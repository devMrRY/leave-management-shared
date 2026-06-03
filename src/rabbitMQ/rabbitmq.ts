import amqp, { Channel, Connection } from "amqplib";
import { logger } from "../logger";

let connection: any = null;
let channel: Channel | null = null;
const { RABBITMQ_HOST, RABBITMQ_PORT, RABBITMQ_USER, RABBITMQ_PASSWORD } = process.env;
const RABBITMQ_URL = `amqp://${RABBITMQ_USER}:${RABBITMQ_PASSWORD}@${RABBITMQ_HOST}:${RABBITMQ_PORT}`;

export const connectRabbitMQ = async (): Promise<Channel | null> => {
    if (channel) return channel;
    const maxRetries = 20;
    let lastError: any;
    if (!connection) {
        for (let i = 0; i < maxRetries; i++) {
            try {
                connection = await amqp.connect(RABBITMQ_URL);
            } catch (err) {
                lastError = err;
                logger.info(`⏳ RabbitMQ not ready, retrying... (${i + 1})`);
                await new Promise((res) => setTimeout(res, 5000));
            }
        }
    }
    if (connection) {
        channel = await connection.createChannel();
    }
    if (!channel) throw lastError;
    logger.info("RabbitMQ connected");
    return channel;
};