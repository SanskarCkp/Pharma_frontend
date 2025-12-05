import React, { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./Payment_Methods.css";
import { Eye, Pencil, Trash2 } from "lucide-react";

import { authFetch } from "../../../api/http";



const USE_LOCAL_STORAGE = false;
const LS_KEY = "payment_methods";

const empty = { id: "", name: "", description: "", method_type: "OTHER", is_active: true };

// Normalize VITE_API_URL so both of these work correctly:
//  - http://127.0.0.1:8000
//  - http://127.0.0.1:8000/api/v1
const rawBase = import.meta.env.VITE_API_URL || "";

// Removes whitespace, trailing slashes, and trailing "/api/v1"
const normalizeBase = (u) =>
  u
    .trim()
    .replace(/\/+$/g, "")
    .replace(/\/api\/v1$/i, "");

const API_BASE = normalizeBase(rawBase);

// Final API endpoint — always correct
const API = `${API_BASE}/api/v1/settings/payment-methods/`;

const METHOD_TYPES = [
  { value: "CASH", label: "Cash" },
  { value: "UPI", label: "UPI" },
  { value: "CARD_CREDIT", label: "Card - Credit" },
  { value: "CARD_DEBIT", label: "Card - Debit" },
  { value: "NET_BANKING", label: "Net Banking" },
  { value: "CREDIT", label: "On Credit" },
  { value: "OTHER", label: "Other" },
];

export default function PaymentMethods() {
  const nav = useNavigate();
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState(empty);
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [showView, setShowView] = useState(null);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [serverError, setServerError] = useState(null);
  const [totalCount, setTotalCount] = useState(null);

  useEffect(() => {
    if (!USE_LOCAL_STORAGE) return;
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) setRows(JSON.parse(raw));
    } catch {}
  }, []);

  const saveLocal = (next) => {
    setRows(next);
    if (USE_LOCAL_STORAGE) {
      try {
        localStorage.setItem(LS_KEY, JSON.stringify(next));
      } catch {}
    }
  };

  const fetchList = async () => {
    setLoading(true);
    setServerError(null);
    try {
      const res = await authFetch(API, { headers: { "Accept": "application/json" } });
      if (!res.ok) throw new Error(`Failed to load (${res.status})`);
      const data = await res.json();
      const list = Array.isArray(data) ? data : data?.results || [];
      setRows(list);
      if (!Array.isArray(data) && typeof data?.count === "number") setTotalCount(data.count);
      else setTotalCount(list.length);

      if (USE_LOCAL_STORAGE) try { localStorage.setItem(LS_KEY, JSON.stringify(list)); } catch {}
    } catch (err) {
      console.error(err);
      setServerError(err.message || "Error loading payment methods");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchList();
  }, []);

  useEffect(() => {
    setTotalCount((prev) => (prev === null || prev === rows.length ? rows.length : prev));
  }, [rows]);

  const nextId = useMemo(() => {
    const nums = rows.map((r) => Number(r.id) || 0);
    return (Math.max(0, ...nums) + 1).toString();
  }, [rows]);

  const openAdd = () => {
    setForm(empty);
    setEditingId(null);
    setErrors({});
    setShowForm(true);
  };
  const openEdit = (r) => {
    setForm({
      id: r.id,
      name: r.name,
      description: r.description || "",
      method_type: r.method_type || "OTHER",
      is_active: r.is_active ?? true,
    });
    setEditingId(r.id);
    setErrors({});
    setShowForm(true);
  };
  const openView = (r) => setShowView(r);
  const closeForm = () => setShowForm(false);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((p) => ({
      ...p,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = "Name is required";
    return e;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const eObj = validate();
    setErrors(eObj);
    if (Object.keys(eObj).length) return;

    setSaving(true);
    setServerError(null);

    const payload = {
      name: form.name.trim(),
      description: form.description?.trim() || "",
      method_type: form.method_type,
      is_active: form.is_active,
    };

    try {
      if (editingId) {
        const res = await authFetch(`${API}${editingId}/`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json", "Accept": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error(`Update failed (${res.status})`);
        const updated = await res.json();
        setRows((prev) => prev.map((r) => (r.id === editingId ? updated : r)));
      } else {
        const res = await authFetch(API, {
          method: "POST",
          headers: { "Content-Type": "application/json", "Accept": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error(`Create failed (${res.status})`);
        const created = await res.json();
        setRows((prev) => [created, ...prev]);
      }
      setShowForm(false);
    } catch (err) {
      console.error(err);
      setServerError(err.message || "Save failed");
      await fetchList();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this payment method?")) return;
    setSaving(true);
    setServerError(null);
    try {
      const res = await authFetch(`${API}${id}/`, { method: "DELETE", headers: { "Accept": "application/json" } });
      if (!res.ok && res.status !== 204) throw new Error(`Delete failed (${res.status})`);
      setRows((r) => r.filter((x) => x.id !== id));
    } catch (err) {
      console.error(err);
      setServerError(err.message || "Delete failed");
      await fetchList();
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") {
        if (showForm) closeForm();
        if (showView) setShowView(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showForm, showView]);

  return (
    <div className="pm-wrap">
      <div className="pm-header">
        <button className="pm-back" onClick={() => nav(-1)} disabled={loading}>← Back</button>
        <div className="pm-headings">
          <h2>Payment Methods</h2>
        </div>
        <button className="pm-add" onClick={openAdd} disabled={loading || saving}>＋ Add New</button>
      </div>

      {serverError && <div style={{ color: "crimson", padding: 8 }}>{serverError}</div>}
      {loading ? (
        <div style={{ padding: 20 }}>Loading...</div>
      ) : (
        <div className="pm-card">
          <table className="pm-table">
            <thead>
              <tr>
                <th style={{ width: "25%" }}>Name</th>
                <th>Description</th>
                <th>Type</th>
                <th>Active</th>
                <th style={{ width: 140, textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.length ? (
                rows.map((r, i) => (
                  <tr key={r.id || i}>
                    <td>{r.name}</td>
                    <td className="pm-muted">{r.description}</td>
                    <td>{r.method_type}</td>
                    <td>{r.is_active ? "Yes" : "No"}</td>
                    <td className="pm-actions">
                      <button className="pm-icon" title="View" onClick={() => openView(r)}>
                        <Eye size={20} color="#136FD7" />
                      </button>
                      <button className="pm-icon" title="Edit" onClick={() => openEdit(r)}>
                        <Pencil size={20} />
                      </button>
                      <button className="pm-icon danger" title="Delete" onClick={() => handleDelete(r.id)}>
                        <Trash2 size={20} color="#E23636" />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} style={{ textAlign: "center", padding: 16 }}>
                    No payment methods yet. Click <strong>Add New</strong>.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Add / Edit Modal */}
      {showForm && (
        <div className="pm-modal-backdrop" onMouseDown={closeForm}>
          <div className="pm-modal" onMouseDown={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
            <div className="pm-modal-header">
              <h3>{editingId ? "Edit Payment Method" : "Add New Payment Method"}</h3>
              <button className="pm-close" onClick={closeForm}>✕</button>
            </div>

            <form className="pm-form" onSubmit={handleSubmit}>
              <label className="pm-label">
                Name <span className="pm-req">*</span>
                <input
                  className={`pm-input ${errors.name ? "pm-input-error" : ""}`}
                  type="text"
                  name="name"
                  placeholder="Enter name"
                  value={form.name}
                  onChange={handleChange}
                  autoFocus
                />
                {errors.name && <div className="pm-error">{errors.name}</div>}
              </label>

              <label className="pm-label">
                Description
                <input
                  className="pm-input"
                  type="text"
                  name="description"
                  placeholder="Enter description (optional)"
                  value={form.description}
                  onChange={handleChange}
                />
              </label>

              <label className="pm-label">
                Type
                <select
                  className="pm-input"
                  name="method_type"
                  value={form.method_type}
                  onChange={handleChange}
                >
                  {METHOD_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </label>

              <label className="pm-label">
                Active
                <input
                  type="checkbox"
                  name="is_active"
                  checked={form.is_active}
                  onChange={handleChange}
                />
              </label>

              <div className="pm-btn-row">
                <button type="button" className="pm-btn ghost" onClick={closeForm} disabled={saving}>Cancel</button>
                <button type="submit" className="pm-btn primary" disabled={saving}>
                  {saving ? (editingId ? "Saving..." : "Adding...") : editingId ? "Save Changes" : "Add Item"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Modal */}
      {showView && (
        <div className="pm-modal-backdrop" onMouseDown={() => setShowView(null)}>
          <div className="pm-modal" onMouseDown={(e) => e.stopPropagation()}>
            <div className="pm-modal-header">
              <h3>View Payment Method</h3>
              <button className="pm-close" onClick={() => setShowView(null)}>✕</button>
            </div>
            <div className="pm-view">
              <div className="pm-view-row"><span className="pm-view-label">Name</span><span className="pm-view-value">{showView.name || "-"}</span></div>
              <div className="pm-view-row"><span className="pm-view-label">Description</span><span className="pm-view-value">{showView.description || "-"}</span></div>
              <div className="pm-view-row"><span className="pm-view-label">Type</span><span className="pm-view-value">{showView.method_type}</span></div>
              <div className="pm-view-row"><span className="pm-view-label">Active</span><span className="pm-view-value">{showView.is_active ? "Yes" : "No"}</span></div>
              <div className="pm-view-row"><span className="pm-view-label">Created</span><span className="pm-view-value">{showView.created_at ? new Date(showView.created_at).toLocaleString() : "-"}</span></div>
              <div className="pm-view-row"><span className="pm-view-label">Updated</span><span className="pm-view-value">{showView.updated_at ? new Date(showView.updated_at).toLocaleString() : "-"}</span></div>
            </div>
            <div className="pm-btn-row">
              <button className="pm-btn ghost" onClick={() => setShowView(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
