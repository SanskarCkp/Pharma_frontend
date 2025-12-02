import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./inventory.css";
import { authFetch } from "../../api/http";

const LS_KEY = "medicines";

// Normalize VITE_API_URL
const rawBase = import.meta.env.VITE_API_URL || "";
const normalizeBase = (u) =>
  u.trim().replace(/\/+$/g, "").replace(/\/api\/v1$/i, "");
const API_BASE = normalizeBase(rawBase);

// API URLs (use location_id=1 as default; you can parametrize)
const LOCATION_ID = 1;
const API_ALL = `${API_BASE}/api/v1/inventory/medicines/?location_id=${LOCATION_ID}`;
const API_LOW = `${API_BASE}/api/v1/inventory/low-stock/?location_id=${LOCATION_ID}`;
const API_EXPIRING = `${API_BASE}/api/v1/inventory/expiring/?window=warning&location_id=${LOCATION_ID}`;
const API_BATCHES = `${API_BASE}/api/v1/inventory/batches/`;
const API_STOCK_ON_HAND = `${API_BASE}/api/v1/inventory/stock-on-hand/`;
const API_STOCK_SUMMARY = `${API_BASE}/api/v1/inventory/stock-summary/`;
const API_EXPIRY_ALERTS = `${API_BASE}/api/v1/inventory/expiry-alerts/`;
const API_MOVEMENTS_LIST = `${API_BASE}/api/v1/inventory/movements/list`;
const API_STATS = `${API_BASE}/api/v1/inventory/stats/`;
const API_ADD_MEDICINE = `${API_BASE}/api/v1/inventory/add-medicine/`;
const API_MOVEMENTS = `${API_BASE}/api/v1/inventory/movements/`;

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

  // modal / details
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [selected, setSelected] = useState(null);
  const [batches, setBatches] = useState([]);
  const [batchStockMap, setBatchStockMap] = useState({}); // batch_id -> stock_on_hand
  const [expiryAlertsSummary, setExpiryAlertsSummary] = useState(null);

  // -----------------------------
  // GET API URL BASED ON TAB
  // -----------------------------
  const getListAPI = () => {
    if (tab === "low") return API_LOW;
    if (tab === "expiring") return API_EXPIRING;
    return API_ALL;
  };

  // -----------------------------
  // FETCH MEDICINES
  // -----------------------------
  useEffect(() => {
    const fetchList = async () => {
      setLoading(true);
      setServerError(null);

      const URL = getListAPI();
      try {
        const res = await authFetch(URL, { headers: { Accept: "application/json" } });

        if (!res.ok) throw new Error(`Failed to load (${res.status})`);

        const data = await res.json();
        // backend sometimes returns array or paginated results
        const list = Array.isArray(data) ? data : data?.results || [];

        setRows(list);

        try {
          localStorage.setItem(LS_KEY, JSON.stringify(list));
        } catch {}
      } catch (err) {
        console.error(err);
        setServerError("Backend offline → Showing saved data");

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
  }, [tab]); // refetch when tab changes

  // -----------------------------
  // Derived categories from rows
  // -----------------------------
  const categories = useMemo(() => {
    const set = new Set(rows.map((r) => r.category).filter(Boolean));
    return ["All", ...Array.from(set)];
  }, [rows]);

  // -----------------------------
  // Determine status (client fallback)
  // Prefer backend status where provided (e.g., low-stock endpoint)
  // -----------------------------
  const getStatus = (r) => {
    // Use backend-provided status if exists
    const backendStatus = r.status || r.stock_status || r.stock_status_text;
    if (backendStatus) {
      // normalize common values
      const bs = String(backendStatus).toLowerCase();
      if (bs.includes("out") || bs.includes("out_of")) return "Out of Stock";
      if (bs.includes("low") || bs.includes("critical")) return "Low Stock";
      return "In Stock";
    }

    const qty = Number(r.quantity ?? r.quantity_base ?? r.current_stock_base ?? 0);
    if (qty <= 0) return "Out of Stock";
    if (qty <= 30) return "Low Stock"; // simple fallback threshold
    return "In Stock";
  };

  const isExpiringSoon = (dateStr) => {
    if (!dateStr) return false;
    const today = new Date();
    const d = new Date(dateStr);
    const diff = (d - today) / (1000 * 60 * 60 * 24);
    return diff >= 0 && diff <= 60; // within 60 days
  };

  // -----------------------------
  // FILTERS
  // -----------------------------
  const filtered = rows.filter((r) => {
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

  // -----------------------------
  // Delete (local only for now)
  // -----------------------------
  const handleDelete = async (id) => {
    if (!window.confirm("Delete this medicine?")) return;
    setDeleting(true);
    setServerError(null);

    try {
      // optimistic remove from UI/localStorage
      const next = rows.filter((r) => r.id !== id);
      setRows(next);

      try {
        localStorage.setItem(LS_KEY, JSON.stringify(next));
      } catch {}

      // If you want to call backend delete, do it here (endpoint not provided in backend file)
      // const resp = await authFetch(`${API_BASE}/api/v1/inventory/medicines/${id}/`, { method: 'DELETE' });
      // if (!resp.ok) throw new Error('Delete failed on server');
    } catch (err) {
      console.error(err);
      setServerError("Delete failed");
    } finally {
      setDeleting(false);
    }
  };

  // -----------------------------
  // Currency helper
  // -----------------------------
  const currency = (n) => (n == null || n === "" ? "" : `₹${Number(n).toFixed(2)}`);

  // -----------------------------
  // Details modal helpers
  // -----------------------------
  const openDetails = async (row) => {
    setSelected(row);
    setDetailOpen(true);
    setDetailLoading(true);
    setBatches([]);
    setBatchStockMap({});
    setExpiryAlertsSummary(null);

    try {
      // 1) Try fetch batches for the product (filter by product_id if backend supports)
      // backend batches endpoint accepts product_id as query param per views file.
      const prodId = row.batch_lot__product_id || row.product_id || row.medicine_id || row.medicine_id;
      const batchesUrl = `${API_BATCHES}?product_id=${encodeURIComponent(prodId)}&status=ACTIVE`;
      const bRes = await authFetch(batchesUrl, { headers: { Accept: "application/json" } });
      if (bRes.ok) {
        const bData = await bRes.json();
        const bList = Array.isArray(bData) ? bData : bData?.results || [];
        setBatches(bList);
      } else {
        // fallback: try using single row batch info if present
        setBatches(
          row.batch_lot_id
            ? [
                {
                  id: row.batch_lot_id,
                  product_id: prodId,
                  batch_no: row.batch_number || row.batch_lot__batch_no,
                  expiry_date: row.expiry_date || row.batch_lot__expiry_date,
                  rack_no: row.rack_no || row.rack,
                },
              ]
            : []
        );
      }

      // 2) For each batch, fetch stock-on-hand (if batch ids exist)
      const batchList = (batches.length && batches) || [];
      // if batches from above are empty, use row.batch_lot_id
      const toCheck = batchList.length ? batchList : row.batch_lot_id ? [{ id: row.batch_lot_id }] : [];

      const stockMap = {};
      for (const b of toCheck) {
        const params = new URLSearchParams();
        params.set("location_id", String(LOCATION_ID));
        if (b.id) params.set("batch_lot_id", String(b.id));
        // call stock-on-hand endpoint
        try {
          const sres = await authFetch(`${API_STOCK_ON_HAND}?${params.toString()}`, {
            headers: { Accept: "application/json" },
          });
          if (sres.ok) {
            const sjson = await sres.json();
            // backend returns {"qty_base": "123.000"} per views
            const qty = Number(sjson.qty_base ?? sjson.qty ?? 0);
            stockMap[b.id] = qty;
          }
        } catch (e) {
          // ignore per-batch failures
        }
      }
      setBatchStockMap(stockMap);

      // 3) Fetch expiry alerts summary (global or for product)
      try {
        const eparams = new URLSearchParams();
        eparams.set("location_id", String(LOCATION_ID));
        // if backend supports product filter on expiry-alerts, include product id (not guaranteed)
        if (prodId) eparams.set("product_id", String(prodId));
        const eres = await authFetch(`${API_EXPIRY_ALERTS}?${eparams.toString()}`, { headers: { Accept: "application/json" } });
        if (eres.ok) {
          const ej = await eres.json();
          setExpiryAlertsSummary(ej || null);
        }
      } catch (e) {
        // ignore
      }
    } catch (err) {
      console.error("Details fetch failed", err);
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDetails = () => {
    setDetailOpen(false);
    setSelected(null);
    setBatches([]);
    setBatchStockMap({});
    setExpiryAlertsSummary(null);
  };

  // -----------------------------
  // Quick action: view stock summary for product (stock-summary endpoint)
  // -----------------------------
  const fetchStockSummaryForProduct = async (row) => {
    try {
      const params = new URLSearchParams();
      params.set("location_id", String(LOCATION_ID));
      // try to get product id from common fields used by backend
      const pid = row.batch_lot__product_id || row.product_id || row.medicine_id || row.product;
      if (!pid) return alert("Product id not available for this row");
      params.set("product_id", String(pid));
      const res = await authFetch(`${API_STOCK_SUMMARY}?${params.toString()}`);
      if (!res.ok) throw new Error(`Failed (${res.status})`);
      const data = await res.json();
      alert("Stock summary:\n\n" + JSON.stringify(data, null, 2));
    } catch (err) {
      console.error(err);
      alert("Failed to load stock summary");
    }
  };

  // -----------------------------
  // Render
  // -----------------------------
  return (
    <div className="inv-wrap">
      <div className="inv-header">
        <div>
          <h2>Inventory Management</h2>
          <p>Manage your medicine inventory and stock levels</p>
        </div>
        <button className="inv-add" onClick={() => nav("/inventory/medicines/add")} disabled={loading || deleting}>
          <span>＋</span> Add Medicine
        </button>
      </div>

      <div className="inv-card">
        {serverError && <div style={{ color: "crimson", padding: 8 }}>{serverError}</div>}

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

          <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="inv-select">
            {categories.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>

          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="inv-select">
            {["All", "In Stock", "Low Stock", "Out of Stock"].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>

          <div className="inv-actions">
            <button
              className="inv-btn ghost"
              onClick={async () => {
                // Quick import/export placeholders - implement as needed
                alert("Import feature not yet implemented");
              }}
            >
              ⬇️ Import
            </button>
            <button
              className="inv-btn brown"
              onClick={async () => {
                // Simple export to CSV of visible rows
                const csvRows = [
                  ["Medicine ID", "Batch", "Name", "Category", "Quantity", "MRP", "Expiry", "Status"],
                  ...filtered.map((r) => [
                    r.medicine_id,
                    r.batch_number,
                    r.medicine_name,
                    r.category,
                    r.quantity,
                    r.mrp,
                    r.expiry_date,
                    getStatus(r),
                  ]),
                ];
                const csv = csvRows.map((cols) => cols.map((c) => `"${(c ?? "").toString().replace(/"/g, '""')}"`).join(",")).join("\n");
                const blob = new Blob([csv], { type: "text/csv" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = "inventory_export.csv";
                a.click();
                URL.revokeObjectURL(url);
              }}
            >
              ⬆️ Export
            </button>
          </div>
        </div>

        {/* TABS */}
        <div className="inv-tabs">
          <button className={`inv-tab ${tab === "all" ? "active" : ""}`} onClick={() => setTab("all")}>
            All Products
          </button>
          <button className={`inv-tab ${tab === "low" ? "active" : ""}`} onClick={() => setTab("low")}>
            Low Stock
          </button>
          <button className={`inv-tab ${tab === "expiring" ? "active" : ""}`} onClick={() => setTab("expiring")}>
            Expiring Stock
          </button>
        </div>

        {/* TABLE */}
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
                  <th style={{ width: 160, textAlign: "center" }}>Actions</th>
                </tr>
              </thead>

              <tbody>
                {filtered.length ? (
                  filtered.map((r) => {
                    const status = getStatus(r);

                    return (
                      <tr key={r.id}>
                        <td>{r.medicine_id ?? r.batch_lot__product__code ?? ""}</td>
                        <td>{r.batch_number ?? r.batch_lot__batch_no ?? ""}</td>
                        <td>{r.medicine_name ?? r.batch_lot__product__name ?? ""}</td>
                        <td>{r.category}</td>
                        <td>{r.quantity ?? r.quantity_base ?? r.current_stock_base ?? ""}</td>
                        <td>
                          {(r.quantity_uom && r.quantity_uom.name) || r.uom || r.base_uom?.name || r.rack || r.rack_no || ""}
                        </td>
                        <td>{currency(r.mrp ?? r.batch_lot__product__mrp)}</td>
                        <td>{r.expiry_date ? new Date(r.expiry_date).toLocaleDateString() : ""}</td>

                        <td>
                          <span
                            className={`badge ${
                              status === "In Stock" ? "green" : status === "Low Stock" ? "amber" : "red"
                            }`}
                          >
                            {status}
                          </span>
                        </td>

                        <td className="inv-actions-cell">
                          <button
                            className="inv-icon"
                            title="View details"
                            onClick={() => {
                              openDetails(r);
                            }}
                          >
                            👁️
                          </button>

                          <button
                            className="inv-icon"
                            title="Stock summary"
                            onClick={() => fetchStockSummaryForProduct(r)}
                          >
                            📊
                          </button>

                          <button
                            className="inv-icon danger"
                            title="Delete"
                            onClick={() => handleDelete(r.id)}
                            disabled={deleting}
                          >
                            🗑️
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

      {/* DETAILS MODAL */}
      {detailOpen && (
        <div className="inv-modal-backdrop" onClick={closeDetails}>
          <div className="inv-modal" onClick={(e) => e.stopPropagation()}>
            <div className="inv-modal-header">
              <h3>Medicine details</h3>
              <button onClick={closeDetails} className="inv-close">
                ×
              </button>
            </div>

            <div className="inv-modal-body">
              {detailLoading ? (
                <div>Loading details...</div>
              ) : (
                <>
                  <div style={{ marginBottom: 12 }}>
                    <b>{selected?.medicine_name ?? selected?.batch_lot__product__name}</b>
                    <div style={{ fontSize: 13, color: "#666" }}>
                      ID: {selected?.medicine_id ?? selected?.batch_lot__product__code ?? ""}
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                    <div>
                      <div className="small-muted">Category</div>
                      <div>{selected?.category || "-"}</div>
                    </div>

                    <div>
                      <div className="small-muted">Manufacturer</div>
                      <div>{selected?.manufacturer || selected?.batch_lot__product__manufacturer || "-"}</div>
                    </div>

                    <div>
                      <div className="small-muted">MRP</div>
                      <div>{currency(selected?.mrp ?? selected?.batch_lot__product__mrp)}</div>
                    </div>

                    <div>
                      <div className="small-muted">Quantity (UI)</div>
                      <div>{selected?.quantity ?? selected?.current_stock_base ?? "-"}</div>
                    </div>

                    <div>
                      <div className="small-muted">Expiry</div>
                      <div>{selected?.expiry_date ? new Date(selected.expiry_date).toLocaleDateString() : "-"}</div>
                    </div>
                  </div>

                  <hr style={{ margin: "12px 0" }} />

                  <div>
                    <h4>Batches</h4>
                    {batches && batches.length ? (
                      <table style={{ width: "100%", borderCollapse: "collapse" }}>
                        <thead>
                          <tr>
                            <th style={{ textAlign: "left" }}>Batch No</th>
                            <th>Expiry</th>
                            <th>Initial Qty</th>
                            <th>Stock On Hand</th>
                            <th>Rack</th>
                          </tr>
                        </thead>
                        <tbody>
                          {batches.map((b) => (
                            <tr key={b.id}>
                              <td style={{ padding: "6px 4px" }}>{b.batch_no || b.batch_number || ""}</td>
                              <td style={{ padding: "6px 4px" }}>{b.expiry_date ? new Date(b.expiry_date).toLocaleDateString() : ""}</td>
                              <td style={{ padding: "6px 4px" }}>{b.initial_quantity ?? b.initial_quantity_base ?? "-"}</td>
                              <td style={{ padding: "6px 4px" }}>
                                {batchStockMap[b.id] != null ? `${batchStockMap[b.id]}` : "—"}
                              </td>
                              <td style={{ padding: "6px 4px" }}>{b.rack_no || b.rack || "-"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <div>No batches found</div>
                    )}
                  </div>

                  <hr style={{ margin: "12px 0" }} />

                  <div>
                    <h4>Expiry Alerts (summary)</h4>
                    {expiryAlertsSummary ? (
                      <pre style={{ whiteSpace: "pre-wrap", fontSize: 13 }}>{JSON.stringify(expiryAlertsSummary, null, 2)}</pre>
                    ) : (
                      <div>No expiry alerts found / not available</div>
                    )}
                  </div>
                </>
              )}
            </div>

            <div className="inv-modal-footer">
              <button onClick={closeDetails} className="inv-btn">Close</button>
              <button
                className="inv-btn"
                onClick={() => {
                  // quick navigate to receive page for this product (if your app has one)
                  const pid = selected?.batch_lot__product_id || selected?.product_id || selected?.medicine_id;
                  if (!pid) return alert("Product id not available");
                  nav(`/inventory/receive?product_id=${pid}`);
                }}
              >
                Receive Stock
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
