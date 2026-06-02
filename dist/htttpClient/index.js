"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractForwardHeaders = extractForwardHeaders;
exports.callService = callService;
function extractForwardHeaders(req) {
    return {
        authorization: req.headers.authorization,
        cookie: req.headers.cookie,
        'x-user-id': req.headers['x-user-id'],
        'x-user-role': req.headers['x-user-role'],
    };
}
async function callService(serviceName, path, options) {
    // Resolve base URL via service registry, env fallback, or provided fallback
    let baseUrl = null;
    try {
        baseUrl = await options?.serviceRegistry?.discover(serviceName) || null;
    }
    catch (err) {
        // ignore and fall back to env
        baseUrl = process.env[`${serviceName.toUpperCase().replace(/-/g, '_')}_URL`] || null;
    }
    if (!baseUrl) {
        baseUrl = process.env[`${serviceName.toUpperCase().replace(/-/g, '_')}_URL`] || null;
    }
    if (!baseUrl) {
        throw new Error(`Service not found: ${serviceName}`);
    }
    const url = `${baseUrl.replace(/\/$/, '')}/${path.replace(/^\/+/, '')}`;
    const headers = new Headers(options?.headers || {});
    const forwarded = {
        ...options?.forwardHeaders,
        ...(options?.req ? extractForwardHeaders(options.req) : {}),
    };
    for (const [k, v] of Object.entries(forwarded)) {
        if (v)
            headers.set(k, v);
    }
    const { req, forwardHeaders, ...fetchOptions } = options ?? {};
    const resp = await fetch(url, {
        ...fetchOptions,
        headers,
    });
    return resp;
}
exports.default = callService;
