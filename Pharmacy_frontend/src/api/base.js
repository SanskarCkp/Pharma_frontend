// src/api/base.js
// Central helper to normalize the configured backend URL so the rest of the app
// can reliably call `/api/v1/...` regardless of how VITE_API_URL is set.

const rawBase = (import.meta.env.VITE_API_URL || "").trim();
const trimmed = rawBase.replace(/\/+$/g, "");

const apiRoot =
  trimmed.length === 0
    ? "/api/v1"
    : trimmed.toLowerCase().endsWith("/api/v1")
    ? trimmed
    : `${trimmed}/api/v1`;

export const apiBase = trimmed;
export const apiRootUrl = apiRoot;

export function apiUrl(path = "") {
  if (!path) return apiRoot;
  if (/^https?:\/\//i.test(path)) return path;
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${apiRoot}${normalized}`;
}
