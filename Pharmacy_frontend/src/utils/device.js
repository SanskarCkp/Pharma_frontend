// src/utils/device.js

const DEVICE_ID_STORAGE_KEY = "device_id";

const canUseLocalStorage = () => {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
};

const generateDeviceId = () => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  const randomPart = Math.random().toString(36).slice(2);
  const timestampPart = Date.now().toString(36);
  return `dev-${timestampPart}-${randomPart}`;
};

export function getOrCreateDeviceId() {
  const fallbackId = generateDeviceId();

  if (!canUseLocalStorage()) {
    return fallbackId;
  }

  try {
    const existing = window.localStorage.getItem(DEVICE_ID_STORAGE_KEY);
    if (existing) {
      return existing;
    }
    window.localStorage.setItem(DEVICE_ID_STORAGE_KEY, fallbackId);
    return fallbackId;
  } catch (error) {
    console.warn("Unable to access localStorage for device id:", error);
    return fallbackId;
  }
}

export default getOrCreateDeviceId;
