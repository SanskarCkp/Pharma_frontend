// src/api/auth.js
// Combined & cleaned version — supports both API styles (/auth/... or /api/v1/auth/...)
// And all forgot/verify/reset OTP flows.

const rawBase = import.meta.env.VITE_API_URL || "";
const API_BASE = rawBase.replace(/\/+$/g, ""); // remove trailing slash

// Utility: ensure "/api/v1/..." is included only once
function withApiV1(pathAfterApiV1) {
  const normalized = pathAfterApiV1.replace(/^\/+/, "");

  // no base URL → default to /api/v1
  if (!API_BASE) return `/api/v1/${normalized}`;

  // VITE_API_URL already ends with /api/v1
  if (API_BASE.toLowerCase().endsWith("/api/v1"))
    return `${API_BASE}/${normalized}`;

  // Normal case: append /api/v1
  return `${API_BASE}/api/v1/${normalized}`;
}

// Safe JSON parser
async function parseJsonSafe(res) {
  try { return await res.json(); } catch { return null; }
}

// Wrapper for fetch + consistent error responses
async function doFetch(url, opts = {}) {
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
    const message =
      (json && (json.detail || json.error || json.message)) ||
      `HTTP ${res.status}`;

    const e = new Error(message);
    e.status = res.status;
    e.body = json;
    throw e;
  }

  return json ?? {};
}

// TOKEN HELPERS
const ACCESS_TOKEN_KEY = "access_token";
const REFRESH_TOKEN_KEY = "refresh_token";

export function getAccessToken() { return localStorage.getItem(ACCESS_TOKEN_KEY); }
export function getRefreshToken() { return localStorage.getItem(REFRESH_TOKEN_KEY); }

export function storeTokens({ access, refresh }) {
  if (access) localStorage.setItem(ACCESS_TOKEN_KEY, access);
  if (refresh) localStorage.setItem(REFRESH_TOKEN_KEY, refresh);
}

export function clearTokens() {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

export function logout() { clearTokens(); }

// ----------------------------
// LOGIN (supports both API patterns)
// ----------------------------
export async function login(username, password) {
  // Decide login URL dynamically
  const url = (() => {
    if (!API_BASE) return "/auth/token/"; // local dev
    if (API_BASE.toLowerCase().endsWith("/api/v1"))
      return `${API_BASE}/auth/token/`;
    return `${API_BASE}/api/v1/auth/token/`;
  })();

  const data = await doFetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });

  // Save tokens if present
  if (data.access || data.refresh)
    storeTokens({ access: data.access, refresh: data.refresh });

  return data;
}

// ----------------------------
// REFRESH TOKEN
// ----------------------------
export async function refreshAccessToken() {
  const refresh = getRefreshToken();
  if (!refresh) {
    clearTokens();
    return null;
  }

  const url = (() => {
    if (!API_BASE) return "/auth/token/refresh/";
    if (API_BASE.toLowerCase().endsWith("/api/v1"))
      return `${API_BASE}/auth/token/refresh/`;
    return `${API_BASE}/api/v1/auth/token/refresh/`;
  })();

  const data = await doFetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh }),
  });

  if (data.access) storeTokens({ access: data.access, refresh });

  return data.access ?? null;
}

// ----------------------------
// FORGOT PASSWORD (OTP FLOW)
// ----------------------------
export async function forgotPassword(email) {
  const url = withApiV1("accounts/forgot-password/");
  return await doFetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
}

// Verify OTP
export async function verifyOtp(email, otp) {
  const url = withApiV1("accounts/verify-otp/");
  return await doFetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, otp }),
  });
}

// Reset password
export async function resetPassword(uid, token, newPassword) {
  const url = withApiV1("accounts/reset-password/");
  return await doFetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ uid, token, new_password: newPassword }),
  });
}

export const resetPasswordApi = resetPassword; // backward compatibility