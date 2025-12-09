import React, { useEffect, useState, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Eye, Trash2, ArrowLeft, Search, ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";
import "./purchaseorders.css";
import "../../inventory/inventory.css";
import { formatDateDDMMYYYY } from "../../../utils/dateFormat";
import { authFetch } from "../../../api/http";
import { useAlert } from "../../ui/alert-provider";
import ConfirmDialog from "../../ui/ConfirmDialog";

const API_BASE_URL = import.meta.env.VITE_API_URL;
const VISIBLE_PAGE_SIZE = 20;

const PurchaseOrders = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const Supplier = location.state?.Supplier || null;
  const { showAlert } = useAlert();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteConfirm, setDeleteConfirm] = useState({ open: false, orderId: null });
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [sortBy, setSortBy] = useState("po_number");
  const [sortDir, setSortDir] = useState("asc");
  const [page, setPage] = useState(1);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query.trim()), 350);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    if (!Supplier?.id) {
      setLoading(false);
      return;
    }

    const fetchOrders = async () => {
      try {
        // Fetch orders filtered by Supplier from backend
        const res = await authFetch(
          `${API_BASE_URL}/api/v1/procurement/purchase-orders/?Supplier=${Supplier.id}`
        );

        const data = await res.json();
        const ordersList = data.results || data || [];

        // Filter by vendor (backend response uses 'vendor' field, not 'Supplier')
        const filteredOrders = ordersList.filter(
          (order) => Number(order.vendor) === Number(Supplier.id)
        );

        // Calculate total items from lines array that's already in the response
        const enrichedOrders = filteredOrders.map((order) => {
          const linesArray = Array.isArray(order.lines) ? order.lines : [];
          const totalItems = linesArray.reduce(
            (sum, line) => sum + Number(line.qty_packs_ordered || 0),
            0
          );
          return { ...order, total_items: totalItems };
        });

        setOrders(enrichedOrders);
      } catch (err) {
        console.error("Error fetching purchase orders:", err);
        setOrders([]);
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, [Supplier]);

  // Filter and sort orders
  const filteredOrders = useMemo(() => {
    let filtered = [...orders];

    // Search filter
    if (debouncedQuery) {
      const q = debouncedQuery.toLowerCase();
      filtered = filtered.filter(
        (order) =>
          order.po_number?.toLowerCase().includes(q) ||
          order.order_date?.toLowerCase().includes(q) ||
          order.expected_date?.toLowerCase().includes(q) ||
          order.status?.toLowerCase().includes(q)
      );
    }

    // Status filter
    if (statusFilter !== "All") {
      filtered = filtered.filter((order) => order.status === statusFilter);
    }

    return filtered;
  }, [orders, debouncedQuery, statusFilter]);

  const handleSort = (key) => {
    if (sortBy === key) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(key);
      setSortDir("asc");
    }
  };

  const sortedOrders = useMemo(() => {
    const list = [...filteredOrders];
    const getter = (obj, key) => {
      if (key === "order_date" || key === "expected_date") {
        return obj[key] ? new Date(obj[key]).getTime() : 0;
      }
      if (key === "total_items") {
        return Number(obj.total_items || 0);
      }
      return String(obj[key] || "").toLowerCase();
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
  }, [filteredOrders, sortBy, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sortedOrders.length / VISIBLE_PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pagedOrders = useMemo(() => {
    const start = (currentPage - 1) * VISIBLE_PAGE_SIZE;
    return sortedOrders.slice(start, start + VISIBLE_PAGE_SIZE);
  }, [sortedOrders, currentPage]);

  const SortIndicator = ({ column }) => {
    if (sortBy === column) {
      return sortDir === "asc" ? (
        <ChevronUp size={14} className="sort-indicator" />
      ) : (
        <ChevronDown size={14} className="sort-indicator" />
      );
    }
    return <ChevronsUpDown size={14} className="sort-indicator" />;
  };

  const handleReceiveItems = (id) =>
    navigate(`/masters/products/receive-items/${id}`, {
      state: { Supplier },
    });

  const handleDeleteClick = (id) => {
    setDeleteConfirm({ open: true, orderId: id });
  };

  const handleDelete = async () => {
    const id = deleteConfirm.orderId;
    if (!id) return;

    try {
      const res = await authFetch(
        `${API_BASE_URL}/api/v1/procurement/purchase-orders/${id}/`,
        { method: "DELETE" }
      );

      if (res.ok) {
        setOrders((prev) => prev.filter((order) => order.id !== id));
        showAlert("Purchase order deleted successfully!", "Success");
      } else {
        const errData = await res.json();
        console.error("Delete failed:", errData);
        showAlert("Failed to delete purchase order.", "Error");
      }
    } catch (err) {
      console.error("Delete error:", err);
      showAlert("Error deleting purchase order.", "Error");
    } finally {
      setDeleteConfirm({ open: false, orderId: null });
    }
  };

  return (
    <div className="inv-wrap">
      <div className="inv-container">
        {/* Header Section - Back button */}
        <div className="purchaseorders-header-section">
          <button className="back-btn" onClick={() => navigate(-1)}>
            <ArrowLeft size={18} />
            Back
          </button>
        </div>

        <div className="inv-header">
          <div>
            <h2>Purchase Orders</h2>
            {Supplier ? (
              <p>Supplier: {Supplier.name}</p>
            ) : (
              <p style={{ color: "#ef4444" }}>
                Supplier not selected. Please select a Supplier to view orders.
              </p>
            )}
          </div>
        </div>

        <div className="inv-card">
          <div className="inv-filters-compact">
            <div className="inv-filter-group" style={{ flex: 1, minWidth: "250px" }}>
              <label className="inv-filter-label-compact">Search</label>
              <div className="inv-search-compact">
                <Search className="inv-search-icon" size={18} />
                <input
                  type="text"
                  placeholder="Search by PO number, date, or status..."
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setPage(1);
                  }}
                />
              </div>
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
              >
                <option value="All">--- Select Status ---</option>
                <option value="DRAFT">DRAFT</option>
                <option value="POSTED">POSTED</option>
                <option value="RECEIVED">RECEIVED</option>
                <option value="COMPLETED">COMPLETED</option>
                <option value="CANCELLED">CANCELLED</option>
              </select>
            </div>
          </div>

          <div className="inv-table-wrap">
            {loading ? (
              <div style={{ padding: 20 }}>Loading orders...</div>
            ) : (
              <table className="inv-table">
                <thead>
                  <tr>
                    <th onClick={() => handleSort("po_number")} className="sortable">
                      PO Number <SortIndicator column="po_number" />
                    </th>
                    <th onClick={() => handleSort("order_date")} className="sortable">
                      Order Date <SortIndicator column="order_date" />
                    </th>
                    <th onClick={() => handleSort("expected_date")} className="sortable">
                      Expected Date <SortIndicator column="expected_date" />
                    </th>
                    <th onClick={() => handleSort("total_items")} className="sortable">
                      Total Items <SortIndicator column="total_items" />
                    </th>
                    <th onClick={() => handleSort("status")} className="sortable">
                      Status <SortIndicator column="status" />
                    </th>
                    <th style={{ width: 180, textAlign: "center" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedOrders.length ? (
                    pagedOrders.map((order) => (
                      <tr key={order.id}>
                        <td>{order.po_number}</td>
                        <td>{formatDateDDMMYYYY(order.order_date)}</td>
                        <td>{formatDateDDMMYYYY(order.expected_date) || "-"}</td>
                        <td>{order.total_items}</td>
                        <td>
                          <span className={`badge ${order.status === 'DRAFT' ? 'yellow' : order.status === 'RECEIVED' || order.status === 'COMPLETED' ? 'green' : order.status === 'POSTED' ? 'blue' : 'red'}`}>
                            {order.status}
                          </span>
                        </td>
                        <td className="inv-actions-cell">
                          <button
                            className="receive-btn"
                            onClick={() => handleReceiveItems(order.id)}
                          >
                            Receive Items
                          </button>
                          <button
                            className="inv-icon danger"
                            title="Delete"
                            onClick={() => handleDeleteClick(order.id)}
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="6" style={{ textAlign: "center", padding: 14 }}>
                        No purchase orders found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>

          {!loading && sortedOrders.length > 0 && (
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
          )}
        </div>
      </div>

      <ConfirmDialog
        open={deleteConfirm.open}
        onOpenChange={(open) => setDeleteConfirm({ open, orderId: deleteConfirm.orderId })}
        title="Delete Purchase Order"
        description="Are you sure you want to delete this order? This action cannot be undone."
        onConfirm={handleDelete}
        confirmText="Delete"
        cancelText="Cancel"
        variant="destructive"
      />
    </div>
  );
};

export default PurchaseOrders;
