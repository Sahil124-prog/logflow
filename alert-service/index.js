require("dotenv").config();
const amqp = require("amqplib");
const mongoose = require("mongoose");

const Log = require("./models/Log");
const Alert = require("./models/Alert");
const { connectPublisher, publishEvent } = require("./publisher");

const ProcessedEvent = require("./models/ProcessedEvent");

const RABBITMQ_URL = process.env.RABBITMQ_URL || "amqp://rabbitmq:5672";
const EXCHANGE = "logflow.events";
const QUEUE = "alerts.queue";

const WINDOW_MINUTES = 5,
  ERROR_THRESHOLD = 2,
  ALERT_COOLDOWN_MS = 30000;

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 10000; // 10s
const RETRY_QUEUE = "alerts.retry.queue";
const DLQ = "alerts.dlq";

async function checkThreshold(service) {
  const windowStart = new Date(Date.now() - WINDOW_MINUTES * 60000);
  const existingAlert = await Alert.findOne({ service, resolved: false });
  const recentlyResolved = await Alert.findOne({
    service,
    resolved: true,
  }).sort({ updatedAt: -1 });

  let timeThreshold = windowStart;
  if (
    recentlyResolved &&
    new Date(recentlyResolved.updatedAt) > timeThreshold
  ) {
    timeThreshold = new Date(recentlyResolved.updatedAt);
  }

  const errorCount = await Log.countDocuments({
    service,
    level: "error",
    timestamp: { $gte: timeThreshold },
  });
  if (errorCount < ERROR_THRESHOLD) return;

  if (
    !existingAlert &&
    (!recentlyResolved ||
      Date.now() - new Date(recentlyResolved.updatedAt).getTime() >
        ALERT_COOLDOWN_MS)
  ) {
    const alert = await Alert.create({
      service,
      errorCount,
      windowStart,
      resolved: false,
    });
    publishEvent("alert.created", alert);
  } else if (existingAlert) {
    existingAlert.errorCount = errorCount;
    await existingAlert.save();
    publishEvent("alert.updated", existingAlert);
  }
  console.log(
    `[alert-service] Alert created for ${service} — ${errorCount} errors`,
  );
}

async function startConsumer(retryDelayMs = 5000) {
  try {
    const connection = await amqp.connect(RABBITMQ_URL);
    const channel = await connection.createChannel();
    await channel.assertExchange(EXCHANGE, "fanout", { durable: true });
    await channel.assertQueue(QUEUE, { durable: true });
    await channel.bindQueue(QUEUE, EXCHANGE, "");

    // Retry queue: messages sit here for RETRY_DELAY_MS, then RabbitMQ
    // automatically routes them back to `alerts.queue` once their TTL expires —
    // this delay+dead-letter trick is how you do delayed retry without a plugin.
    await channel.assertQueue(RETRY_QUEUE, {
      durable: true,
      arguments: {
        "x-message-ttl": RETRY_DELAY_MS,
        "x-dead-letter-exchange": "",
        "x-dead-letter-routing-key": QUEUE,
      },
    });

    await channel.assertQueue(DLQ, { durable: true });

    channel.consume(QUEUE, async (msg) => {
      if (!msg) return;
      let eventId, eventType, log;
      try {
        ({
          eventId,
          eventType,
          data: log,
        } = JSON.parse(msg.content.toString()));

        if (eventType !== "log.created" || log.level !== "error") {
          channel.ack(msg);
          return;
        }

        const alreadyDone = await ProcessedEvent.findOne({ eventId });
        if (alreadyDone) {
          channel.ack(msg);
          return;
        }

        await checkThreshold(log.service);
        await ProcessedEvent.create({ eventId });
        channel.ack(msg);
      } catch (err) {
        console.error("[alert-service] processing error:", err.message);
        const retryCount = (msg.properties.headers?.["x-retry-count"] || 0) + 1;

        if (retryCount > MAX_RETRIES) {
          channel.sendToQueue(DLQ, msg.content, { persistent: true });
          console.error(
            `[alert-service] gave up after ${MAX_RETRIES} retries, moved to DLQ:`,
            eventId,
          );
        } else {
          channel.sendToQueue(RETRY_QUEUE, msg.content, {
            persistent: true,
            headers: { "x-retry-count": retryCount },
          });
          console.log(
            `[alert-service] retry ${retryCount}/${MAX_RETRIES} scheduled:`,
            eventId,
          );
        }
        channel.ack(msg); // remove from alerts.queue — it's now parked in retry/DLQ instead
      }
    });

    console.log("[alert-service] listening on", QUEUE);
    connection.on("close", () =>
      setTimeout(() => startConsumer(retryDelayMs), retryDelayMs),
    );
  } catch (err) {
    console.error(
      "[alert-service] consumer connect failed, retrying:",
      err.message,
    );
    setTimeout(() => startConsumer(retryDelayMs), retryDelayMs);
  }
}

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("[alert-service] MongoDB connected"))
  .catch((err) => console.error("[alert-service] MongoDB error:", err));

connectPublisher();
startConsumer();
