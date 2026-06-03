"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.connectRabbitMQ = void 0;
const amqplib_1 = __importDefault(require("amqplib"));
const logger_1 = require("../logger");
let connection = null;
let channel = null;
const { RABBITMQ_HOST, RABBITMQ_PORT, RABBITMQ_USER, RABBITMQ_PASSWORD } = process.env;
const RABBITMQ_URL = `amqp://${RABBITMQ_USER}:${RABBITMQ_PASSWORD}@${RABBITMQ_HOST}:${RABBITMQ_PORT}`;
const connectRabbitMQ = async () => {
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
                logger_1.logger.info(`⏳ RabbitMQ not ready, retrying... (${i + 1})`);
                await new Promise((res) => setTimeout(res, 5000));
            }
        }
    }
    if (connection) {
        channel = await connection.createChannel();
    }
    if (!channel)
        throw lastError;
    logger_1.logger.info("RabbitMQ connected");
    return channel;
};
exports.connectRabbitMQ = connectRabbitMQ;
