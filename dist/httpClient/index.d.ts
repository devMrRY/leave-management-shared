export interface HttpClientOptions {
    baseUrl: string;
    headers?: HeadersInit;
}
export declare class HttpClient {
    private readonly baseUrl;
    private readonly defaultHeaders;
    constructor(options: HttpClientOptions);
    private request;
    get(path: string, options?: RequestInit): Promise<Response>;
    post(path: string, body?: unknown, options?: RequestInit): Promise<Response>;
    put(path: string, body?: unknown, options?: RequestInit): Promise<Response>;
    patch(path: string, body?: unknown, options?: RequestInit): Promise<Response>;
    delete(path: string, options?: RequestInit): Promise<Response>;
}
