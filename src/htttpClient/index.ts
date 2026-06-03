export interface HttpClientOptions {
  baseUrl: string;
  headers?: HeadersInit;
}

export class HttpClient {
  private readonly baseUrl: string;
  private readonly defaultHeaders: Headers;

  constructor(options: HttpClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, '');
    this.defaultHeaders = new Headers(options.headers);
  }

  private request(
    method: string,
    path: string,
    options: RequestInit = {}
  ): Promise<Response> {
    const headers = new Headers(this.defaultHeaders);

    if (options.headers) {
      new Headers(options.headers).forEach((value, key) => {
        headers.set(key, value);
      });
    }

    return fetch(
      `${this.baseUrl}/${path.replace(/^\/+/, '')}`,
      {
        ...options,
        method,
        headers,
      }
    );
  }

  get(path: string, options?: RequestInit) {
    return this.request('GET', path, options);
  }

  post(path: string, body?: unknown, options: RequestInit = {}) {
    return this.request('POST', path, {
      ...options,
      body:
        typeof body === 'object' &&
        body !== null &&
        !(body instanceof FormData)
          ? JSON.stringify(body)
          : (body as BodyInit),
    });
  }

  put(path: string, body?: unknown, options: RequestInit = {}) {
    return this.request('PUT', path, {
      ...options,
      body:
        typeof body === 'object' &&
        body !== null &&
        !(body instanceof FormData)
          ? JSON.stringify(body)
          : (body as BodyInit),
    });
  }

  patch(path: string, body?: unknown, options: RequestInit = {}) {
    return this.request('PATCH', path, {
      ...options,
      body:
        typeof body === 'object' &&
        body !== null &&
        !(body instanceof FormData)
          ? JSON.stringify(body)
          : (body as BodyInit),
    });
  }

  delete(path: string, options?: RequestInit) {
    return this.request('DELETE', path, options);
  }
}