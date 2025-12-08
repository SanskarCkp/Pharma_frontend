import React, { useEffect, useMemo, useState } from "react";
import "./inventory.css";
import { authFetch } from "../../api/http";
import { getAccessToken, getRefreshToken, storeTokens } from "../../api/auth";
import { getDefaultLocationId } from "../../config/location";

const rawBase = import.meta.env.VITE_API_URL || "";
const normalizeBase = (u) => u.trim().replace(/\/+$/g, "").replace(/\/api\/v1$/i, "");
const API_BASE = normalizeBase(rawBase);

const ADD_MEDICINE_API = `${API_BASE}/api/v1/inventory/add-medicine/`;
const MEDICINE_SEARCH_API = `${API_BASE}/api/v1/inventory/medicines/?search=`;

const DEFAULT_LOCATION_ID = getDefaultLocationId();

// Predefined categories matching AddMedicine.jsx
const MEDICINE_CATEGORIES = [
  { id: 'tablet', name: 'Tablet', looseLabel: 'Strips', boxLabel: 'Boxes', perBoxLabel: 'Strips per Box', perBoxDefault: 10, perBoxField: 'strips_per_box' },
  { id: 'capsule', name: 'Capsule', looseLabel: 'Strips', boxLabel: 'Boxes', perBoxLabel: 'Strips per Box', perBoxDefault: 10, perBoxField: 'strips_per_box' },
  { id: 'syrup', name: 'Syrup/Suspension', looseLabel: 'Bottles', boxLabel: 'Boxes', perBoxLabel: 'Bottles per Box', perBoxDefault: 12, perBoxField: 'bottles_per_box' },
  { id: 'injection', name: 'Injection/Vial', looseLabel: 'Vials', boxLabel: 'Boxes', perBoxLabel: 'Vials per Box', perBoxDefault: 10, perBoxField: 'vials_per_box' },
  { id: 'ointment', name: 'Ointment/Cream', looseLabel: 'Tubes', boxLabel: 'Boxes', perBoxLabel: 'Tubes per Box', perBoxDefault: 10, perBoxField: 'tubes_per_box' },
  { id: 'drops', name: 'Drops (Eye/Ear/Nasal)', looseLabel: 'Bottles', boxLabel: 'Boxes', perBoxLabel: 'Bottles per Box', perBoxDefault: 10, perBoxField: 'bottles_per_box' },
  { id: 'inhaler', name: 'Inhaler', looseLabel: 'Inhalers', boxLabel: 'Boxes', perBoxLabel: 'Inhalers per Box', perBoxDefault: 1, perBoxField: 'inhalers_per_box' },
  { id: 'powder', name: 'Powder/Sachet', looseLabel: 'Sachets', boxLabel: 'Boxes', perBoxLabel: 'Sachets per Box', perBoxDefault: 10, perBoxField: 'sachets_per_box' },
  { id: 'gel', name: 'Gel', looseLabel: 'Tubes', boxLabel: 'Boxes', perBoxLabel: 'Tubes per Box', perBoxDefault: 10, perBoxField: 'tubes_per_box' },
  { id: 'spray', name: 'Spray', looseLabel: 'Bottles', boxLabel: 'Boxes', perBoxLabel: 'Bottles per Box', perBoxDefault: 10, perBoxField: 'bottles_per_box' },
  { id: 'lotion', name: 'Lotion/Solution', looseLabel: 'Bottles', boxLabel: 'Boxes', perBoxLabel: 'Bottles per Box', perBoxDefault: 10, perBoxField: 'bottles_per_box' },
  { id: 'shampoo', name: 'Shampoo', looseLabel: 'Bottles', boxLabel: 'Boxes', perBoxLabel: 'Bottles per Box', perBoxDefault: 10, perBoxField: 'bottles_per_box' },
  { id: 'soap', name: 'Soap/Bar', looseLabel: 'Bars', boxLabel: 'Boxes', perBoxLabel: 'Bars per Box', perBoxDefault: 3, perBoxField: 'bars_per_box' },
  { id: 'bandage', name: 'Bandage/Dressing', looseLabel: 'Packs', boxLabel: 'Boxes', perBoxLabel: 'Packs per Box', perBoxDefault: 10, perBoxField: 'packs_per_box' },
  { id: 'mask', name: 'Mask (Surgical/N95)', looseLabel: 'Packs', boxLabel: 'Boxes', perBoxLabel: 'Packs per Box', perBoxDefault: 10, perBoxField: 'packs_per_box' },
  { id: 'gloves', name: 'Gloves', looseLabel: 'Packs', boxLabel: 'Boxes', perBoxLabel: 'Packs per Box', perBoxDefault: 10, perBoxField: 'packs_per_box' },
  { id: 'cotton', name: 'Cotton/Gauze', looseLabel: 'Packs', boxLabel: 'Boxes', perBoxLabel: 'Packs per Box', perBoxDefault: 10, perBoxField: 'packs_per_box' },
  { id: 'sanitizer', name: 'Hand Sanitizer', looseLabel: 'Bottles', boxLabel: 'Boxes', perBoxLabel: 'Bottles per Box', perBoxDefault: 12, perBoxField: 'bottles_per_box' },
  { id: 'thermometer', name: 'Thermometer', looseLabel: 'Packs', boxLabel: 'Boxes', perBoxLabel: 'Packs per Box', perBoxDefault: 10, perBoxField: 'packs_per_box' },
  { id: 'supplement', name: 'Supplement/Vitamin', looseLabel: 'Strips', boxLabel: 'Boxes', perBoxLabel: 'Strips per Box', perBoxDefault: 10, perBoxField: 'strips_per_box' },
  { id: 'other', name: 'Other/Miscellaneous', looseLabel: 'Packs', boxLabel: 'Boxes', perBoxLabel: 'Packs per Box', perBoxDefault: 10, perBoxField: 'packs_per_box' }
];

const normalizeCategoryId = (category) => {
  if (!category) return "";
  const raw =
    typeof category === "string"
      ? category
      : category.id || category.slug || category.code || category.value || category.name || "";
  const cleaned = String(raw || "").trim();
  const lowered = cleaned.toLowerCase();
  const direct = MEDICINE_CATEGORIES.find((c) => c.id === lowered);
  if (direct) return direct.id;
  const byName = MEDICINE_CATEGORIES.find((c) => c.name.toLowerCase() === lowered);
  if (byName) return byName.id;
  return lowered;
};

const deriveBoxCount = (medicineLike, categoryId) => {
  const med = medicineLike?.medicine || medicineLike || {};
  const toNumber = (value) => {
    const num = Number(value);
    return Number.isFinite(num) && num > 0 ? num : null;
  };

  const catId = categoryId || normalizeCategoryId(med.category);
  const categoryConfig = MEDICINE_CATEGORIES.find((c) => c.id === catId);
  const preferredField = categoryConfig?.perBoxField;

  const candidates = [
    preferredField,
    "strips_per_box",
    "bottles_per_box",
    "vials_per_box",
    "tubes_per_box",
    "inhalers_per_box",
    "sachets_per_box",
    "bars_per_box",
    "packs_per_box",
    "units_per_box",
    "quantity_per_box",
    "pack_size",
    "units_per_pack",
  ].filter(Boolean);

  for (const key of candidates) {
    const value = toNumber(med[key]);
    if (value) return value;
    if (med.medicine && med.medicine !== med) {
      const nested = toNumber(med.medicine[key]);
      if (nested) return nested;
    }
  }

  return null;
};

const dispatchInventoryRefresh = () => {
  try {
    window.dispatchEvent(new CustomEvent("inventory:refresh"));
  } catch {}
};

async function tryRefreshToken() {
  try {
    const refresh = getRefreshToken();
    if (!refresh) return false;
    const res = await fetch(`${API_BASE}/api/v1/auth/token/refresh/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh }),
    });
    if (!res.ok) return false;
    const data = await res.json().catch(() => null);
    if (!data) return false;
    storeTokens({ access: data.access, refresh: data.refresh || refresh });
    return Boolean(data.access || data.refresh);
  } catch {
    return false;
  }
}

async function fetchWithAuthRetry(url, options = {}) {
  try {
    const response = await authFetch(url, options);
    if (response.status !== 401) return response;
    const refreshed = await tryRefreshToken();
    if (!refreshed) return response;
    return await authFetch(url, options);
  } catch (err) {
    console.warn("authFetch failed, falling back to fetch", err);
    const headers = { ...(options.headers || {}) };
    const token = getAccessToken();
    if (token) headers.Authorization = `Bearer ${token}`;
    return fetch(url, { ...options, headers });
  }
}

export default function QuickAddMedicine({ open, onClose, onSaved }) {
  const [name, setName] = useState("");
  const [stockUnit, setStockUnit] = useState("");
  const [quantity, setQuantity] = useState("");
  const [category, setCategory] = useState("");
  const [boxCount, setBoxCount] = useState("");
  const [categoryTouched, setCategoryTouched] = useState(false);
  const [boxCountTouched, setBoxCountTouched] = useState(false);
  const [autoSuggestion, setAutoSuggestion] = useState({ category: "", perBox: null, source: "" });
  const [lookingUpName, setLookingUpName] = useState(false);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const selectedCategory = MEDICINE_CATEGORIES.find((c) => c.id === category);
  const quantityLabel =
    stockUnit === "box" ? selectedCategory?.boxLabel || "Boxes" : selectedCategory?.looseLabel || "Units";
  const defaultPerBox = selectedCategory?.perBoxDefault;
  const autoBoxCount = autoSuggestion.perBox;
  const perBoxField = selectedCategory?.perBoxField;
  const itemsPerBoxLabel = selectedCategory?.perBoxLabel || "Items per Box";

  const boxCountOptions = useMemo(() => {
    const opts = [];
    if (autoBoxCount) {
      opts.push({ value: String(autoBoxCount), label: `Auto-detected (${autoBoxCount})` });
    }
    if (defaultPerBox && defaultPerBox !== autoBoxCount) {
      opts.push({ value: String(defaultPerBox), label: `Category default (${defaultPerBox})` });
    }
    if (boxCount && !opts.find((o) => o.value === boxCount)) {
      opts.push({ value: String(boxCount), label: `Use ${boxCount}` });
    }
    return opts;
  }, [autoBoxCount, defaultPerBox, boxCount]);

  useEffect(() => {
    if (!open) return;
    const query = name.trim();
    if (query.length < 2) {
      setLookingUpName(false);
      setAutoSuggestion({ category: "", perBox: null, source: "" });
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLookingUpName(true);
      try {
        const res = await fetchWithAuthRetry(`${MEDICINE_SEARCH_API}${encodeURIComponent(query)}`, {
          signal: controller.signal,
        });
        if (!res.ok) throw new Error(`Lookup failed (${res.status})`);
        const data = await res.json().catch(() => null);
        const list = Array.isArray(data) ? data : data?.results || data?.items || [];
        const normalizedQuery = query.toLowerCase();
        const match =
          list.find((item) => {
            const med = item.medicine || item;
            const medName = (med.name || med.medicine_name || "").toLowerCase();
            return medName === normalizedQuery;
          }) || list[0];

        if (!match) {
          setAutoSuggestion({ category: "", perBox: null, source: "" });
          return;
        }

        const med = match.medicine || match;
        const detectedCategory = normalizeCategoryId(med.category || match.category);
        const detectedPerBox = deriveBoxCount(med, detectedCategory || category);

        setAutoSuggestion({
          category: detectedCategory || "",
          perBox: detectedPerBox,
          source: med.name || med.medicine_name || match.medicine_name || query,
        });

        console.log("Auto-detection results:", {
          detectedCategory,
          detectedPerBox,
          categoryTouched,
          stockUnit,
          source: med.name || med.medicine_name || match.medicine_name || query
        });

        // Auto-set category if user hasn't manually changed it
        if (detectedCategory && !categoryTouched) {
          setCategory(detectedCategory);
          console.log("Category auto-set to:", detectedCategory);
        }

        // Auto-set box count if stock unit is box and user hasn't manually changed it
        if (stockUnit === "box" && detectedPerBox && !boxCountTouched) {
          setBoxCount(String(detectedPerBox));
          console.log("Box count auto-set to:", detectedPerBox);
        }
      } catch (err) {
        if (err.name === "AbortError") return;
        console.warn("Medicine lookup failed", err);
      } finally {
        setLookingUpName(false);
      }
    }, 400);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [name, open, stockUnit, category, categoryTouched, boxCountTouched]);

  useEffect(() => {
    if (!open) return;
    if (stockUnit !== "box") {
      setBoxCount("");
      return;
    }
    if (boxCountTouched) return;
    const fallback = autoBoxCount || defaultPerBox;
    if (fallback && boxCount !== String(fallback)) {
      setBoxCount(String(fallback));
    }
  }, [open, stockUnit, autoBoxCount, defaultPerBox, boxCountTouched, boxCount]);

  const handleCategoryChange = (e) => {
    setCategory(e.target.value);
    setCategoryTouched(true);
  };

  const handleStockUnitChange = (e) => {
    setStockUnit(e.target.value);
  };

  const handleClose = () => {
    setName("");
    setStockUnit("");
    setQuantity("");
    setCategory("");
    setBoxCount("");
    setCategoryTouched(false);
    setBoxCountTouched(false);
    setAutoSuggestion({ category: "", perBox: null, source: "" });
    setLookingUpName(false);
    setErrors({});
    setServerError("");
    if (onClose) onClose();
  };

  const validate = () => {
    const localErrors = {};
    if (!name.trim()) localErrors.name = "Medicine name is required";
    if (!category) localErrors.category = "Category is required";
    if (!stockUnit) localErrors.stock_unit = "Stock unit type is required";
    if (!quantity) localErrors.quantity = "Quantity is required";
    if (stockUnit === "box" && !boxCount) localErrors.box_count = "Items per box is required";
    return localErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError("");
    setErrors({});

    const validationErrors = validate();
    if (Object.keys(validationErrors).length) {
      setErrors(validationErrors);
      return;
    }

    const parsedBoxCount = Number(boxCount || defaultPerBox || 0);
    const hasBoxCount = stockUnit === "box" && Number.isFinite(parsedBoxCount) && parsedBoxCount > 0;

    // Build a minimal payload with defaults for required fields
    const medicinePayload = {
      name: name.trim(),
      category: category,
      strength: "",
      rack_location: 1, // Default rack - adjust as needed
      gst_percent: "0",
      cost_price: "0",
      mrp: "0",
      // Set packaging fields to defaults
      tablets_per_strip: category === "tablet" ? 10 : undefined,
      capsules_per_strip: category === "capsule" ? 10 : undefined,
      ml_per_bottle: category === "syrup" ? 100 : undefined,
      ml_per_vial: category === "injection" ? 5 : undefined,
      grams_per_tube: category === "ointment" ? 30 : undefined,
    };

    if (hasBoxCount) {
      if (perBoxField) {
        medicinePayload[perBoxField] = parsedBoxCount;
      } else {
        medicinePayload.packs_per_box = parsedBoxCount;
      }
    }

    const payload = {
      location_id: Number(DEFAULT_LOCATION_ID),
      medicine: medicinePayload,
      batch: {
        batch_number: `QUICK-${Date.now()}`,
        quantity: Number(quantity),
        stock_unit: stockUnit,
        mfg_date: undefined,
        expiry_date: new Date(new Date().setFullYear(new Date().getFullYear() + 2)).toISOString().split('T')[0], // Default 2 years from now
      },
    };

    setSubmitting(true);
    try {
      const response = await fetchWithAuthRetry(ADD_MEDICINE_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) {
        if (body?.detail) {
          setServerError(body.detail);
        } else {
          setServerError(`Save failed (${response.status})`);
        }
        return;
      }

      dispatchInventoryRefresh();
      if (onSaved) onSaved(body);
      handleClose();
    } catch (err) {
      console.error("Quick add medicine failed", err);
      setServerError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const renderFieldError = (field) => {
    const message = errors[field];
    if (!message) return null;
    return <div className="err" style={{ color: '#dc2626', fontSize: '12px', marginTop: '4px' }}>{message}</div>;
  };

  if (!open) return null;

  return (
    <div className="drawer-backdrop" onClick={handleClose}>
      <div className="quick-add-modal" onClick={(e) => e.stopPropagation()}>
        <div className="quick-add-header">
          <h3>Quick Add Medicine</h3>
          <button className="close-btn" onClick={handleClose}>&times;</button>
        </div>

        {serverError && <div className="inv-error-banner">{serverError}</div>}

        <form onSubmit={handleSubmit}>
          <div className="field">
            <label>Medicine Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Paracetamol, Amoxicillin"
              className={errors.name ? "error" : ""}
              autoFocus
            />
            {renderFieldError("name")}
          </div>

          <div className="field">
            <label>Category *</label>
            <select
              value={category}
              onChange={handleCategoryChange}
              className={errors.category ? "error" : ""}
            >
              <option value="">Select category</option>
              {MEDICINE_CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            {renderFieldError("category")}
            {autoSuggestion.category && !categoryTouched && category && (
              <div className="hint" style={{ fontSize: '12px', color: '#059669', marginTop: '4px' }}>
                ✓ Auto-detected from "{autoSuggestion.source}"
              </div>
            )}
          </div>

          <div className="field">
            <label>Stock Unit Type *</label>
            <select
              value={stockUnit}
              onChange={handleStockUnitChange}
              className={errors.stock_unit ? "error" : ""}
            >
              <option value="">Select stock unit type</option>
              <option value="box">Box (Packed)</option>
              <option value="loose">Loose (Individual Units)</option>
            </select>
            {renderFieldError("stock_unit")}
            {stockUnit && (
              <div className="hint" style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
                {stockUnit === 'box'
                  ? 'Box: Complete packages (e.g., 10 strips/box)'
                  : 'Loose: Individual units (e.g., single strips, bottles)'}
              </div>
            )}
          </div>

          {stockUnit === 'box' && selectedCategory && (
            <div className="field">
              <label>{selectedCategory.perBoxLabel} *</label>
              <input
                type="number"
                value={autoBoxCount || selectedCategory.perBoxDefault}
                readOnly
                disabled
                style={{
                  backgroundColor: '#f3f4f6',
                  cursor: 'not-allowed',
                  color: '#374151',
                  fontWeight: '500'
                }}
              />
              <div className="hint" style={{ fontSize: '12px', color: autoBoxCount ? '#059669' : '#6b7280', marginTop: '4px' }}>
                {autoBoxCount
                  ? `✓ Auto-detected: ${autoBoxCount} ${selectedCategory.looseLabel.toLowerCase()} per box`
                  : `Default: ${selectedCategory.perBoxDefault} ${selectedCategory.looseLabel.toLowerCase()} per box`
                }
              </div>
            </div>
          )}

          <div className="field">
            <label>Quantity ({quantityLabel}) *</label>
            <input
              type="number"
              min="0"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder={stockUnit === 'box' ? 'e.g., 10, 20' : 'e.g., 100, 50'}
              className={errors.quantity ? "error" : ""}
            />
            {renderFieldError("quantity")}
          </div>

          <div className="quick-add-actions">
            <button type="button" className="btn-secondary" onClick={handleClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting ? "Adding..." : "Add Medicine"}
            </button>
          </div>
        </form>

        <div className="quick-add-note">
          <small>
            💡 Note: Default values will be used for other fields. You can edit them later for complete details.
          </small>
        </div>
      </div>
    </div>
  );
}
