import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./inventory.css";
import { authFetch } from "../../api/http";

const LS_KEY = "medicines";

// Normalize VITE_API_URL so both of these work:
//  - http://127.0.0.1:8000
//  - http://127.0.0.1:8000/api/v1
const rawBase = import.meta.env.VITE_API_URL || "";
const normalizeBase = (u) =>
  u
    .trim()
    .replace(/\/+$/g, "")
    .replace(/\/api\/v1$/i, "");
const API_BASE = normalizeBase(rawBase);
const LIST_API = API_BASE
  ? `${API_BASE}/api/v1/inventory/medicines/?location_id=1`
  : "/api/v1/inventory/medicines/?location_id=1";

export default function MedicineInventory() {
  const nav = useNavigate();
  const [rows, setRows] = useState([]);
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [tab, setTab] = useState("all"); // all | low | expiring
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // load medicines from backend (falls back to localStorage if backend fails)
  useEffect(() => {
    const fetchList = async () => {
      setLoading(true);
      setServerError(null);
      try {
        const res = await authFetch(LIST_API, { headers: { Accept: "application/json" } });
        if (!res.ok) throw new Error(`Failed to load (${res.status})`);
        const data = await res.json();
        const list = Array.isArray(data) ? data : data?.results || [];
        setRows(list);
        try { localStorage.setItem(LS_KEY, JSON.stringify(list)); } catch {}
      } catch (err) {
        console.error(err);
        setServerError(err.message || "Error loading medicines, falling back to localStorage");
        // fallback to localStorage
        try {
          const raw = localStorage.getItem(LS_KEY);
          setRows(raw ? JSON.parse(raw) : []);
        } catch {
          setRows([]);
        }
      } finally {
        setLoading(false);
      }
    };
    fetchList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const categories = useMemo(() => {
    const set = new Set(rows.map(r => r.category).filter(Boolean));
    return ["All", ...Array.from(set)];
  }, [rows]);

  const getStatus = (r) => {
    if (Number(r.quantity) <= 0) return "Out of Stock";
    if (Number(r.quantity) <= 30) return "Low Stock";
    return "In Stock";
  };

  const isExpiringSoon = (dateStr) => {
    if (!dateStr) return false;
    const today = new Date();
    const d = new Date(dateStr);
    const diff = (d - today) / (1000 * 60 * 60 * 24);
    return diff >= 0 && diff <= 60; // within 60 days
  };

  const filtered = rows.filter(r => {
    const matchesSearch =
      !query ||
      `${r.medicine_id || ""} ${r.batch_number || ""} ${r.medicine_name || ""} ${r.category || ""} ${r.manufacturer || ""}`
        .toLowerCase()
        .includes(query.toLowerCase());

    const matchesCategory = categoryFilter === "All" || r.category === categoryFilter;

    const s = getStatus(r);
    const matchesStatus = statusFilter === "All" || s === statusFilter;

    const tabOk =
      tab === "all" ||
      (tab === "low" && (s === "Low Stock" || s === "Out of Stock")) ||
      (tab === "expiring" && isExpiringSoon(r.expiry_date));

    return matchesSearch && matchesCategory && matchesStatus && tabOk;
  });

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this medicine?")) return;
    setDeleting(true);
    setServerError(null);
    try {
      // backend delete is not wired yet; keep local delete only
      if (!res.ok && res.status !== 204) throw new Error(`Delete failed (${res.status})`);
      const next = rows.filter(r => r.id !== id);
      setRows(next);
      try { localStorage.setItem(LS_KEY, JSON.stringify(next)); } catch {}
    } catch (err) {
      console.error(err);
      setServerError(err.message || "Delete failed");
    } finally {
      setDeleting(false);
    }
  };

  const currency = (n) => (n === "" || n == null ? "" : `₹${Number(n).toFixed(2)}`);

return (
  <div className="inv-wrap">
    <div className="inv-header">
      <div>
        <h2>Inventory Management</h2>
        <p>Manage your medicine inventory and stock levels</p>
      </div>
      <button
        className="inv-add"
        onClick={() => nav("/inventory/medicines/add")}
        disabled={loading || deleting}
      >
        <span>＋</span> Add Medicine
      </button>
    </div>

    <div className="inv-card">
      <div className="inv-filters">
        <div className="inv-search">
          <span className="inv-search-icon">🔍</span>
          <input
            type="text"
            placeholder="Search by medicine name or supplier..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="inv-select"
        >
          {categories.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="inv-select"
        >
          {["All", "In Stock", "Low Stock", "Out of Stock"].map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>

        <div className="inv-actions">
          <button className="inv-btn ghost">⬇️ Import</button>
          <button className="inv-btn brown">⬆️ Export</button>
        </div>
      </div>

      <div className="inv-tabs">
        <button className={`inv-tab ${tab === "all" ? "active" : ""}`} onClick={() => setTab("all")}>All Products</button>
        <button className={`inv-tab ${tab === "low" ? "active" : ""}`} onClick={() => setTab("low")}>Low Stock</button>
        <button className={`inv-tab ${tab === "expiring" ? "active" : ""}`} onClick={() => setTab("expiring")}>Expiring Stock</button>
      </div>

      <div className="inv-table-wrap">
        {loading ? (
          <div style={{ padding: 20 }}>Loading...</div>
        ) : (
          <table className="inv-table">
            <thead>
              <tr>
                <th>Medicine ID</th>
                <th>Batch Number</th>
                <th>Medicine Name</th>
                <th>Category</th>
                <th>Stock</th>
                <th>Price (₹)</th>
                <th>Expiry Date</th>
                <th>Status</th>
                <th style={{ width: 96, textAlign: "center" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length ? (
                filtered.map((r) => {
                  const status = getStatus(r);
                  return (
                    <tr key={r.id}>
                      <td>{r.medicine_id}</td>
                      <td>{r.batch_number}</td>
                      <td>{r.medicine_name}</td>
                      <td>{r.category}</td>
                      <td>{r.quantity}</td>
                      <td>{currency(r.mrp)}</td>
                      <td>{r.expiry_date ? new Date(r.expiry_date).toLocaleDateString() : ""}</td>
                      <td>
                        <span className={`badge ${
                          status === "In Stock" ? "green"
                          : status === "Low Stock" ? "amber"
                          : "red"
                        }`}>
                          {status}
                        </span>
                      </td>
                      <td className="inv-actions-cell">
                        <button className="inv-icon" title="View" onClick={() => alert(JSON.stringify(r, null, 2))}>👁️</button>
                        <button className="inv-icon danger" title="Delete" onClick={() => handleDelete(r.id)} disabled={deleting}>🗑️</button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={9} style={{ textAlign: "center", padding: 14 }}>
                    No medicines yet. Click <strong>Add Medicine</strong>.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  </div>
);
}