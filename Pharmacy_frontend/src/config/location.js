const raw = Number(import.meta.env.VITE_DEFAULT_LOCATION_ID || import.meta.env.VITE_LOCATION_ID || 1);

export const DEFAULT_LOCATION_ID = Number.isFinite(raw) && raw > 0 ? raw : 1;

export function getDefaultLocationId() {
  return DEFAULT_LOCATION_ID;
}
