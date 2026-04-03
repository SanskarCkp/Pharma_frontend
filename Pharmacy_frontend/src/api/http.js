import { getAccessToken, refreshAccessToken, clearTokens } from "./auth";

export async function authFetch(input, init = {}) {
  const initialOptions = { ...init };
  const headers = new Headers(initialOptions.headers || {});

  const token = getAccessToken();
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  if (!headers.has("Accept")) {
    headers.set("Accept", "application/json");
  }

  const options = { ...initialOptions, headers };

  let response = await fetch(input, options);

  if (response.status !== 401) {
    return response;
  }

  const refreshed = await refreshAccessToken();
  if (!refreshed) {
    clearTokens();
    return response;
  }

  const retryHeaders = new Headers(initialOptions.headers || {});
  retryHeaders.set("Authorization", `Bearer ${refreshed}`);
  if (!retryHeaders.has("Accept")) {
    retryHeaders.set("Accept", "application/json");
  }

  const retryOptions = { ...initialOptions, headers: retryHeaders };
  return fetch(input, retryOptions);
}

export async function getUserFacingErrorMessage(
  response,
  fallback = "Something went wrong. Please try again."
) {
  if (!response) {
    return fallback;
  }

  if (response.status >= 500) {
    return "Server error. Please try again in a moment.";
  }

  if (response.status === 404) {
    return "The requested invoice was not found.";
  }

  if (response.status === 401) {
    return "Your session has expired. Please log in again.";
  }

  if (response.status === 403) {
    return "You do not have permission to perform this action.";
  }

  try {
    const contentType = response.headers.get("content-type") || "";
    if (!contentType.toLowerCase().includes("application/json")) {
      return fallback;
    }

    const data = await response.clone().json();
    if (!data || typeof data !== "object") {
      return fallback;
    }

    const directMessage =
      data.detail ||
      data.error ||
      data.message ||
      data.non_field_errors?.[0];

    if (typeof directMessage === "string" && directMessage.trim()) {
      return directMessage.trim();
    }

    for (const value of Object.values(data)) {
      if (Array.isArray(value) && value.length && typeof value[0] === "string") {
        return value[0];
      }

      if (typeof value === "string" && value.trim()) {
        return value.trim();
      }
    }
  } catch {
    return fallback;
  }

  return fallback;
}

