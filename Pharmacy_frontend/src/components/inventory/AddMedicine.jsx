import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import "./inventory.css";
import { authFetch } from "../../api/http";
import { getAccessToken, getRefreshToken, storeTokens } from "../../api/auth";
import { getDefaultLocationId } from "../../config/location";
import { MEDICINE_CATEGORIES } from "../../constants/medicineCategories";

const rawBase = import.meta.env.VITE_API_URL || "";
const normalizeBase = (u) => u.trim().replace(/\/+$/g, "").replace(/\/api\/v1$/i, "");
const API_BASE = normalizeBase(rawBase);

const RACKS_API = `${API_BASE}/api/v1/inventory/rack-locations/`;
const ADD_MEDICINE_API = `${API_BASE}/api/v1/inventory/add-medicine/`;
const MEDICINE_DETAIL_API = (id) => `${API_BASE}/api/v1/inventory/medicines/${id}/`;
const RACKS_API_NO_SLASH = `${API_BASE}/api/v1/inventory/rack-locations`;

const DEFAULT_LOCATION_ID = getDefaultLocationId();

const dispatchInventoryRefresh = () => {
  try {
    window.dispatchEvent(new CustomEvent("inventory:refresh"));
  } catch {}
};

const extractRackList = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.results)) return payload.results;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.data?.results)) return payload.data.results;
  return [];
};

const createInitialMedicine = () => ({
  id: null,
  name: "",
  category: "",
  strength: "",
  description: "",
  hsn_code: "",
  rack_location: "",
  gst_percent: "",
  cost_price: "",
  mrp: "",
  // Packaging fields for different categories
  tablets_per_strip: "",
  strips_per_box: "",
  ml_per_bottle: "",
  bottles_per_box: "",
  ml_per_vial: "",
  vials_per_box: "",
  capsules_per_strip: "",
  grams_per_tube: "",
  tubes_per_box: "",
  doses_per_inhaler: "",
  inhalers_per_box: "",
  grams_per_sachet: "",
  sachets_per_box: "",
  grams_per_bar: "",
  bars_per_box: "",
  pieces_per_pack: "",
  packs_per_box: "",
  pairs_per_pack: "",
  grams_per_pack: "",
  units_per_pack: "",
  loose_units: "", // For loose tablets/capsules
});

const createInitialBatch = () => ({
  id: null,
  batch_number: "",
  quantity: "",
  stock_unit: "", // box or loose
  mfg_date: "",
  expiry_date: "",
});

const flattenErrors = (payload) => {
  if (!payload || typeof payload !== "object") return {};
  const flat = {};
  const visit = (node, prefix = "") => {
    if (!node) return;
    if (Array.isArray(node)) {
      const msg = node
        .map((entry) => (typeof entry === "string" ? entry : JSON.stringify(entry)))
        .join(", ");
      if (prefix) flat[prefix] = msg;
      return;
    }
    if (typeof node === "object") {
      Object.entries(node).forEach(([key, value]) => {
        if (key === "medicine" || key === "batch") {
          visit(value, "");
        } else {
          const nextKey = prefix ? `${prefix}.${key}` : key;
          visit(value, nextKey);
        }
      });
      return;
    }
    if (prefix) flat[prefix] = String(node);
  };
  visit(payload, "");
  return flat;
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

export default function AddMedicine({
  open = true,
  asDrawer = false,
  mode = "add",
  initialData = null,
  onClose,
  onSaved,
  locationIdOverride,
} = {}) {
  const nav = useNavigate();
  const [medicine, setMedicine] = useState(() => createInitialMedicine());
  const [batch, setBatch] = useState(() => createInitialBatch());
  const [rackLocations, setRackLocations] = useState([]);
  const [loadingMasters, setLoadingMasters] = useState(true);
  const [errors, setErrors] = useState({});
  const [fieldErrors, setFieldErrors] = useState({});
  const [serverError, setServerError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const resolvedLocationId = locationIdOverride ?? DEFAULT_LOCATION_ID;
  const isDrawer = Boolean(asDrawer);
  const isEdit = mode === "edit";

  const renderFieldError = (field) => {
    const message = fieldErrors[field] || errors[field];
    if (!message) return null;
    return <div className="err">{message}</div>;
  };

  const handleClose = useCallback(() => {
    if (onClose) {
      onClose();
    } else {
      nav(-1);
    }
  }, [nav, onClose]);

  const handleSuccess = useCallback(
    (body, message) => {
      if (onSaved) {
        onSaved(body);
      }
      dispatchInventoryRefresh();
      if (isDrawer) {
        handleClose();
      } else {
        nav("/inventory/medicines", {
          state: { flash: message },
          replace: true,
        });
      }
    },
    [handleClose, isDrawer, nav, onSaved]
  );

  const resetForm = useCallback(() => {
    setMedicine(createInitialMedicine());
    setBatch(createInitialBatch());
    setErrors({});
    setFieldErrors({});
    setServerError("");
  }, []);

  const applyInitialData = useCallback((detail) => {
    if (!detail) return;
    const med = detail.medicine || {};
    const batchInfo = detail.batch || {};

    // Extract category - handle both frontend ID string and object format
    let categoryValue = med.category || "";
    if (categoryValue && typeof categoryValue === 'object') {
      // If it's an object with id and name, map the name to frontend category ID
      const categoryName = categoryValue.name || "";
      const categoryMapping = {
        'Tablet': 'tablet',
        'Capsule': 'capsule',
        'Syrup/Suspension': 'syrup',
        'Injection/Vial': 'injection',
        'Ointment/Cream': 'ointment',
        'Drops (Eye/Ear/Nasal)': 'drops',
        'Inhaler': 'inhaler',
        'Powder/Sachet': 'powder',
        'Gel': 'gel',
        'Spray': 'spray',
        'Lotion/Solution': 'lotion',
        'Shampoo': 'shampoo',
        'Soap/Bar': 'soap',
        'Bandage/Dressing': 'bandage',
        'Mask (Surgical/N95)': 'mask',
        'Gloves': 'gloves',
        'Cotton/Gauze': 'cotton',
        'Hand Sanitizer': 'sanitizer',
        'Thermometer': 'thermometer',
        'Supplement/Vitamin': 'supplement',
        'Other/Miscellaneous': 'other',
      };
      categoryValue = categoryMapping[categoryName] || categoryValue;
    } else if (!categoryValue || categoryValue === "") {
      // If category is missing, try category_id (backward compatibility)
      if (med.category_id && typeof med.category_id === 'object' && med.category_id.name) {
        const categoryMapping = {
          'Tablet': 'tablet',
          'Capsule': 'capsule',
          'Syrup/Suspension': 'syrup',
          'Injection/Vial': 'injection',
          'Ointment/Cream': 'ointment',
          'Drops (Eye/Ear/Nasal)': 'drops',
          'Inhaler': 'inhaler',
          'Powder/Sachet': 'powder',
          'Gel': 'gel',
          'Spray': 'spray',
          'Lotion/Solution': 'lotion',
          'Shampoo': 'shampoo',
          'Soap/Bar': 'soap',
          'Bandage/Dressing': 'bandage',
          'Mask (Surgical/N95)': 'mask',
          'Gloves': 'gloves',
          'Cotton/Gauze': 'cotton',
          'Hand Sanitizer': 'sanitizer',
          'Thermometer': 'thermometer',
          'Supplement/Vitamin': 'supplement',
          'Other/Miscellaneous': 'other',
        };
        categoryValue = categoryMapping[med.category_id.name] || "";
      }
    }

    setMedicine({
      ...createInitialMedicine(),
      id: med.id ?? null,
      name: med.name || "",
      category: categoryValue,
      strength: med.strength || "",
      description: med.description || "",
      hsn_code: med.hsn || med.hsn_code || "",
      rack_location: med.rack_location?.id ? String(med.rack_location.id) : "",
      gst_percent: med.gst_percent || "",
      cost_price: batchInfo.purchase_price || med.cost_price || "", // Map purchase_price from batch to cost_price
      mrp: med.mrp ?? "",
      tablets_per_strip: med.tablets_per_strip ?? "",
      strips_per_box: med.strips_per_box ?? "",
      ml_per_bottle: med.ml_per_bottle ?? "",
      bottles_per_box: med.bottles_per_box ?? "",
      ml_per_vial: med.ml_per_vial ?? "",
      vials_per_box: med.vials_per_box ?? "",
      capsules_per_strip: med.capsules_per_strip ?? "",
      grams_per_tube: med.grams_per_tube ?? "",
      tubes_per_box: med.tubes_per_box ?? "",
      doses_per_inhaler: med.doses_per_inhaler ?? "",
      inhalers_per_box: med.inhalers_per_box ?? "",
      grams_per_sachet: med.grams_per_sachet ?? "",
      sachets_per_box: med.sachets_per_box ?? "",
      grams_per_bar: med.grams_per_bar ?? "",
      bars_per_box: med.bars_per_box ?? "",
      pieces_per_pack: med.pieces_per_pack ?? "",
      packs_per_box: med.packs_per_box ?? "",
      pairs_per_pack: med.pairs_per_pack ?? "",
      grams_per_pack: med.grams_per_pack ?? "",
      units_per_pack: med.units_per_pack ?? "",
      loose_units: med.loose_units ?? "",
    });

    setBatch({
      ...createInitialBatch(),
      id: batchInfo.id ?? null,
      batch_number: batchInfo.batch_number || "",
      quantity: batchInfo.quantity ? Number(batchInfo.quantity) : "",
      stock_unit: batchInfo.stock_unit || "", // Now included in backend response
      mfg_date: batchInfo.mfg_date || "",
      expiry_date: batchInfo.expiry_date || "",
    });
  }, []);

  useEffect(() => {
    if (!isDrawer) return;
    if (!open) {
      resetForm();
      return;
    }
    if (isEdit && initialData) {
      applyInitialData(initialData);
    } else if (!isEdit) {
      resetForm();
    }
  }, [applyInitialData, initialData, isDrawer, isEdit, open, resetForm]);

  useEffect(() => {
    if (!isDrawer && isEdit && initialData) {
      applyInitialData(initialData);
    }
  }, [applyInitialData, initialData, isDrawer, isEdit]);

  useEffect(() => {
    async function loadMasters() {
      setLoadingMasters(true);
      try {
        const tryLoad = async (url) => {
          const rackRes = await authFetch(url, { cache: "no-store" });
          if (!rackRes.ok) {
            throw new Error(`Rack locations request failed (${rackRes.status})`);
          }
          const rackJson = await rackRes.json().catch(() => null);
          return extractRackList(rackJson);
        };

        let racks = await tryLoad(RACKS_API);
        if (!racks.length) {
          racks = await tryLoad(RACKS_API_NO_SLASH);
        }
        setRackLocations(racks);
      } catch (err) {
        console.error("Failed to load master data", err);
        setServerError("Unable to load master data. Please refresh.");
      } finally {
        setLoadingMasters(false);
      }
    }
    loadMasters();
  }, []);

  const handleMedicineChange = (e) => {
    const { name, value } = e.target;

    // Auto-fill HSN code when category changes
    if (name === 'category' && value) {
      const selectedCategory = MEDICINE_CATEGORIES.find(c => c.id === value);
      setMedicine((prev) => ({
        ...prev,
        [name]: value,
        // Auto-fill HSN code from the selected category
        hsn_code: selectedCategory?.defaultHsnCode || prev.hsn_code
      }));
    } else {
      setMedicine((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleBatchChange = (e) => {
    const { name, value } = e.target;
    setBatch((prev) => ({ ...prev, [name]: value }));
  };

  const validate = () => {
    const localErrors = {};
    if (!medicine.name.trim()) localErrors.name = "Medicine name is required";
    if (!medicine.category) localErrors.category = "Category is required";

    // Validate HSN code if provided (must be 4, 6, or 8 digits)
    if (medicine.hsn_code) {
      const hsnTrimmed = medicine.hsn_code.trim();
      if (!/^\d{4}$|^\d{6}$|^\d{8}$/.test(hsnTrimmed)) {
        localErrors.hsn_code = "HSN code must be 4, 6, or 8 digits";
      }
    }

    if (!medicine.rack_location) localErrors.rack_location = "Rack location is required";
    if (!medicine.gst_percent) localErrors.gst_percent = "GST % is required";
    if (!medicine.cost_price) localErrors.cost_price = "Cost price is required";
    if (!medicine.mrp) localErrors.mrp = "MRP is required";

    // Validate stock unit type
    if (!batch.stock_unit) localErrors.stock_unit = "Stock unit type is required";

    // Validate packaging fields based on category
    const selectedCategory = MEDICINE_CATEGORIES.find(c => c.id === medicine.category);
    if (selectedCategory) {
      selectedCategory.packagingFields.forEach(field => {
        // Only validate "per box" fields if stock unit is "box"
        if (field.showOnlyForBox && batch.stock_unit !== 'box') {
          return;
        }
        if (!medicine[field.key]) {
          localErrors[field.key] = `${field.label} is required`;
        }
      });
    }

    if (!batch.batch_number.trim()) localErrors.batch_number = "Batch number is required";
    if (!batch.quantity) localErrors.quantity = "Quantity is required";
    if (!batch.expiry_date) localErrors.expiry_date = "Expiry date is required";
    return localErrors;
  };

  const buildPayload = () => {
    const location = Number(resolvedLocationId) || DEFAULT_LOCATION_ID;

    const medPayload = {
      ...(medicine.id ? { id: medicine.id } : {}),
      name: medicine.name.trim(),
      category: medicine.category,
      strength: medicine.strength.trim() || undefined,
      description: medicine.description.trim() || undefined,
      hsn_code: medicine.hsn_code.trim() || undefined,
      rack_location: Number(medicine.rack_location),
      gst_percent: medicine.gst_percent || "0",
      mrp: medicine.mrp,
      tablets_per_strip: medicine.tablets_per_strip ? Number(medicine.tablets_per_strip) : undefined,
      strips_per_box: medicine.strips_per_box ? Number(medicine.strips_per_box) : undefined,
      ml_per_bottle: medicine.ml_per_bottle ? Number(medicine.ml_per_bottle) : undefined,
      bottles_per_box: medicine.bottles_per_box ? Number(medicine.bottles_per_box) : undefined,
      ml_per_vial: medicine.ml_per_vial ? Number(medicine.ml_per_vial) : undefined,
      vials_per_box: medicine.vials_per_box ? Number(medicine.vials_per_box) : undefined,
      capsules_per_strip: medicine.capsules_per_strip ? Number(medicine.capsules_per_strip) : undefined,
      grams_per_tube: medicine.grams_per_tube ? Number(medicine.grams_per_tube) : undefined,
      tubes_per_box: medicine.tubes_per_box ? Number(medicine.tubes_per_box) : undefined,
      doses_per_inhaler: medicine.doses_per_inhaler ? Number(medicine.doses_per_inhaler) : undefined,
      inhalers_per_box: medicine.inhalers_per_box ? Number(medicine.inhalers_per_box) : undefined,
      grams_per_sachet: medicine.grams_per_sachet ? Number(medicine.grams_per_sachet) : undefined,
      sachets_per_box: medicine.sachets_per_box ? Number(medicine.sachets_per_box) : undefined,
      grams_per_bar: medicine.grams_per_bar ? Number(medicine.grams_per_bar) : undefined,
      bars_per_box: medicine.bars_per_box ? Number(medicine.bars_per_box) : undefined,
      pieces_per_pack: medicine.pieces_per_pack ? Number(medicine.pieces_per_pack) : undefined,
      packs_per_box: medicine.packs_per_box ? Number(medicine.packs_per_box) : undefined,
      pairs_per_pack: medicine.pairs_per_pack ? Number(medicine.pairs_per_pack) : undefined,
      grams_per_pack: medicine.grams_per_pack ? Number(medicine.grams_per_pack) : undefined,
      units_per_pack: medicine.units_per_pack ? Number(medicine.units_per_pack) : undefined,
      loose_units: medicine.loose_units ? Number(medicine.loose_units) : undefined,
    };

    const batchPayload = {
      ...(batch.id ? { id: batch.id } : {}),
      batch_number: batch.batch_number.trim(),
      mfg_date: batch.mfg_date || undefined,
      expiry_date: batch.expiry_date,
      quantity: Number(batch.quantity),
      stock_unit: batch.stock_unit,
      purchase_price: medicine.cost_price || "0",
    };

    return {
      location_id: location,
      medicine: medPayload,
      batch: batchPayload,
    };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError("");
    setFieldErrors({});
    const validationErrors = validate();
    if (Object.keys(validationErrors).length) {
      setErrors(validationErrors);
      return;
    }
    setErrors({});

    const payload = buildPayload();
    setSubmitting(true);
    try {
      const endpoint =
        isEdit && payload.batch.id
          ? MEDICINE_DETAIL_API(payload.batch.id)
          : ADD_MEDICINE_API;
      const response = await fetchWithAuthRetry(endpoint, {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) {
        setFieldErrors(flattenErrors(body));
        if (body?.detail) {
          setServerError(body.detail);
        } else {
          setServerError(`Save failed (${response.status})`);
        }
        return;
      }
      handleSuccess(
        body,
        `Medicine ${body?.medicine?.name || ""} ${isEdit ? "updated" : "added"} successfully.`
      );
    } catch (err) {
      console.error("Add medicine failed", err);
      setServerError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (isDrawer && !open) {
    return null;
  }

  const header = (
    <>
      {/* Header Section - Back button */}
      <div className="inv-form-header-section">
        <button className="back-btn" type="button" onClick={handleClose}>
          <ArrowLeft size={18} />
          {isDrawer ? "Close" : "Back"}
        </button>
      </div>

      {/* Header Card */}
      <div className="inv-form-header-card">
        <div>
          <h2>{isEdit ? "Edit Medicine" : "Add New Medicine"}</h2>
          <p>Enter medicine details and initial stock information</p>
        </div>
      </div>
    </>
  );

  const formContent = (
    <div className="inv-form-card">
      {serverError && <div className="inv-error-banner">{serverError}</div>}
      {loadingMasters && <div style={{ marginBottom: 12 }}>Loading master data...</div>}

      <form className="grid2" onSubmit={handleSubmit}>
        <div style={{ gridColumn: "1/3", marginBottom: 10 }}>
          <h3 className="section-title">Medicine Details</h3>
          <div className="section-line" />
        </div>

        <div className="field">
          <label>Medicine Name *</label>
          <input
            name="name"
            value={medicine.name}
            onChange={handleMedicineChange}
            placeholder="e.g., Paracetamol, Amoxicillin"
            className={errors.name ? "error" : ""}
          />
          {renderFieldError("name")}
        </div>

        <div className="field">
          <label>Category *</label>
          <select
            name="category"
            value={medicine.category}
            onChange={handleMedicineChange}
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
          <label>Strength</label>
          <input
            name="strength"
            value={medicine.strength}
            onChange={handleMedicineChange}
            placeholder="e.g., 500mg, 250mg/5ml"
          />
          {renderFieldError("strength")}
        </div>

        <div className="field">
          <label>Description</label>
          <input
            name="description"
            value={medicine.description}
            onChange={handleMedicineChange}
            placeholder="i.e., Company name or other details"
          />
          {renderFieldError("description")}
        </div>

        <div className="field">
          <label>HSN Code</label>
          <input
            name="hsn_code"
            value={medicine.hsn_code}
            onChange={handleMedicineChange}
            placeholder="e.g., 30049099"
            maxLength="8"
            className={errors.hsn_code ? "error" : ""}
          />
          {renderFieldError("hsn_code")}
        </div>

        <div className="field">
          <label>GST % *</label>
          <input
            name="gst_percent"
            type="number"
            min="0"
            max="100"
            step="0.01"
            value={medicine.gst_percent}
            onChange={handleMedicineChange}
            placeholder="e.g., 12, 18, 5"
            className={errors.gst_percent ? "error" : ""}
          />
          {renderFieldError("gst_percent")}
        </div>

        <div style={{ gridColumn: "1/3", marginTop: 20, marginBottom: 10 }}>
          <h3 className="section-title">Opening Stock</h3>
          <div className="section-line" />
        </div>

        <div className="field">
          <label>Stock Unit Type *</label>
          <select
            name="stock_unit"
            value={batch.stock_unit}
            onChange={handleBatchChange}
            className={errors.stock_unit ? "error" : ""}
          >
            <option value="">Select stock unit type</option>
            <option value="box">Box (Packed)</option>
            <option value="loose">Loose (Individual Units)</option>
          </select>
          {renderFieldError("stock_unit")}
          {batch.stock_unit && (
            <div className="hint" style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
              {batch.stock_unit === 'box'
                ? 'Box: Complete packages (e.g., 10 strips/box)'
                : 'Loose: Individual units (e.g., single tablets, bottles)'}
            </div>
          )}
        </div>

        {medicine.category && MEDICINE_CATEGORIES.find(c => c.id === medicine.category)?.packagingFields
          .filter(field => field.alwaysShow || (field.showOnlyForBox && batch.stock_unit === 'box'))
          .map(field => (
            <div className="field" key={field.key}>
              <label>{field.label} *</label>
              <input
                type="number"
                min="0"
                step="any"
                name={field.key}
                value={medicine[field.key] || ""}
                onChange={handleMedicineChange}
                placeholder={field.placeholder}
                className={errors[field.key] ? "error" : ""}
              />
              {renderFieldError(field.key)}
            </div>
          ))}

        <div className="field">
          <label>
            {batch.stock_unit === "box"
              ? `Total ${
                  medicine.category === "tablet"
                    ? "Boxes"
                    : medicine.category === "syrup"
                    ? "Boxes"
                    : medicine.category === "injection"
                    ? "Boxes"
                    : medicine.category === "capsule"
                    ? "Boxes"
                    : medicine.category === "ointment"
                    ? "Boxes"
                    : "Boxes"
                } *`
              : `Total ${
                  medicine.category === "tablet"
                    ? "Strips"
                    : medicine.category === "syrup"
                    ? "Bottles"
                    : medicine.category === "injection"
                    ? "Vials"
                    : medicine.category === "capsule"
                    ? "Strips"
                    : medicine.category === "ointment"
                    ? "Tubes"
                    : "Units"
                } *`}
          </label>
          <input
            name="quantity"
            type="number"
            min="0"
            value={batch.quantity}
            onChange={handleBatchChange}
            placeholder={
              batch.stock_unit === 'box'
                ? 'e.g., 10, 20'
                : medicine.category === 'tablet' ? 'e.g., 100 (strips)'
                : medicine.category === 'syrup' ? 'e.g., 50 (bottles)'
                : medicine.category === 'injection' ? 'e.g., 100 (vials)'
                : medicine.category === 'capsule' ? 'e.g., 100 (strips)'
                : medicine.category === 'ointment' ? 'e.g., 50 (tubes)'
                : 'e.g., 100, 50'
            }
            className={errors.quantity ? "error" : ""}
            readOnly={isEdit}
            disabled={isEdit}
          />
          {renderFieldError("quantity")}
        </div>

        {(medicine.category === 'tablet' || medicine.category === 'capsule') && (
          <div className="field">
            <label>
              Loose {medicine.category === 'tablet' ? 'Tablets' : 'Capsules'} (Optional)
            </label>
            <input
              name="loose_units"
              type="number"
              min="0"
              step="1"
              value={medicine.loose_units}
              onChange={handleMedicineChange}
              placeholder={
                medicine.category === 'tablet'
                  ? 'e.g., 5 (loose tablets not in strips)'
                  : 'e.g., 3 (loose capsules not in strips)'
              }
              className={errors.loose_units ? "error" : ""}
            />
            {renderFieldError("loose_units")}
            <div className="hint" style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
              Enter individual {medicine.category === 'tablet' ? 'tablets' : 'capsules'} available outside of complete strips
            </div>
          </div>
        )}

        <div style={{ gridColumn: "1/3", marginTop: 15, marginBottom: 10 }}>
          <h4 className="section-title" style={{ fontSize: '14px', fontWeight: '600' }}>
            Pricing & Location
          </h4>
          <div className="section-line" />
        </div>

        <div className="field">
          <label>Rack Location *</label>
          <select
            name="rack_location"
            value={medicine.rack_location}
            onChange={handleMedicineChange}
            className={errors.rack_location ? "error" : ""}
          >
            <option value="">Select rack location</option>
            {rackLocations.map((rack) => (
              <option key={rack.id} value={rack.id}>
                {rack.name}
              </option>
            ))}
          </select>
          {renderFieldError("rack_location")}
        </div>

        <div style={{ gridColumn: "1/1" }}></div>

        <div className="field">
          <label>Cost Price *</label>
          <input
            name="cost_price"
            type="number"
            min="0"
            step="0.01"
            value={medicine.cost_price}
            onChange={handleMedicineChange}
            placeholder="e.g., 95.00, 30.50"
            className={errors.cost_price ? "error" : ""}
          />
          {renderFieldError("cost_price")}
        </div>

        <div className="field">
          <label>MRP (Selling Price) *</label>
          <input
            name="mrp"
            type="number"
            min="0"
            step="0.01"
            value={medicine.mrp}
            onChange={handleMedicineChange}
            placeholder="e.g., 125.50, 45.00"
            className={errors.mrp ? "error" : ""}
          />
          {renderFieldError("mrp")}
        </div>

        <div style={{ gridColumn: "1/3", marginTop: 20, marginBottom: 10 }}>
          <h3 className="section-title">Batch Information</h3>
          <div className="section-line" />
        </div>

        <div className="field">
          <label>Batch Number *</label>
          <input
            name="batch_number"
            value={batch.batch_number}
            onChange={handleBatchChange}
            placeholder="e.g., BT2024001, LOT456"
            className={errors.batch_number ? "error" : ""}
          />
          {renderFieldError("batch_number")}
        </div>

        <div className="field">
          <label>Manufacture Date</label>
          <input
            name="mfg_date"
            type="date"
            value={batch.mfg_date}
            onChange={handleBatchChange}
          />
          {renderFieldError("mfg_date")}
        </div>

        <div className="field">
          <label>Expiry Date *</label>
          <input
            name="expiry_date"
            type="date"
            value={batch.expiry_date}
            onChange={handleBatchChange}
            className={errors.expiry_date ? "error" : ""}
          />
          {renderFieldError("expiry_date")}
        </div>

        <div style={{ gridColumn: "1 / 3", display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 20 }}>
          <button
            type="button"
            className="btn-secondary"
            onClick={(evt) => {
              evt.preventDefault();
              handleClose();
            }}
          >
            Cancel
          </button>
          <button type="submit" className="btn-primary" disabled={submitting}>
            {submitting ? "Saving..." : isEdit ? "Update Medicine" : "Add Medicine"}
          </button>
        </div>
      </form>
    </div>
  );

  if (isDrawer) {
    return (
      <div className="drawer-backdrop">
        <div className="drawer-panel">
          {header}
          {formContent}
        </div>
      </div>
    );
  }

  return (
    <div className="inv-form-wrap">
      {header}
      {formContent}
    </div>
  );
}
