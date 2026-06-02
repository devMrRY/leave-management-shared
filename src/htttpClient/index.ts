export interface CallOptions extends RequestInit {
  req?: Request;
  forwardHeaders?: Record<string, string | undefined>;
  fallbackUrl?: string;
  serviceRegistry?: {
    discover: (serviceName: string) => Promise<string>;
  }
}

export function extractForwardHeaders(req: any): Record<string, string | undefined> {
  return {
    authorization: req.headers.authorization as string | undefined,
    cookie: req.headers.cookie as string | undefined,
    'x-user-id': req.headers['x-user-id'] as string | undefined,
    'x-user-role': req.headers['x-user-role'] as string | undefined,
  };
}

export async function callService(
  serviceName: string,
  path: string,
  options?: CallOptions
): Promise<Response> {
  // Resolve base URL via service registry, env fallback, or provided fallback
  let baseUrl: string | null = null;
  try {
    baseUrl = await options?.serviceRegistry?.discover(serviceName) || null;
  } catch (err) {
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
  const forwarded: Record<string, string | undefined> = {
    ...options?.forwardHeaders,
    ...(options?.req ? extractForwardHeaders(options.req) : {}),
  };

  for (const [k, v] of Object.entries(forwarded)) {
    if (v) headers.set(k, v);
  }

  const { req, forwardHeaders, ...fetchOptions } = options ?? {};
  const resp = await fetch(url, {
    ...fetchOptions,
    headers,
  });

  return resp;
}

export default callService;
