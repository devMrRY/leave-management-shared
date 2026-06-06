"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.publish = void 0;
const logger_1 = require("../logger");
const consumer_1 = require("./consumer");
const api_1 = require("@opentelemetry/api");
const publish = async (exchange, routingKey, data) => {
    const ch = await (0, consumer_1.connectChannel)();
    if (!ch) {
        logger_1.logger.error("Failed to connect to RabbitMQ");
        return;
    }
    const headers = {};
    api_1.propagation.inject(api_1.context.active(), headers);
    const result = ch.publish(exchange, routingKey, Buffer.from(JSON.stringify(data)), { persistent: true, headers });
    return result;
};
exports.publish = publish;
