export interface HttpClientOptions {
    baseUrl: string;
    getRequestContext: () => {
        authorization?: string;
        userId?: string;
        role?: string;
    } | undefined;
}
export declare class HttpClient {
    private baseUrl;
    private getRequestContext;
    constructor(options: HttpClientOptions);
    private buildHeaders;
    request(method: string, path: string, options?: RequestInit): Promise<Response>;
    get(path: string, options?: RequestInit): Promise<Response>;
    post(path: string, body?: any, options?: RequestInit): Promise<Response>;
    put(path: string, body?: any, options?: RequestInit): Promise<Response>;
    patch(path: string, body?: any, options?: RequestInit): Promise<Response>;
    delete(path: string, options?: RequestInit): Promise<Response>;
}
