import React, { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./unitofmeasurement.css";
import { authFetch } from "../../api/http";


const empty = { id: "", name: "", description: "", uom_type: "BASE" };

// Base API setup
const rawBase = import.meta.env.VITE_API_URL || "";
const normalizeBase = (u) =>
  u.trim().replace(/\/+$/g, "").replace(/\/api\/v1$/i, "");
const API_BASE = normalizeBase(rawBase);
const API = `${API_BASE}/api/v1/catalog/uoms/`;

export default function UnitOfMeasurement() {
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
      setServerError(err.message || "Error loading units");
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
    setForm({
      id: r.id,
      name: r.name,
      description: r.description || "",
      uom_type: r.uom_type || "BASE",
    });
    setEditingId(r.id);
    setErrors({});
    setShowForm(true);
  };

  const openView = (r) => setShowView(r);

  const closeForm = () => setShowForm(false);

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = "Name is required";
    if (!form.uom_type) e.uom_type = "UOM Type is required";
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
      uom_type: form.uom_type,
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

  const confirmDelete = (r) => setDeleteItem(r);

  const handleDelete = async () => {
    if (!deleteItem) return;

    setSaving(true);
    try {
      const res = await authFetch(`${API}${deleteItem.id}/`, {
        method: "DELETE",
        headers: { Accept: "application/json" },
      });
      if (!res.ok && res.status !== 204)
        throw new Error(`Delete failed (${res.status})`);

      setRows((prev) => prev.filter((x) => x.id !== deleteItem.id));
    } catch (err) {
      setServerError(err.message || "Delete failed");
      await fetchList();
    } finally {
      setSaving(false);
      setDeleteItem(null);
    }
  };

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
          <h2>Unit of Measurement</h2>
          <p>Manage all available units of measurement</p>
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
                <th className="name-col">Name</th>
                <th className="desc-col">Description</th>

                {/* NEW COLUMN */}
                <th className="type-col">UOM Type</th>

                <th className="actions-col">Actions</th>
              </tr>
            </thead>

            <tbody>
              {rows.length ? (
                rows.map((r, index) => (
                  <tr key={r.id}>
                    <td className="slno-col">{index + 1}</td>
                    <td>{r.name}</td>
                    <td className="mfMuted">{r.description || "-"}</td>

                    {/* SHOW UOM TYPE */}
                    <td>{r.uom_type || "-"}</td>

                    <td className="mfActions">
                      <button className="mfIcon" onClick={() => openView(r)}>👁️</button>
                      <button className="mfIcon" onClick={() => openEdit(r)}>✎</button>
                      <button className="mfIcon danger" onClick={() => confirmDelete(r)}>🗑️</button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} style={{ padding: 16, textAlign: "center" }}>
                    No units yet. Click <strong>Add New</strong>.
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
              <h3>{editingId ? "Edit Unit" : "Add New Unit"}</h3>
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
                  placeholder="Enter unit name"
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

              {/* UOM Type Dropdown */}
              <label className="mfLabel">
                UOM Type <span className="mfReq">*</span>
                <select
                  name="uom_type"
                  className={`mfInput ${errors.uom_type ? "mfInputError" : ""}`}
                  value={form.uom_type}
                  onChange={handleChange}
                >
                  <option value="BASE">BASE</option>
                  <option value="PACK">PACK</option>
                   <option value="BOTH">BOTH</option>
                </select>
                {errors.uom_type && <div className="mfError">{errors.uom_type}</div>}
              </label>

              <div className="mfBtnRow">
                <button type="button" className="mfBtn" onClick={closeForm}>
                  Cancel
                </button>
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
              <h3>View Unit</h3>
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
                <span className="mfViewLabel">UOM Type</span>
                <span className="mfViewColon">:</span>
                <span className="mfViewValue">{showView.uom_type || "-"}</span>
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
              <button className="mfBtn" onClick={() => setShowView(null)}>
                Close
              </button>
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
              Are you sure you want to delete <strong>{deleteItem.name}</strong>?
            </div>

            <div className="mfBtnRow">
              <button className="mfBtn" onClick={() => setDeleteItem(null)}>
                Cancel
              </button>
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
