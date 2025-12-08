import React, { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, Pencil, Trash2 } from "lucide-react";
import "./payment_terms.css";

import { authFetch } from "../../../api/http";



const USE_LOCAL_STORAGE = false;
const LS_KEY = "payment_terms";

const empty = { id: "", name: "", days: 0, description: "" };

const rawBase = import.meta.env.VITE_API_URL || "";
const normalizeBase = (u) =>
  u
    .trim()
    .replace(/\/+$/g, "")
    .replace(/\/api\/v1$/i, "");
const API_BASE = normalizeBase(rawBase);
const API = API_BASE
  ? `${API_BASE}/api/v1/settings/payment-terms/`
  : "/api/v1/settings/payment-terms/";

export default function PaymentTerms() {
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
      const res = await authFetch(API, { headers: { Accept: "application/json" } });
      if (!res.ok) throw new Error(`Failed to load (${res.status})`);
      const data = await res.json();
      const list = Array.isArray(data) ? data : data?.results || [];
      setRows(list);
      if (USE_LOCAL_STORAGE) try { localStorage.setItem(LS_KEY, JSON.stringify(list)); } catch {}
    } catch (err) {
      console.error(err);
      setServerError(err.message || "Error loading payment terms");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchList(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

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
    setForm({ id: r.id, name: r.name, days: r.days || 0, description: r.description || "" });
    setEditingId(r.id);
    setErrors({});
    setShowForm(true);
  };
  const openView = (r) => setShowView(r);
  const closeForm = () => setShowForm(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: name === "days" ? Number(value) : value }));
  };

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = "Name is required";
    if (form.days < 0) e.days = "Days cannot be negative";
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
      days: form.days,
      description: form.description?.trim() || "",
    };

    try {
      if (editingId) {
        const res = await authFetch(`${API}${editingId}/`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error(`Update failed (${res.status})`);
        const updated = await res.json();
        setRows((prev) => prev.map((r) => (r.id === editingId ? updated : r)));
      } else {
        const res = await authFetch(API, {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
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
    if (!window.confirm("Delete this payment term?")) return;
    setSaving(true);
    setServerError(null);
    try {
      const res = await authFetch(`${API}${id}/`, { method: "DELETE", headers: { Accept: "application/json" } });
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
          <h2>Payment Terms</h2>
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
                <th>Name</th>
                <th>Days</th>
                <th>Description</th>
                <th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.length ? rows.map((r, i) => (
                <tr key={r.id || i}>
                  <td>{r.name}</td>
                  <td>{r.days}</td>
                  <td className="pm-muted">{r.description}</td>
                  <td className="pm-actions">
                    <button className="pm-icon" title="View" onClick={() => openView(r)} disabled={saving}>
                      <Eye size={16} />
                    </button>
                    <button className="pm-icon" title="Edit" onClick={() => openEdit(r)} disabled={saving}>
                      <Pencil size={16} />
                    </button>
                    <button className="pm-icon danger" title="Delete" onClick={() => handleDelete(r.id)} disabled={saving}>
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={4} style={{ textAlign: "center", padding: 16 }}>
                    No payment terms yet. Click <strong>Add New</strong>.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <div className="pm-modal-backdrop" onMouseDown={closeForm}>
          <div className="pm-modal" onMouseDown={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
            <div className="pm-modal-header">
              <h3>{editingId ? "Edit Payment Terms" : "Add New Payment Terms"}</h3>
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
                Days
                <input
                  className={`pm-input ${errors.days ? "pm-input-error" : ""}`}
                  type="number"
                  min="0"
                  name="days"
                  placeholder="Enter days"
                  value={form.days}
                  onChange={handleChange}
                />
                {errors.days && <div className="pm-error">{errors.days}</div>}
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

      {showView && (
        <div className="pm-modal-backdrop" onMouseDown={() => setShowView(null)}>
          <div className="pm-modal" onMouseDown={(e) => e.stopPropagation()}>
            <div className="pm-modal-header">
              <h3>View Payment Term</h3>
              <button className="pm-close" onClick={() => setShowView(null)}>✕</button>
            </div>
            <div className="pm-view">
              <div className="pm-view-row"><span className="pm-view-label">Name</span><span className="pm-view-value">{showView.name || "-"}</span></div>
              <div className="pm-view-row"><span className="pm-view-label">Days</span><span className="pm-view-value">{showView.days}</span></div>
              <div className="pm-view-row"><span className="pm-view-label">Description</span><span className="pm-view-value">{showView.description || "-"}</span></div>
              <div className="pm-view-row"><span className="pm-view-label">Created</span><span className="pm-view-value">{showView.created_at ? new Date(showView.created_at).toLocaleString() : "-"}</span></div>
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
