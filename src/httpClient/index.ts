export interface HttpClientOptions {
  baseUrl: string;
  getRequestContext: () =>
    | {
        authorization?: string;
        userId?: string;
        role?: string;
      }
    | undefined;
}

export class HttpClient {
  private baseUrl: string;
  private getRequestContext;
  
  constructor(options: HttpClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, "");
    this.getRequestContext = options.getRequestContext;
  }


  private buildHeaders(extra?: HeadersInit): Headers {
    const headers = new Headers(extra);
    const ctx = this.getRequestContext?.();

    if (ctx?.authorization) headers.set("authorization", ctx.authorization);
    if (ctx?.userId) headers.set("x-user-id", ctx.userId);
    if (ctx?.role) headers.set("x-user-role", ctx.role);

    return headers;
  }

  async request(method: string, path: string, options: RequestInit = {}) {
    const headers = this.buildHeaders(options.headers);
    const isStringBody = typeof options.body === "string";
    const isFormData = options.body instanceof FormData;
    const hasBody = options.body !== undefined && options.body !== null;

    const contentType = headers.get("content-type");
    if (!contentType && !isStringBody && !isFormData && hasBody) {
      headers.set("content-type", "application/json");
    }
    return fetch(`${this.baseUrl}/${path.replace(/^\/+/, "")}`, {
      ...options,
      method,
      headers,
    });
  }

  get(path: string, options?: RequestInit) {
    return this.request("GET", path, options);
  }

  post(path: string, body?: any, options: RequestInit = {}) {
    return this.request("POST", path, {
      ...options,
      body: JSON.stringify(body),
    });
  }

  put(path: string, body?: any, options: RequestInit = {}) {
    return this.request("PUT", path, {
      ...options,
      body: JSON.stringify(body),
    });
  }

  patch(path: string, body?: any, options: RequestInit = {}) {
    return this.request("PATCH", path, {
      ...options,
      body: JSON.stringify(body),
    });
  }

  delete(path: string, options?: RequestInit) {
    return this.request("DELETE", path, options);
  }
}