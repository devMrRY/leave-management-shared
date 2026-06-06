import { SpanStatusCode, trace } from "@opentelemetry/api";

const tracer = trace.getTracer("rabbitmq-consumer");

export const runInConsumerSpan = async <T>(
  spanName: string,
  fn: () => Promise<T>,
): Promise<T> => {
  return tracer.startActiveSpan(spanName, async (span) => {
    try {
      const result = await fn();

      span.setStatus({
        code: SpanStatusCode.OK,
      });

      return result;
    } catch (err) {
      span.recordException(err as Error);

      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: (err as Error).message,
      });

      throw err;
    } finally {
      span.end();
    }
  });
};
