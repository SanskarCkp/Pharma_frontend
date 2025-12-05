import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./inventory.css";
import { authFetch } from "../../api/http";
import { apiUrl } from "../../api/base";

const LS_KEY = "medicines";
const LOCATION_ID_FALLBACK = Number(import.meta.env.VITE_DEFAULT_LOCATION_ID || 1);

const API_GLOBAL = apiUrl("inventory/medicines/global/");
const API_BATCHES = apiUrl("inventory/batches/");
const API_STOCK_ON_HAND = apiUrl("inventory/stock-on-hand/");
const API_STOCK_SUMMARY = apiUrl("inventory/stock-summary/");
const API_EXPIRY_ALERTS = apiUrl("inventory/expiry-alerts/");
const API_RACKS = apiUrl("inventory/rack-locations/");
const API_CATEGORIES = apiUrl("catalog/categories/");

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
  const [locationFilter, setLocationFilter] = useState("");

  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [selected, setSelected] = useState(null);
  const [batches, setBatches] = useState([]);
  const [batchStockMap, setBatchStockMap] = useState({});
  const [expiryAlertsSummary, setExpiryAlertsSummary] = useState(null);

  useEffect(() => {
    async function loadMasters() {
      try {
        const [racksRes, catRes] = await Promise.all([authFetch(API_RACKS), authFetch(API_CATEGORIES)]);
        const rackJson = await racksRes.json().catch(() => null);
        const catJson = await catRes.json().catch(() => null);
        setRackOptions(
          Array.isArray(rackJson)
            ? rackJson
            : rackJson?.results || rackJson?.items || []
        );
        setCategoryOptions(
          Array.isArray(catJson)
            ? catJson
            : catJson?.results || catJson?.items || []
        );
      } catch (err) {
        console.warn("Failed to load rack/category masters", err);
      }
    }
    loadMasters();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query.trim());
    }, 350);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    let cancelled = false;
    async function fetchRows() {
      setLoading(true);
      setServerError(null);
      try {
        const params = new URLSearchParams();
        if (debouncedQuery) params.set("q", debouncedQuery);
        if (categoryFilter && categoryFilter !== "All") params.set("category_id", categoryFilter);
        if (rackFilter && rackFilter !== "All") params.set("rack_id", rackFilter);
        if (locationFilter) params.set("location_id", locationFilter);
        const statusParam =
          tab === "low"
            ? "LOW_STOCK"
            : tab === "expiring"
            ? "EXPIRING"
            : statusFilter !== "All"
            ? statusFilter
            : null;
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
        console.error(err);
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
  }, [debouncedQuery, categoryFilter, statusFilter, rackFilter, locationFilter, tab]);

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

  const getStatus = (r) => {
    const backendStatus = r.status || r.stock_status || r.stock_status_text;
    if (backendStatus) {
      const bs = String(backendStatus).toUpperCase();
      if (bs.includes("OUT")) return "Out of Stock";
      if (bs.includes("LOW") || bs.includes("CRITICAL")) return "Low Stock";
      return "In Stock";
    }
    const qty = Number(r.quantity ?? r.quantity_base ?? r.current_stock_base ?? 0);
    if (qty <= 0) return "Out of Stock";
    if (qty <= 30) return "Low Stock";
    return "In Stock";
  };

  const filteredRows = rows;

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

  const currency = (n) => (n == null || n === "" ? "" : `₹${Number(n).toFixed(2)}`);

  const openDetails = async (row) => {
    setSelected(row);
    setDetailOpen(true);
    setDetailLoading(true);
    setBatches([]);
    setBatchStockMap({});
    setExpiryAlertsSummary(null);
    const effectiveLocation = Number(locationFilter) || LOCATION_ID_FALLBACK;

    try {
      const prodId = row.product_id || row.batch_lot__product_id;
      const batchesUrl = `${API_BATCHES}?product_id=${encodeURIComponent(prodId || "")}&status=ACTIVE`;
      const batchRes = await authFetch(batchesUrl, { headers: { Accept: "application/json" } });
      let batchList = [];
      if (batchRes.ok) {
        const batchJson = await batchRes.json();
        batchList = Array.isArray(batchJson) ? batchJson : batchJson?.results || [];
      } else if (row.batch_lot_id) {
        batchList = [
          {
            id: row.batch_lot_id,
            product_id: prodId,
            batch_no: row.batch_number || row.batch_lot__batch_no,
            expiry_date: row.expiry_date || row.batch_lot__expiry_date,
            rack_no: row.rack_no || row.rack,
          },
        ];
      }
      setBatches(batchList);

      const stockMap = {};
      const targetBatches =
        batchList.length > 0
          ? batchList
          : row.batch_lot_id
          ? [{ id: row.batch_lot_id }]
          : [];

      for (const b of targetBatches) {
        const params = new URLSearchParams();
        params.set("location_id", String(effectiveLocation));
        if (b.id) params.set("batch_lot_id", String(b.id));
        try {
          const sres = await authFetch(`${API_STOCK_ON_HAND}?${params.toString()}`, {
            headers: { Accept: "application/json" },
          });
          if (sres.ok) {
            const sjson = await sres.json();
            const qty = Number(sjson.qty_base ?? sjson.qty ?? 0);
            stockMap[b.id] = qty;
          }
        } catch (err) {
          console.warn("stock-on-hand failed", err);
        }
      }
      setBatchStockMap(stockMap);

      try {
        const eparams = new URLSearchParams();
        eparams.set("location_id", String(effectiveLocation));
        if (prodId) eparams.set("product_id", String(prodId));
        const eres = await authFetch(`${API_EXPIRY_ALERTS}?${eparams.toString()}`, {
          headers: { Accept: "application/json" },
        });
        if (eres.ok) {
          const ej = await eres.json();
          setExpiryAlertsSummary(ej || null);
        }
      } catch (err) {
        console.warn("expiry summary failed", err);
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

  const fetchStockSummaryForProduct = async (row) => {
    try {
      const params = new URLSearchParams();
      params.set("location_id", String(Number(locationFilter) || LOCATION_ID_FALLBACK));
      const pid = row.product_id || row.batch_lot__product_id || row.medicine_id;
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
        <button className="inv-add" onClick={() => nav("/inventory/medicines/add")} disabled={loading || deleting}>
          + Add Medicine
        </button>
      </div>

      <div className="inv-card">
        {serverError && <div style={{ color: "crimson", padding: 8 }}>{serverError}</div>}

        <div className="inv-filters">
          <div className="inv-search">
            <span className="inv-search-icon">?</span>
            <input
              type="text"
              placeholder="Search by medicine, batch or supplier..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="inv-select">
            <option value="All">All Categories</option>
            {categoriesForSelect.map(([id, label]) => (
              <option key={id} value={id}>
                {label}
              </option>
            ))}
          </select>

          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="inv-select" disabled={tab !== "all"}>
            {[
              ["All", "All"],
              ["IN_STOCK", "In Stock"],
              ["LOW_STOCK", "Low Stock"],
              ["OUT_OF_STOCK", "Out of Stock"],
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

          <input
            type="number"
            min="1"
            placeholder="Location"
            value={locationFilter}
            onChange={(e) => setLocationFilter(e.target.value)}
            className="inv-select"
            style={{ width: 110 }}
          />

          <div className="inv-actions">
            <button
              className="inv-btn ghost"
              onClick={() => alert("Import feature not yet implemented")}
            >
              Import
            </button>
            <button
              className="inv-btn brown"
              onClick={() => {
                const csvRows = [
                  ["Medicine ID", "Batch", "Name", "Category", "Quantity", "MRP", "Expiry", "Status"],
                  ...filteredRows.map((r) => [
                    r.medicine_id,
                    r.batch_number,
                    r.medicine_name,
                    getCategoryLabel(r),
                    r.quantity,
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
          <button className={`inv-tab ${tab === "expiring" ? "active" : ""}`} onClick={() => handleTabChange("expiring")}>
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
                  <th style={{ width: 160, textAlign: "center" }}>Actions</th>
                </tr>
              </thead>

              <tbody>
                {filteredRows.length ? (
                  filteredRows.map((r) => {
                    const status = getStatus(r);
                    const categoryLabel = getCategoryLabel(r);
                    const rowKey =
                      r.id ?? r.batch_id ?? `${r.product_id || r.medicine_id || "row"}-${r.batch_number || "na"}`;
                    const quantityValue = r.quantity ?? r.quantity_base ?? r.current_stock_base ?? "";
                    const uomLabel =
                      r.uom || r.base_uom?.name || r.quantity_uom?.name || "";
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
                                status === "In Stock" ? "green" : status === "Low Stock" ? "amber" : "red"
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
                          <button className="inv-icon" title="View details" onClick={() => openDetails(r)}>
                            View
                          </button>

                          <button className="inv-icon" title="Stock summary" onClick={() => fetchStockSummaryForProduct(r)}>
                            Stats
                          </button>

                          <button className="inv-icon danger" title="Delete" onClick={() => handleDelete(r.id)} disabled={deleting}>
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

      {detailOpen && (
        <div className="inv-modal-backdrop" onClick={closeDetails}>
          <div className="inv-modal" onClick={(e) => e.stopPropagation()}>
            <div className="inv-modal-header">
              <h3>Medicine details</h3>
              <button onClick={closeDetails} className="inv-close">
                X
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
                      <div className="small-muted">Quantity (Base)</div>
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
                              <td style={{ padding: "6px 4px" }}>
                                {b.expiry_date ? new Date(b.expiry_date).toLocaleDateString() : ""}
                              </td>
                              <td style={{ padding: "6px 4px" }}>{b.initial_quantity ?? b.initial_quantity_base ?? "-"}</td>
                              <td style={{ padding: "6px 4px" }}>
                                {b.id && batchStockMap[b.id] != null ? `${batchStockMap[b.id]}` : "—"}
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
              <button onClick={closeDetails} className="inv-btn">
                Close
              </button>
              <button
                className="inv-btn"
                onClick={() => {
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
