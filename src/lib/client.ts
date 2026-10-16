import { buildAuthHeaders } from "./auth.js";
import { apiBase } from "./config.js";
import { CliError } from "./errors.js";
import { log } from "./logger.js";

const MAX_RETRIES = 3;
const RETRY_DELAYS = [1000, 2000, 4000];
const TIMEOUT_MS = 30_000;

/** HTTP methods supported by the client */
type Method = "GET" | "POST" | "PATCH" | "PUT" | "DELETE";

/** Options for an API request */
interface RequestOptions {
  params?: Record<string, string>;
  body?: Record<string, unknown>;
  timeout?: number;
  /** Credential: org API token (default), admin session, or none for public routes */
  auth?: "token" | "session" | "none";
}

/**
 * Make an authenticated API request with retry logic.
 * Retries on 429 (rate limit) and 5xx (server errors).
 */
export async function request(method: Method, path: string, opts: RequestOptions = {}): Promise<unknown> {
  let url = `${apiBase()}${path}`;

  if (opts.params) {
    const filtered = Object.fromEntries(
      Object.entries(opts.params).filter(([, v]) => v !== undefined && v !== ""),
    );
    if (Object.keys(filtered).length > 0) {
      url += `?${new URLSearchParams(filtered).toString()}`;
    }
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
    ...(opts.auth === "none" ? {} : buildAuthHeaders(opts.auth === "session")),
  };

  const fetchOpts: RequestInit = {
    method,
    headers,
    signal: AbortSignal.timeout(opts.timeout ?? TIMEOUT_MS),
  };

  if (opts.body && method !== "GET") {
    fetchOpts.body = JSON.stringify(opts.body);
  }

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    log.debug(`${method} ${url}${attempt > 0 ? ` (retry ${attempt})` : ""}`);

    const res = await fetch(url, fetchOpts);

    // Retry on rate limit or server error
    if ((res.status === 429 || res.status >= 500) && attempt < MAX_RETRIES) {
      const delay = RETRY_DELAYS[attempt] ?? 4000;
      log.warn(`${res.status} - retrying in ${delay / 1000}s...`);
      await Bun.sleep(delay);
      continue;
    }

    const data = await res.json().catch(() => null);

    if (!res.ok) {
      // FastAPI errors carry `detail`: a string, or a list of validation errors.
      const detail = (data as Record<string, unknown>)?.detail;
      const msg =
        (typeof detail === "string" ? detail : detail && JSON.stringify(detail)) ??
        (data as Record<string, unknown>)?.message ??
        res.statusText;
      throw new CliError(res.status, String(msg));
    }

    return data;
  }

  throw new CliError(500, "Max retries exceeded");
}

/** Typed HTTP client with convenience methods */
export const client = {
  /** GET request with optional query params */
  get(path: string, params?: Record<string, string>) {
    return request("GET", path, { params });
  },

  /** POST request with JSON body */
  post(path: string, body?: Record<string, unknown>) {
    return request("POST", path, { body });
  },

  /** PATCH request with JSON body */
  patch(path: string, body?: Record<string, unknown>) {
    return request("PATCH", path, { body });
  },

  /** PUT request with JSON body */
  put(path: string, body?: Record<string, unknown>) {
    return request("PUT", path, { body });
  },

  /** DELETE request */
  delete(path: string) {
    return request("DELETE", path);
  },
};
