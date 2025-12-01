import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./inventory.css";
import { authFetch } from "../../api/http";

const rawBase = import.meta.env.VITE_API_URL || "";
const normalizeBase = (u) =>
  u
    .trim()
    .replace(/\/+$/g, "")
    .replace(/\/api\/v1$/i, "");

const API_BASE = normalizeBase(rawBase);

// Endpoints
const PRODUCTS_API = `${API_BASE}/api/v1/catalog/products/`;
const CATEGORY_API = `${API_BASE}/api/v1/catalog/categories/`;
const FORMS_API = `${API_BASE}/api/v1/catalog/forms/`;
const UOMS_API = `${API_BASE}/api/v1/catalog/uoms/`;
const VENDORS_API = `${API_BASE}/api/v1/catalog/vendors/`;
const RACKS_API = `${API_BASE}/api/v1/inventory/rack-locations/`;

const emptyForm = {
  medicine_name: "",
  generic_name: "",
  category: "",
  medicine_form: "",
  strength: "",
  base_uom: "",
  tablets_per_strip: "",
  strips_per_box: "",
  units_per_pack: "",
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
  preferred_vendor: "",
  hsn: "",
  rack_location: "",

  storage_instructions: "",
};

async function tryRefreshToken() {
  try {
    const refresh = localStorage.getItem("refresh");
    if (!refresh) return false;

    const refreshUrl = `${API_BASE}/api/v1/auth/token/refresh/`;
    const r = await fetch(refreshUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh }),
    });

    if (!r.ok) return false;

    const body = await r.json();
    if (body.access) localStorage.setItem("access", body.access);
    if (body.refresh) localStorage.setItem("refresh", body.refresh);
    return true;
  } catch (e) {
    return false;
  }
}

async function fetchWithAuthRetry(url, options = {}) {
  let response = await authFetch(url, options);
  if (response.status !== 401) return response;

  const refreshed = await tryRefreshToken();
  if (!refreshed) return response;

  return await authFetch(url, options);
}

export default function AddMedicine() {
  const nav = useNavigate();

  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState("");
  const [fieldErrors, setFieldErrors] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [categories, setCategories] = useState([]);
  const [forms, setForms] = useState([]);
  const [uoms, setUoms] = useState([]);
  const [loadingMasters, setLoadingMasters] = useState(true);
  const [vendors, setVendors] = useState([]);
  const [rackLocations, setRackLocations] = useState([]);



  // Load master data
  useEffect(() => {
    async function load() {
      try {
        const [c, f, u,v,r] = await Promise.all([
          authFetch(CATEGORY_API),
          authFetch(FORMS_API),
          authFetch(UOMS_API),
          authFetch(VENDORS_API),
           authFetch(RACKS_API),
          
          
          
          
          
        ]);

        const cjson = await c.json().catch(() => null);
        const fjson = await f.json().catch(() => null);
        const ujson = await u.json().catch(() => null);
        const vjson = await v.json().catch(() => null);
        const rjson = await r.json().catch(() => null);

        

        setCategories(cjson?.results || []);
        setForms(fjson?.results || []);
        setUoms(ujson?.results || []);
        setVendors(vjson?.results || []);
        setRackLocations(rjson?.results || []);
      } catch (e) {
        console.log("Master load error", e);
      } finally {
        setLoadingMasters(false);
      }
    }
    
    load();
  }, []);

  const change = (e) =>
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

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
    if (!form.reorder_level && form.reorder_level !== 0) e.reorder_level = "Required";
    if (!form.units_per_pack) e.units_per_pack = "Required";
    if (!form.preferred_vendor) e.preferred_vendor = "Required";

    return e;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFieldErrors(null);
    setServerError("");
    const eObj = validate();
    setErrors(eObj);
    if (Object.keys(eObj).length) return;

    setSubmitting(true);

    // New payload structure for /catalog/products/
    const payload = {
  name: form.medicine_name,
  generic_name: form.generic_name || "",
  category: Number(form.category),
  medicine_form: Number(form.medicine_form),
  dosage_strength: form.strength || "",
  base_uom: Number(form.base_uom),

  hsn: form.hsn || "",
  schedule: form.schedule || "OTC",
  rack_location: form.rack_location || "",

  pack_unit: Number(form.quantity_uom),
  selling_uom: form.selling_uom ? Number(form.selling_uom) : null,

  tablets_per_strip: form.tablets_per_strip ? Number(form.tablets_per_strip) : null,
  strips_per_box: form.strips_per_box ? Number(form.strips_per_box) : null,

  gst_percent: form.gst_percent ? String(form.gst_percent) : "0",
  reorder_level: form.reorder_level ? Number(form.reorder_level) : 0,
  mrp: form.mrp ? String(form.mrp) : "0",

  manufacturer: form.manufacturer || "",
  description: form.description || "",
  storage_instructions: form.storage_instructions || "",
  batch_number: form.batch_number,

  mfg_date: form.mfg_date || null,
  expiry_date: form.expiry_date,

  quantity: Number(form.quantity),
  units_per_pack: Number(form.units_per_pack),
  purchase_price: String(form.purchase_price),

  preferred_vendor: Number(form.preferred_vendor),
};

    try {
      const res = await fetchWithAuthRetry(PRODUCTS_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      let body = null;
      try {
        body = await res.json();
      } catch {
        body = null;
      }

      if (!res.ok) {
        if (body && typeof body === "object") {
          setFieldErrors(body);
        } else {
          setServerError(JSON.stringify(body || "Save failed"));
        }
        return;
      }

      nav("/inventory/medicines");
    } catch (err) {
      console.error("Network error", err);
      setServerError("Network error");
    } finally {
      setSubmitting(false);
    }
  };

  const renderFieldError = (name) => {
    if (!fieldErrors) return null;
    if (fieldErrors[name]) {
      return <div className="err">{Array.isArray(fieldErrors[name]) ? fieldErrors[name].join(", ") : String(fieldErrors[name])}</div>;
    }
    return null;
  };

  return (
    <div className="inv-form-wrap">
      <div className="inv-form-header">
        <button className="btn-secondary" style={{ marginBottom: "10px" }} onClick={() => nav(-1)}>
          ← Back
        </button>
        <h2>Add New Medicine</h2>
        <p>Enter the medicine details</p>
      </div>

      <div className="inv-form-card">
        {serverError && <div className="inv-error-banner">{serverError}</div>}
        {fieldErrors && typeof fieldErrors === "object" && (
          <div className="inv-error-banner" style={{ whiteSpace: "pre-wrap" }}>
            {JSON.stringify(fieldErrors, null, 2)}
          </div>
        )}

        <form className="grid2" onSubmit={handleSubmit}>
          {/* Medicine Name */}
          <div className="field">
            <label>Medicine Name *</label>
            <input name="medicine_name" value={form.medicine_name} onChange={change} className={errors.medicine_name ? "error" : ""} />
            {errors.medicine_name && <div className="err">{errors.medicine_name}</div>}
            {renderFieldError("name")}
          </div>

          {/* Generic Name */}
          <div className="field">
            <label>Generic Name</label>
            <input name="generic_name" value={form.generic_name} onChange={change} />
            {renderFieldError("generic_name")}
          </div>

          {/* Category */}
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

          {/* Medicine Form */}
          <div className="field">
            <label>Medicine Form *</label>
            <select name="medicine_form" value={form.medicine_form} onChange={change} className={errors.medicine_form ? "error" : ""}>
              <option value="">Select</option>
              {forms.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
            {errors.medicine_form && <div className="err">{errors.medicine_form}</div>}
            {renderFieldError("medicine_form")}
          </div>

          {/* Strength */}
          <div className="field">
            <label>Strength</label>
            <input name="strength" value={form.strength} onChange={change} />
            <small>Will be saved to <code>dosage_strength</code></small>
            {renderFieldError("dosage_strength")}
          </div>

          {/* Base UOM */}
          <div className="field">
            <label>Base UOM *</label>
            <select name="base_uom" value={form.base_uom} onChange={change} className={errors.base_uom ? "error" : ""}>
              <option value="">Select</option>
              {uoms.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
            {errors.base_uom && <div className="err">{errors.base_uom}</div>}
            {renderFieldError("base_uom")}
          </div>

          {/* Tablets per Strip */}
          <div className="field">
            <label>Tablets per Strip</label>
            <input name="tablets_per_strip" value={form.tablets_per_strip} onChange={change} />
            {renderFieldError("tablets_per_strip")}
          </div>

          {/* Strips per Box */}
          <div className="field">
            <label>Strips per Box</label>
            <input name="strips_per_box" value={form.strips_per_box} onChange={change} />
            {renderFieldError("strips_per_box")}
          </div>

          {/* Units per Pack */}
          <div className="field">
            <label>Units per Pack *</label>
            <input type="number" name="units_per_pack" value={form.units_per_pack} onChange={change} className={errors.units_per_pack ? "error" : ""} />
            {errors.units_per_pack && <div className="err">{errors.units_per_pack}</div>}
          </div>

          {/* Quantity */}
          <div className="field">
            <label>Quantity *</label>
            <input type="number" name="quantity" value={form.quantity} onChange={change} className={errors.quantity ? "error" : ""} />
            {errors.quantity && <div className="err">{errors.quantity}</div>}
            {renderFieldError("quantity")}
          </div>

          {/* Quantity UOM */}
          <div className="field">
            <label>Quantity UOM *</label>
            <select name="quantity_uom" value={form.quantity_uom} onChange={change} className={errors.quantity_uom ? "error" : ""}>
              <option value="">Select</option>
              {uoms.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
            {errors.quantity_uom && <div className="err">{errors.quantity_uom}</div>}
            {renderFieldError("pack_unit")}
          </div>

          {/* Selling UOM */}
          <div className="field">
            <label>Selling UOM</label>
            <select name="selling_uom" value={form.selling_uom} onChange={change}>
              <option value="">Select</option>
              {uoms.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
            {renderFieldError("selling_uom")}
          </div>

          {/* Purchase Price */}
          <div className="field">
            <label>Purchase Price *</label>
            <input type="number" name="purchase_price" value={form.purchase_price} onChange={change} className={errors.purchase_price ? "error" : ""} />
            {errors.purchase_price && <div className="err">{errors.purchase_price}</div>}
            {renderFieldError("purchase_price")}
          </div>

          {/* MRP */}
          <div className="field">
            <label>MRP *</label>
            <input type="number" name="mrp" value={form.mrp} onChange={change} className={errors.mrp ? "error" : ""} />
            {errors.mrp && <div className="err">{errors.mrp}</div>}
            {renderFieldError("mrp")}
          </div>

          {/* Batch Number */}
          <div className="field">
            <label>Batch Number *</label>
            <input name="batch_number" value={form.batch_number} onChange={change} className={errors.batch_number ? "error" : ""} />
            {errors.batch_number && <div className="err">{errors.batch_number}</div>}
            {renderFieldError("batch_number")}
          </div>

          {/* Reorder Level */}
          <div className="field">
            <label>Reorder Level *</label>
            <input type="number" name="reorder_level" value={form.reorder_level} onChange={change} className={errors.reorder_level ? "error" : ""} />
            {errors.reorder_level && <div className="err">{errors.reorder_level}</div>}
            {renderFieldError("reorder_level")}
          </div>

          {/* MFG Date */}
          <div className="field">
            <label>MFG Date</label>
            <input type="date" name="mfg_date" value={form.mfg_date} onChange={change} />
            {renderFieldError("mfg_date")}
          </div>

          {/* Expiry Date */}
          <div className="field">
            <label>Expiry Date *</label>
            <input type="date" name="expiry_date" value={form.expiry_date} onChange={change} className={errors.expiry_date ? "error" : ""} />
            {errors.expiry_date && <div className="err">{errors.expiry_date}</div>}
            {renderFieldError("expiry_date")}
          </div>

          {/* GST */}
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

          <div className="field">
  <label>Preferred Vendor *</label>
  {loadingMasters ? <div>Loading...</div> : (
    <select
      name="preferred_vendor"
      value={form.preferred_vendor}
      onChange={change}
      className={errors.preferred_vendor ? "error" : ""}
    >
      <option value="">Select</option>
      {vendors.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
    </select>
  )}
  {errors.preferred_vendor && <div className="err">{errors.preferred_vendor}</div>}
  {renderFieldError("preferred_vendor")}
</div>
{/* Rack Location */}
<div className="field">
  <label>Rack Location *</label>
  <select
    name="rack_location"
    value={form.rack_location}
    onChange={change}
  >
    <option value="">Select Rack</option>
    {rackLocations.map((rack) => (
      <option key={rack.id} value={rack.id}>
        {rack.name} ({rack.description})
      </option>
    ))}
  </select>

  {renderFieldError("rack_location")}
</div>

          {/* Storage Instructions */}
          <div className="field">
            <label>Storage Instructions</label>
            <input name="storage_instructions" value={form.storage_instructions} onChange={change} />
            {renderFieldError("storage_instructions")}
          </div>

          {/* Description */}
          <div className="field">
            <label>Description</label>
            <textarea name="description" value={form.description} onChange={change} />
            {renderFieldError("description")}
          </div>

          <div style={{ gridColumn: "1/3" }}>
            <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: "10px" }}>
              <button type="button" className="btn-secondary" onClick={() => nav("/inventory/medicines")}>Cancel</button>
              <button className="btn-primary" disabled={submitting}>{submitting ? "Saving..." : "Save"}</button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
