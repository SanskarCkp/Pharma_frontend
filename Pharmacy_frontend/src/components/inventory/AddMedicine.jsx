import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./inventory.css";
import { authFetch } from "../../api/http";

const LS_KEY = "medicines";

const rawBase = import.meta.env.VITE_API_URL || "";
const normalizeBase = (u) =>
  u
    .trim()
    .replace(/\/+$/g, "")
    .replace(/\/api\/v1$/i, "");
const API_BASE = normalizeBase(rawBase);
const ADD_API = API_BASE
  ? `${API_BASE}/api/v1/inventory/add-medicine/`
  : "/api/v1/inventory/add-medicine/";

const empty = {
  id: "",
  medicine_id: "",
  batch_number: "",
  medicine_name: "",
  generic_name: "",
  category: "",
  manufacturer: "",
  quantity: "",
  mrp: "",
  purchase_price: "",
  expiry_date: "",
  description: "",
};

export default function AddMedicine() {
  const nav = useNavigate();
  const [form, setForm] = useState(empty);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
  };

  const validate = () => {
    const e = {};
    if (!form.medicine_name.trim()) e.medicine_name = "Medicine name is required";
    if (!form.category.trim()) e.category = "Category is required";
    if (!form.quantity) e.quantity = "Quantity is required";
    if (!form.mrp) e.mrp = "MRP is required";
    if (!form.purchase_price) e.purchase_price = "Purchase price is required";
    if (!form.expiry_date) e.expiry_date = "Expiry date is required";
    return e;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const eObj = validate();
    setErrors(eObj);
    setServerError("");
    if (Object.keys(eObj).length) return;

    const item = {
      ...form,
      id: crypto.randomUUID(),
      medicine_id:
        form.medicine_id ||
        (form.medicine_name || "MD")
          .slice(0, 2)
          .toUpperCase() + Math.floor(Math.random() * 9999),
    };

    const payload = {
      location_id: 1,
      product: {
        code: item.medicine_id,
        name: item.medicine_name,
        generic_name: item.generic_name || "",
        manufacturer: item.manufacturer || "",
        mrp: String(item.mrp),
        base_unit: "TAB",
        pack_unit: "STRIP",
        units_per_pack: "10.000",
        gst_percent: "0",
        reorder_level: "0",
      },
      batch: {
        batch_no: item.batch_number || item.medicine_id,
        expiry_date: item.expiry_date,
      },
      opening_qty_packs: String(item.quantity),
      purchase_price: String(item.purchase_price),
    };

    setSubmitting(true);
    try {
      const res = await authFetch(ADD_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        let msg = `Backend add failed (${res.status})`;
        try {
          const data = await res.json();
          msg += `: ${JSON.stringify(data)}`;
        } catch {
          const txt = await res.text();
          if (txt) msg += `: ${txt}`;
        }
        setServerError(msg);
      } else {
        try {
          const raw = localStorage.getItem(LS_KEY);
          const arr = raw ? JSON.parse(raw) : [];
          arr.unshift(item);
          localStorage.setItem(LS_KEY, JSON.stringify(arr));
        } catch {}
        nav("/inventory/medicines");
      }
    } catch (err) {
      console.error(err);
      setServerError("Network error while saving medicine");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="inv-form-wrap">
      <div className="inv-form-header">
        <div>
          <h2>Add New Medicine</h2>
          <p>Enter the details of the new medicine to add to inventory</p>
        </div>
      </div>

      <div className="inv-form-card">
        {serverError && (
          <div className="inv-error-banner">{serverError}</div>
        )}
        <form className="grid2" onSubmit={handleSubmit}>
          {/* left */}
          <div className="field">
            <label>Medicine Name <span className="req">*</span></label>
            <input
              type="text" name="medicine_name" placeholder="e.g., Paracetamol 500mg"
              value={form.medicine_name} onChange={handleChange}
              className={errors.medicine_name ? "error" : ""}
            />
            {errors.medicine_name && <div className="err">{errors.medicine_name}</div>}
          </div>

          <div className="field">
            <label>Generic Name</label>
            <input
              type="text" name="generic_name" placeholder="e.g., Acetaminophen"
              value={form.generic_name} onChange={handleChange}
            />
          </div>

          <div className="field">
            <label>Category <span className="req">*</span></label>
            <select
              name="category" value={form.category} onChange={handleChange}
              className={errors.category ? "error" : ""}
            >
              <option value="">Select category</option>
              <option>Antipyretic</option>
              <option>Antibiotic</option>
              <option>Antacid</option>
              <option>Antidiabetic</option>
              <option>NSAID</option>
              <option>Cholesterol</option>
              <option>Antihistamine</option>
            </select>
            {errors.category && <div className="err">{errors.category}</div>}
          </div>

          <div className="field">
            <label>Manufacturer</label>
            <input
              type="text" name="manufacturer" placeholder="e.g., Sun Pharma"
              value={form.manufacturer} onChange={handleChange}
            />
          </div>

          <div className="field">
            <label>Quantity <span className="req">*</span></label>
            <input
              type="number" name="quantity" placeholder="e.g., 500"
              value={form.quantity} onChange={handleChange}
              className={errors.quantity ? "error" : ""}
            />
            {errors.quantity && <div className="err">{errors.quantity}</div>}
          </div>

          <div className="field">
            <label>Batch Number</label>
            <input
              type="text" name="batch_number" placeholder="e.g., BTH-2024-001"
              value={form.batch_number} onChange={handleChange}
            />
          </div>

          <div className="field">
            <label>MRP (₹) <span className="req">*</span></label>
            <input
              type="number" step="0.01" name="mrp" placeholder="e.g., 5.00"
              value={form.mrp} onChange={handleChange}
              className={errors.mrp ? "error" : ""}
            />
            {errors.mrp && <div className="err">{errors.mrp}</div>}
          </div>

          <div className="field">
            <label>Purchase Price (₹) <span className="req">*</span></label>
            <input
              type="number" step="0.01" name="purchase_price" placeholder="e.g., 2.50"
              value={form.purchase_price} onChange={handleChange}
              className={errors.purchase_price ? "error" : ""}
            />
            {errors.purchase_price && <div className="err">{errors.purchase_price}</div>}
          </div>

          <div className="field">
            <label>Expiry Date <span className="req">*</span></label>
            <input
              type="date" name="expiry_date" value={form.expiry_date}
              onChange={handleChange} className={errors.expiry_date ? "error" : ""}
            />
            {errors.expiry_date && <div className="err">{errors.expiry_date}</div>}
          </div>

          <div className="field col-span-2">
            <label>Description</label>
            <textarea
              name="description" rows={3} placeholder="Enter any additional information about the medicine..."
              value={form.description} onChange={handleChange}
            />
          </div>

          <div className="form-actions col-span-2">
            <button
              type="button"
              className="btn ghost"
              onClick={() => nav(-1)}
              disabled={submitting}
            >
              X  Cancel
            </button>

            <button type="submit" className="btn primary" disabled={submitting}>
              {submitting ? "Saving..." : "Add Medicine"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
