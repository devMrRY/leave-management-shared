import { logger } from "../logger";
import CircuitBreaker from "opossum";

export class ServiceUnavailableError extends Error {
  status = 503;
  constructor(message = "Service Unavailable") {
    super(message);
    this.name = "ServiceUnavailableError";
  }
}

type AnyFn = (...args: any[]) => Promise<any>;

const breakerRegistry: Map<string, CircuitBreaker> = new Map();

export function getCircuitBreaker(serviceName: string, actionFn: AnyFn, fallback?: AnyFn) {
  if (breakerRegistry.has(serviceName)) {
    return breakerRegistry.get(serviceName)!;
  }

  const breaker = new CircuitBreaker(actionFn, {
    timeout: Number(process.env.CB_TIMEOUT) || 5000, // request timeout
    errorThresholdPercentage: Number(process.env.CB_ERROR_THRESHOLD) || 50, // open if 50% fail
    resetTimeout: Number(process.env.CB_RESET_TIMEOUT) || 10000, // retry after 10s
    volumeThreshold: Number(process.env.CB_VOLUME_THRESHOLD) || 5,
    rollingCountTimeout: Number(process.env.CB_ROLLING_TIMEOUT) || 6000,
    rollingCountBuckets: Number(process.env.CB_ROLLING_BUCKETS) || 60,
  });

  // optional logging and metrics hooks
  breaker.on("open", () => logger.info(`[CB] OPEN: ${serviceName}`));
  breaker.on("halfOpen", () => logger.info(`[CB] HALF-OPEN: ${serviceName}`));
  breaker.on("close", () => logger.info(`[CB] CLOSED: ${serviceName}`));
  breaker.on("failure", (error: unknown) =>
    logger.error({ err: error, stats: breaker.stats }, `[CB] FAILED: ${serviceName}`),
  );
  breaker.on("reject", (error: unknown) =>
    logger.error({ err: error, stats: breaker.stats }, `[CB] REJECTED: ${serviceName}`),
  );

  // default fallback returns a controlled ServiceUnavailableError rejection
  if (fallback) {
    breaker.fallback((...args: any[]) => fallback(...(args as any[])));
  } else {
    breaker.fallback(() => Promise.reject(new ServiceUnavailableError()));
  }

  breakerRegistry.set(serviceName, breaker);

  return breaker;
}
