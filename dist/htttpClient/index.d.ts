export interface CallOptions extends RequestInit {
    req?: any;
    forwardHeaders?: Record<string, string | undefined>;
    fallbackUrl?: string;
    serviceRegistry?: any;
}
export declare function extractForwardHeaders(req: any): Record<string, string | undefined>;
export declare function callService(serviceName: string, path: string, options?: CallOptions): Promise<Response>;
export default callService;
