"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createConsumer = exports.connectConsumer = void 0;
const amqplib_1 = __importDefault(require("amqplib"));
const { RABBITMQ_HOST, RABBITMQ_PORT, RABBITMQ_USER, RABBITMQ_PASSWORD } = process.env;
const RABBITMQ_URL = `amqp://${RABBITMQ_USER}:${RABBITMQ_PASSWORD}@${RABBITMQ_HOST}:${RABBITMQ_PORT}`;
let connection = null;
let channel = null;
// Connect and return a new channel for each consumer
const connectConsumer = async () => {
    if (channel)
        return channel;
    const maxRetries = 20;
    let lastError;
    if (!connection) {
        for (let i = 0; i < maxRetries; i++) {
            try {
                connection = await amqplib_1.default.connect(RABBITMQ_URL);
            }
            catch (err) {
                lastError = err;
                console.log(`⏳ RabbitMQ not ready, retrying... (${i + 1})`);
                await new Promise((res) => setTimeout(res, 3000));
            }
        }
    }
    channel = await connection.createChannel();
    if (!channel)
        throw lastError;
    console.log("🐇 Consumer connected");
    return channel;
};
exports.connectConsumer = connectConsumer;
const queueHandlerRegistry = new Map();
const queueConsumerStarted = new Set();
const createConsumer = async (params) => {
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
        handlers = new Map();
        queueHandlerRegistry.set(queueKey, handlers);
    }
    handlers.set(routingKey, handler);
    if (!queueConsumerStarted.has(queueKey)) {
        console.log(`👂 Starting consumer on exchange '${exchange}', queue '${queue}'`);
        await channel.consume(queue, async (msg) => {
            if (!msg)
                return;
            try {
                const data = JSON.parse(msg.content.toString());
                const routing = msg.fields.routingKey;
                const handlerForRoute = handlers.get(routing);
                if (!handlerForRoute) {
                    console.warn(`⚠️ No handler registered for routingKey '${routing}' on queue '${queue}'`);
                    channel.ack(msg);
                    return;
                }
                await handlerForRoute(data);
                channel.ack(msg);
            }
            catch (err) {
                console.error("❌ Consumer error:", err);
                channel.nack(msg, false, false);
            }
        });
        queueConsumerStarted.add(queueKey);
    }
    console.log(`👂 Bound queue '${queue}' to exchange '${exchange}' with routingKey '${routingKey}'`);
};
exports.createConsumer = createConsumer;
