// src/components/Masters/medicineforms/medicineforms.jsx

import React, { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./medicineforms.css";
import { authFetch } from "../../api/http";

const empty = { id: "", name: "", description: "" };

// API
const API = "http://127.0.0.1:8000/api/v1/catalog/forms/";

export default function MedicineForms() {
  const nav = useNavigate();

  const [rows, setRows] = useState([]);
  const [form, setForm] = useState(empty);
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [showView, setShowView] = useState(null);
  const [deleteItem, setDeleteItem] = useState(null);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [serverError, setServerError] = useState(null);

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
    } catch (err) {
      setServerError(err.message || "Error loading forms");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchList();
  }, []);

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
    setForm({ id: r.id, name: r.name, description: r.description || "" });
    setEditingId(r.id);
    setErrors({});
    setShowForm(true);
  };

  const openView = (r) => setShowView(r);
  const closeForm = () => setShowForm(false);

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = "Name is required";
    return e;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const eObj = validate();
    setErrors(eObj);
    if (Object.keys(eObj).length) return;

    const payload = {
      name: form.name.trim(),
      description: form.description?.trim() || "",
    };

    setSaving(true);
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
      setServerError(err.message || "Save failed");
      await fetchList();
    } finally {
      setSaving(false);
    }
  };

  // Delete handlers
  const confirmDelete = (row) => setDeleteItem(row);

  const handleDelete = async () => {
    if (!deleteItem?.id) return;
    setSaving(true);
    try {
      const res = await authFetch(`${API}${deleteItem.id}/`, {
        method: "DELETE",
        headers: { Accept: "application/json" },
      });
      if (!res.ok && res.status !== 204)
        throw new Error(`Delete failed (${res.status})`);
      setRows((prev) => prev.filter((r) => r.id !== deleteItem.id));
    } catch (err) {
      setServerError(err.message || "Delete failed");
      await fetchList();
    } finally {
      setSaving(false);
      setDeleteItem(null);
    }
  };

  // Close modals on ESC
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") {
        if (showForm) closeForm();
        if (showView) setShowView(null);
        if (deleteItem) setDeleteItem(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showForm, showView, deleteItem]);

  return (
    <div className="mfWrap">
      <div className="mfHeader">
        <button className="mfBack" onClick={() => nav(-1)} disabled={loading}>
          ← Back
        </button>
        <div className="mfHeadings">
          <h2>HSN Code</h2>
          <p>Manage all available HSN Code</p>
        </div>
        <button className="mfAdd" onClick={openAdd} disabled={loading || saving}>
          ＋ Add New
        </button>
      </div>

      {serverError && <div style={{ color: "crimson", padding: 8 }}>{serverError}</div>}

      {loading ? (
        <div style={{ padding: 20 }}>Loading...</div>
      ) : (
        <div className="mfCard">
          <table className="mfTable">
            <thead>
              <tr>
                <th className="slno-col">SL No</th>
                <th className="name-col">Code</th>
                <th className="desc-col">Description</th>
                <th className="actions-col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.length ? (
                rows.map((r, i) => (
                  <tr key={r.id}>
                    <td className="slno-col">{i + 1}</td>
                    <td>{r.name}</td>
                    <td className="mfMuted">{r.description || "-"}</td>
                    <td className="mfActions">
                      <button className="mfIcon" onClick={() => openView(r)}>👁️</button>
                      <button className="mfIcon" onClick={() => openEdit(r)}>✎</button>
                      <button className="mfIcon danger" onClick={() => confirmDelete(r)}>🗑️</button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} style={{ padding: 16, textAlign: "center" }}>
                    No forms yet. Click <strong>Add New</strong>.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showForm && (
        <div className="mfModalBackdrop" onMouseDown={closeForm}>
          <div className="mfModal" onMouseDown={(e) => e.stopPropagation()}>
            <div className="mfModalHeader">
              <h3>{editingId ? "Edit Form" : "Add New Form"}</h3>
              <button className="mfClose" onClick={closeForm}>✕</button>
            </div>
            <form className="mfForm" onSubmit={handleSubmit}>
              <label className="mfLabel">
                Name <span className="mfReq">*</span>
                <input
                  className={`mfInput ${errors.name ? "mfInputError" : ""}`}
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="Enter form name"
                  autoFocus
                />
                {errors.name && <div className="mfError">{errors.name}</div>}
              </label>

              <label className="mfLabel">
                Description
                <input
                  className="mfInput"
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  placeholder="Enter description (optional)"
                />
              </label>

              <div className="mfBtnRow">
                <button type="button" className="mfBtn" onClick={closeForm}>Cancel</button>
                <button type="submit" className="mfBtn primary">
                  {saving ? "Saving..." : editingId ? "Save Changes" : "Add Item"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Modal */}
      {showView && (
        <div className="mfModalBackdrop" onMouseDown={() => setShowView(null)}>
          <div className="mfModal" onMouseDown={(e) => e.stopPropagation()}>
            <div className="mfModalHeader">
              <h3>View Form</h3>
              <button className="mfClose" onClick={() => setShowView(null)}>✕</button>
            </div>
            <div className="mfViewTable">
              <div className="mfViewRow">
                <span className="mfViewLabel">Name</span>
                <span className="mfViewColon">:</span>
                <span className="mfViewValue">{showView.name}</span>
              </div>
              <div className="mfViewRow">
                <span className="mfViewLabel">Description</span>
                <span className="mfViewColon">:</span>
                <span className="mfViewValue">{showView.description || "-"}</span>
              </div>
              <div className="mfViewRow">
                <span className="mfViewLabel">Created</span>
                <span className="mfViewColon">:</span>
                <span className="mfViewValue">
                  {showView.created_at ? new Date(showView.created_at).toLocaleString() : "-"}
                </span>
              </div>
              <div className="mfViewRow">
                <span className="mfViewLabel">Updated</span>
                <span className="mfViewColon">:</span>
                <span className="mfViewValue">
                  {showView.updated_at ? new Date(showView.updated_at).toLocaleString() : "-"}
                </span>
              </div>
            </div>
            <div className="mfBtnRow center">
              <button className="mfBtn" onClick={() => setShowView(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {deleteItem && (
        <div className="mfModalBackdrop" onMouseDown={() => setDeleteItem(null)}>
          <div className="mfModal" onMouseDown={(e) => e.stopPropagation()}>
            <div className="mfModalHeader">
              <h3>Confirm Delete</h3>
              <button className="mfClose" onClick={() => setDeleteItem(null)}>✕</button>
            </div>
            <div style={{ padding: 20 }}>
              Are you sure you want to delete <strong>{deleteItem.name}</strong> form?
            </div>
            <div className="mfBtnRow">
              <button className="mfBtn" onClick={() => setDeleteItem(null)}>Cancel</button>
              <button className="mfBtn danger" onClick={handleDelete}>
                {saving ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
