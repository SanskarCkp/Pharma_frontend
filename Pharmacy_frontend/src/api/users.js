// src/api/users.js
const rawBase = import.meta.env.VITE_API_URL || "";
const API_BASE = rawBase.replace(/\/+$/g, ""); // remove trailing slash(es)

function apiUrl(path) {
  const p = String(path).replace(/^\/+/, "");
  if (/^https?:\/\//.test(p)) return p;
  if (API_BASE.toLowerCase().endsWith("/api/v1")) return `${API_BASE}/${p}`;
  return `${API_BASE}/api/v1/${p}`;
}

async function parseJsonSafe(res) {
  try { return await res.json(); } catch { return null; }
}

async function doFetch(url, options = {}) {
  console.log("[API] fetch", url, options);
  let res;
  try {
    res = await fetch(url, options);
  } catch (err) {
    const e = new Error("Network error: " + err.message);
    e.kind = "network";
    throw e;
  }
  const body = await parseJsonSafe(res);
  if (!res.ok) {
    const err = new Error(body?.detail || body?.error || `HTTP ${res.status}`);
    err.status = res.status;
    err.url = url;
    err.body = body;
    console.error("[API] error", err);
    throw err;
  }
  return body ?? {};
}

export async function fetchUsersFromBackend() {
  const url = apiUrl("accounts/users/");
  return await doFetch(url, { method: "GET", headers: { Accept: "application/json" } });
}

/**
 * createUserOnBackend - create a Django auth user via backend endpoint
 * payload includes:
 *   - username (we use email as username)
 *   - email
 *   - password
 *   - first_name, last_name (extracted from full_name)
 *   - is_active
 */
export async function createUserOnBackend({ email, full_name = "", password, is_active = true }) {
  const url = apiUrl("accounts/users/");

  const username = email || ""; // IMPORTANT: default auth_user requires username non-empty & unique
  const parts = (full_name || "").trim().split(/\s+/);
  const first_name = parts[0] || "";
  const last_name = parts.length > 1 ? parts.slice(1).join(" ") : "";

  const payload = { username, email, password, first_name, last_name, is_active, full_name };

  return await doFetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(payload),
  });
}
