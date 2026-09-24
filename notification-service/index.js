require("dotenv").config();
const amqp = require("amqplib");

const RABBITMQ_URL = process.env.RABBITMQ_URL || "amqp://rabbitmq:5672";
const EXCHANGE = "logflow.events";
const QUEUE = "notifications.queue";

function sendNotification(alert) {
  console.log(
    `[notification-service] 🔔 ALERT: ${alert.service} — ${alert.errorCount} errors in window (started ${alert.windowStart})`,
  );
  // Real integration (webhook/email/Slack) would go here — same interface,
  // this function is the one place that changes.
}

async function startConsumer(retryDelayMs = 5000) {
  try {
    const connection = await amqp.connect(RABBITMQ_URL);
    const channel = await connection.createChannel();
    await channel.assertExchange(EXCHANGE, "fanout", { durable: true });
    await channel.assertQueue(QUEUE, { durable: true });
    await channel.bindQueue(QUEUE, EXCHANGE, "");

    channel.consume(QUEUE, (msg) => {
      if (!msg) return;
      try {
        const { eventType, data } = JSON.parse(msg.content.toString());
        if (eventType === "alert.created") {
          sendNotification(data);
        }
        // alert.updated and log.created intentionally ignored — see above
        channel.ack(msg);
      } catch (err) {
        console.error("[notification-service] processing error:", err.message);
        channel.nack(msg, false, false);
      }
    });

    console.log("[notification-service] listening on", QUEUE);
    connection.on("close", () =>
      setTimeout(() => startConsumer(retryDelayMs), retryDelayMs),
    );
  } catch (err) {
    console.error(
      "[notification-service] connect failed, retrying:",
      err.message,
    );
    setTimeout(() => startConsumer(retryDelayMs), retryDelayMs);
  }
}

startConsumer();
