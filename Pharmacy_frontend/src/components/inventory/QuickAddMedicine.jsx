import React, { useEffect, useMemo, useRef, useState } from "react";
import "./inventory.css";
import { authFetch } from "../../api/http";
import { getAccessToken, getRefreshToken, storeTokens } from "../../api/auth";
import { getDefaultLocationId } from "../../config/location";

const rawBase = import.meta.env.VITE_API_URL || "";
const normalizeBase = (u) => u.trim().replace(/\/+$/g, "").replace(/\/api\/v1$/i, "");
const API_BASE = normalizeBase(rawBase);

const ADD_MEDICINE_API = `${API_BASE}/api/v1/inventory/add-medicine/`;
const MEDICINE_SEARCH_API = `${API_BASE}/api/v1/catalog/products/?q=`;

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

const PACKAGING_FIELD_LABELS = {
  tablets_per_strip: "Tablets per Strip",
  capsules_per_strip: "Capsules per Strip",
  strips_per_box: "Strips per Box",
  ml_per_bottle: "ML per Bottle",
  bottles_per_box: "Bottles per Box",
  ml_per_vial: "ML per Vial",
  vials_per_box: "Vials per Box",
  grams_per_tube: "Grams per Tube",
  tubes_per_box: "Tubes per Box",
  doses_per_inhaler: "Doses per Inhaler",
  inhalers_per_box: "Inhalers per Box",
  grams_per_sachet: "Grams per Sachet",
  sachets_per_box: "Sachets per Box",
  grams_per_bar: "Grams per Bar",
  bars_per_box: "Bars per Box",
  pieces_per_pack: "Pieces per Pack",
  packs_per_box: "Packs per Box",
  pairs_per_pack: "Pairs per Pack",
  grams_per_pack: "Grams per Pack",
  units_per_pack: "Units per Pack",
  loose_units: "Loose Units",
};

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
  const [optionsVisible, setOptionsVisible] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [selectedMedicine, setSelectedMedicine] = useState(null);
  const [lookingUpName, setLookingUpName] = useState(false);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const inputWrapperRef = useRef(null);

  const selectedCategory = MEDICINE_CATEGORIES.find((c) => c.id === category);
  const quantityLabel =
    stockUnit === "box" ? selectedCategory?.boxLabel || "Boxes" : selectedCategory?.looseLabel || "Units";
  const defaultPerBox = selectedCategory?.perBoxDefault;
  const perBoxField = selectedCategory?.perBoxField;
  const itemsPerBoxLabel = selectedCategory?.perBoxLabel || "Items per Box";

  const detectedPerBox = useMemo(() => {
    if (stockUnit !== "box") return "";
    if (selectedMedicine) {
      const val = deriveBoxCount(selectedMedicine, category);
      if (val) return String(val);
    }
    if (boxCount) return boxCount;
    if (defaultPerBox) return String(defaultPerBox);
    return "";
  }, [selectedMedicine, category, stockUnit, boxCount, defaultPerBox]);

  const packagingDetails = useMemo(() => {
    if (!selectedMedicine) return [];
    const med = selectedMedicine;
    const entries = [];
    Object.entries(PACKAGING_FIELD_LABELS).forEach(([field, label]) => {
      const value = med[field];
      if (value !== null && value !== undefined && value !== "") {
        entries.push({ label, value });
      }
    });
    return entries;
  }, [selectedMedicine]);

  useEffect(() => {
    if (!open) return;
    if (selectedMedicine) return;
    if (stockUnit !== "box") {
      setBoxCount("");
      return;
    }
    if (!boxCount && defaultPerBox) {
      setBoxCount(String(defaultPerBox));
    }
  }, [open, stockUnit, selectedMedicine, defaultPerBox, boxCount]);

  useEffect(() => {
    if (!open) return;
    const query = name.trim();
    if (query.length < 2) {
      setSuggestions([]);
      setLookingUpName(false);
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
        // Format suggestions to match expected structure
        const formatted = list.slice(0, 8).map(item => ({
          medicine: {
            id: item.id,
            name: item.name,
            category: item.category ? (typeof item.category === 'object' ? item.category : { id: item.category, name: item.category_name || '' }) : null,
            strength: item.dosage_strength || item.strength || '',
            rack_location: item.rack_location ? (typeof item.rack_location === 'object' ? item.rack_location : { id: item.rack_location }) : null,
            gst_percent: item.gst_percent || '0',
            mrp: item.mrp || '0',
            form: item.medicine_form ? (typeof item.medicine_form === 'object' ? item.medicine_form : { id: item.medicine_form }) : null,
            base_uom: item.base_uom ? (typeof item.base_uom === 'object' ? item.base_uom : { id: item.base_uom }) : null,
            selling_uom: item.selling_uom ? (typeof item.selling_uom === 'object' ? item.selling_uom : { id: item.selling_uom }) : null,
            // All packaging fields
            tablets_per_strip: item.tablets_per_strip,
            capsules_per_strip: item.capsules_per_strip,
            strips_per_box: item.strips_per_box,
            ml_per_bottle: item.ml_per_bottle,
            bottles_per_box: item.bottles_per_box,
            ml_per_vial: item.ml_per_vial,
            vials_per_box: item.vials_per_box,
            grams_per_tube: item.grams_per_tube,
            tubes_per_box: item.tubes_per_box,
            doses_per_inhaler: item.doses_per_inhaler,
            inhalers_per_box: item.inhalers_per_box,
            grams_per_sachet: item.grams_per_sachet,
            sachets_per_box: item.sachets_per_box,
            grams_per_bar: item.grams_per_bar,
            bars_per_box: item.bars_per_box,
            pieces_per_pack: item.pieces_per_pack,
            packs_per_box: item.packs_per_box,
            pairs_per_pack: item.pairs_per_pack,
            grams_per_pack: item.grams_per_pack,
            units_per_pack: item.units_per_pack,
          }
        }));
        setSuggestions(formatted);
        setOptionsVisible(true);
      } catch (err) {
        if (err.name === "AbortError") return;
        console.warn("Medicine lookup failed", err);
      } finally {
        setLookingUpName(false);
      }
    }, 350);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [name, open]);

  useEffect(() => {
    if (!open) return;
    const handler = (event) => {
      if (!inputWrapperRef.current) return;
      if (!inputWrapperRef.current.contains(event.target)) {
        setOptionsVisible(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const handleCategoryChange = (e) => {
    if (selectedMedicine) return;
    setCategory(e.target.value);
    setCategoryTouched(true);
  };

  const handleStockUnitChange = (e) => {
    setStockUnit(e.target.value);
    if (selectedMedicine) {
      setBoxCount("");
    }
  };

  const handleSuggestionSelect = (item) => {
    const med = item?.medicine || item;
    if (!med) return;
    const medName = med.name || med.medicine_name || "";
    setName(medName);
    // Extract category - handle both object and ID formats
    let categoryValue = med.category;
    if (categoryValue && typeof categoryValue === 'object') {
      categoryValue = categoryValue.id || categoryValue.name;
    }
    const detectedCategory = normalizeCategoryId(categoryValue || item.category);
    setCategory(detectedCategory);
    setSelectedMedicine(med);
    setCategoryTouched(false);
    setOptionsVisible(false);
  };

  const handleClose = () => {
    setName("");
    setStockUnit("");
    setQuantity("");
    setCategory("");
    setBoxCount("");
    setCategoryTouched(false);
    setSuggestions([]);
    setSelectedMedicine(null);
    setOptionsVisible(false);
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

    const parsedBoxCount = Number(detectedPerBox || defaultPerBox || 0);
    const hasBoxCount = stockUnit === "box" && Number.isFinite(parsedBoxCount) && parsedBoxCount > 0;

    let medicinePayload;
    
    if (selectedMedicine) {
      // When medicine is selected, use existing medicine data
      const med = selectedMedicine;
      // Extract category ID properly
      let categoryId = med.category;
      if (categoryId && typeof categoryId === 'object') {
        categoryId = categoryId.id || categoryId.name;
      }
      medicinePayload = {
        id: med.id,
        name: med.name || name.trim(),
        category: categoryId || category,
        form: med.form?.id || med.form,
        strength: med.strength || med.dosage_strength || "",
        base_uom: med.base_uom?.id || med.base_uom,
        selling_uom: med.selling_uom?.id || med.selling_uom,
        rack_location: med.rack_location?.id || med.rack_location || 1,
        gst_percent: med.gst_percent || "0",
        mrp: med.mrp || "0",
        // Include all packaging fields from selected medicine
        tablets_per_strip: med.tablets_per_strip,
        capsules_per_strip: med.capsules_per_strip,
        strips_per_box: med.strips_per_box,
        ml_per_bottle: med.ml_per_bottle,
        bottles_per_box: med.bottles_per_box,
        ml_per_vial: med.ml_per_vial,
        vials_per_box: med.vials_per_box,
        grams_per_tube: med.grams_per_tube,
        tubes_per_box: med.tubes_per_box,
        doses_per_inhaler: med.doses_per_inhaler,
        inhalers_per_box: med.inhalers_per_box,
        grams_per_sachet: med.grams_per_sachet,
        sachets_per_box: med.sachets_per_box,
        grams_per_bar: med.grams_per_bar,
        bars_per_box: med.bars_per_box,
        pieces_per_pack: med.pieces_per_pack,
        packs_per_box: med.packs_per_box,
        pairs_per_pack: med.pairs_per_pack,
        grams_per_pack: med.grams_per_pack,
        units_per_pack: med.units_per_pack,
      };
    } else {
      // When medicine is new, create with defaults
      medicinePayload = {
        name: name.trim(),
        category: category,
        strength: "",
        rack_location: 1, // Default rack - adjust as needed
        gst_percent: "0",
        mrp: "0",
        form: 1, // Default form - adjust as needed
        base_uom: 5, // Default TAB UOM - adjust as needed
        selling_uom: 7, // Default STRIP UOM - adjust as needed
      };

      // Set packaging fields based on category
      if (category === "tablet") {
        medicinePayload.tablets_per_strip = 10;
        medicinePayload.strips_per_box = 10;
      } else if (category === "capsule") {
        medicinePayload.capsules_per_strip = 10;
        medicinePayload.strips_per_box = 10;
      } else if (category === "syrup" || category === "drops") {
        medicinePayload.ml_per_bottle = 100;
        medicinePayload.bottles_per_box = 12;
      } else if (category === "injection") {
        medicinePayload.ml_per_vial = 5;
        medicinePayload.vials_per_box = 10;
      } else if (category === "ointment" || category === "gel") {
        medicinePayload.grams_per_tube = 30;
        medicinePayload.tubes_per_box = 10;
      } else if (category === "inhaler") {
        medicinePayload.doses_per_inhaler = 100;
        medicinePayload.inhalers_per_box = 1;
      } else if (category === "powder") {
        medicinePayload.grams_per_sachet = 10;
        medicinePayload.sachets_per_box = 10;
      } else if (category === "soap") {
        medicinePayload.grams_per_bar = 100;
        medicinePayload.bars_per_box = 3;
      } else {
        medicinePayload.pieces_per_pack = 1;
        medicinePayload.packs_per_box = 10;
      }

      if (hasBoxCount && perBoxField) {
        medicinePayload[perBoxField] = parsedBoxCount;
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
        expiry_date: new Date(new Date().setFullYear(new Date().getFullYear() + 2)).toISOString().split('T')[0],
        quantity_uom: 8, // Default UOM ID - adjust as needed
        purchase_price: "0",
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
        } else if (body && typeof body === "object") {
          const errorMessages = Object.entries(body)
            .flatMap(([key, value]) => {
              if (Array.isArray(value)) return value;
              if (typeof value === "string") return [value];
              if (typeof value === "object") return Object.values(value).flat();
              return [];
            })
            .join("; ");
          setServerError(errorMessages || `Save failed (${response.status})`);
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
          <div className="field" ref={inputWrapperRef} style={{ position: "relative" }}>
            <label>Medicine Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (selectedMedicine) {
                  setSelectedMedicine(null);
                  setCategory("");
                }
              }}
              placeholder="Type to search existing medicines"
              className={errors.name ? "error" : ""}
              autoFocus
              onFocus={() => {
                if (suggestions.length) setOptionsVisible(true);
              }}
            />
            {renderFieldError("name")}
            {optionsVisible && (lookingUpName || suggestions.length > 0) && (
              <div className="quick-add-suggestions">
                {lookingUpName && <div className="quick-add-suggestion muted">Searching…</div>}
                {!lookingUpName && suggestions.length === 0 && (
                  <div className="quick-add-suggestion muted">No matches</div>
                )}
                {!lookingUpName &&
                  suggestions.map((item) => {
                    const med = item?.medicine || item;
                    const medName = med?.name || med?.medicine_name || "Unnamed";
                    let medCategory = "";
                    if (med?.category) {
                      if (typeof med.category === 'object') {
                        medCategory = med.category.name || "";
                      } else {
                        medCategory = String(med.category);
                      }
                    }
                    if (!medCategory) {
                      medCategory = item?.category || "";
                    }
                    return (
                      <button
                        type="button"
                        key={`${med?.id || medName}-${medCategory}`}
                        className="quick-add-suggestion"
                        onClick={() => handleSuggestionSelect(item)}
                      >
                        <span className="name">{medName}</span>
                        {medCategory && <span className="meta">{medCategory}</span>}
                      </button>
                    );
                  })}
              </div>
            )}
          </div>

          <div className="field">
            <label>Category *</label>
            <select
              value={category}
              onChange={handleCategoryChange}
              disabled={selectedMedicine}
              className={errors.category ? "error" : ""}
              style={selectedMedicine ? { backgroundColor: '#f3f4f6', cursor: 'not-allowed' } : {}}
            >
              <option value="">Select category</option>
              {MEDICINE_CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            {renderFieldError("category")}
            {selectedMedicine && category && (
              <div className="hint" style={{ fontSize: '12px', color: '#059669', marginTop: '4px' }}>
                ✓ Auto-detected from selected medicine
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

          {category && stockUnit && (() => {
            // Use the same structure as AddMedicine - find category with packagingFields
            const categoryConfig = [
              { id: 'tablet', packagingFields: [
                { key: 'tablets_per_strip', label: 'Tablets per Strip', alwaysShow: true },
                { key: 'strips_per_box', label: 'Strips per Box', showOnlyForBox: true }
              ]},
              { id: 'capsule', packagingFields: [
                { key: 'capsules_per_strip', label: 'Capsules per Strip', alwaysShow: true },
                { key: 'strips_per_box', label: 'Strips per Box', showOnlyForBox: true }
              ]},
              { id: 'syrup', packagingFields: [
                { key: 'ml_per_bottle', label: 'ML per Bottle', alwaysShow: true },
                { key: 'bottles_per_box', label: 'Bottles per Box', showOnlyForBox: true }
              ]},
              { id: 'injection', packagingFields: [
                { key: 'ml_per_vial', label: 'ML per Vial', alwaysShow: true },
                { key: 'vials_per_box', label: 'Vials per Box', showOnlyForBox: true }
              ]},
              { id: 'ointment', packagingFields: [
                { key: 'grams_per_tube', label: 'Grams per Tube', alwaysShow: true },
                { key: 'tubes_per_box', label: 'Tubes per Box', showOnlyForBox: true }
              ]},
              { id: 'drops', packagingFields: [
                { key: 'ml_per_bottle', label: 'ML per Bottle', alwaysShow: true },
                { key: 'bottles_per_box', label: 'Bottles per Box', showOnlyForBox: true }
              ]},
              { id: 'inhaler', packagingFields: [
                { key: 'doses_per_inhaler', label: 'Doses per Inhaler', alwaysShow: true },
                { key: 'inhalers_per_box', label: 'Inhalers per Box', showOnlyForBox: true }
              ]},
              { id: 'powder', packagingFields: [
                { key: 'grams_per_sachet', label: 'Grams per Sachet', alwaysShow: true },
                { key: 'sachets_per_box', label: 'Sachets per Box', showOnlyForBox: true }
              ]},
              { id: 'gel', packagingFields: [
                { key: 'grams_per_tube', label: 'Grams per Tube', alwaysShow: true },
                { key: 'tubes_per_box', label: 'Tubes per Box', showOnlyForBox: true }
              ]},
              { id: 'spray', packagingFields: [
                { key: 'ml_per_bottle', label: 'ML per Bottle', alwaysShow: true },
                { key: 'bottles_per_box', label: 'Bottles per Box', showOnlyForBox: true }
              ]},
              { id: 'lotion', packagingFields: [
                { key: 'ml_per_bottle', label: 'ML per Bottle', alwaysShow: true },
                { key: 'bottles_per_box', label: 'Bottles per Box', showOnlyForBox: true }
              ]},
              { id: 'shampoo', packagingFields: [
                { key: 'ml_per_bottle', label: 'ML per Bottle', alwaysShow: true },
                { key: 'bottles_per_box', label: 'Bottles per Box', showOnlyForBox: true }
              ]},
              { id: 'soap', packagingFields: [
                { key: 'grams_per_bar', label: 'Grams per Bar', alwaysShow: true },
                { key: 'bars_per_box', label: 'Bars per Box', showOnlyForBox: true }
              ]},
              { id: 'bandage', packagingFields: [
                { key: 'pieces_per_pack', label: 'Pieces per Pack', alwaysShow: true },
                { key: 'packs_per_box', label: 'Packs per Box', showOnlyForBox: true }
              ]},
              { id: 'mask', packagingFields: [
                { key: 'pieces_per_pack', label: 'Pieces per Pack', alwaysShow: true },
                { key: 'packs_per_box', label: 'Packs per Box', showOnlyForBox: true }
              ]},
              { id: 'gloves', packagingFields: [
                { key: 'pairs_per_pack', label: 'Pairs per Pack', alwaysShow: true },
                { key: 'packs_per_box', label: 'Packs per Box', showOnlyForBox: true }
              ]},
              { id: 'cotton', packagingFields: [
                { key: 'grams_per_pack', label: 'Grams per Pack', alwaysShow: true },
                { key: 'packs_per_box', label: 'Packs per Box', showOnlyForBox: true }
              ]},
              { id: 'sanitizer', packagingFields: [
                { key: 'ml_per_bottle', label: 'ML per Bottle', alwaysShow: true },
                { key: 'bottles_per_box', label: 'Bottles per Box', showOnlyForBox: true }
              ]},
              { id: 'thermometer', packagingFields: [
                { key: 'pieces_per_pack', label: 'Pieces per Pack', alwaysShow: true },
                { key: 'packs_per_box', label: 'Packs per Box', showOnlyForBox: true }
              ]},
              { id: 'supplement', packagingFields: [
                { key: 'tablets_per_strip', label: 'Tablets per Strip', alwaysShow: true },
                { key: 'strips_per_box', label: 'Strips per Box', showOnlyForBox: true }
              ]},
              { id: 'other', packagingFields: [
                { key: 'units_per_pack', label: 'Units per Pack', alwaysShow: true },
                { key: 'packs_per_box', label: 'Packs per Box', showOnlyForBox: true }
              ]},
            ].find(c => c.id === category);
            
            if (!categoryConfig) return null;
            
            const relevantFields = categoryConfig.packagingFields.filter(f => 
              f.alwaysShow || (f.showOnlyForBox && stockUnit === 'box')
            );
            
            if (relevantFields.length === 0) return null;
            
            return relevantFields.map(field => {
              const value = selectedMedicine ? selectedMedicine[field.key] : null;
              const displayValue = value !== null && value !== undefined && value !== '' 
                ? String(value) 
                : '';
              
              return (
                <div className="field" key={field.key}>
                  <label>{field.label} {selectedMedicine ? '' : '*'}</label>
                  <input
                    type="number"
                    value={displayValue}
                    readOnly={selectedMedicine}
                    disabled={selectedMedicine}
                    style={selectedMedicine ? {
                      backgroundColor: '#f3f4f6',
                      cursor: 'not-allowed',
                      color: '#374151',
                      fontWeight: '500'
                    } : {}}
                    placeholder={field.placeholder || ''}
                  />
                  {selectedMedicine && value && (
                    <div className="hint" style={{ fontSize: '12px', color: '#059669', marginTop: '4px' }}>
                      ✓ Auto-detected from selected medicine
                    </div>
                  )}
                </div>
              );
            });
          })()}

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
