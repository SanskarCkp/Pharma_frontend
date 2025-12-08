import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, Pencil, Trash2, Search } from "lucide-react";
import "./inventory.css";
import { authFetch } from "../../api/http";
import { apiUrl } from "../../api/base";
import { getDefaultLocationId } from "../../config/location";
import QuickAddMedicine from "./QuickAddMedicine";
import { useAlert } from "../ui/alert-provider";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../ui/alert-dialog";

const LS_KEY = "medicines";
const PAGE_SIZE = 500; // fetch size
const VISIBLE_PAGE_SIZE = 20; // rows shown per page
const DEFAULT_LOCATION_ID = getDefaultLocationId();

const API_GLOBAL = apiUrl("inventory/medicines/global/");
const API_STOCK_SUMMARY = apiUrl("inventory/stock-summary/");
const API_RACKS = apiUrl("inventory/rack-locations/");
const API_CATEGORIES = apiUrl("catalog/categories/");
const API_MEDICINE_DETAIL = (id) => apiUrl(`inventory/medicines/${id}/`);

export default function MedicineInventory() {
  const nav = useNavigate();
  const { showAlert } = useAlert();
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
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState("batch_number");
  const [sortDir, setSortDir] = useState("asc");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);

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
        setPage(1);
        try {
          localStorage.setItem(LS_KEY, JSON.stringify(list));
        } catch {}
      } catch (err) {
        if (cancelled) return;
        console.error("Inventory fetch failed", err);
        setServerError("Backend offline â†’ Showing saved data");
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

  const handleDeleteClick = (row) => {
    const batchId = resolveBatchId(row);
    if (!batchId) {
      showAlert("Unable to determine batch to delete.", "Error");
      return;
    }
    setItemToDelete(row);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;

    const batchId = resolveBatchId(itemToDelete);
    setDeleting(true);
    setServerError(null);
    setDeleteDialogOpen(false);

    try {
      const res = await authFetch(API_MEDICINE_DETAIL(batchId), {
        method: "DELETE",
        headers: { Accept: "application/json" },
      });
      if (!res.ok && res.status !== 204) {
        const text = await res.text();
        throw new Error(text || `Delete failed (${res.status})`);
      }
      const next = rows.filter((r) => resolveBatchId(r) !== batchId);
      setRows(next);
      try {
        localStorage.setItem(LS_KEY, JSON.stringify(next));
      } catch {}
      window.dispatchEvent(new CustomEvent("inventory:refresh"));
      showAlert("Medicine batch deleted successfully", "Success");
    } catch (err) {
      console.error(err);
      setServerError(err.message || "Delete failed");
      showAlert(err.message || "Delete failed", "Error");
    } finally {
      setDeleting(false);
      setItemToDelete(null);
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
      showAlert("Unable to open details for this record.", "Error");
      return;
    }
    nav(`/inventory/medicines/${batchId}`);
  };

  const handleEdit = (row) => {
    const batchId = resolveBatchId(row);
    if (!batchId) {
      showAlert("Unable to determine batch for editing.", "Error");
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
      if (!pid) return showAlert("Product id not available for this row", "Error");
      params.set("product_id", String(pid));
      const res = await authFetch(`${API_STOCK_SUMMARY}?${params}`);
      if (!res.ok) throw new Error(`Failed (${res.status})`);
      const data = await res.json();
      showAlert("Stock summary:\n\n" + JSON.stringify(data, null, 2), "Stock Summary");
    } catch (err) {
      console.error(err);
      showAlert("Failed to load stock summary", "Error");
    }
  };

  const handleTabChange = (next) => {
    setTab(next);
    if (next !== "all") {
      setStatusFilter("All");
    }
    setPage(1);
  };

  const handleSort = (key) => {
    if (sortBy === key) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(key);
      setSortDir("asc");
    }
  };

  const sortedRows = useMemo(() => {
    const list = [...rows];
    const getter = (row, key) => {
      switch (key) {
        case "batch_number":
          return row.batch_number || row.batch_lot__batch_no || "";
        case "medicine_name":
          return row.medicine_name || row.batch_lot__product__name || "";
        case "category":
          return getCategoryLabel(row);
        case "stock":
          return getBaseQuantity(row);
        case "rack":
          return row.rack || row.rack_name || row.rack_no || "";
        case "price":
          return Number(row.mrp ?? row.batch_lot__product__mrp ?? 0);
        case "expiry":
          return row.expiry_date || "";
        default:
          return "";
      }
    };
    list.sort((a, b) => {
      const av = getter(a, sortBy);
      const bv = getter(b, sortBy);
      if (typeof av === "number" && typeof bv === "number") {
        return sortDir === "asc" ? av - bv : bv - av;
      }
      return sortDir === "asc"
        ? String(av).localeCompare(String(bv))
        : String(bv).localeCompare(String(av));
    });
    return list;
  }, [rows, sortBy, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sortedRows.length / VISIBLE_PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pagedRows = useMemo(() => {
    const start = (currentPage - 1) * VISIBLE_PAGE_SIZE;
    return sortedRows.slice(start, start + VISIBLE_PAGE_SIZE);
  }, [sortedRows, currentPage]);

  const SortIndicator = ({ column }) => {
    return (
      <span className="sort-indicator">
        {sortBy === column ? (sortDir === "asc" ? "▲" : "▼") : "↕"}
      </span>
    );
  };

  return (
    <div className="inv-wrap">
      <div className="inv-container">
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

        <div className="inv-filters-compact">
          <div className="inv-filter-group" style={{ flex: 1, minWidth: "250px" }}>
            <label className="inv-filter-label-compact">Search</label>
            <div className="inv-search-compact">
              <Search className="inv-search-icon" size={18} />
              <input
                type="text"
                placeholder="Search by medicine, batch or supplier..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="inv-filter-group">
            <label className="inv-filter-label-compact">Category</label>
            <select
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value);
                setPage(1);
              }}
              className="inv-select-compact"
            >
              <option value="All">--- Select Category ---</option>
              {categoriesForSelect.map(([id, label]) => (
                <option key={id} value={id}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div className="inv-filter-group">
            <label className="inv-filter-label-compact">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="inv-select-compact"
              disabled={tab !== "all"}
            >
              {[
                ["All", "--- Select Status ---"],
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
          </div>

          <div className="inv-filter-group">
            <label className="inv-filter-label-compact">Rack</label>
            <select
              value={rackFilter}
              onChange={(e) => {
                setRackFilter(e.target.value);
                setPage(1);
              }}
              className="inv-select-compact"
            >
              <option value="All">--- Select Rack ---</option>
              {rackOptions.map((rack) => (
                <option key={rack.id} value={rack.id}>
                  {rack.name}
                </option>
              ))}
            </select>
          </div>

          <button
            className="inv-btn brown"
            onClick={() => {
              const csvRows = [
                ["Batch", "Name", "Category", "Quantity", "MRP", "Expiry", "Status"],
                ...rows.map((r) => [
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
            Export CSV
          </button>
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
                  <th onClick={() => handleSort("batch_number")} className="sortable">
                    Batch Number <SortIndicator column="batch_number" />
                  </th>
                  <th onClick={() => handleSort("medicine_name")} className="sortable">
                    Medicine Name <SortIndicator column="medicine_name" />
                  </th>
                  <th onClick={() => handleSort("category")} className="sortable">
                    Category <SortIndicator column="category" />
                  </th>
                  <th onClick={() => handleSort("stock")} className="sortable">
                    Stock <SortIndicator column="stock" />
                  </th>
                  <th onClick={() => handleSort("rack")} className="sortable">
                    Rack <SortIndicator column="rack" />
                  </th>
                  <th onClick={() => handleSort("price")} className="sortable">
                    Price (₹) <SortIndicator column="price" />
                  </th>
                  <th onClick={() => handleSort("expiry")} className="sortable">
                    Expiry <SortIndicator column="expiry" />
                  </th>
                  <th>Status</th>
                  <th style={{ width: 140, textAlign: "center" }}>Actions</th>
                  <th>HSN code</th>
                </tr>
              </thead>
              <tbody>
                {pagedRows.length ? (
                  pagedRows.map((r) => {
                    const status = getStatus(r);
                    const categoryLabel = getCategoryLabel(r);
                    const rowKey =
                      r.id ?? r.batch_id ?? `${r.product_id || r.medicine_id || "row"}-${r.batch_number || "na"}`;
                    const quantityValue = getBaseQuantity(r);
                    const uomLabel = r.uom || r.base_uom?.name || r.quantity_uom?.name || "";
                    const rackLabel = r.rack || r.rack_name || r.rack_no || "";

                    return (
                      <tr key={rowKey}>
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
                            <Eye size={16} />
                          </button>
                          <button className="inv-icon" title="Edit" onClick={() => handleEdit(r)}>
                            <Pencil size={16} />
                          </button>
                          <button
                            className="inv-icon danger"
                            title="Delete"
                            onClick={() => handleDeleteClick(r)}
                            disabled={deleting}
                          >
                            <Trash2 size={16} />
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

        <div className="inv-pagination">
          <button
            className="inv-btn ghost"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
          >
            Prev
          </button>
          <span className="page-info">
            Page {currentPage} of {totalPages}
          </span>
          <button
            className="inv-btn ghost"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
          >
            Next
          </button>
        </div>
      </div>

        {/* Quick Add Modal */}
        <QuickAddMedicine
          open={quickAddOpen}
          onClose={() => setQuickAddOpen(false)}
          onSaved={handleQuickAddSaved}
        />

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Medicine Batch</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this medicine batch? This action cannot be undone.
                {itemToDelete && (
                  <div style={{ marginTop: '12px', fontWeight: '500', color: '#374151' }}>
                    Batch: {itemToDelete.batch_number ?? itemToDelete.batch_lot__batch_no ?? 'N/A'}
                  </div>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setItemToDelete(null)}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDelete}
                style={{ background: '#ef4444' }}
                onMouseEnter={(e) => e.target.style.background = '#dc2626'}
                onMouseLeave={(e) => e.target.style.background = '#ef4444'}
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}


