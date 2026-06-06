"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runInConsumerSpan = void 0;
const api_1 = require("@opentelemetry/api");
const tracer = api_1.trace.getTracer("rabbitmq-consumer");
const runInConsumerSpan = async (spanName, fn) => {
    return tracer.startActiveSpan(spanName, async (span) => {
        try {
            const result = await fn();
            span.setStatus({
                code: api_1.SpanStatusCode.OK,
            });
            return result;
        }
        catch (err) {
            span.recordException(err);
            span.setStatus({
                code: api_1.SpanStatusCode.ERROR,
                message: err.message,
            });
            throw err;
        }
        finally {
            span.end();
        }
    });
};
exports.runInConsumerSpan = runInConsumerSpan;
