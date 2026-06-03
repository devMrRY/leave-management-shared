"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HttpClient = void 0;
class HttpClient {
    constructor(options) {
        this.baseUrl = options.baseUrl.replace(/\/$/, '');
        this.defaultHeaders = new Headers(options.headers);
    }
    request(method, path, options = {}) {
        const headers = new Headers(this.defaultHeaders);
        if (options.headers) {
            new Headers(options.headers).forEach((value, key) => {
                headers.set(key, value);
            });
        }
        const isJsonBody = options.body &&
            typeof options.body === 'string';
        const hasContentType = headers.has('content-type');
        if (!hasContentType && !isJsonBody) {
            headers.set('content-type', 'application/json');
        }
        return fetch(`${this.baseUrl}/${path.replace(/^\/+/, '')}`, {
            ...options,
            method,
            headers,
        });
    }
    get(path, options) {
        return this.request('GET', path, options);
    }
    post(path, body, options = {}) {
        return this.request('POST', path, {
            ...options,
            body: typeof body === 'object' &&
                body !== null &&
                !(body instanceof FormData)
                ? JSON.stringify(body)
                : body,
        });
    }
    put(path, body, options = {}) {
        return this.request('PUT', path, {
            ...options,
            body: typeof body === 'object' &&
                body !== null &&
                !(body instanceof FormData)
                ? JSON.stringify(body)
                : body,
        });
    }
    patch(path, body, options = {}) {
        return this.request('PATCH', path, {
            ...options,
            body: typeof body === 'object' &&
                body !== null &&
                !(body instanceof FormData)
                ? JSON.stringify(body)
                : body,
        });
    }
    delete(path, options) {
        return this.request('DELETE', path, options);
    }
}
exports.HttpClient = HttpClient;
