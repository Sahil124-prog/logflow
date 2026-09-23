const amqp = require("amqplib");
const RABBITMQ_URL = process.env.RABBITMQ_URL || "amqp://rabbitmq:5672";
const EXCHANGE = "logflow.events";
let channel = null;

async function connectPublisher(retryDelayMs = 5000) {
  try {
    const connection = await amqp.connect(RABBITMQ_URL);
    channel = await connection.createChannel();
    await channel.assertExchange(EXCHANGE, "fanout", { durable: true });
    console.log("[alert-service] publisher connected");
    connection.on("close", () => {
      channel = null;
      setTimeout(() => connectPublisher(retryDelayMs), retryDelayMs);
    });
  } catch (err) {
    console.error(
      "[alert-service] publisher connect failed, retrying:",
      err.message,
    );
    setTimeout(() => connectPublisher(retryDelayMs), retryDelayMs);
  }
}

function publishEvent(eventType, data) {
  if (!channel)
    return console.error(
      "[alert-service] RabbitMQ unavailable — event not published:",
      eventType,
    );
  channel.publish(
    EXCHANGE,
    "",
    Buffer.from(JSON.stringify({ eventType, data })),
    { persistent: true },
  );
}

module.exports = { connectPublisher, publishEvent };
