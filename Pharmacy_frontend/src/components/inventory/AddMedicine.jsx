import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./inventory.css";
import { authFetch } from "../../api/http";

const rawBase = import.meta.env.VITE_API_URL || "";
const normalizeBase = (u) =>
  u.trim().replace(/\/+$/g, "").replace(/\/api\/v1$/i, "");

const API_BASE = normalizeBase(rawBase);
const PRODUCTS_API = `${API_BASE}/api/v1/catalog/products/`;
const CATEGORY_API = `${API_BASE}/api/v1/catalog/categories/`;
const FORMS_API = `${API_BASE}/api/v1/catalog/forms/`;
const UOMS_API = `${API_BASE}/api/v1/catalog/uoms/`;
const RACKS_API = `${API_BASE}/api/v1/inventory/rack-locations/`;

/* ---------- initial form state (unchanged) ---------- */
const emptyForm = {
  medicine_name: "",
  generic_name: "",
  category: "",
  medicine_form: "",
  strength: "",
  base_uom: "",
  tablets_per_strip: "",
  strips_per_box: "",
  capsules_per_strip: "",
  units_per_box: "",
  ml_per_bottle: "",
  units_per_pack: "",
  ml_per_vial: "",
  ml_per_ampoule: "",
  g_per_sachet: "",
  g_per_tube: "",
  g_per_jar: "",
  units_per_roll: "",
  ml_per_dropper: "",
  quantity: "",
  quantity_uom: "",
  selling_uom: "",
  manufacturer: "",
  mrp: "",
  purchase_price: "",
  expiry_date: "",
  mfg_date: "",
  gst_percent: "",
  description: "",
  reorder_level: "",
  batch_number: "",
  hsn: "",
  rack_location: "",
  schedule: "OTC",
  pack_size: "",
};

/* ---------- improved UOM matching (robust) ---------- */
const uomKeywords = {
  tablet: ["tablet", "tab", "tabs", "tablets"],
  capsule: ["capsule", "cap", "caps", "capsules"],
  strip: ["strip", "strips"],
  bottle: ["bottle", "bottles"],
  syrupbottle: ["syrup", "syrup bottle"],
  box: ["box", "boxes"],
  vial: ["vial", "vials"],
  ampoule: ["ampoule", "amp"],
  sachet: ["sachet"],
  tube: ["tube"],
  jar: ["jar"],
  pack: ["pack"],
  roll: ["roll"],
  dropper: ["dropper"],
};

const uomFieldMap = {
  tablet: [
    { field: "tablets_per_strip", label: "Tablets per Strip", type: "number" },
    { field: "strips_per_box", label: "Strips per Box", type: "number" },
  ],
  strip: [{ field: "strips_per_box", label: "Strips per Box", type: "number" }],
  capsule: [
    { field: "capsules_per_strip", label: "Capsules per Strip", type: "number" },
    { field: "strips_per_box", label: "Strips per Box", type: "number" },
  ],
  bottle: [
    { field: "ml_per_bottle", label: "ml per Bottle", type: "number" },
    { field: "units_per_bottle", label: "Units per Bottle", type: "number" },
  ],
  syrupbottle: [{ field: "ml_per_bottle", label: "ml per Bottle", type: "number" }],
  box: [
    { field: "units_per_box", label: "Units per Box", type: "number" },
    { field: "strips_per_box", label: "Strips per Box", type: "number" },
  ],
  vial: [{ field: "ml_per_vial", label: "ml per Vial", type: "number" }],
  ampoule: [{ field: "ml_per_ampoule", label: "ml per Ampoule", type: "number" }],
  sachet: [{ field: "g_per_sachet", label: "g per Sachet", type: "number" }],
  tube: [{ field: "g_per_tube", label: "g per Tube", type: "number" }],
  jar: [{ field: "g_per_jar", label: "g per Jar", type: "number" }],
  pack: [{ field: "units_per_pack", label: "Units per Pack", type: "number" }],
  roll: [{ field: "units_per_roll", label: "Units per Roll", type: "number" }],
  dropper: [{ field: "ml_per_dropper", label: "ml per Dropper", type: "number" }],
};

function matchUomName(uomName) {
  const name = (uomName || "").toLowerCase();
  for (const key in uomKeywords) {
    if (uomKeywords[key].some((kw) => name.includes(kw))) return key;
  }
  return null;
}

/* ---------- token refresh + wrapper (kept but with logging) ---------- */
async function tryRefreshToken() {
  try {
    const refresh = localStorage.getItem("refresh");
    if (!refresh) return false;
    const r = await fetch(`${API_BASE}/api/v1/auth/token/refresh/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh }),
    });
    if (!r.ok) return false;
    const body = await r.json();
    if (body.access) localStorage.setItem("access", body.access);
    if (body.refresh) localStorage.setItem("refresh", body.refresh);
    return true;
  } catch {
    return false;
  }
}

async function fetchWithAuthRetry(url, options = {}) {
  // Prefer authFetch (your existing wrapper) — but log and fallback to direct fetch if needed
  try {
    let response = await authFetch(url, options);
    if (response.status !== 401) return response;
    const refreshed = await tryRefreshToken();
    if (!refreshed) return response;
    return await authFetch(url, options);
  } catch (err) {
    console.warn("authFetch failed, falling back to direct fetch:", err);
    // fallback: try direct fetch with access token if present
    const access = localStorage.getItem("access");
    const headers = { ...(options.headers || {}) };
    if (access) headers["Authorization"] = `Bearer ${access}`;
    try {
      return await fetch(url, { ...options, headers });
    } catch (e) {
      throw e;
    }
  }
}

/* ---------- component ---------- */
export default function AddMedicine() {
  const nav = useNavigate();
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [fieldErrors, setFieldErrors] = useState(null);
  const [serverError, setServerError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [categories, setCategories] = useState([]);
  const [forms, setForms] = useState([]);
  const [uoms, setUoms] = useState([]);
  const [rackLocations, setRackLocations] = useState([]);
  const [loadingMasters, setLoadingMasters] = useState(true);

  useEffect(() => {
    async function loadMasters() {
      try {
        const [c, f, u, r] = await Promise.all([
          authFetch(CATEGORY_API),
          authFetch(FORMS_API),
          authFetch(UOMS_API),
          authFetch(RACKS_API),
        ]);
        const cjson = await c.json().catch(() => null);
        const fjson = await f.json().catch(() => null);
        const ujson = await u.json().catch(() => null);
        const rjson = await r.json().catch(() => null);

        setCategories(cjson?.results || []);
        setForms(fjson?.results || []);
        setUoms(ujson?.results || []);
        setRackLocations(rjson?.results || []);
      } catch (e) {
        console.error("Master load error", e);
      } finally {
        setLoadingMasters(false);
      }
    }
    loadMasters();
  }, []);

  const getUomById = (id) => uoms.find((u) => String(u.id) === String(id)) || null;
  const getUomName = (id) => (getUomById(id)?.name || "");

  const change = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  /* ---------- units per pack calculator (unchanged, robust) ---------- */
  const computeUnitsPerPack = (f = form) => {
    const baseUom = getUomById(f.base_uom);
    const sellUom = getUomById(f.selling_uom || f.quantity_uom);
    if (!baseUom) return null;

    const n = (v) => {
      if (v === "" || v === null || v === undefined) return null;
      const num = Number(v);
      return Number.isFinite(num) ? num : null;
    };

    const baseName = (baseUom?.name || "").toLowerCase();
    const sellName = (sellUom?.name || "").toLowerCase();

    let units = null;

    if (baseName.includes("tablet")) {
      const tps = n(f.tablets_per_strip);
      const spb = n(f.strips_per_box);
      if (sellName.includes("box")) units = tps != null && spb != null ? tps * spb : n(f.units_per_box);
      else if (sellName.includes("strip")) units = tps;
      else units = n(f.units_per_pack);
    } else if (baseName.includes("capsule")) {
      const cps = n(f.capsules_per_strip);
      const spb = n(f.strips_per_box);
      if (sellName.includes("box")) units = cps != null && spb != null ? cps * spb : cps;
      else if (sellName.includes("strip")) units = cps;
      else units = n(f.units_per_pack);
    } else if (baseName.includes("ml")) {
      const mlb = n(f.ml_per_bottle);
      const mlv = n(f.ml_per_vial);
      const mla = n(f.ml_per_ampoule);
      const mld = n(f.ml_per_dropper);
      if (sellName.includes("bottle")) units = mlb;
      else if (sellName.includes("vial")) units = mlv;
      else if (sellName.includes("ampoule")) units = mla;
      else if (sellName.includes("dropper")) units = mld;
      else units = n(f.units_per_pack);
    } else {
      units = n(f.units_per_pack);
    }

    return units;
  };

  useEffect(() => {
    const computed = computeUnitsPerPack(form);
    if (computed != null) setForm((p) => ({ ...p, units_per_pack: computed }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    form.base_uom,
    form.selling_uom,
    form.quantity_uom,
    form.tablets_per_strip,
    form.strips_per_box,
    form.capsules_per_strip,
    form.units_per_box,
    form.ml_per_bottle,
    form.ml_per_vial,
    form.ml_per_ampoule,
    form.ml_per_dropper,
  ]);

  /* ---------- basic UI validations ---------- */
  const validate = () => {
    const e = {};
    if (!form.medicine_name) e.medicine_name = "Required";
    if (!form.category) e.category = "Required";
    if (!form.medicine_form) e.medicine_form = "Required";
    if (!form.base_uom) e.base_uom = "Required";
    if (!form.quantity) e.quantity = "Required";
    if (!form.quantity_uom) e.quantity_uom = "Required";
    if (!form.purchase_price) e.purchase_price = "Required";
    if (!form.mrp) e.mrp = "Required";
    if (!form.batch_number) e.batch_number = "Required";
    if (!form.expiry_date) e.expiry_date = "Required";
    if (form.reorder_level === "" || form.reorder_level === null) e.reorder_level = "Required";
    if (form.units_per_pack === "" || form.units_per_pack === null) e.units_per_pack = "Required";
    return e;
  };

  /* ---------- submit handler (improved) ---------- */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setFieldErrors(null);
    setServerError("");

    // compute units synchronously for payload
    const computedUnits = computeUnitsPerPack(form);
    const unitsPerPackFinal = computedUnits != null ? computedUnits : (form.units_per_pack ? Number(form.units_per_pack) : null);

    // small helper
    const toNum = (v) => {
      if (v === "" || v === null || v === undefined) return null;
      const n = Number(v);
      return Number.isFinite(n) ? n : null;
    };

    setErrors({});
    const eObj = validate();
    setErrors(eObj);
    if (Object.keys(eObj).length) return;

    setSubmitting(true);

    // selected uoms
    const selectedBase = getUomById(form.base_uom);
    const selectedSell = getUomById(form.selling_uom || form.quantity_uom);

    // dynamic uom fields (tablets/capsule/etc.)
    const dynamicPayload = {};
    const baseMatch = matchUomName(selectedBase?.name);
    const sellMatch = matchUomName(selectedSell?.name);

    // collect uom-specific numeric fields if present
    const numericFields = [
      "tablets_per_strip",
      "strips_per_box",
      "capsules_per_strip",
      "units_per_box",
      "ml_per_bottle",
      "ml_per_vial",
      "ml_per_ampoule",
      "ml_per_dropper",
      "units_per_pack",
      "g_per_sachet",
      "g_per_tube",
      "g_per_jar",
      "units_per_roll",
    ];
    numericFields.forEach((f) => {
      if (Object.prototype.hasOwnProperty.call(form, f) && form[f] !== "") {
        dynamicPayload[f] = toNum(form[f]);
      }
    });

    // Build payload strictly matching Product model fields to avoid 400
    const payload = {
      code: null,
      name: form.medicine_name,
      generic_name: form.generic_name || "",
      dosage_strength: form.strength || "",
      hsn: form.hsn || "",
      schedule: form.schedule || "OTC",
      category: form.category ? Number(form.category) : null,
      medicine_form: form.medicine_form ? Number(form.medicine_form) : null,
      base_uom: selectedBase ? Number(selectedBase.id) : null,
      selling_uom: selectedSell ? Number(selectedSell.id) : null,
      base_unit: getUomName(form.base_uom) || "",
      pack_unit: getUomName(form.selling_uom || form.quantity_uom) || "",
      pack_size: form.pack_size || "",
      units_per_pack: unitsPerPackFinal,
      base_unit_step: 1,
      gst_percent: form.gst_percent ? Number(form.gst_percent) : 0,
      reorder_level: form.reorder_level ? Number(form.reorder_level) : 0,
      mrp: form.mrp ? String(form.mrp) : "0",
      manufacturer: form.manufacturer || "",
      description: form.description || "",
      storage_instructions: "",
      rack_location: form.rack_location ? Number(form.rack_location) : null,
      preferred_vendor: null,
      is_sensitive: false,
      is_active: true,
      // include dynamic numeric uom fields if present
      ...dynamicPayload,
    };

    // debug logs so you can see in Console that the POST is triggered and payload content
    console.info("Attempting to POST product to", PRODUCTS_API);
    console.info("Payload:", payload);

    try {
      const res = await fetchWithAuthRetry(PRODUCTS_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      // log response for debugging — helpful if POST reaches backend but fails validation
      console.info("Response status:", res.status);

      const body = await res.json().catch(() => null);

      if (!res.ok) {
        console.warn("Server returned non-OK:", res.status, body);
        setFieldErrors(body);
        // show generic message if no body
        if (!body) setServerError(`Save failed (${res.status})`);
        setSubmitting(false);
        return;
      }

      // success -> navigate back to list
      nav("/inventory/medicines");
    } catch (err) {
      console.error("Network / fetch error:", err);
      setServerError("Network error — check console for details");
    } finally {
      setSubmitting(false);
    }
  };

  const renderFieldError = (name) => {
    if (!fieldErrors) return null;
    if (fieldErrors[name]) return <div className="err">{Array.isArray(fieldErrors[name]) ? fieldErrors[name].join(", ") : fieldErrors[name]}</div>;
    return null;
  };

  /* render UOM-specific inputs using robust match */
  const renderUOMSpecificFields = () => {
    const baseUom = getUomById(form.base_uom);
    if (!baseUom?.name) return null;
    const match = matchUomName(baseUom.name);
    if (!match) return null;
    const fields = uomFieldMap[match] || [];
    return fields.map(({ field, label, type }) => (
      <div className="field" key={field}>
        <label>{label}</label>
        <input name={field} type={type} value={form[field] || ""} onChange={change} />
        {renderFieldError(field)}
      </div>
    ));
  };

  return (
    <div className="inv-form-wrap">
      <div className="inv-form-header">
        <button className="btn-secondary" style={{ marginBottom: "10px" }} onClick={() => nav(-1)}>← Back</button>
        <h2>Add New Medicine</h2>
        <p>Enter the medicine details</p>
      </div>
      <div className="inv-form-card">
        {serverError && <div className="inv-error-banner">{serverError}</div>}
        {fieldErrors && <div className="inv-error-banner" style={{ whiteSpace: "pre-wrap" }}>{JSON.stringify(fieldErrors, null, 2)}</div>}

        <div style={{ gridColumn: "1/3", marginBottom: "10px" }}>
          <h3 className="section-title">Medicine Information</h3>
          <div className="section-line"></div>
        </div>

        <form className="grid2" onSubmit={handleSubmit}>
          {/* Medicine Info Fields */}
          <div className="field">
            <label>Medicine Name *</label>
            <input name="medicine_name" value={form.medicine_name} onChange={change} className={errors.medicine_name ? "error" : ""} />
            {errors.medicine_name && <div className="err">{errors.medicine_name}</div>}
            {renderFieldError("name")}
          </div>

          <div className="field">
            <label>Generic Name</label>
            <input name="generic_name" value={form.generic_name} onChange={change} />
            {renderFieldError("generic_name")}
          </div>

          <div className="field">
            <label>Category *</label>
            {loadingMasters ? <div>Loading...</div> : (
              <select name="category" value={form.category} onChange={change} className={errors.category ? "error" : ""}>
                <option value="">Select</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            )}
            {errors.category && <div className="err">{errors.category}</div>}
            {renderFieldError("category")}
          </div>

          <div className="field">
            <label>Medicine Form *</label>
            <select name="medicine_form" value={form.medicine_form} onChange={change} className={errors.medicine_form ? "error" : ""}>
              <option value="">Select</option>
              {forms.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
            {errors.medicine_form && <div className="err">{errors.medicine_form}</div>}
            {renderFieldError("medicine_form")}
          </div>

          <div className="field">
            <label>Strength</label>
            <input name="strength" value={form.strength} onChange={change} />
            {renderFieldError("dosage_strength")}
          </div>

          <div className="field">
            <label>Rack Location *</label>
            <select name="rack_location" value={form.rack_location} onChange={change}>
              <option value="">Select Rack</option>
              {rackLocations.map((rack) => (
                <option key={rack.id} value={rack.id}>
                  {rack.name} ({rack.description})
                </option>
              ))}
            </select>
            {renderFieldError("rack_location")}
          </div>

          <div className="field">
            <label>Description</label>
            <textarea name="description" value={form.description} onChange={change} />
            {renderFieldError("description")}
          </div>

          <div className="field">
            <label>Base UOM *</label>
            <select name="base_uom" value={form.base_uom} onChange={change} className={errors.base_uom ? "error" : ""}>
              <option value="">Select</option>
              {uoms.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
            {errors.base_uom && <div className="err">{errors.base_uom}</div>}
            {renderFieldError("base_uom")}
          </div>

          {/* UOM-specific fields */}
          {renderUOMSpecificFields()}

          {/* Batch & Pricing Section */}
          <div style={{ gridColumn: "1/3", marginTop: "20px", marginBottom: "10px" }}>
            <h3 className="section-title">Batch & Pricing</h3>
            <div className="section-line"></div>
          </div>

          {/* Batch & Pricing Fields */}
          <div className="field">
            <label>Batch Number *</label>
            <input name="batch_number" value={form.batch_number} onChange={change} className={errors.batch_number ? "error" : ""} />
            {errors.batch_number && <div className="err">{errors.batch_number}</div>}
            {renderFieldError("batch_number")}
          </div>

          <div className="field">
            <label>Quantity *</label>
            <input type="number" name="quantity" value={form.quantity} onChange={change} className={errors.quantity ? "error" : ""} />
            {errors.quantity && <div className="err">{errors.quantity}</div>}
            {renderFieldError("quantity")}
          </div>

          <div className="field">
            <label>Quantity UOM *</label>
            <select name="quantity_uom" value={form.quantity_uom} onChange={change} className={errors.quantity_uom ? "error" : ""}>
              <option value="">Select</option>
              {uoms.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
            {errors.quantity_uom && <div className="err">{errors.quantity_uom}</div>}
            {renderFieldError("pack_unit")}
          </div>

          <div className="field">
            <label>Selling UOM</label>
            <select name="selling_uom" value={form.selling_uom} onChange={change}>
              <option value="">Select</option>
              {uoms.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
            {renderFieldError("selling_uom")}
          </div>

          <div className="field">
            <label>Purchase Price *</label>
            <input type="number" name="purchase_price" value={form.purchase_price} onChange={change} className={errors.purchase_price ? "error" : ""} />
            {errors.purchase_price && <div className="err">{errors.purchase_price}</div>}
            {renderFieldError("purchase_price")}
          </div>

          <div className="field">
            <label>MRP *</label>
            <input type="number" name="mrp" value={form.mrp} onChange={change} className={errors.mrp ? "error" : ""} />
            {errors.mrp && <div className="err">{errors.mrp}</div>}
            {renderFieldError("mrp")}
          </div>

          <div className="field">
            <label>Units per Pack (auto)</label>
            <input type="number" name="units_per_pack" value={form.units_per_pack || ""} onChange={change} />
            {renderFieldError("units_per_pack")}
          </div>

          <div className="field">
            <label>MFG Date</label>
            <input type="date" name="mfg_date" value={form.mfg_date} onChange={change} />
            {renderFieldError("mfg_date")}
          </div>

          <div className="field">
            <label>Expiry Date *</label>
            <input type="date" name="expiry_date" value={form.expiry_date} onChange={change} className={errors.expiry_date ? "error" : ""} />
            {errors.expiry_date && <div className="err">{errors.expiry_date}</div>}
            {renderFieldError("expiry_date")}
          </div>

          <div className="field">
            <label>GST %</label>
            <input name="gst_percent" value={form.gst_percent} onChange={change} />
            {renderFieldError("gst_percent")}
          </div>

          <div className="field">
            <label>HSN Code</label>
            <input name="hsn" value={form.hsn} onChange={change} />
            {renderFieldError("hsn")}
          </div>

          <div style={{ gridColumn: "1/3" }}>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
              <button type="button" className="btn-secondary" onClick={() => nav("/inventory/medicines")}>Cancel</button>
             <button type="button" className="btn-primary" onClick={handleSubmit} disabled={submitting}>
</button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
