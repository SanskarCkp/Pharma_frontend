import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  AUTH_TOKENS_CHANGED_EVENT,
  clearTokens,
  getAccessToken,
  getRefreshToken,
  login as loginRequest,
  storeTokens,
} from "../api/auth";
import getOrCreateDeviceId from "../utils/device";

const USER_STORAGE_KEY = "auth_user";
const LICENSE_DAYS_STORAGE_KEY = "license_days_left";
const LICENSE_VALID_TO_STORAGE_KEY = "license_valid_to";
const DEFAULT_ERROR_MESSAGE =
  "Unable to login. Please check your credentials and try again.";

const AuthContext = createContext(undefined);

const storage = {
  get(key) {
    if (typeof window === "undefined" || !window.localStorage) {
      return null;
    }
    try {
      return window.localStorage.getItem(key);
    } catch (error) {
      console.warn(`Unable to read key "${key}" from localStorage:`, error);
      return null;
    }
  },
  set(key, value) {
    if (typeof window === "undefined" || !window.localStorage) {
      return;
    }
    try {
      window.localStorage.setItem(key, value);
    } catch (error) {
      console.warn(`Unable to save key "${key}" to localStorage:`, error);
    }
  },
  remove(key) {
    if (typeof window === "undefined" || !window.localStorage) {
      return;
    }
    try {
      window.localStorage.removeItem(key);
    } catch (error) {
      console.warn(`Unable to remove key "${key}" from localStorage:`, error);
    }
  },
};

const safeParseJson = (value) => {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
};

const readStoredUser = () => {
  const raw = storage.get(USER_STORAGE_KEY);
  return safeParseJson(raw);
};

const readStoredLicenseDays = () => {
  const raw = storage.get(LICENSE_DAYS_STORAGE_KEY);
  if (raw === null || raw === undefined || raw === "") return null;
  const parsed = Number(raw);
  return Number.isNaN(parsed) ? null : parsed;
};

const readStoredLicenseValidTo = () => {
  const raw = storage.get(LICENSE_VALID_TO_STORAGE_KEY);
  return raw || null;
};

const normalizeDaysLeft = (value) => {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : parsed;
};

const prettifyKey = (key) =>
  key
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());

const extractErrorMessage = (error) => {
  if (!error) return DEFAULT_ERROR_MESSAGE;

  const body = error.body;
  if (body) {
    if (typeof body === "string") return body;

    const knownMessage = body.detail || body.error || body.message;
    if (knownMessage) return knownMessage;

    const messages = [];
    const appendValue = (label, value) => {
      if (!value) return;
      const formattedLabel =
        label && label !== "non_field_errors" ? `${prettifyKey(label)}: ` : "";
      messages.push(`${formattedLabel}${value}`.trim());
    };

    Object.entries(body).forEach(([key, value]) => {
      if (value === null || value === undefined) return;
      if (Array.isArray(value)) {
        appendValue(key, value.join(" "));
      } else if (typeof value === "string") {
        appendValue(key, value);
      } else if (typeof value === "object" && value.detail) {
        appendValue(key, value.detail);
      }
    });

    if (messages.length) {
      return messages.join(" ");
    }
  }

  if (error.message) return error.message;
  return DEFAULT_ERROR_MESSAGE;
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => readStoredUser());
  const [accessToken, setAccessToken] = useState(() => getAccessToken());
  const [refreshToken, setRefreshToken] = useState(() => getRefreshToken());
  const [licenseDaysLeft, setLicenseDaysLeft] = useState(() =>
    readStoredLicenseDays()
  );
  const [licenseValidTo, setLicenseValidTo] = useState(() =>
    readStoredLicenseValidTo()
  );

  useEffect(() => {
    getOrCreateDeviceId();
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const handler = (event) => {
      const detail = event?.detail || {};
      setAccessToken(detail.access ?? getAccessToken());
      setRefreshToken(detail.refresh ?? getRefreshToken());
    };
    window.addEventListener(AUTH_TOKENS_CHANGED_EVENT, handler);
    return () => window.removeEventListener(AUTH_TOKENS_CHANGED_EVENT, handler);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const syncFromStorage = () => {
      setAccessToken(getAccessToken());
      setRefreshToken(getRefreshToken());
      setUser(readStoredUser());
      setLicenseDaysLeft(readStoredLicenseDays());
      setLicenseValidTo(readStoredLicenseValidTo());
    };
    window.addEventListener("storage", syncFromStorage);
    return () => window.removeEventListener("storage", syncFromStorage);
  }, []);

  const updateLicenseInfo = useCallback((daysValue, validToValue) => {
    const normalizedDays = normalizeDaysLeft(daysValue);

    if (normalizedDays === null) {
      storage.remove(LICENSE_DAYS_STORAGE_KEY);
      setLicenseDaysLeft(null);
    } else {
      storage.set(LICENSE_DAYS_STORAGE_KEY, String(normalizedDays));
      setLicenseDaysLeft(normalizedDays);
    }

    if (validToValue) {
      storage.set(LICENSE_VALID_TO_STORAGE_KEY, validToValue);
      setLicenseValidTo(validToValue);
    } else {
      storage.remove(LICENSE_VALID_TO_STORAGE_KEY);
      setLicenseValidTo(null);
    }
  }, []);

  const login = useCallback(
    async (username, password) => {
      const normalizedUsername =
        typeof username === "string" ? username.trim() : "";
      const normalizedPassword =
        typeof password === "string" ? password : "";

      try {
        const response = await loginRequest(
          normalizedUsername,
          normalizedPassword
        );

        const access = response?.access ?? response?.access_token ?? null;
        const refresh = response?.refresh ?? response?.refresh_token ?? null;

        if (!access && !refresh) {
          throw new Error(
            "Login succeeded but the server did not return auth tokens."
          );
        }

        storeTokens({ access, refresh });
        setAccessToken(access ?? getAccessToken());
        setRefreshToken(refresh ?? getRefreshToken());

        const nextUser = response?.user ?? { username: normalizedUsername };
        setUser(nextUser);
        storage.set(USER_STORAGE_KEY, JSON.stringify(nextUser));

        const daysLeft =
          response?.license?.days_left ?? response?.license?.daysLeft ?? null;
        const validTo =
          response?.license?.valid_to ?? response?.license?.validTo ?? null;
        updateLicenseInfo(daysLeft, validTo);

        return response;
      } catch (error) {
        throw new Error(extractErrorMessage(error));
      }
    },
    [updateLicenseInfo]
  );

  const logout = useCallback(() => {
    clearTokens();
    setAccessToken(null);
    setRefreshToken(null);
    setUser(null);
    storage.remove(USER_STORAGE_KEY);
    updateLicenseInfo(null, null);
  }, [updateLicenseInfo]);

  const value = useMemo(
    () => ({
      user,
      accessToken,
      refreshToken,
      licenseDaysLeft,
      licenseValidTo,
      isAuthenticated: Boolean(accessToken || refreshToken),
      login,
      logout,
    }),
    [
      user,
      accessToken,
      refreshToken,
      licenseDaysLeft,
      licenseValidTo,
      login,
      logout,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export default AuthContext;
