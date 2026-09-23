const amqp = require("amqplib");

const RABBITMQ_URL = process.env.RABBITMQ_URL || "amqp://rabbitmq:5672";
const EXCHANGE = "logflow.events";

// A "fanout" exchange ignores routing keys entirely — it copies every
// message to every queue bound to it. That's what we want here: alert-service,
// notification-service and the dashboard consumer should ALL see every
// log.created event.
let channel = null;

async function connectPublisher(retryDelayMs = 5000) {
  try {
    const connection = await amqp.connect(RABBITMQ_URL);
    channel = await connection.createChannel();
    await channel.assertExchange(EXCHANGE, "fanout", { durable: true });
    console.log(
      "[log-ingestion-service] connected to RabbitMQ, exchange ready:",
      EXCHANGE,
    );

    connection.on("close", () => {
      console.error(
        "[log-ingestion-service] RabbitMQ connection closed — retrying in",
        retryDelayMs,
        "ms",
      );
      channel = null;
      setTimeout(() => connectPublisher(retryDelayMs), retryDelayMs);
    });
    connection.on("error", (err) => {
      console.error(
        "[log-ingestion-service] RabbitMQ connection error:",
        err.message,
      );
    });
  } catch (err) {
    console.error(
      "[log-ingestion-service] failed to connect, retrying in",
      retryDelayMs,
      "ms —",
      err.message,
    );
    channel = null;
    setTimeout(() => connectPublisher(retryDelayMs), retryDelayMs);
  }
}



// Fire-and-forget: the Mongo write has already succeeded by the time this
// runs, so a broker outage must never turn into a failed API response.
function publishLogCreated(log) {
  if (!channel) {
    console.error(
      "[log-ingestion-service] RabbitMQ unavailable — log.created NOT published for log id:",
      log._id?.toString(),
    );
    return;
  }
  try {
    const payload = Buffer.from(
      JSON.stringify({ eventType: "log.created", data: log }),
    );
    channel.publish(EXCHANGE, "", payload, { persistent: true });
  } catch (err) {
    console.error(
      "[log-ingestion-service] failed to publish log.created:",
      err.message,
    );
  }
}

module.exports = { connectPublisher, publishLogCreated };
