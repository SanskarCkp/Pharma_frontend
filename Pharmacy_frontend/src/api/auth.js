// src/api/auth.js
// Handles login, tokens, forgot/verify/reset password.
// Tolerant of VITE_API_URL that may or may not include /api/v1

const rawBase = import.meta.env.VITE_API_URL || "";
const API_BASE = rawBase.replace(/\/+$/g, ""); // remove trailing slash

function withApiV1(pathAfterApiV1) {
  const normalized = pathAfterApiV1.replace(/^\/+/, "");
  if (!API_BASE) return `/api/v1/${normalized}`;
  if (API_BASE.toLowerCase().endsWith("/api/v1")) return `${API_BASE}/${normalized}`;
  return `${API_BASE}/api/v1/${normalized}`;
}

async function parseJsonSafe(res) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

async function doFetch(url, opts = {}) {
  // Uncomment for debug:
  // console.log("[api/auth] FETCH", opts.method || "GET", url, opts.body ? JSON.parse(opts.body) : undefined);
  let res;
  try {
    res = await fetch(url, opts);
  } catch (err) {
    const e = new Error("Network error: " + err.message);
    e.kind = "network";
    throw e;
  }
  const json = await parseJsonSafe(res);
  if (!res.ok) {
    const message = (json && (json.detail || json.error)) || `HTTP ${res.status}`;
    const e = new Error(message);
    e.status = res.status;
    e.body = json;
    throw e;
  }
  return json ?? {};
}

// Token keys + helpers
const ACCESS_TOKEN_KEY = "access_token";
const REFRESH_TOKEN_KEY = "refresh_token";
export function getAccessToken() { return localStorage.getItem(ACCESS_TOKEN_KEY); }
export function getRefreshToken() { return localStorage.getItem(REFRESH_TOKEN_KEY); }
export function storeTokens({ access, refresh }) { if (access) localStorage.setItem(ACCESS_TOKEN_KEY, access); if (refresh) localStorage.setItem(REFRESH_TOKEN_KEY, refresh); }
export function clearTokens() { localStorage.removeItem(ACCESS_TOKEN_KEY); localStorage.removeItem(REFRESH_TOKEN_KEY); }
export function logout() { clearTokens(); }

// LOGIN (token endpoint may live at /auth/token/ or /api/v1/auth/token/)
export async function login(username, password) {
  const url = (() => {
    if (!API_BASE) return "/auth/token/";
    if (API_BASE.toLowerCase().endsWith("/api/v1")) return `${API_BASE}/auth/token/`;
    return `${API_BASE}/api/v1/auth/token/`;
  })();

  const body = JSON.stringify({ username, password });
  const data = await doFetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body });
  if (data.access || data.refresh) storeTokens({ access: data.access, refresh: data.refresh });
  return data;
}

// REFRESH
export async function refreshAccessToken() {
  const refresh = getRefreshToken();
  if (!refresh) { clearTokens(); return null; }
  const url = (() => {
    if (!API_BASE) return "/auth/token/refresh/";
    if (API_BASE.toLowerCase().endsWith("/api/v1")) return `${API_BASE}/auth/token/refresh/`;
    return `${API_BASE}/api/v1/auth/token/refresh/`;
  })();
  const data = await doFetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ refresh }) });
  if (data.access) storeTokens({ access: data.access, refresh });
  return data.access ?? null;
}

// Forgot / Verify / Reset (OTP flow)
export async function forgotPassword(email) {
  const url = withApiV1("accounts/forgot-password/");
  return await doFetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) });
}

export async function verifyOtp(email, otp) {
  const url = withApiV1("accounts/verify-otp/");
  return await doFetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, otp }) });
}

export async function resetPasswordApi(uid, token, newPassword) {
  const url = withApiV1("accounts/reset-password/");
  return await doFetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ uid, token, new_password: newPassword }) });
}
export const resetPassword = resetPasswordApi;
