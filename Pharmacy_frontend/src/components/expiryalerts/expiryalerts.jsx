import React, { useState, useEffect } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import "./expiryalerts.css";
import { authFetch } from "../../api/http";

const API_BASE_URL = import.meta.env.VITE_API_URL;

export default function ExpiryAlerts() {
  const [activeTab, setActiveTab] = useState("All");
  const [items, setItems] = useState([]);
  const [summary, setSummary] = useState({ critical: 0, warning: 0, safe: 0 });
  const [thresholds, setThresholds] = useState({ critical: 30, warning: 60 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadThresholds();
    loadExpiryAlerts();
  }, []);

  // -------------------------------
  // Load Thresholds from Settings
  // -------------------------------
  const loadThresholds = async () => {
    try {
      const res = await authFetch(`${API_BASE_URL}/api/v1/settings/app/`);
      if (!res.ok) return;

      const data = await res.json();
      const alerts = data.alerts || {};

      setThresholds({
        critical: parseInt(alerts.ALERT_EXPIRY_CRITICAL_DAYS ?? 30, 10),
        warning: parseInt(alerts.ALERT_EXPIRY_WARNING_DAYS ?? 60, 10),
      });
    } catch (e) {
      console.error("Failed to load thresholds", e);
    }
  };

  // -------------------------------
  // Load Expiry Alerts (Real Backend Data)
  // -------------------------------
  const loadExpiryAlerts = async () => {
    setLoading(true);
    try {
      const res = await authFetch(
        `${API_BASE_URL}/api/v1/inventory/expiry-alerts/?bucket=all`
      );
      if (!res.ok) throw new Error("API error");

      const data = await res.json();
      setSummary(data.summary || {});
      setItems(data.items || []);
    } catch (e) {
      console.error("Error loading expiry alerts", e);
    }
    setLoading(false);
  };

  // -------------------------------
  // Filter Items by Tab
  // -------------------------------
  const filtered =
    activeTab === "All"
      ? items
      : items.filter(
          (it) => it.status.toLowerCase() === activeTab.toLowerCase()
        );

  // -------------------------------
  // Export PDF
  // -------------------------------
  const handleExportPDF = () => {
    const exportData = items.filter((it) =>
      ["CRITICAL", "WARNING"].includes(it.status)
    );

    if (!exportData.length) {
      alert("⚠ No items to export");
      return;
    }

    const doc = new jsPDF();
    doc.text("Medicine Expiry Report", 14, 15);

    autoTable(doc, {
      startY: 25,
      head: [
        [
          "Product ID",
          "Batch No",
          "Expiry Date",
          "Days Left",
          "Status",
          "Quantity",
        ],
      ],
      body: exportData.map((it) => [
        it.product_id,
        it.batch_no,
        it.expiry_date,
        it.days_left,
        it.status,
        it.quantity_base,
      ]),
    });

    doc.save("Expiry-Report.pdf");
  };

  // -------------------------------
  // UI Rendering
  // -------------------------------
  if (loading) {
    return (
      <div className="expiryalerts-page">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p className="loading-text">Loading expiry alerts...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="expiryalerts-page">
      <h2 className="page-title">Medicine Expiry Alerts</h2>
      <p className="page-subtitle">Manage medicines nearing expiration</p>

      {/* KPI CARDS */}
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
          <h4>Safe (&gt; {thresholds.warning} days)</h4>
          <h2>{summary.safe}</h2>
        </div>
      </div>

      {/* TABS */}
      <div className="tabs">
        <div>
          {["All", "Critical", "Warning", "Safe"].map((tab) => (
            <button
              key={tab}
              className={`tab ${activeTab === tab ? "active" : ""}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
            </button>
          ))}
        </div>

        <button className="export-btn" onClick={handleExportPDF}>
          📄 Export
        </button>
      </div>

      {/* TABLE */}
      <div className="table-container">
        <table className="expiry-table">
          <thead>
            <tr>
              <th>Product ID</th>
              <th>Batch No</th>
              <th>Expiry</th>
              <th>Days Left</th>
              <th>Status</th>
              <th>Qty</th>
            </tr>
          </thead>

          <tbody>
            {filtered.length ? (
              filtered.map((it, idx) => (
                <tr key={idx}>
                  <td>{it.product_id}</td>
                  <td>{it.batch_no}</td>
                  <td>{it.expiry_date}</td>
                  <td>{it.days_left}</td>
                  <td>
                    <span
                      className={`status-badge ${it.status.toLowerCase()}`}
                    >
                      {it.status}
                    </span>
                  </td>
                  <td>{it.quantity_base}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="6" style={{ textAlign: "center" }}>
                  No records found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
