"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ServiceUnavailableError = void 0;
exports.getCircuitBreaker = getCircuitBreaker;
const logger_1 = require("../logger");
const opossum_1 = __importDefault(require("opossum"));
class ServiceUnavailableError extends Error {
    constructor(message = "Service Unavailable") {
        super(message);
        this.status = 503;
        this.name = "ServiceUnavailableError";
    }
}
exports.ServiceUnavailableError = ServiceUnavailableError;
const breakerRegistry = new Map();
function getCircuitBreaker(serviceName, actionFn, fallback) {
    if (breakerRegistry.has(serviceName)) {
        return breakerRegistry.get(serviceName);
    }
    const breaker = new opossum_1.default(actionFn, {
        timeout: Number(process.env.CB_TIMEOUT) || 5000, // request timeout
        errorThresholdPercentage: Number(process.env.CB_ERROR_THRESHOLD) || 50, // open if 50% fail
        resetTimeout: Number(process.env.CB_RESET_TIMEOUT) || 10000, // retry after 10s
        volumeThreshold: Number(process.env.CB_VOLUME_THRESHOLD) || 5,
        rollingCountTimeout: Number(process.env.CB_ROLLING_TIMEOUT) || 6000,
        rollingCountBuckets: Number(process.env.CB_ROLLING_BUCKETS) || 60,
    });
    // optional logging and metrics hooks
    breaker.on("open", () => logger_1.logger.info(`[CB] OPEN: ${serviceName}`));
    breaker.on("halfOpen", () => logger_1.logger.info(`[CB] HALF-OPEN: ${serviceName}`));
    breaker.on("close", () => logger_1.logger.info(`[CB] CLOSED: ${serviceName}`));
    breaker.on("failure", (error) => logger_1.logger.error({ err: error, stats: breaker.stats }, `[CB] FAILED: ${serviceName}`));
    breaker.on("reject", (error) => logger_1.logger.error({ err: error, stats: breaker.stats }, `[CB] REJECTED: ${serviceName}`));
    // default fallback returns a controlled ServiceUnavailableError rejection
    if (fallback) {
        breaker.fallback((...args) => fallback(...args));
    }
    else {
        breaker.fallback(() => Promise.reject(new ServiceUnavailableError()));
    }
    breakerRegistry.set(serviceName, breaker);
    return breaker;
}
