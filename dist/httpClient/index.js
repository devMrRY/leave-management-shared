"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HttpClient = void 0;
class HttpClient {
    constructor(options) {
        this.baseUrl = options.baseUrl.replace(/\/$/, "");
        this.getRequestContext = options.getRequestContext;
    }
    buildHeaders(extra) {
        const headers = new Headers(extra);
        const ctx = this.getRequestContext?.();
        if (ctx?.authorization)
            headers.set("authorization", ctx.authorization);
        if (ctx?.userId)
            headers.set("x-user-id", ctx.userId);
        if (ctx?.role)
            headers.set("x-user-role", ctx.role);
        return headers;
    }
    async request(method, path, options = {}) {
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
    get(path, options) {
        return this.request("GET", path, options);
    }
    post(path, body, options = {}) {
        return this.request("POST", path, {
            ...options,
            headers: {
                "content-type": "application/json",
                ...options.headers,
            },
            body: JSON.stringify(body),
        });
    }
    put(path, body, options = {}) {
        return this.request("PUT", path, {
            ...options,
            headers: {
                "content-type": "application/json",
                ...options.headers,
            },
            body: JSON.stringify(body),
        });
    }
    patch(path, body, options = {}) {
        return this.request("PATCH", path, {
            ...options,
            headers: {
                "content-type": "application/json",
                ...options.headers,
            },
            body: JSON.stringify(body),
        });
    }
    delete(path, options) {
        return this.request("DELETE", path, options);
    }
}
exports.HttpClient = HttpClient;
