import { logger } from "../logger";
import { connectRabbitMQ } from "./rabbitmq";

export const publish = async (
    exchange: string,
    routingKey: string,
    data: unknown
) => {
    const ch = await connectRabbitMQ();
    if (!ch) {
        logger.error("Failed to connect to RabbitMQ");
        return;
    }

    const result = ch.publish(
        exchange,
        routingKey,
        Buffer.from(JSON.stringify(data)),
        { persistent: true }
    );
    return result;
};