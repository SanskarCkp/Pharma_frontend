import React, { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Eye, Trash2 } from "lucide-react";
import { useAlert } from "../ui/alert-provider";
import "./billgeneration.css";
import "../inventory/inventory.css";
import { authFetch } from "../../api/http";
import { apiUrl } from "../../api/base";

const BILLING_STATS_URL = apiUrl("sales/billing/stats/");
const INVOICES_URL = apiUrl("sales/invoices/");
const ITEMS_PER_PAGE = 20;

export default function BillList() {
  const navigate = useNavigate();
  const { showAlert } = useAlert();
  const [bills, setBills] = useState([]);
  const [kpis, setKpis] = useState({
    totalBills: 0,
    totalProducts: 0,
    totalRevenue: 0,
    changeBills: 0,
    changeProducts: 0,
    changeRevenue: 0,
  });

  // Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [paymentFilter, setPaymentFilter] = useState("All");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // Pagination & Sorting
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState("invoice_date");
  const [sortDir, setSortDir] = useState("desc");
  const [deleteDialog, setDeleteDialog] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const today = new Date();
        const first = new Date(today.getFullYear(), today.getMonth(), 1)
          .toISOString()
          .slice(0, 10);
        const last = new Date(today.getFullYear(), today.getMonth() + 1, 0)
          .toISOString()
          .slice(0, 10);

        const statsRes = await authFetch(
          `${BILLING_STATS_URL}?from=${first}&to=${last}`
        );
        if (statsRes.ok) {
          const stats = await statsRes.json();
          setKpis({
            totalBills: stats.total_bills || 0,
            totalProducts: stats.total_products_sold || 0,
            totalRevenue: stats.total_revenue || 0,
            changeBills: 0,
            changeProducts: 0,
            changeRevenue: 0,
          });
        }

        const listRes = await authFetch(
          `${INVOICES_URL}?ordering=-invoice_date`
        );
        if (listRes.ok) {
          const data = await listRes.json();
          const billsData = Array.isArray(data) ? data : data.results || [];
          // Debug: Check if invoice_date is present
          if (billsData.length > 0 && !billsData[0].invoice_date) {
            console.warn("Invoice date missing in response:", billsData[0]);
          }
          setBills(billsData);
        } else {
          setBills([]);
        }
      } catch {
        setBills([]);
      }
    }
    load();
  }, []);

  const formatMoney = (v) => `₹${Number(v || 0).toFixed(2)}`;

  // Safely format date to prevent "Invalid Date"
  const formatDate = (dateString) => {
    if (!dateString) return "-";
    try {
      // Check if it's already in DD-MM-YYYY HH:MM format (from backend)
      if (typeof dateString === 'string' && /^\d{2}-\d{2}-\d{4} \d{2}:\d{2}/.test(dateString)) {
        // Already formatted by backend, just add seconds if missing
        if (dateString.length === 16) {
          // Format: "15-12-2025 07:02" - add seconds
          return dateString + ":00";
        }
        return dateString;
      }
      
      // Try to parse DD-MM-YYYY format manually
      if (typeof dateString === 'string' && /^\d{2}-\d{2}-\d{4}/.test(dateString)) {
        // Parse DD-MM-YYYY format
        const parts = dateString.split(' ');
        const datePart = parts[0]; // "15-12-2025"
        const timePart = parts[1] || "00:00"; // "07:02" or empty
        
        const [day, month, year] = datePart.split('-').map(Number);
        const [hours = 0, minutes = 0] = timePart.split(':').map(Number);
        
        // Create date object (month is 0-indexed in JS)
        const date = new Date(year, month - 1, day, hours, minutes);
        
        if (isNaN(date.getTime())) {
          console.warn("Invalid date:", dateString);
          return "-";
        }
        
        // Format as DD-MM-YYYY HH:MM:SS
        const formattedDay = String(date.getDate()).padStart(2, '0');
        const formattedMonth = String(date.getMonth() + 1).padStart(2, '0');
        const formattedYear = date.getFullYear();
        const formattedHours = String(date.getHours()).padStart(2, '0');
        const formattedMinutes = String(date.getMinutes()).padStart(2, '0');
        const formattedSeconds = String(date.getSeconds()).padStart(2, '0');
        return `${formattedDay}-${formattedMonth}-${formattedYear} ${formattedHours}:${formattedMinutes}:${formattedSeconds}`;
      }
      
      // Handle ISO format or other standard formats
      const date = dateString instanceof Date ? dateString : new Date(dateString);
      // Check if date is valid
      if (isNaN(date.getTime())) {
        console.warn("Invalid date:", dateString);
        return "-";
      }
      // Format as DD-MM-YYYY HH:MM:SS
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      const seconds = String(date.getSeconds()).padStart(2, '0');
      return `${day}-${month}-${year} ${hours}:${minutes}:${seconds}`;
    } catch (e) {
      console.warn("Error formatting date:", dateString, e);
      return "-";
    }
  };

  const openDeleteDialog = (bill) => {
    if (!bill) return;
    const status = (bill.status || bill.invoice_status || "").toLowerCase();
    const isPosted = status === "posted";
    setDeleteDialog({
      bill,
      requiresRestoreChoice: isPosted,
      restoreStock: isPosted,
    });
  };

  const closeDeleteDialog = () => {
    setDeleteDialog(null);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteDialog?.bill) return;
    const { bill, requiresRestoreChoice, restoreStock } = deleteDialog;

    try {
      setDeleteLoading(true);
      const invoiceId = bill.id;
      const shouldRestore = requiresRestoreChoice ? !!restoreStock : false;
      const url = `${INVOICES_URL}${invoiceId}/${shouldRestore ? "?restore_stock=true" : ""}`;

      const res = await authFetch(url, { method: "DELETE" });

      if (res.ok || res.status === 204) {
        showAlert(
          `Invoice ${bill.invoice_no || invoiceId} deleted successfully${
            shouldRestore ? " and stock restored" : ""
          }`,
          "Success"
        );
        setBills((prev) => prev.filter((b) => b.id !== invoiceId));
        setDeleteLoading(false);
        closeDeleteDialog();
        window.location.reload();
      } else {
        const errorData = await res.json().catch(() => ({}));
        showAlert(errorData.detail || "Failed to delete invoice", "Error");
      }
    } catch (err) {
      console.error("Delete failed:", err);
      showAlert("Failed to delete invoice: " + (err.message || "Unknown error"), "Error");
    } finally {
      setDeleteLoading(false);
    }
  };

  // Filter and sort bills
  const filteredAndSortedBills = useMemo(() => {
    let filtered = [...bills];

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (b) =>
          b.invoice_no?.toLowerCase().includes(q) ||
          b.customer_name?.toLowerCase().includes(q) ||
          b.customer?.name?.toLowerCase().includes(q)
      );
    }

    // Payment status filter
    if (paymentFilter && paymentFilter !== "All") {
      filtered = filtered.filter((b) => b.payment_status === paymentFilter);
    }

    // Date range filter
    if (dateFrom) {
      filtered = filtered.filter((b) => {
        const billDate = new Date(b.invoice_date);
        return billDate >= new Date(dateFrom);
      });
    }
    if (dateTo) {
      filtered = filtered.filter((b) => {
        const billDate = new Date(b.invoice_date);
        return billDate <= new Date(dateTo);
      });
    }

    // Sorting
    filtered.sort((a, b) => {
      let aVal = a[sortBy];
      let bVal = b[sortBy];

      // Handle customer name sorting
      if (sortBy === "customer_name") {
        aVal = a.customer_name || a.customer?.name || "";
        bVal = b.customer_name || b.customer?.name || "";
      }

      // Handle date sorting
      if (sortBy === "invoice_date") {
        aVal = new Date(aVal).getTime();
        bVal = new Date(bVal).getTime();
      }

      // Handle numeric sorting
      if (sortBy === "net_total") {
        aVal = Number(aVal) || 0;
        bVal = Number(bVal) || 0;
      }

      if (sortDir === "asc") {
        return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
      } else {
        return aVal < bVal ? 1 : aVal > bVal ? -1 : 0;
      }
    });

    return filtered;
  }, [bills, searchQuery, paymentFilter, dateFrom, dateTo, sortBy, sortDir]);

  // Paginate
  const totalPages = Math.ceil(filteredAndSortedBills.length / ITEMS_PER_PAGE);
  const paginatedBills = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredAndSortedBills.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredAndSortedBills, currentPage]);

  // Handle column sort
  const handleSort = (column) => {
    if (sortBy === column) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column);
      setSortDir("asc");
    }
    setCurrentPage(1);
  };

  // Get unique payment statuses
  const paymentStatuses = useMemo(() => {
    const statuses = new Set(bills.map((b) => b.payment_status).filter(Boolean));
    return Array.from(statuses);
  }, [bills]);

  // Sort indicator component
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
        {/* Header Section */}
        <div className="inv-header">
          <div>
            <h2>Bill Generation</h2>
            <p>Manage and track all your billing transactions</p>
          </div>

          <button
            className="inv-add"
            onClick={() => navigate("/billgeneration/generate")}
          >
            + Generate New Bill
          </button>
        </div>

        {/* KPI Cards */}
        {(() => {
          const currentMonth = new Date().toLocaleString("default", { month: "long" });
          return (
            <div
              className="kpi-container"
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: "1rem",
                marginBottom: "1.5rem",
              }}
            >
              <div
                className="kpi-card"
                style={{
                  border: "1px solid #e5e7eb",
                  borderRadius: "10px",
                  backgroundColor: "#ffffff",
                  padding: "1rem 1.25rem",
                  boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
                  transition: "all 0.2s"
                }}
              >
                <h4 style={{ color: "#6b7280", fontSize: "0.75rem", fontWeight: "500", marginBottom: "0.5rem", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  TOTAL BILLS (THIS MONTH)
                </h4>
                <p
                  style={{
                    fontWeight: "700",
                    fontSize: "1.75rem",
                    color: "#111827",
                    marginBottom: "0.25rem",
                    lineHeight: "1.2"
                  }}
                >
                  {kpis.totalBills}
                </p>
                <small style={{ color: "#6b7280", fontSize: "0.8125rem" }}>
                  Total bills generated in {currentMonth}
                </small>
              </div>

              <div
                className="kpi-card"
                style={{
                  border: "1px solid #e5e7eb",
                  borderRadius: "10px",
                  backgroundColor: "#ffffff",
                  padding: "1rem 1.25rem",
                  boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
                  transition: "all 0.2s"
                }}
              >
                <h4 style={{ color: "#6b7280", fontSize: "0.75rem", fontWeight: "500", marginBottom: "0.5rem", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  TOTAL PRODUCTS SOLD (THIS MONTH)
                </h4>
                <p
                  style={{
                    fontWeight: "700",
                    fontSize: "1.75rem",
                    color: "#111827",
                    marginBottom: "0.25rem",
                    lineHeight: "1.2"
                  }}
                >
                  {kpis.totalProducts}
                </p>
                <small style={{ color: "#6b7280", fontSize: "0.8125rem" }}>
                  Total items sold in {currentMonth}
                </small>
              </div>

              <div
                className="kpi-card"
                style={{
                  border: "1px solid #e5e7eb",
                  borderRadius: "10px",
                  backgroundColor: "#ffffff",
                  padding: "1rem 1.25rem",
                  boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
                  transition: "all 0.2s"
                }}
              >
                <h4 style={{ color: "#6b7280", fontSize: "0.75rem", fontWeight: "500", marginBottom: "0.5rem", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  TOTAL REVENUE (THIS MONTH)
                </h4>
                <p
                  style={{
                    fontWeight: "700",
                    fontSize: "1.75rem",
                    color: "#14b8a6",
                    marginBottom: "0.25rem",
                    lineHeight: "1.2"
                  }}
                >
                  {formatMoney(kpis.totalRevenue)}
                </p>
                <small style={{ color: "#6b7280", fontSize: "0.8125rem" }}>
                  Revenue generated in {currentMonth}
                </small>
              </div>
            </div>
          );
        })()}

        {/* Bills Table with Filters */}
        <div className="inv-card">
          {/* Filters - Compact Layout */}
          <div className="inv-filters-compact">
            <div className="inv-filter-group" style={{ flex: 1, minWidth: "250px" }}>
              <label className="inv-filter-label-compact">Search</label>
              <div className="inv-search-compact">
                <Search className="inv-search-icon" size={18} />
                <input
                  type="text"
                  placeholder="Search by bill ID, customer name..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                />
              </div>
            </div>

            <div className="inv-filter-group">
              <label className="inv-filter-label-compact">From Date</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => {
                  setDateFrom(e.target.value);
                  setCurrentPage(1);
                }}
                className="inv-select-compact"
              />
            </div>

            <div className="inv-filter-group">
              <label className="inv-filter-label-compact">To Date</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => {
                  setDateTo(e.target.value);
                  setCurrentPage(1);
                }}
                className="inv-select-compact"
              />
            </div>

            <div className="inv-filter-group">
              <label className="inv-filter-label-compact">Payment Status</label>
              <select
                value={paymentFilter}
                onChange={(e) => {
                  setPaymentFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="inv-select-compact"
              >
                <option value="All">--- Select Payment Status ---</option>
                {paymentStatuses.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>

            <button
              className="inv-btn brown"
              onClick={() => {
                const csvRows = [
                  ["Bill ID", "Date", "Customer", "Amount", "Payment Status"],
                  ...filteredAndSortedBills.map((b) => {
                    const formattedDate = formatDate(b.invoice_date);
                    return [
                      b.invoice_no,
                      formattedDate !== "-" ? formattedDate : "",
                      b.customer_name || b.customer?.name || "-",
                      b.net_total,
                      b.payment_status,
                    ];
                  }),
                ];
                const csv = csvRows
                  .map((cols) => cols.map((c) => `"${(c ?? "").toString().replace(/"/g, '""')}"`).join(","))
                  .join("\n");
                const blob = new Blob([csv], { type: "text/csv" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = "bills_export.csv";
                a.click();
                URL.revokeObjectURL(url);
              }}
            >
              Export CSV
            </button>
          </div>

          {/* Table */}
          <div className="inv-table-wrap">
            <table className="inv-table">
              <thead>
                <tr>
                  <th onClick={() => handleSort("invoice_no")} className="sortable">
                    Bill ID <SortIndicator column="invoice_no" />
                  </th>
                  <th onClick={() => handleSort("invoice_date")} className="sortable">
                    Transaction Date <SortIndicator column="invoice_date" />
                  </th>
                  <th onClick={() => handleSort("customer_name")} className="sortable">
                    Customer Name <SortIndicator column="customer_name" />
                  </th>
                  <th onClick={() => handleSort("net_total")} className="sortable">
                    Total Amount <SortIndicator column="net_total" />
                  </th>
                  <th onClick={() => handleSort("payment_status")} className="sortable">
                    Payment <SortIndicator column="payment_status" />
                  </th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedBills.length === 0 ? (
                  <tr>
                    <td colSpan="6">
                      No bills found
                    </td>
                  </tr>
                ) : (
                  paginatedBills.map((bill) => (
                    <tr key={bill.id}>
                      <td>{bill.invoice_no}</td>
                      <td>{formatDate(bill.invoice_date || bill.created_at || bill.updated_at)}</td>
                      <td>{bill.customer_name_display || bill.customer_name || bill.customer?.name || bill.customer_detail?.name || "-"}</td>
                      <td>{formatMoney(bill.net_total)}</td>
                      <td>
                        {(() => {
                          // Get payment method display or fallback to payment status
                          const paymentDisplay = bill.payment_method_display || bill.payment_status || "CREDIT";
                          
                          // Format payment method names for display
                          const formatPaymentMethod = (method) => {
                            if (!method) return "CREDIT";
                            const methodUpper = method.toUpperCase();
                            if (methodUpper === "CARD_CREDIT") return "CARD - CREDIT";
                            if (methodUpper === "CARD_DEBIT") return "CARD - DEBIT";
                            if (methodUpper === "NET_BANKING") return "NET BANKING";
                            if (methodUpper === "CASH") return "CASH";
                            if (methodUpper === "UPI") return "UPI";
                            if (methodUpper === "OTHER") return "OTHER";
                            if (methodUpper === "PAID" || methodUpper === "PARTIAL") return methodUpper;
                            if (methodUpper === "CREDIT") return "CREDIT";
                            return methodUpper.replace(/_/g, " ");
                          };
                          
                          const displayText = formatPaymentMethod(paymentDisplay);
                          
                          // Determine badge color
                          const isPaidMethod = bill.payment_method_display && (
                            bill.payment_method_display === "CASH" ||
                            bill.payment_method_display === "UPI" ||
                            bill.payment_method_display === "CARD_CREDIT" ||
                            bill.payment_method_display === "CARD_DEBIT" ||
                            bill.payment_method_display === "NET_BANKING" ||
                            bill.payment_method_display === "OTHER"
                          );
                          
                          const badgeClass = isPaidMethod
                            ? "green"
                            : bill.payment_status === "PAID" || bill.payment_status === "paid"
                            ? "green"
                            : bill.payment_status === "PENDING"
                            ? "amber"
                            : "red";
                          
                          return (
                            <span className={`badge ${badgeClass}`}>
                              {displayText}
                            </span>
                          );
                        })()}
                      </td>
                      <td className="inv-actions-cell">
                        <button
                          className="inv-icon"
                          title="View Invoice"
                          onClick={() => navigate(`/billgeneration/invoice/${bill.id}`)}
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          className="inv-icon danger"
                          title="Delete Invoice"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            openDeleteDialog(bill);
                          }}
                          type="button"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="inv-pagination">
            <button
              className="inv-btn ghost"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              Prev
            </button>
            <span className="page-info">
              Page {currentPage} of {totalPages}
            </span>
            <button
              className="inv-btn ghost"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              Next
            </button>
          </div>
        </div>
      </div>
      {deleteDialog && (
        <div className="app-modal-overlay" role="dialog" aria-modal="true">
          <div className="app-modal">
            <div className="app-modal__header">
              <div>
                <p className="app-modal__eyebrow">Invoice action</p>
                <h3>Delete invoice?</h3>
              </div>
              <button
                type="button"
                className="app-modal__close"
                onClick={closeDeleteDialog}
                disabled={deleteLoading}
                aria-label="Close dialog"
              >
                &times;
              </button>
            </div>
            <div className="app-modal__body">
              <p>
                Removing invoice{" "}
                <strong>{deleteDialog.bill?.invoice_no || deleteDialog.bill?.id}</strong> permanently will also
                clear its payment history.
              </p>
              <div className="app-modal__summary">
                <div>
                  <span className="app-modal__summary-label">Customer</span>
                  <strong>
                    {deleteDialog.bill?.customer_name_display ||
                      deleteDialog.bill?.customer_name ||
                      deleteDialog.bill?.customer?.name ||
                      deleteDialog.bill?.customer_detail?.name ||
                      "-"}
                  </strong>
                </div>
                <div>
                  <span className="app-modal__summary-label">Bill total</span>
                  <strong>{formatMoney(deleteDialog.bill?.net_total)}</strong>
                </div>
                <div>
                  <span className="app-modal__summary-label">Date</span>
                  <strong>{formatDate(deleteDialog.bill?.invoice_date)}</strong>
                </div>
              </div>
              {deleteDialog.requiresRestoreChoice && (
                <label className="app-modal__checkbox">
                  <input
                    type="checkbox"
                    checked={!!deleteDialog.restoreStock}
                    disabled={deleteLoading}
                    onChange={(e) =>
                      setDeleteDialog((prev) => ({ ...prev, restoreStock: e.target.checked }))
                    }
                  />
                  <span>Restore stock quantities for every item in this invoice</span>
                </label>
              )}
              <div className="app-modal__warning">
                This action cannot be undone. Deleted invoice numbers become available for reuse.
              </div>
            </div>
            <div className="app-modal__footer">
              <button
                type="button"
                className="inv-btn muted"
                onClick={closeDeleteDialog}
                disabled={deleteLoading}
              >
                Keep Invoice
              </button>
              <button
                type="button"
                className="inv-btn danger"
                onClick={handleDeleteConfirm}
                disabled={deleteLoading}
              >
                {deleteLoading ? "Deleting..." : "Delete Invoice"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
