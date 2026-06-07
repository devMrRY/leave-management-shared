import CircuitBreaker from "opossum";
export declare class ServiceUnavailableError extends Error {
    status: number;
    constructor(message?: string);
}
type AnyFn = (...args: any[]) => Promise<any>;
export declare function getCircuitBreaker(serviceName: string, actionFn: AnyFn, fallback?: AnyFn): CircuitBreaker<any[], any>;
export {};
