const amqp = require("amqplib");
const { logsReceivedTotal } = require("../metrics");

const RABBITMQ_URL = process.env.RABBITMQ_URL || "amqp://rabbitmq:5672";
const EXCHANGE = "logflow.events";
const QUEUE = "dashboard-realtime.queue";

// This replaces the req.io.emit("new-log", log) call that used to sit
// directly inside the old POST /logs handler. That handler doesn't live
// here anymore — this consumer is now the ONLY thing that pushes new logs
// to connected dashboard clients, and it does so by reacting to the same
// log.created event every other consumer reacts to.
async function startDashboardConsumer(io, retryDelayMs = 5000) {
  try {
    const connection = await amqp.connect(RABBITMQ_URL);
    const channel = await connection.createChannel();

    await channel.assertExchange(EXCHANGE, "fanout", { durable: true });
    await channel.assertQueue(QUEUE, { durable: true });
    await channel.bindQueue(QUEUE, EXCHANGE, "");

    channel.consume(QUEUE, (msg) => {
      if (!msg) return;
      try {
        const { data: log } = JSON.parse(msg.content.toString());

        io.emit("new-log", log);

        if (logsReceivedTotal) {
          logsReceivedTotal.inc({ level: log.level, service: log.service });
        }

        channel.ack(msg);
      } catch (err) {
        console.error(
          "[dashboardConsumer] failed to process message:",
          err.message,
        );
        // Drop malformed messages rather than requeue forever — real
        // retry/DLQ handling for genuine processing failures comes in
        // Phase 0.7. For now this only guards against unparsable payloads.
        channel.nack(msg, false, false);
      }
    });

    console.log("[dashboardConsumer] listening on", QUEUE);

    connection.on("close", () => {
      console.error(
        "[dashboardConsumer] RabbitMQ connection closed — retrying in",
        retryDelayMs,
        "ms",
      );
      setTimeout(() => startDashboardConsumer(io, retryDelayMs), retryDelayMs);
    });
  } catch (err) {
    console.error(
      "[dashboardConsumer] failed to start, retrying in",
      retryDelayMs,
      "ms —",
      err.message,
    );
    setTimeout(() => startDashboardConsumer(io, retryDelayMs), retryDelayMs);
  }
}

module.exports = startDashboardConsumer;
