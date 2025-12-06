import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./inventory.css";
import { authFetch } from "../../api/http";
import { getAccessToken, getRefreshToken, storeTokens } from "../../api/auth";
import { getDefaultLocationId } from "../../config/location";

const rawBase = import.meta.env.VITE_API_URL || "";
const normalizeBase = (u) => u.trim().replace(/\/+$/g, "").replace(/\/api\/v1$/i, "");
const API_BASE = normalizeBase(rawBase);

const CATEGORY_API = `${API_BASE}/api/v1/catalog/categories/`;
const FORMS_API = `${API_BASE}/api/v1/catalog/forms/`;
const UOMS_API = `${API_BASE}/api/v1/catalog/uoms/`;
const RACKS_API = `${API_BASE}/api/v1/inventory/rack-locations/`;
const ADD_MEDICINE_API = `${API_BASE}/api/v1/inventory/add-medicine/`;
const MEDICINE_DETAIL_API = (id) => `${API_BASE}/api/v1/inventory/medicines/${id}/`;
const MOVEMENT_API = `${API_BASE}/api/v1/inventory/movements/`;

const DEFAULT_LOCATION_ID = getDefaultLocationId();
const dispatchInventoryRefresh = () => {
  try {
    window.dispatchEvent(new CustomEvent("inventory:refresh"));
  } catch {}
};

const createInitialMedicine = () => ({
  id: null,
  name: "",
  generic_name: "",
  category: "",
  form: "",
  strength: "",
  base_uom: "",
  selling_uom: "",
  rack_location: "",
  description: "",
  gst_percent: "",
  tablets_per_strip: "",
  strips_per_box: "",
  ml_per_bottle: "",
  bottles_per_box: "",
  vials_per_box: "",
  ml_per_vial: "",
  grams_per_tube: "",
  tubes_per_box: "",
  units_per_pack: "",
  mrp: "",
});

const createInitialBatch = () => ({
  id: null,
  batch_number: "",
  quantity: "",
  quantity_uom: "",
  purchase_price: "",
  mfg_date: "",
  expiry_date: "",
});

const numberOrUndefined = (value) => {
  if (value === "" || value === null || value === undefined) return undefined;
  const num = Number(value);
  return Number.isFinite(num) ? num : undefined;
};

const decimalStringOrUndefined = (value) => {
  if (value === "" || value === null || value === undefined) return undefined;
  if (typeof value === "number") return value.toString();
  return value;
};

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

const PACKAGING_FORMS = {
  tablets: { form: /TABLET|CAPSULE/i, base: /TAB/i },
  syrup: { form: /SYRUP|SUSPENSION/i, base: /ML/i },
  injection: { form: /INJECTION|VIAL/i, base: /VIAL/i },
  ointment: { form: /OINTMENT|CREAM|GEL/i, base: /GM|GRAM/i },
};

const detectPackagingType = (formName = "", baseUom = "") => {
  const f = (formName || "").toUpperCase();
  const b = (baseUom || "").toUpperCase();
  for (const [key, cfg] of Object.entries(PACKAGING_FORMS)) {
    if ((cfg.form && cfg.form.test(f)) || (cfg.base && cfg.base.test(b))) {
      return key;
    }
  }
  return null;
};

const numberVal = (value) => {
  const num = Number(value);
  return Number.isFinite(num) && num > 0 ? num : null;
};

const computeUnitsPerPack = (packagingType, medicine) => {
  switch (packagingType) {
    case "tablets": {
      const tablets = numberVal(medicine.tablets_per_strip);
      if (!tablets) return null;
      const strips = numberVal(medicine.strips_per_box) || 1;
      return tablets * strips;
    }
    case "syrup": {
      const mlPerBottle = numberVal(medicine.ml_per_bottle);
      if (!mlPerBottle) return null;
      const bottles = numberVal(medicine.bottles_per_box) || 1;
      return mlPerBottle * bottles;
    }
    case "injection": {
      const vials = numberVal(medicine.vials_per_box);
      return vials || null;
    }
    case "ointment": {
      const grams = numberVal(medicine.grams_per_tube);
      if (!grams) return null;
      const tubes = numberVal(medicine.tubes_per_box) || 1;
      return grams * tubes;
    }
    default:
      return null;
  }
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
  const [categories, setCategories] = useState([]);
  const [forms, setForms] = useState([]);
  const [uoms, setUoms] = useState([]);
  const [rackLocations, setRackLocations] = useState([]);
  const [loadingMasters, setLoadingMasters] = useState(true);
  const [errors, setErrors] = useState({});
  const [fieldErrors, setFieldErrors] = useState({});
  const [serverError, setServerError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [currentStock, setCurrentStock] = useState("");
  const [adjustQty, setAdjustQty] = useState("");
  const [adjustError, setAdjustError] = useState("");
  const [adjustSuccess, setAdjustSuccess] = useState("");
  const [adjustLoading, setAdjustLoading] = useState(false);
  const resolvedLocationId = useMemo(
    () => Number(locationIdOverride ?? DEFAULT_LOCATION_ID),
    [locationIdOverride]
  );
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
    setAdjustQty("");
    setAdjustError("");
    setAdjustSuccess("");
    setCurrentStock("");
  }, []);

  const applyInitialData = useCallback((detail) => {
    if (!detail) return;
    const med = detail.medicine || {};
    const batchInfo = detail.batch || {};
    setCurrentStock(
      detail.inventory?.stock_on_hand_base ??
        batchInfo.current_stock_base ??
        ""
    );
    setMedicine({
      ...createInitialMedicine(),
      id: med.id ?? null,
      name: med.name || "",
      generic_name: med.generic_name || "",
      category: med.category?.id ? String(med.category.id) : "",
      form: med.form?.id ? String(med.form.id) : "",
      strength: med.strength || "",
      base_uom: med.base_uom?.id ? String(med.base_uom.id) : "",
      selling_uom: med.selling_uom?.id ? String(med.selling_uom.id) : "",
      rack_location: med.rack_location?.id ? String(med.rack_location.id) : "",
      description: med.description || "",
      gst_percent: med.gst_percent || "",
      tablets_per_strip: med.tablets_per_strip ?? "",
      strips_per_box: med.strips_per_box ?? "",
      units_per_pack: med.units_per_pack ?? "",
      mrp: med.mrp ?? "",
    });
    setBatch({
      ...createInitialBatch(),
      id: batchInfo.id ?? null,
      batch_number: batchInfo.batch_number || "",
      quantity: batchInfo.quantity ? Number(batchInfo.quantity) : "",
      quantity_uom: batchInfo.quantity_uom?.id ? String(batchInfo.quantity_uom.id) : "",
      purchase_price: batchInfo.purchase_price ?? "",
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
    if (initialData?.inventory?.stock_on_hand_base != null) {
      setCurrentStock(initialData.inventory.stock_on_hand_base);
    }
  }, [initialData]);

  const refreshCurrentStock = useCallback(async () => {
    if (!batch.id) return;
    try {
      const params = new URLSearchParams();
      const loc = resolvedLocationId || DEFAULT_LOCATION_ID;
      if (loc) params.set("location_id", String(loc));
      const url = params.toString()
        ? `${MEDICINE_DETAIL_API(batch.id)}?${params.toString()}`
        : MEDICINE_DETAIL_API(batch.id);
      const res = await fetchWithAuthRetry(url);
      if (!res.ok) return;
      const data = await res.json().catch(() => null);
      if (data?.inventory?.stock_on_hand_base != null) {
        setCurrentStock(data.inventory.stock_on_hand_base);
      }
    } catch {
      // ignore
    }
  }, [batch.id, resolvedLocationId]);

  useEffect(() => {
    async function loadMasters() {
      setLoadingMasters(true);
      try {
        const [catRes, formRes, uomRes, rackRes] = await Promise.all([
          authFetch(CATEGORY_API),
          authFetch(FORMS_API),
          authFetch(UOMS_API),
          authFetch(RACKS_API),
        ]);
        const [catJson, formJson, uomJson, rackJson] = await Promise.all([
          catRes.json().catch(() => null),
          formRes.json().catch(() => null),
          uomRes.json().catch(() => null),
          rackRes.json().catch(() => null),
        ]);
        setCategories(catJson?.results || []);
        setForms(formJson?.results || []);
        setUoms(uomJson?.results || []);
        setRackLocations(rackJson?.results || []);
      } catch (err) {
        console.error("Failed to load master data", err);
        setServerError("Unable to load master data. Please refresh.");
      } finally {
        setLoadingMasters(false);
      }
    }
    loadMasters();
  }, []);

  const selectedFormName = useMemo(() => {
    const form = forms.find((f) => String(f.id) === String(medicine.form));
    return form?.name || "";
  }, [forms, medicine.form]);

  const selectedBaseUomLabel = useMemo(() => {
    const entry = uoms.find(
      (u) => String(u.id) === String(medicine.base_uom) || String(u.code) === String(medicine.base_uom)
    );
    return entry?.code || entry?.name || "";
  }, [uoms, medicine.base_uom]);

  const packagingType = useMemo(
    () => detectPackagingType(selectedFormName, selectedBaseUomLabel),
    [selectedFormName, selectedBaseUomLabel]
  );

  const autoUnitsPerPack = useMemo(
    () =>
      computeUnitsPerPack(packagingType, medicine),
    [
      packagingType,
      medicine.tablets_per_strip,
      medicine.strips_per_box,
      medicine.ml_per_bottle,
      medicine.bottles_per_box,
      medicine.vials_per_box,
      medicine.grams_per_tube,
      medicine.tubes_per_box,
    ]
  );

  const totalBaseUnits = useMemo(() => {
    const qty = Number(batch.quantity);
    const units = autoUnitsPerPack ?? numberVal(medicine.units_per_pack);
    if (!qty || !units) return null;
    return qty * units;
  }, [batch.quantity, autoUnitsPerPack, medicine.units_per_pack]);

  const handleMedicineChange = (e) => {
    const { name, value } = e.target;
    setMedicine((prev) => ({ ...prev, [name]: value }));
  };

  const handleBatchChange = (e) => {
    const { name, value } = e.target;
    setBatch((prev) => ({ ...prev, [name]: value }));
  };

  const lastSellingRef = useRef(null);
  useEffect(() => {
    if (!medicine.selling_uom) return;
    if (lastSellingRef.current === medicine.selling_uom) return;
    lastSellingRef.current = medicine.selling_uom;
    setBatch((prev) => ({
      ...prev,
      quantity_uom:
        prev.quantity_uom && prev.quantity_uom !== "" ? prev.quantity_uom : medicine.selling_uom,
    }));
  }, [medicine.selling_uom]);

  const validate = () => {
    const localErrors = {};
    if (!medicine.name.trim()) localErrors.name = "Required";
    if (!medicine.category) localErrors.category = "Required";
    if (!medicine.form) localErrors.form = "Required";
    if (!medicine.base_uom) localErrors.base_uom = "Required";
    if (!medicine.selling_uom) localErrors.selling_uom = "Required";
    if (!medicine.rack_location) localErrors.rack_location = "Required";
    if (!medicine.mrp) localErrors.mrp = "Required";
    if (!batch.batch_number.trim()) localErrors.batch_number = "Required";
    if (!batch.quantity) localErrors.quantity = "Required";
    if (!batch.quantity_uom) localErrors.quantity_uom = "Required";
    if (!batch.purchase_price) localErrors.purchase_price = "Required";
    if (!batch.expiry_date) localErrors.expiry_date = "Required";
    if (packagingType === "tablets") {
      if (!medicine.tablets_per_strip) localErrors.tablets_per_strip = "Required";
      if (!medicine.strips_per_box) localErrors.strips_per_box = "Required";
    } else if (packagingType === "syrup") {
      if (!medicine.ml_per_bottle) localErrors.ml_per_bottle = "Required";
      if (!medicine.bottles_per_box) localErrors.bottles_per_box = "Required";
    } else if (packagingType === "injection") {
      if (!medicine.vials_per_box) localErrors.vials_per_box = "Required";
    } else if (packagingType === "ointment") {
      if (!medicine.grams_per_tube) localErrors.grams_per_tube = "Required";
      if (!medicine.tubes_per_box) localErrors.tubes_per_box = "Required";
    } else if (!medicine.units_per_pack) {
      localErrors.units_per_pack = "Units per pack is required for this form.";
    }
    return localErrors;
  };

  const renderPackagingFields = () => {
    const numberInput = (name, label) => (
      <div className="field">
        <label>{label}</label>
        <input
          type="number"
          min="0"
          step="any"
          name={name}
          value={medicine[name] || ""}
          onChange={handleMedicineChange}
        />
        {renderFieldError(name)}
      </div>
    );

    const packagingAuto = Boolean(packagingType);
    const unitsValue = packagingAuto
      ? autoUnitsPerPack != null
        ? Number(autoUnitsPerPack)
        : ""
      : medicine.units_per_pack;
    const unitsField = (
      <div className="field">
        <label>
          Units per Pack{" "}
          {packagingAuto ? "(auto)" : "(enter manually)"}
        </label>
        <input
          type="number"
          min="0"
          step="any"
          name="units_per_pack"
          value={unitsValue}
          onChange={handleMedicineChange}
          disabled={packagingAuto}
        />
        {packagingAuto ? (
          <div className="hint">
            Based on packaging inputs. Fill those fields to see the computed value.
          </div>
        ) : (
          <div className="hint">Enter base units per selling pack.</div>
        )}
        {renderFieldError("units_per_pack")}
      </div>
    );

    let fields = unitsField;
    switch (packagingType) {
      case "tablets":
        fields = (
          <>
            {numberInput("tablets_per_strip", "Tablets per Strip")}
            {numberInput("strips_per_box", "Strips per Box")}
            {unitsField}
          </>
        );
        break;
      case "syrup":
        fields = (
          <>
            {numberInput("ml_per_bottle", "ML per Bottle")}
            {numberInput("bottles_per_box", "Bottles per Box")}
            {unitsField}
          </>
        );
        break;
      case "injection":
        fields = (
          <>
            {numberInput("vials_per_box", "Vials per Box")}
            {numberInput("ml_per_vial", "ML per Vial (optional)")}
            {unitsField}
          </>
        );
        break;
      case "ointment":
        fields = (
          <>
            {numberInput("grams_per_tube", "Grams per Tube")}
            {numberInput("tubes_per_box", "Tubes per Box")}
            {unitsField}
          </>
        );
        break;
      default:
        fields = unitsField;
    }
    const previewUnits =
      autoUnitsPerPack != null
        ? Number(autoUnitsPerPack)
        : numberVal(medicine.units_per_pack);
    return (
      <>
        {fields}
        {previewUnits ? (
          <div className="hint">
            Units per pack: {previewUnits} {selectedBaseUomLabel || "base units"}
          </div>
        ) : null}
      </>
    );
  };

  const buildPayload = () => {
    const location = Number(resolvedLocationId) || DEFAULT_LOCATION_ID;
    const unitsPerPack =
      autoUnitsPerPack != null
        ? Number(autoUnitsPerPack)
        : numberOrUndefined(medicine.units_per_pack);

    const medPayload = {
      ...(medicine.id ? { id: medicine.id } : {}),
      name: medicine.name.trim(),
      generic_name: medicine.generic_name.trim() || undefined,
      category: Number(medicine.category),
      form: Number(medicine.form),
      strength: medicine.strength.trim() || undefined,
      base_uom: Number(medicine.base_uom),
      selling_uom: Number(medicine.selling_uom || batch.quantity_uom),
      rack_location: Number(medicine.rack_location),
      description: medicine.description.trim(),
      gst_percent: decimalStringOrUndefined(medicine.gst_percent) ?? "0",
      tablets_per_strip: numberOrUndefined(medicine.tablets_per_strip),
      strips_per_box: numberOrUndefined(medicine.strips_per_box),
      ml_per_bottle: numberOrUndefined(medicine.ml_per_bottle),
      bottles_per_box: numberOrUndefined(medicine.bottles_per_box),
      vials_per_box: numberOrUndefined(medicine.vials_per_box),
      ml_per_vial: numberOrUndefined(medicine.ml_per_vial),
      grams_per_tube: numberOrUndefined(medicine.grams_per_tube),
      tubes_per_box: numberOrUndefined(medicine.tubes_per_box),
      units_per_pack: unitsPerPack,
      mrp: decimalStringOrUndefined(medicine.mrp),
    };

    const resolvedQuantityUom = batch.quantity_uom || medicine.selling_uom;
    const batchPayload = {
      ...(batch.id ? { id: batch.id } : {}),
      batch_number: batch.batch_number.trim(),
      mfg_date: batch.mfg_date || undefined,
      expiry_date: batch.expiry_date,
      quantity: Number(batch.quantity),
      quantity_uom: resolvedQuantityUom ? Number(resolvedQuantityUom) : undefined,
      purchase_price: decimalStringOrUndefined(batch.purchase_price),
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

  const handleStockAdjustment = async () => {
    setAdjustError("");
    setAdjustSuccess("");
    if (!adjustQty || Number(adjustQty) === 0) {
      setAdjustError("Enter a non-zero quantity.");
      return;
    }
    if (!batch.id) {
      setAdjustError("Batch id missing.");
      return;
    }
    setAdjustLoading(true);
    try {
      const payload = {
        location_id: resolvedLocationId || DEFAULT_LOCATION_ID,
        batch_lot_id: batch.id,
        qty_change_base: adjustQty,
        reason: "ADJUSTMENT",
      };
      const res = await fetchWithAuthRetry(MOVEMENT_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.detail || `Adjustment failed (${res.status})`);
      }
      setAdjustSuccess("Stock updated successfully.");
      setAdjustQty("");
      await refreshCurrentStock();
      dispatchInventoryRefresh();
    } catch (err) {
      setAdjustError(err.message || "Failed to update stock.");
    } finally {
      setAdjustLoading(false);
    }
  };

  if (isDrawer && !open) {
    return null;
  }

  const header = (
    <div className="inv-form-header">
      <button className="btn-secondary" type="button" onClick={handleClose}>
        {isDrawer ? "Close" : "Back"}
      </button>
      <h2>{isEdit ? "Edit Medicine" : "Add New Medicine"}</h2>
      <p>Create the product master and its opening batch in one step</p>
    </div>
  );

  const formContent = (
    <div className="inv-form-card">
      {serverError && <div className="inv-error-banner">{serverError}</div>}
      {loadingMasters && <div style={{ marginBottom: 12 }}>Loading master data…</div>}

      <form className="grid2" onSubmit={handleSubmit}>
          <div className="field">
            <label>Medicine Name *</label>
            <input
              name="name"
              value={medicine.name}
              onChange={handleMedicineChange}
              className={errors.name ? "error" : ""}
            />
            {renderFieldError("name")}
          </div>

          <div className="field">
            <label>Generic Name</label>
            <input name="generic_name" value={medicine.generic_name} onChange={handleMedicineChange} />
            {renderFieldError("generic_name")}
          </div>

          <div className="field">
            <label>Category *</label>
            <select
              name="category"
              value={medicine.category}
              onChange={handleMedicineChange}
              className={errors.category ? "error" : ""}
            >
              <option value="">Select</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            {renderFieldError("category")}
          </div>

  <div className="field">
            <label>Medicine Form *</label>
            <select name="form" value={medicine.form} onChange={handleMedicineChange} className={errors.form ? "error" : ""}>
              <option value="">Select</option>
              {forms.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
            {renderFieldError("form")}
          </div>

          <div className="field">
            <label>Strength</label>
            <input name="strength" value={medicine.strength} onChange={handleMedicineChange} />
            {renderFieldError("strength")}
          </div>

          <div className="field">
            <label>Rack Location *</label>
            <select
              name="rack_location"
              value={medicine.rack_location}
              onChange={handleMedicineChange}
              className={errors.rack_location ? "error" : ""}
            >
              <option value="">Select</option>
              {rackLocations.map((rack) => (
                <option key={rack.id} value={rack.id}>
                  {rack.name}
                </option>
              ))}
            </select>
            {renderFieldError("rack_location")}
          </div>

          <div className="field">
            <label>Base UOM *</label>
            <select
              name="base_uom"
              value={medicine.base_uom}
              onChange={handleMedicineChange}
              className={errors.base_uom ? "error" : ""}
            >
              <option value="">Select</option>
              {uoms.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
            {renderFieldError("base_uom")}
          </div>

          <div className="field">
            <label>Selling UOM *</label>
            <select
              name="selling_uom"
              value={medicine.selling_uom}
              onChange={handleMedicineChange}
              className={errors.selling_uom ? "error" : ""}
            >
              <option value="">Select</option>
              {uoms.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
            {renderFieldError("selling_uom")}
          </div>

          <div className="field">
            <label>GST %</label>
            <input name="gst_percent" value={medicine.gst_percent} onChange={handleMedicineChange} />
            {renderFieldError("gst_percent")}
          </div>

          <div className="field" style={{ gridColumn: "1 / 3" }}>
            <label>Description</label>
            <textarea name="description" value={medicine.description} onChange={handleMedicineChange} />
            {renderFieldError("description")}
          </div>

          <div style={{ gridColumn: "1/3", marginTop: 10 }}>
            <h3 className="section-title">Packaging</h3>
            <div className="section-line" />
          </div>

          {renderPackagingFields()}

          <div className="field">
            <label>MRP *</label>
            <input
              name="mrp"
              type="number"
              min="0"
              step="0.01"
              value={medicine.mrp}
              onChange={handleMedicineChange}
              className={errors.mrp ? "error" : ""}
            />
            {renderFieldError("mrp")}
          </div>

          <div style={{ gridColumn: "1/3", marginTop: 20 }}>
            <h3 className="section-title">Batch & Pricing</h3>
            <div className="section-line" />
          </div>

          <div className="field">
            <label>Batch Number *</label>
            <input
              name="batch_number"
              value={batch.batch_number}
              onChange={handleBatchChange}
              className={errors.batch_number ? "error" : ""}
            />
            {renderFieldError("batch_number")}
          </div>

          <div className="field">
            <label>Quantity *</label>
            <input
              name="quantity"
              type="number"
              min="0"
              value={batch.quantity}
              onChange={handleBatchChange}
              className={errors.quantity ? "error" : ""}
              readOnly={isEdit}
              disabled={isEdit}
            />
            {renderFieldError("quantity")}
            {totalBaseUnits != null && (
              <div className="hint">
                ≈ {totalBaseUnits} base units ({batch.quantity || 0} packs ×{" "}
                {autoUnitsPerPack != null
                  ? autoUnitsPerPack
                  : medicine.units_per_pack || "?"}
                )
              </div>
            )}
          </div>

          <div className="field">
            <label>Quantity UOM *</label>
            <select
              name="quantity_uom"
              value={batch.quantity_uom}
              onChange={handleBatchChange}
              className={errors.quantity_uom ? "error" : ""}
            >
              <option value="">Select</option>
              {uoms.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
            {renderFieldError("quantity_uom")}
          </div>

          <div className="field">
            <label>Purchase Price *</label>
            <input
              name="purchase_price"
              type="number"
              min="0"
              step="0.01"
              value={batch.purchase_price}
              onChange={handleBatchChange}
              className={errors.purchase_price ? "error" : ""}
            />
            {renderFieldError("purchase_price")}
          </div>

          <div className="field">
            <label>Manufacture Date</label>
            <input name="mfg_date" type="date" value={batch.mfg_date} onChange={handleBatchChange} />
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

        <div style={{ gridColumn: "1 / 3", display: "flex", justifyContent: "flex-end", gap: 10 }}>
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
            {submitting ? "Saving..." : "Save Medicine"}
          </button>
        </div>
      </form>
      {isEdit && (
        <div className="inv-form-card" style={{ marginTop: 20 }}>
          <h3 className="section-title">Stock Adjustment</h3>
          <div className="section-line" />
          <p className="small-muted">
            Current stock (base units): <strong>{currentStock ?? "0"}</strong>
          </p>
          <div className="field">
            <label>Adjust by (base units)</label>
            <input
              type="number"
              step="any"
              value={adjustQty}
              onChange={(e) => setAdjustQty(e.target.value)}
              placeholder="e.g., 100 or -50"
            />
          </div>
          {adjustError && <div className="err">{adjustError}</div>}
          {adjustSuccess && <div className="hint" style={{ color: "#047857" }}>{adjustSuccess}</div>}
          <button
            type="button"
            className="btn-primary"
            onClick={handleStockAdjustment}
            disabled={adjustLoading}
            style={{ marginTop: 12 }}
          >
            {adjustLoading ? "Updating..." : "Update Stock"}
          </button>
        </div>
      )}
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
