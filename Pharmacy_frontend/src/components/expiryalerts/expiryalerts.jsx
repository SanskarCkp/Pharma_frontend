import React, { useState, useEffect } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import "./expiryalerts.css";
import { authFetch } from "../../api/http";
import { apiUrl } from "../../api/base";

const EXPIRY_ALERTS_API = apiUrl("inventory/expiry-alerts/");
const DEFAULT_LOCATION = Number(import.meta.env.VITE_DEFAULT_LOCATION_ID || 1);

export default function ExpiryAlerts() {
  const [activeTab, setActiveTab] = useState("All");
  const [medicines, setMedicines] = useState([]);
  const [modal, setModal] = useState({ show: false, med: null });
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState({ critical: 0, warning: 0, safe: 0 });
  const [locationId, setLocationId] = useState(String(DEFAULT_LOCATION));

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (locationId) params.set("location_id", locationId);
        params.set("bucket", activeTab === "All" ? "all" : activeTab.toLowerCase());
        const response = await authFetch(`${EXPIRY_ALERTS_API}?${params.toString()}`);
        if (!response.ok) throw new Error("Failed to load data");
        const data = await response.json();
        setMedicines(Array.isArray(data.items) ? data.items : []);
        setSummary(data.summary || { critical: 0, warning: 0, safe: 0 });
      } catch (error) {
        console.error("Error fetching medicines:", error);
        setMedicines([]);
        setSummary({ critical: 0, warning: 0, safe: 0 });
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [activeTab, locationId]);

  const filtered = medicines;

  const kpi = {
    critical: summary.critical || 0,
    warning: summary.warning || 0,
    safe: summary.safe || 0,
    totalValue: medicines
      .filter((m) => (m.status || "").toUpperCase() !== "SAFE")
      .reduce((sum, m) => sum + Number(m.quantity_base || 0), 0)
      .toFixed(2),
  };

  const handleExportPDF = () => {
    const exportData = medicines.filter(
      (m) => (m.status || "").toUpperCase() === "CRITICAL" || (m.status || "").toUpperCase() === "WARNING"
    );

    if (!exportData.length) {
      alert("No critical or warning medicines to export!");
      return;
    }

    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(14);
    doc.text("Medicine Expiry Report (Critical & Warning Only)", 14, 15);

    const tableData = exportData.map((m) => [
      m.product_name || m.product_id,
      m.batch_no,
      Number(m.quantity_base || 0).toLocaleString(),
      m.expiry_date,
      `${m.days_left != null ? m.days_left : "-"} days`,
      m.status,
    ]);

    autoTable(doc, {
      startY: 25,
      head: [["Product", "Batch No.", "Qty (Base)", "Expiry Date", "Days Left", "Status"]],
      body: tableData,
      theme: "grid",
      styles: { fontSize: 10, cellPadding: 3, font: "helvetica" },
      headStyles: { fillColor: [20, 184, 166], textColor: 255, halign: "center" },
      bodyStyles: { halign: "center" },
    });

    const pageHeight = doc.internal.pageSize.height;
    doc.setFontSize(10);
    doc.text(
      `Generated on: ${new Date().toLocaleDateString()} | Total Medicines: ${exportData.length}`,
      14,
      pageHeight - 10
    );

    doc.save(`ExpiryReport-${new Date().toISOString().slice(0, 10)}.pdf`);
    alert("Critical & warning medicines exported successfully!");
  };

  const handleReturn = (medicine) => {
    setModal({ show: true, med: medicine });
  };

  const confirmReturn = () => {
    if (modal.med) {
      setMedicines((prev) => prev.filter((m) => m.batch_lot_id !== modal.med.batch_lot_id));
      alert(`Batch ${modal.med.batch_no} has been marked as returned (local only).`);
    }
    setModal({ show: false, med: null });
  };

  if (loading) {
    return (
      <div className="expiryalerts-page">
        <p>Loading medicine data...</p>
      </div>
    );
  }

  return (
    <div className="expiryalerts-page">
      <div className="expiryalerts-header">
        <div>
          <h2 className="page-title">Medicine Expiry Alerts</h2>
          <p className="page-subtitle">Monitor and manage medicines nearing expiration</p>
        </div>
        <div>
          <label style={{ fontSize: 12, color: "#555" }}>Location</label>
          <input
            type="number"
            min="1"
            value={locationId}
            onChange={(e) => setLocationId(e.target.value)}
            className="location-input"
          />
        </div>
      </div>

      <div className="kpi-cards">
        <div className="kpi-card critical">
          <h4>Critical (&lt;30 days)</h4>
          <h2>{kpi.critical}</h2>
          <p>Immediate action required</p>
        </div>
        <div className="kpi-card warning">
          <h4>Warning (31–90 days)</h4>
          <h2>{kpi.warning}</h2>
          <p>Plan for clearance</p>
        </div>
        <div className="kpi-card safe">
          <h4>Safe (&gt;90 days)</h4>
          <h2>{kpi.safe}</h2>
          <p>No immediate concern</p>
        </div>
        <div className="kpi-card value">
          <h4>At-Risk Quantity</h4>
          <h2>{kpi.totalValue}</h2>
          <p>Critical + warning base units</p>
        </div>
      </div>

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
                ? Object.values(summary).reduce((sum, val) => sum + Number(val || 0), 0)
                : summary[tab.toLowerCase()] || 0}
              )
            </button>
          ))}
        </div>

        <button className="export-btn" onClick={handleExportPDF}>
          Export
        </button>
      </div>

      <div className="table-container">
        {activeTab !== "All" && (
          <div className={`alert-banner ${activeTab.toLowerCase()}`}>
            <strong>{activeTab}:</strong>{" "}
            {activeTab === "Critical"
              ? "Expiring within 30 days"
              : activeTab === "Warning"
              ? "Expiring in 31–90 days"
              : "No immediate concern"}
          </div>
        )}

        <table className="expiry-table">
          <thead>
            <tr>
              <th>Product</th>
              <th>Batch Number</th>
              <th>Quantity (Base)</th>
              <th>Expiry Date</th>
              <th>Days Left</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length > 0 ? (
              filtered.map((m) => (
                <tr key={`${m.batch_lot_id}-${m.batch_no}`}>
                  <td>{m.product_name || m.medicine_name || m.product_id || "-"}</td>
                  <td>{m.batch_no}</td>
                  <td>{Number(m.quantity_base || 0).toLocaleString()}</td>
                  <td>{m.expiry_date}</td>
                  <td className={m.status?.toLowerCase()}>
                    {m.days_left != null ? `${m.days_left} days` : "-"}
                  </td>
                  <td>
                    <span className={`status-badge ${m.status?.toLowerCase()}`}>
                      {m.status}
                    </span>
                  </td>
                  <td>
                    {m.status?.toUpperCase() !== "SAFE" ? (
                      <button className="return-btn" onClick={() => handleReturn(m)}>
                        Return
                      </button>
                    ) : (
                      "-"
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="7" className="ts-no-data">
                  No medicines found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {modal.show && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>Return Confirmation</h3>
            <p>
              Are you sure you want to return{" "}
              <strong>{modal.med.product_name || modal.med.product_id}</strong> (Batch: {modal.med.batch_no})?
            </p>
            <div className="modal-actions">
              <button className="cancel-btn" onClick={() => setModal({ show: false, med: null })}>
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
