"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = void 0;
const pino_1 = __importDefault(require("pino"));
const api_1 = require("@opentelemetry/api");
exports.logger = (0, pino_1.default)({
    level: process.env.LOG_LEVEL || "info",
    mixin() {
        const span = api_1.trace.getActiveSpan();
        if (!span) {
            return {};
        }
        const ctx = span.spanContext();
        return {
            traceId: ctx.traceId,
            spanId: ctx.spanId,
        };
    },
});
