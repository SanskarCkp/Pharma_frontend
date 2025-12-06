import React, { useState } from "react";
import "./inventory.css";
import { authFetch } from "../../api/http";
import { getAccessToken, getRefreshToken, storeTokens } from "../../api/auth";
import { getDefaultLocationId } from "../../config/location";

const rawBase = import.meta.env.VITE_API_URL || "";
const normalizeBase = (u) => u.trim().replace(/\/+$/g, "").replace(/\/api\/v1$/i, "");
const API_BASE = normalizeBase(rawBase);

const ADD_MEDICINE_API = `${API_BASE}/api/v1/inventory/add-medicine/`;

const DEFAULT_LOCATION_ID = getDefaultLocationId();

// Predefined categories matching AddMedicine.jsx
const MEDICINE_CATEGORIES = [
  { id: 'tablet', name: 'Tablet', looseLabel: 'Strips', boxLabel: 'Boxes', perBoxLabel: 'Strips per Box', perBoxDefault: 10 },
  { id: 'capsule', name: 'Capsule', looseLabel: 'Strips', boxLabel: 'Boxes', perBoxLabel: 'Strips per Box', perBoxDefault: 10 },
  { id: 'syrup', name: 'Syrup/Suspension', looseLabel: 'Bottles', boxLabel: 'Boxes', perBoxLabel: 'Bottles per Box', perBoxDefault: 10 },
  { id: 'injection', name: 'Injection/Vial', looseLabel: 'Vials', boxLabel: 'Boxes', perBoxLabel: 'Vials per Box', perBoxDefault: 10 },
  { id: 'ointment', name: 'Ointment/Cream', looseLabel: 'Tubes', boxLabel: 'Boxes', perBoxLabel: 'Tubes per Box', perBoxDefault: 10 },
  { id: 'drops', name: 'Drops (Eye/Ear/Nasal)', looseLabel: 'Bottles', boxLabel: 'Boxes', perBoxLabel: 'Bottles per Box', perBoxDefault: 10 },
  { id: 'inhaler', name: 'Inhaler', looseLabel: 'Inhalers', boxLabel: 'Boxes', perBoxLabel: 'Inhalers per Box', perBoxDefault: 1 },
  { id: 'powder', name: 'Powder/Sachet', looseLabel: 'Sachets', boxLabel: 'Boxes', perBoxLabel: 'Sachets per Box', perBoxDefault: 10 },
  { id: 'gel', name: 'Gel', looseLabel: 'Tubes', boxLabel: 'Boxes', perBoxLabel: 'Tubes per Box', perBoxDefault: 10 },
  { id: 'spray', name: 'Spray', looseLabel: 'Bottles', boxLabel: 'Boxes', perBoxLabel: 'Bottles per Box', perBoxDefault: 10 },
  { id: 'lotion', name: 'Lotion/Solution', looseLabel: 'Bottles', boxLabel: 'Boxes', perBoxLabel: 'Bottles per Box', perBoxDefault: 10 },
  { id: 'shampoo', name: 'Shampoo', looseLabel: 'Bottles', boxLabel: 'Boxes', perBoxLabel: 'Bottles per Box', perBoxDefault: 10 },
  { id: 'soap', name: 'Soap/Bar', looseLabel: 'Bars', boxLabel: 'Boxes', perBoxLabel: 'Bars per Box', perBoxDefault: 3 },
  { id: 'bandage', name: 'Bandage/Dressing', looseLabel: 'Packs', boxLabel: 'Boxes', perBoxLabel: 'Packs per Box', perBoxDefault: 10 },
  { id: 'mask', name: 'Mask (Surgical/N95)', looseLabel: 'Packs', boxLabel: 'Boxes', perBoxLabel: 'Packs per Box', perBoxDefault: 10 },
  { id: 'gloves', name: 'Gloves', looseLabel: 'Packs', boxLabel: 'Boxes', perBoxLabel: 'Packs per Box', perBoxDefault: 10 },
  { id: 'cotton', name: 'Cotton/Gauze', looseLabel: 'Packs', boxLabel: 'Boxes', perBoxLabel: 'Packs per Box', perBoxDefault: 10 },
  { id: 'sanitizer', name: 'Hand Sanitizer', looseLabel: 'Bottles', boxLabel: 'Boxes', perBoxLabel: 'Bottles per Box', perBoxDefault: 12 },
  { id: 'thermometer', name: 'Thermometer', looseLabel: 'Packs', boxLabel: 'Boxes', perBoxLabel: 'Packs per Box', perBoxDefault: 10 },
  { id: 'supplement', name: 'Supplement/Vitamin', looseLabel: 'Strips', boxLabel: 'Boxes', perBoxLabel: 'Strips per Box', perBoxDefault: 10 },
  { id: 'other', name: 'Other/Miscellaneous', looseLabel: 'Packs', boxLabel: 'Boxes', perBoxLabel: 'Packs per Box', perBoxDefault: 10 }
];

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
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!open) return null;

  const selectedCategory = MEDICINE_CATEGORIES.find(c => c.id === category);
  const quantityLabel = stockUnit === 'box'
    ? (selectedCategory?.boxLabel || 'Boxes')
    : (selectedCategory?.looseLabel || 'Units');

  const handleClose = () => {
    setName("");
    setStockUnit("");
    setQuantity("");
    setCategory("");
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

    // Build a minimal payload with defaults for required fields
    const payload = {
      location_id: Number(DEFAULT_LOCATION_ID),
      medicine: {
        name: name.trim(),
        category: category,
        strength: "",
        rack_location: 1, // Default rack - adjust as needed
        gst_percent: "0",
        cost_price: "0",
        mrp: "0",
        // Set packaging fields to defaults
        tablets_per_strip: category === 'tablet' ? 10 : undefined,
        strips_per_box: (category === 'tablet' || category === 'capsule') && stockUnit === 'box' ? 10 : undefined,
        ml_per_bottle: category === 'syrup' ? 100 : undefined,
        bottles_per_box: category === 'syrup' && stockUnit === 'box' ? 12 : undefined,
        ml_per_vial: category === 'injection' ? 5 : undefined,
        vials_per_box: category === 'injection' && stockUnit === 'box' ? 10 : undefined,
        capsules_per_strip: category === 'capsule' ? 10 : undefined,
        grams_per_tube: category === 'ointment' ? 30 : undefined,
        tubes_per_box: category === 'ointment' && stockUnit === 'box' ? 10 : undefined,
      },
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
              onChange={(e) => setCategory(e.target.value)}
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
          </div>

          <div className="field">
            <label>Stock Unit Type *</label>
            <select
              value={stockUnit}
              onChange={(e) => setStockUnit(e.target.value)}
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
              <label>{selectedCategory.perBoxLabel}</label>
              <input
                type="number"
                value={selectedCategory.perBoxDefault}
                readOnly
                disabled
                style={{
                  backgroundColor: '#f3f4f6',
                  cursor: 'not-allowed',
                  color: '#6b7280'
                }}
              />
              <div className="hint" style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
                Default packaging configuration (non-editable)
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
