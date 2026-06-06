import { logger } from "../logger";
import { connectChannel } from "./consumer";
import { context, propagation } from "@opentelemetry/api";

export const publish = async (
  exchange: string,
  routingKey: string,
  data: unknown,
) => {
  const ch = await connectChannel();
  if (!ch) {
    logger.error("Failed to connect to RabbitMQ");
    return;
  }
  const headers: any = {};
  propagation.inject(context.active(), headers);

  const result = ch.publish(
    exchange,
    routingKey,
    Buffer.from(JSON.stringify(data)),
    { persistent: true, headers },
  );
  return result;
};
