import { getApiBaseUrl } from "../config/env";
import { normalizeApiError } from "./normalizeApiError";

/**
 * Small fetch wrapper:
 * - base URL config
 * - JSON parsing
 * - error normalization for consistent UI rendering
 */

// PUBLIC_INTERFACE
export async function apiRequest(path, options = {}) {
  /** Performs an API request and throws a normalized error on non-2xx. */
  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl}${path}`;

  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {})
  };

  const resp = await fetch(url, { ...options, headers });

  const contentType = resp.headers.get("content-type") || "";
  const isJson = contentType.includes("application/json");

  let data = null;
  try {
    data = isJson ? await resp.json() : await resp.text();
  } catch (e) {
    data = null;
  }

  if (!resp.ok) {
    const normalized = normalizeApiError({
      httpStatus: resp.status,
      body: data
    });
    throw normalized;
  }

  return data;
}
