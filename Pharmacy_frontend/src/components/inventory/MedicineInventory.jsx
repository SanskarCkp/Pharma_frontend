import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./inventory.css";
import { authFetch } from "../../api/http";
import { apiUrl } from "../../api/base";
import { getDefaultLocationId } from "../../config/location";
import QuickAddMedicine from "./QuickAddMedicine";

const LS_KEY = "medicines";
const PAGE_SIZE = 250;
const DEFAULT_LOCATION_ID = getDefaultLocationId();

const API_GLOBAL = apiUrl("inventory/medicines/global/");
const API_STOCK_SUMMARY = apiUrl("inventory/stock-summary/");
const API_RACKS = apiUrl("inventory/rack-locations/");
const API_CATEGORIES = apiUrl("catalog/categories/");
const API_MEDICINE_DETAIL = (id) => apiUrl(`inventory/medicines/${id}/`);

export default function MedicineInventory() {
  const nav = useNavigate();
  const [rows, setRows] = useState([]);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [tab, setTab] = useState("all");
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [rackFilter, setRackFilter] = useState("All");
  const [rackOptions, setRackOptions] = useState([]);
  const [categoryOptions, setCategoryOptions] = useState([]);
  const [manualRefresh, setManualRefresh] = useState(0);
  const [quickAddOpen, setQuickAddOpen] = useState(false);

  const statusToParam = (value) => {
    if (!value || value === "All") return null;
    const normalized = value.toString().toUpperCase().replace(/\s+/g, "_");
    if (["IN_STOCK", "LOW_STOCK", "OUT_OF_STOCK", "EXPIRING"].includes(normalized)) {
      return normalized;
    }
    return normalized;
  };

  const triggerRefresh = () => setManualRefresh((prev) => prev + 1);

  useEffect(() => {
    const handler = () => triggerRefresh();
    window.addEventListener("inventory:refresh", handler);
    return () => window.removeEventListener("inventory:refresh", handler);
  }, []);

  useEffect(() => {
    async function loadMasters() {
      try {
        const [racksRes, catRes] = await Promise.all([
          authFetch(API_RACKS),
          authFetch(API_CATEGORIES),
        ]);
        const rackJson = await racksRes.json().catch(() => null);
        const catJson = await catRes.json().catch(() => null);
        setRackOptions(Array.isArray(rackJson) ? rackJson : rackJson?.results || []);
        setCategoryOptions(Array.isArray(catJson) ? catJson : catJson?.results || []);
      } catch (err) {
        console.warn("Failed to load rack/category masters", err);
      }
    }
    loadMasters();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query.trim()), 350);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    let cancelled = false;
    async function fetchRows() {
      setLoading(true);
      setServerError(null);
      try {
        const params = new URLSearchParams();
        params.set("page_size", String(PAGE_SIZE));
        if (debouncedQuery) params.set("q", debouncedQuery);
        if (categoryFilter && categoryFilter !== "All") params.set("category_id", categoryFilter);
        if (rackFilter && rackFilter !== "All") params.set("rack_id", rackFilter);
        if (DEFAULT_LOCATION_ID) params.set("location_id", String(DEFAULT_LOCATION_ID));
        const explicitStatus = statusToParam(statusFilter);
        const statusParam =
          tab === "low" ? "LOW_STOCK" : tab === "expiring" ? "EXPIRING" : explicitStatus;
        if (statusParam) params.set("status", statusParam);

        const url = params.toString() ? `${API_GLOBAL}?${params.toString()}` : API_GLOBAL;
        const res = await authFetch(url, { headers: { Accept: "application/json" } });
        if (!res.ok) throw new Error(`Failed (${res.status})`);
        const data = await res.json();
        if (cancelled) return;
        const list = Array.isArray(data) ? data : data?.results || data?.items || [];
        setRows(list);
        try {
          localStorage.setItem(LS_KEY, JSON.stringify(list));
        } catch {}
      } catch (err) {
        if (cancelled) return;
        console.error("Inventory fetch failed", err);
        setServerError("Backend offline → Showing saved data");
        try {
          const cached = localStorage.getItem(LS_KEY);
          setRows(cached ? JSON.parse(cached) : []);
        } catch {
          setRows([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchRows();
    return () => {
      cancelled = true;
    };
  }, [debouncedQuery, categoryFilter, statusFilter, rackFilter, tab, manualRefresh]);

  const getCategoryLabel = (row) =>
    row?.category?.name ||
    row?.category_label ||
    row?.category_name ||
    (typeof row?.category === "string" ? row.category : "") ||
    "";

  const categoriesForSelect = useMemo(() => {
    const unique = new Map();
    categoryOptions.forEach((cat) => {
      if (!cat) return;
      unique.set(String(cat.id), cat.name || cat.title || `Category ${cat.id}`);
    });
    rows.forEach((r) => {
      const id = r.category_id || r.category?.id;
      if (id && !unique.has(String(id))) {
        unique.set(String(id), getCategoryLabel(r) || `Category ${id}`);
      }
    });
    return Array.from(unique.entries());
  }, [categoryOptions, rows]);

  const getBaseQuantity = (row) => {
    const raw =
      row?.current_stock_base ??
      row?.quantity_base ??
      row?.quantity ??
      row?.current_stock ??
      row?.quantity_on_hand ??
      0;
    const num = Number(raw);
    return Number.isFinite(num) ? num : 0;
  };

  const getStatus = (row) => {
    const backendStatus = row.status || row.stock_status || row.stock_status_text;
    if (backendStatus) {
      const bs = String(backendStatus).toUpperCase();
      if (bs.includes("OUT")) return "Out of Stock";
      if (bs.includes("LOW") || bs.includes("CRITICAL")) return "Low Stock";
      if (bs.includes("EXPIR") || bs.includes("WARN")) return "Expiring";
      return "In Stock";
    }
    const qty = getBaseQuantity(row);
    if (qty <= 0) return "Out of Stock";
    if (qty <= 30) return "Low Stock";
    return "In Stock";
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this medicine?")) return;
    setDeleting(true);
    setServerError(null);
    try {
      const next = rows.filter((r) => r.id !== id && r.batch_id !== id);
      setRows(next);
      try {
        localStorage.setItem(LS_KEY, JSON.stringify(next));
      } catch {}
    } catch (err) {
      console.error(err);
      setServerError("Delete failed");
    } finally {
      setDeleting(false);
    }
  };

  const currency = (n) => {
    if (n == null || n === "" || Number.isNaN(Number(n))) return "";
    return `₹${Number(n).toFixed(2)}`;
  };

  const resolveBatchId = (row) => row?.batch_id || row?.batchId || row?.id;

  const fetchMedicineDetail = async (row) => {
    const batchId = resolveBatchId(row);
    if (!batchId) {
      throw new Error("Unable to determine batch for this row.");
    }
    const params = new URLSearchParams();
    if (DEFAULT_LOCATION_ID) params.set("location_id", String(DEFAULT_LOCATION_ID));
    const url = params.toString()
      ? `${API_MEDICINE_DETAIL(batchId)}?${params.toString()}`
      : API_MEDICINE_DETAIL(batchId);
    const res = await authFetch(url, { headers: { Accept: "application/json" } });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || `Failed (${res.status})`);
    }
    return res.json();
  };

  const goToDetail = (row) => {
    const batchId = resolveBatchId(row);
    if (!batchId) {
      alert("Unable to open details for this record.");
      return;
    }
    nav(`/inventory/medicines/${batchId}`);
  };

  const handleEdit = (row) => {
    const batchId = resolveBatchId(row);
    if (!batchId) {
      alert("Unable to determine batch for editing.");
      return;
    }
    nav(`/inventory/medicines/${batchId}/edit`);
  };

  const openAddDrawer = () => nav("/inventory/medicines/add");

  const handleQuickAddSaved = (body) => {
    triggerRefresh();
    // Optional: show success message
    console.log("Medicine added successfully:", body);
  };

  const fetchStockSummaryForProduct = async (row) => {
    try {
      const params = new URLSearchParams();
      if (DEFAULT_LOCATION_ID) params.set("location_id", String(DEFAULT_LOCATION_ID));
      const pid = row.product_id || row.batch_lot__product_id || row.medicine_id;
      if (!pid) return alert("Product id not available for this row");
      params.set("product_id", String(pid));
      const res = await authFetch(`${API_STOCK_SUMMARY}?${params}`);
      if (!res.ok) throw new Error(`Failed (${res.status})`);
      const data = await res.json();
      alert("Stock summary:\n\n" + JSON.stringify(data, null, 2));
    } catch (err) {
      console.error(err);
      alert("Failed to load stock summary");
    }
  };

  const handleTabChange = (next) => {
    setTab(next);
    if (next !== "all") {
      setStatusFilter("All");
    }
  };

  return (
    <div className="inv-wrap">
      <div className="inv-header">
        <div>
          <h2>Inventory Management</h2>
          <p>Manage your medicine inventory and stock levels</p>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '10px' }}>
          <button
            className="inv-add"
            style={{ background: '#06b6d4', marginLeft: 0 }}
            onClick={() => setQuickAddOpen(true)}
            disabled={loading || deleting}
          >
            Quick Add
          </button>
          <button className="inv-add" onClick={openAddDrawer} disabled={loading || deleting}>
            + Add Medicine
          </button>
        </div>
      </div>

      <div className="inv-card">
        {serverError && <div style={{ color: "crimson", padding: 8 }}>{serverError}</div>}

        <div className="inv-filters">
          <div className="inv-search">
            <span className="inv-search-icon">🔍</span>
            <input
              type="text"
              placeholder="Search by medicine, batch or supplier..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="inv-select"
          >
            <option value="All">All Categories</option>
            {categoriesForSelect.map(([id, label]) => (
              <option key={id} value={id}>
                {label}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="inv-select"
            disabled={tab !== "all"}
          >
            {[
              ["All", "All"],
              ["In Stock", "In Stock"],
              ["Low Stock", "Low Stock"],
              ["Out of Stock", "Out of Stock"],
              ["Expiring", "Expiring"],
            ].map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>

          <select value={rackFilter} onChange={(e) => setRackFilter(e.target.value)} className="inv-select">
            <option value="All">All Racks</option>
            {rackOptions.map((rack) => (
              <option key={rack.id} value={rack.id}>
                {rack.name}
              </option>
            ))}
          </select>

          <div className="inv-actions">
            <button className="inv-btn ghost" onClick={() => alert("Import feature not yet implemented")}>
              Import
            </button>
            <button
              className="inv-btn brown"
              onClick={() => {
                const csvRows = [
                  ["Medicine ID", "Batch", "Name", "Category", "Quantity", "MRP", "Expiry", "Status"],
                  ...rows.map((r) => [
                    r.medicine_id,
                    r.batch_number,
                    r.medicine_name,
                    getCategoryLabel(r),
                    getBaseQuantity(r),
                    r.mrp,
                    r.expiry_date,
                    getStatus(r),
                  ]),
                ];
                const csv = csvRows
                  .map((cols) => cols.map((c) => `"${(c ?? "").toString().replace(/"/g, '""')}"`).join(","))
                  .join("\n");
                const blob = new Blob([csv], { type: "text/csv" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = "inventory_export.csv";
                a.click();
                URL.revokeObjectURL(url);
              }}
            >
              Export
            </button>
          </div>
        </div>

        <div className="inv-tabs">
          <button className={`inv-tab ${tab === "all" ? "active" : ""}`} onClick={() => handleTabChange("all")}>
            All Products
          </button>
          <button className={`inv-tab ${tab === "low" ? "active" : ""}`} onClick={() => handleTabChange("low")}>
            Low Stock
          </button>
          <button
            className={`inv-tab ${tab === "expiring" ? "active" : ""}`}
            onClick={() => handleTabChange("expiring")}
          >
            Expiring Stock
          </button>
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
                  <th>UOM / Rack</th>
                  <th>Price (₹)</th>
                  <th>Expiry</th>
                  <th>Status</th>
                  <th style={{ width: 180, textAlign: "center" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.length ? (
                  rows.map((r) => {
                    const status = getStatus(r);
                    const categoryLabel = getCategoryLabel(r);
                    const rowKey =
                      r.id ?? r.batch_id ?? `${r.product_id || r.medicine_id || "row"}-${r.batch_number || "na"}`;
                    const quantityValue = getBaseQuantity(r);
                    const uomLabel = r.uom || r.base_uom?.name || r.quantity_uom?.name || "";
                    const rackLabel = r.rack || r.rack_name || r.rack_no || "";

                    return (
                      <tr key={rowKey}>
                        <td>{r.medicine_id ?? r.batch_lot__product__code ?? ""}</td>
                        <td>{r.batch_number ?? r.batch_lot__batch_no ?? ""}</td>
                        <td>{r.medicine_name ?? r.batch_lot__product__name ?? ""}</td>
                        <td>{categoryLabel}</td>
                        <td>{quantityValue}</td>
                        <td>{[uomLabel, rackLabel].filter(Boolean).join(" / ")}</td>
                        <td>{currency(r.mrp ?? r.batch_lot__product__mrp)}</td>
                        <td>{r.expiry_date ? new Date(r.expiry_date).toLocaleDateString() : ""}</td>
                        <td>
                          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                            <span
                              className={`badge ${
                                status === "In Stock" ? "green" : status === "Low Stock" ? "amber" : status === "Expiring" ? "amber" : "red"
                              }`}
                            >
                              {status}
                            </span>
                            {r.is_expiring && (
                              <span className="badge amber" style={{ fontSize: 11 }}>
                                Expiring soon
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="inv-actions-cell">
                          <button className="inv-icon" title="View details" onClick={() => goToDetail(r)}>
                            View
                          </button>
                          <button className="inv-icon" title="Edit" onClick={() => handleEdit(r)}>
                            Edit
                          </button>
                          <button className="inv-icon" title="Stock summary" onClick={() => fetchStockSummaryForProduct(r)}>
                            Stats
                          </button>
                          <button
                            className="inv-icon danger"
                            title="Delete"
                            onClick={() => handleDelete(r.id)}
                            disabled={deleting}
                          >
                            Del
                          </button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={10} style={{ textAlign: "center", padding: 14 }}>
                      No medicines found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Quick Add Modal */}
      <QuickAddMedicine
        open={quickAddOpen}
        onClose={() => setQuickAddOpen(false)}
        onSaved={handleQuickAddSaved}
      />
    </div>
  );
}
