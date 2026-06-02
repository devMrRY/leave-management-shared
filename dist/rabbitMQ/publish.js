"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.publish = void 0;
const logger_1 = require("../logger");
const rabbitmq_1 = require("./rabbitmq");
const publish = async (exchange, routingKey, data) => {
    const ch = await (0, rabbitmq_1.connectRabbitMQ)();
    if (!ch) {
        logger_1.logger.error("Failed to connect to RabbitMQ");
        return;
    }
    const result = ch.publish(exchange, routingKey, Buffer.from(JSON.stringify(data)), { persistent: true });
    return result;
};
exports.publish = publish;
