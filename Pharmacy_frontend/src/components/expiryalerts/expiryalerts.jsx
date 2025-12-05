import React, { useState, useEffect } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import "./expiryalerts.css";
import { authFetch } from "../../api/http";

export default function ExpiryAlerts() {
  const [activeTab, setActiveTab] = useState("All");
  const [items, setItems] = useState([]);
  const [summary, setSummary] = useState({ critical: 0, warning: 0, safe: 0 });
  const [thresholds, setThresholds] = useState({ critical: 30, warning: 60 });
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState({ critical: 0, warning: 0, safe: 0 });
  const [locationId, setLocationId] = useState(String(DEFAULT_LOCATION));

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await authFetch("/api/expiry-alerts"); // <-- Replace this
        if (!response.ok) throw new Error("Failed to load data");
        const data = await response.json();
        setMedicines(data);
      } catch (error) {
        console.error("Error fetching medicines:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  // ✅ Filter logic
  const filtered =
    activeTab === "All" ? medicines : medicines.filter((m) => m.status === activeTab);

  // ✅ KPI calculations
  const kpi = {
    critical: medicines.filter((m) => m.status === "Critical").length,
    warning: medicines.filter((m) => m.status === "Warning").length,
    safe: medicines.filter((m) => m.status === "Safe").length,
    totalValue: medicines
      .filter((m) => m.status === "Critical" || m.status === "Warning")
      .reduce((sum, m) => sum + parseFloat(m.stock?.replace(/[₹,]/g, "") || 0), 0)
      .toFixed(2),
  };

  // ✅ Export PDF (Critical + Warning)
  const handleExportPDF = () => {
    const exportData = medicines.filter(
      (m) => m.status === "Critical" || m.status === "Warning"
    );

    if (!exportData.length) {
      alert("⚠️ No critical or warning medicines to export!");
      return;
    }

    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(14);
    doc.text("Medicine Expiry Report (Critical & Warning Only)", 14, 15);

    const tableData = exportData.map((m) => {
      const numericStock = parseFloat(m.stock?.replace(/[₹,]/g, "") || 0);
      const formattedStock = `₹. ${numericStock.toLocaleString("en-IN")}`;
      return [
        m.name,
        m.category,
        m.batch,
        m.qty,
        formattedStock,
        m.expiry,
        `${m.daysLeft} days`,
        m.supplier,
        m.status,
      ];
    });

    autoTable(doc, {
      startY: 25,
      head: [
        [
          "Medicine Name",
          "Category",
          "Batch No.",
          "Qty",
          "Stock Value",
          "Expiry Date",
          "Days Left",
          "Supplier",
          "Status",
        ],
      ],
      body: tableData,
      theme: "grid",
      styles: { fontSize: 10, cellPadding: 3, font: "helvetica" },
      headStyles: { fillColor: [20, 184, 166], textColor: 255, halign: "center" },
      bodyStyles: { halign: "center" },
      columnStyles: { 4: { halign: "right" } },
    });

    const pageHeight = doc.internal.pageSize.height;
    doc.setFontSize(10);
    doc.text(
      `Generated on: ${new Date().toLocaleDateString()} | Total Medicines: ${exportData.length}`,
      14,
      pageHeight - 10
    );

    doc.save(`ExpiryReport-${new Date().toISOString().slice(0, 10)}.pdf`);
    alert("✅ Critical & Warning medicines exported successfully!");
  };

  // ✅ Handle Return
  const handleReturn = (medicine) => {
    setModal({ show: true, med: medicine });
  };

  const confirmReturn = () => {
    if (modal.med) {
      setMedicines((prev) => prev.filter((m) => m.id !== modal.med.id));
      alert(`✅ ${modal.med.name} has been marked as returned to supplier.`);
    }
    setModal({ show: false, med: null });
  };

  if (loading) {
    return (
      <div className="expiryalerts-page">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="expiryalerts-page">
      <h2 className="page-title">Medicine Expiry Alerts</h2>
      <p className="page-subtitle">Monitor and manage medicines nearing expiration</p>

      {/* KPI Cards */}
      <div className="kpi-cards">
        <div className="kpi-card critical">
          <h4>Critical (≤ {thresholds.critical} days)</h4>
          <h2>{summary.critical}</h2>
        </div>

        <div className="kpi-card warning">
          <h4>
            Warning ({thresholds.critical + 1}–{thresholds.warning} days)
          </h4>
          <h2>{summary.warning}</h2>
        </div>

        <div className="kpi-card safe">
          <h4>Safe (&gt;90 days)</h4>
          <h2>{kpi.safe}</h2>
          <p>No immediate concern</p>
        </div>
        <div className="kpi-card value">
          <h4>At-Risk Value</h4>
          <h2>₹{kpi.totalValue}</h2>
          <p>Critical + warning stock</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs">
        <div>
          {["All", "Critical", "Warning", "Safe"].map((tab) => (
            <button
              key={tab}
              className={`tab ${activeTab === tab ? "active" : ""}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab} (
              {tab === "All"
                ? medicines.length
                : medicines.filter((m) => m.status === tab).length}
              )
            </button>
          ))}
        </div>

        <button className="export-btn" onClick={handleExportPDF}>
          📄 Export Report
        </button>
      </div>

      {/* Table */}
      <div className="table-container">
        <table className="expiry-table">
          <thead>
            <tr>
              <th>Medicine Name</th>
              <th>Category</th>
              <th>Batch Number</th>
              <th>Quantity</th>
              <th>Stock Value</th>
              <th>Expiry Date</th>
              <th>Days Left</th>
              <th>Status</th>
              <th>Qty</th>
            </tr>
          </thead>

          <tbody>
            {filtered.length > 0 ? (
              filtered.map((m) => (
                <tr key={m.id}>
                  <td>{m.name}</td>
                  <td>{m.category}</td>
                  <td>{m.batch}</td>
                  <td>{m.qty}</td>
                  <td>{m.stock}</td>
                  <td>{m.expiry}</td>
                  <td className={m.status?.toLowerCase()}>
                    {m.daysLeft} days
                  </td>
                  <td>{m.supplier}</td>
                  <td>
                    <span className={`status-badge ${m.status?.toLowerCase()}`}>
                      {m.status}
                    </span>
                  </td>
                  <td>
                    {m.status !== "Safe" ? (
                      <button
                        className="return-btn"
                        onClick={() => handleReturn(m)}
                      >
                        ↩ Return
                      </button>
                    ) : (
                      "-"
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="10" style={{ textAlign: "center", color: "#999" }}>
                  No medicines found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {modal.show && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>Return Confirmation</h3>
            <p>
              Are you sure you want to return{" "}
              <strong>{modal.med.name}</strong> (Batch: {modal.med.batch})?
            </p>
            <div className="modal-actions">
              <button
                className="cancel-btn"
                onClick={() => setModal({ show: false, med: null })}
              >
                Cancel
              </button>
              <button className="confirm-btn" onClick={confirmReturn}>
                Confirm Return
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
