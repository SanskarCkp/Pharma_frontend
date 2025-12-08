// src/api/auth.js
// Combined & cleaned version — supports both API styles (/auth/... or /api/v1/auth/...)
// And all forgot/verify/reset OTP flows.

import getOrCreateDeviceId from "../utils/device";

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
export const AUTH_TOKENS_CHANGED_EVENT = "auth:tokens-changed";

const ACCESS_TOKEN_KEY = "access_token";
const REFRESH_TOKEN_KEY = "refresh_token";
const LEGACY_ACCESS_KEYS = ["access"];
const LEGACY_REFRESH_KEYS = ["refresh"];

const readFromStorage = (primary, legacyKeys) => {
  const val = localStorage.getItem(primary);
  if (val) return val;
  for (const key of legacyKeys) {
    const legacyVal = localStorage.getItem(key);
    if (legacyVal) return legacyVal;
  }
  return null;
};

const persistToStorage = (primary, value, legacyKeys) => {
  localStorage.setItem(primary, value);
  legacyKeys.forEach((key) => localStorage.setItem(key, value));
};

const removeKeys = (primary, legacyKeys) => {
  localStorage.removeItem(primary);
  legacyKeys.forEach((key) => localStorage.removeItem(key));
};

const broadcastTokenChange = (detail) => {
  if (typeof window === "undefined" || typeof window.dispatchEvent !== "function") {
    return;
  }

  try {
    window.dispatchEvent(new CustomEvent(AUTH_TOKENS_CHANGED_EVENT, { detail }));
  } catch (error) {
    console.warn("Failed to broadcast auth token change:", error);
  }
};

export function getAccessToken() {
  return readFromStorage(ACCESS_TOKEN_KEY, LEGACY_ACCESS_KEYS);
}

export function getRefreshToken() {
  return readFromStorage(REFRESH_TOKEN_KEY, LEGACY_REFRESH_KEYS);
}

export function storeTokens({ access, refresh }) {
  if (access) persistToStorage(ACCESS_TOKEN_KEY, access, LEGACY_ACCESS_KEYS);
  if (refresh) persistToStorage(REFRESH_TOKEN_KEY, refresh, LEGACY_REFRESH_KEYS);

  const latestAccess = access ?? getAccessToken();
  const latestRefresh = refresh ?? getRefreshToken();
  broadcastTokenChange({ access: latestAccess, refresh: latestRefresh });
}

export function clearTokens() {
  removeKeys(ACCESS_TOKEN_KEY, LEGACY_ACCESS_KEYS);
  removeKeys(REFRESH_TOKEN_KEY, LEGACY_REFRESH_KEYS);
  broadcastTokenChange({ access: null, refresh: null });
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

  const deviceId = getOrCreateDeviceId();

  const data = await doFetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password, device_id: deviceId }),
  });

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
