import React, { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, Pencil, Trash2, ArrowLeft, Plus } from "lucide-react";
import "./rack_locations.css";
import "../../inventory/inventory.css";
import { authFetch } from "../../../api/http";

const USE_LOCAL_STORAGE = false;
const LS_KEY = "rack_locations";

const empty = {
  id: "",
  name: "",
  description: "",
  max_capacity: "",
  current_capacity: "",
  is_active: true,
};

// Normalize VITE_API_URL
const rawBase = import.meta.env.VITE_API_URL || "";
const normalizeBase = (u) =>
  u.trim().replace(/\/+$/g, "").replace(/\/api\/v1$/i, "");
const API_BASE = normalizeBase(rawBase);
const API = API_BASE
  ? `${API_BASE}/api/v1/inventory/rack-locations/`
  : "/api/v1/inventory/rack-locations/";

export default function RackLocations() {
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

  // Load from local storage
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

  // Fetch list
  const fetchList = async () => {
    setLoading(true);
    setServerError(null);
    try {
      const res = await authFetch(API, { headers: { Accept: "application/json" } });
      if (!res.ok) throw new Error(`Failed to load (${res.status})`);
      const data = await res.json();
      const list = Array.isArray(data) ? data : data?.results || [];
      setRows(list);
      if (USE_LOCAL_STORAGE)
        try {
          localStorage.setItem(LS_KEY, JSON.stringify(list));
        } catch {}
    } catch (err) {
      console.error(err);
      setServerError(err.message || "Error loading rack locations");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchList();
  }, []);

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
      max_capacity: r.max_capacity || "",
      current_capacity: r.current_capacity || "",
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

  // Create / Update
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
      max_capacity: Number(form.max_capacity) || 0,
      current_capacity: Number(form.current_capacity) || 0,
      is_active: form.is_active,
    };

    try {
      if (editingId) {
        const res = await authFetch(`${API}${editingId}/`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error(`Update failed (${res.status})`);
        const updated = await res.json();
        setRows((prev) => prev.map((r) => (r.id === editingId ? updated : r)));
      } else {
        const res = await authFetch(API, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
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
    if (!window.confirm("Delete this rack location?")) return;
    setSaving(true);
    setServerError(null);
    try {
      const res = await authFetch(`${API}${id}/`, {
        method: "DELETE",
        headers: { Accept: "application/json" },
      });
      if (!res.ok && res.status !== 204)
        throw new Error(`Delete failed (${res.status})`);
      setRows((r) => r.filter((x) => x.id !== id));
    } catch (err) {
      console.error(err);
      setServerError(err.message || "Delete failed");
      await fetchList();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="pm-wrap">
      {/* Header Section - Back button */}
      <div className="pm-header-section">
        <button className="back-btn" onClick={() => nav(-1)} disabled={loading}>
          <ArrowLeft size={18} />
          Back
        </button>
      </div>

      {/* Header */}
      <div className="pm-header-card">
        <div>
          <h2>Rack Locations</h2>
          <p>Manage all rack locations and storage</p>
        </div>
        <button
          className="pm-add"
          onClick={openAdd}
          disabled={loading || saving}
        >
          <Plus size={18} />
          Add New
        </button>
      </div>

      {serverError && (
        <div style={{ color: "crimson", padding: 8 }}>{serverError}</div>
      )}

      {loading ? (
        <div style={{ padding: 20 }}>Loading...</div>
      ) : (
        <div className="pm-card">
          <div className="inv-table-wrap">
          <table className="inv-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Description</th>
                <th>Max Capacity</th>
                <th>Current</th>
                <th>Status</th>
                <th style={{ width: 140, textAlign: "right" }}>Actions</th>
              </tr>
            </thead>

            <tbody>
              {rows.length ? (
                rows.map((r, i) => (
                  <tr key={r.id || i}>
                    <td>{r.name}</td>
                    <td className="pm-muted">{r.description}</td>
                    <td>{r.max_capacity ?? "-"}</td>
                    <td>{r.current_capacity ?? "-"}</td>
                    <td>{r.is_active ? "Active" : "Inactive"}</td>

                    <td className="pm-actions">
                      <button
                        className="pm-icon"
                        title="View"
                        onClick={() => openView(r)}
                        disabled={saving}
                      >
                        <Eye size={16} />
                      </button>
                      <button
                        className="pm-icon"
                        title="Edit"
                        onClick={() => openEdit(r)}
                        disabled={saving}
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        className="pm-icon danger"
                        title="Delete"
                        onClick={() => handleDelete(r.id)}
                        disabled={saving}
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} style={{ textAlign: "center", padding: 16 }}>
                    No rack locations yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          </div>
        </div>
      )}

      {/* Add / Edit Modal */}
      {showForm && (
        <div className="pm-modal-backdrop" onMouseDown={closeForm}>
          <div
            className="pm-modal"
            onMouseDown={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="pm-modal-header">
              <h3>
                {editingId ? "Edit Rack Location" : "Add New Rack Location"}
              </h3>
              <button className="pm-close" onClick={closeForm}>
                ✕
              </button>
            </div>

            <form className="pm-form" onSubmit={handleSubmit}>
              {/* Name */}
              <label className="pm-label">
                <span style={{ whiteSpace: "nowrap" }}>Name <span className="pm-req">*</span></span>
                <input
                  className={`pm-input ${
                    errors.name ? "pm-input-error" : ""
                  }`}
                  type="text"
                  name="name"
                  placeholder="Enter name"
                  value={form.name}
                  onChange={handleChange}
                  autoFocus
                />
                {errors.name && <div className="pm-error">{errors.name}</div>}
              </label>

              {/* Description */}
              <label className="pm-label">
                Description
                <input
                  className="pm-input"
                  type="text"
                  name="description"
                  placeholder="Enter description"
                  value={form.description}
                  onChange={handleChange}
                />
              </label>

              {/* Max Capacity */}
              <label className="pm-label">
                Max Capacity
                <input
                  className="pm-input"
                  type="number"
                  name="max_capacity"
                  value={form.max_capacity}
                  onChange={handleChange}
                  placeholder="Enter max capacity"
                />
              </label>

              {/* Current Capacity */}
              <label className="pm-label">
                Current Capacity
                <input
                  className="pm-input"
                  type="number"
                  name="current_capacity"
                  value={form.current_capacity}
                  onChange={handleChange}
                  placeholder="Enter current capacity"
                />
              </label>

              {/* Is Active */}
              <label className="pm-label">
                <input
                  type="checkbox"
                  name="is_active"
                  checked={form.is_active}
                  onChange={handleChange}
                />{" "}
                Active
              </label>

              <div className="pm-btn-row">
                <button
                  type="button"
                  className="pm-btn ghost"
                  onClick={closeForm}
                  disabled={saving}
                >
                  Cancel
                </button>
                <button type="submit" className="pm-btn primary" disabled={saving}>
                  {saving
                    ? editingId
                      ? "Saving..."
                      : "Adding..."
                    : editingId
                    ? "Save Changes"
                    : "Add Rack"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Modal */}
      {showView && (
        <div
          className="pm-modal-backdrop"
          onMouseDown={() => setShowView(null)}
        >
          <div className="pm-modal" onMouseDown={(e) => e.stopPropagation()}>
            <div className="pm-modal-header">
              <h3>View Rack Location</h3>
              <button className="pm-close" onClick={() => setShowView(null)}>
                ✕
              </button>
            </div>

            <div className="pm-view">
              <div className="pm-view-row">
                <span className="pm-view-label">Name</span>
                <span className="pm-view-value">
                  {showView.name || "-"}
                </span>
              </div>

              <div className="pm-view-row">
                <span className="pm-view-label">Description</span>
                <span className="pm-view-value">
                  {showView.description || "-"}
                </span>
              </div>

              <div className="pm-view-row">
                <span className="pm-view-label">Max Capacity</span>
                <span className="pm-view-value">
                  {showView.max_capacity ?? "-"}
                </span>
              </div>

              <div className="pm-view-row">
                <span className="pm-view-label">Current Capacity</span>
                <span className="pm-view-value">
                  {showView.current_capacity ?? "-"}
                </span>
              </div>

              <div className="pm-view-row">
                <span className="pm-view-label">Status</span>
                <span className="pm-view-value">
                  {showView.is_active ? "Active" : "Inactive"}
                </span>
              </div>

              <div className="pm-view-row">
                <span className="pm-view-label">Created</span>
                <span className="pm-view-value">
                  {showView.created_at
                    ? new Date(showView.created_at).toLocaleString()
                    : "-"}
                </span>
              </div>

              <div className="pm-view-row">
                <span className="pm-view-label">Updated</span>
                <span className="pm-view-value">
                  {showView.updated_at
                    ? new Date(showView.updated_at).toLocaleString()
                    : "-"}
                </span>
              </div>
            </div>

            <div className="pm-btn-row">
              <button className="pm-btn ghost" onClick={() => setShowView(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
