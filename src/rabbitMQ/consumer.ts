import amqp, { Channel, ConsumeMessage } from "amqplib";
import { context, propagation } from "@opentelemetry/api";
let connection: any = null;
let channel: Channel | null = null;

// Connect and return a new channel for each consumer
export const connectChannel = async (): Promise<Channel> => {
  const { RABBITMQ_HOST, RABBITMQ_PORT, RABBITMQ_USER, RABBITMQ_PASSWORD } =
    process.env;
  const RABBITMQ_URL = `amqp://${RABBITMQ_USER}:${RABBITMQ_PASSWORD}@${RABBITMQ_HOST}:${RABBITMQ_PORT}`;
  if (channel) return channel;
  const maxRetries = 20;
  let lastError: any;

  for (let i = 1; i <= maxRetries; i++) {
    try {
      connection = await amqp.connect(RABBITMQ_URL);
      break;
    } catch (err) {
      lastError = err;
      console.log(`⏳ RabbitMQ not ready, retrying... (${i + 1})`);
      await new Promise((res) => setTimeout(res, 3000));
    }
  }
  channel = await connection.createChannel();
  if (!channel) throw lastError;
  console.log("🐇 Consumer connected");
  return channel;
};

const queueHandlerRegistry = new Map<
  string,
  Map<string, (data: any) => Promise<void>>
>();
const queueConsumerStarted = new Set<string>();

export const createConsumer = async (params: {
  channel: Channel;
  exchange: string;
  queue: string;
  routingKey: string;
  serviceName: string;
  handler: (data: any) => Promise<void>;
}) => {
  const { channel, exchange, queue, routingKey, handler } = params;
  const queueKey = `${exchange}::${queue}`;

  // Ensure the exchange exists (all services use the same exchange)
  await channel.assertExchange(exchange, "topic", { durable: true });

  // Each instance can have its own queue (e.g., queue = serviceName-instanceId)
  await channel.assertQueue(queue, { durable: true });

  // Bind the queue to the exchange with the routing key (event type)
  await channel.bindQueue(queue, exchange, routingKey);

  let handlers = queueHandlerRegistry.get(queueKey);
  if (!handlers) {
    handlers = new Map<string, (data: any) => Promise<void>>();
    queueHandlerRegistry.set(queueKey, handlers);
  }
  handlers.set(routingKey, handler);

  if (!queueConsumerStarted.has(queueKey)) {
    console.log(
      `👂 Starting consumer on exchange '${exchange}', queue '${queue}'`,
    );
    await channel.consume(queue, async (msg: ConsumeMessage | null) => {
      if (!msg) return;
      try {
        const parentContext = propagation.extract(
          context.active(),
          msg.properties.headers
        );
        const data = JSON.parse(msg.content.toString());
        const routing = msg.fields.routingKey;
        const handlerForRoute = handlers.get(routing);

        if (!handlerForRoute) {
          console.warn(
            `⚠️ No handler registered for routingKey '${routing}' on queue '${queue}'`,
          );
          channel.ack(msg);
          return;
        }

        await context.with(parentContext, async () => {
          await handlerForRoute(data);
        });
        channel.ack(msg);
      } catch (err) {
        console.error("❌ Consumer error:", err);
        channel.nack(msg, false, false);
      }
    });
    queueConsumerStarted.add(queueKey);
  }

  console.log(
    `👂 Bound queue '${queue}' to exchange '${exchange}' with routingKey '${routingKey}'`,
  );
};
