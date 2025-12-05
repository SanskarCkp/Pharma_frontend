import React, { useEffect, useState } from "react";
import "./ExpiryReport.css";
import { Link, useLocation } from "react-router-dom";
import { authFetch } from "../../api/http";
import { apiUrl } from "../../api/base";

const EXPIRY_API = apiUrl("reports/expiry/");
const EXPORT_URL = apiUrl("reports/exports/");

export default function ExpiryReport() {
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState([]);
  const [error, setError] = useState(null);

  // window = all | warning | critical
  const [windowFilter, setWindowFilter] = useState("all");

  /** ⭐ EXPORT XLSX WITH FILTER */
  async function handleExport() {
    try {
      const formData = new FormData();
      formData.append("report_type", "EXPIRY_STATUS");
      formData.append("params", JSON.stringify({ window: windowFilter }));
      const res = await authFetch(EXPORT_URL, { method: "POST", body: formData });
      if (!res.ok) throw new Error(`Export failed (${res.status})`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `expiry-report-${Date.now()}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert(err.message || "Export failed");
    }
  }

  /** Fetch expiry list */
  const fetchData = async () => {
    setLoading(true);
    setError(null);

    try {
      const url = new URL(EXPIRY_API, window.location.origin);

      if (windowFilter !== "all") {
        url.searchParams.set("window", windowFilter);
      }

      const res = await authFetch(url.toString());

      if (!res.ok) throw new Error(`Failed to fetch (${res.status})`);

      const data = await res.json();
      setRows(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [windowFilter]);

  return (
    <div className="er-wrap">
      <div className="er-header">
        <div>
          <h2 className="er-title">Reports & Analytics</h2>
          <p className="er-sub">View detailed reports and insights</p>
        </div>

        {/* Export */}
        <button className="report-export-btn" onClick={handleExport}>
          Export
        </button>
      </div>

      {/* Tabs */}
      <div className="er-tabs">
        <Link to="/reports/sales" className={location.pathname === "/reports/sales" ? "er-tab active" : "er-tab"}>
          Sales Report
        </Link>

        <Link to="/reports/purchases" className={location.pathname === "/reports/purchases" ? "er-tab active" : "er-tab"}>
          Purchase Report
        </Link>

        <Link to="/reports/expiry" className={location.pathname === "/reports/expiry" ? "er-tab active" : "er-tab"}>
          Expiry Report
        </Link>

        <Link to="/reports/top-selling" className={location.pathname === "/reports/top-selling" ? "er-tab active" : "er-tab"}>
          Top Selling
        </Link>
      </div>

      {/* Main Card */}
      <div className="er-card">
        <h4 className="er-card-title">Medicine Expiry Tracking</h4>

        {/* Window Filter */}
        <div className="er-filter-row">
          <label>Window:</label>
          <div className="er-filter-buttons">
            <button
              className={windowFilter === "all" ? "er-filter-btn active" : "er-filter-btn"}
              onClick={() => setWindowFilter("all")}
            >
              All
            </button>

            <button
              className={windowFilter === "warning" ? "er-filter-btn active" : "er-filter-btn"}
              onClick={() => setWindowFilter("warning")}
            >
              Warning
            </button>

            <button
              className={windowFilter === "critical" ? "er-filter-btn active" : "er-filter-btn"}
              onClick={() => setWindowFilter("critical")}
            >
              Critical
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="er-table-wrap">
          {loading ? (
            <div className="er-loading">Loading...</div>
          ) : error ? (
            <div className="er-error">Error: {error}</div>
          ) : (
            <table className="er-table">
              <thead>
                <tr>
                  <th>Medicine</th>
                  <th>Batch No</th>
                  <th>Qty</th>
                  <th>Expiry</th>
                  <th>Days Left</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="er-no-data">
                      No items found.
                    </td>
                  </tr>
                ) : (
                  rows.map((r, i) => {
                    const status = (r.status || "").toLowerCase();
                    return (
                      <tr key={i}>
                        <td className="td-left">{r.product_name || "-"}</td>
                        <td>{r.batch_no || "-"}</td>
                        <td>{r.quantity ?? "-"}</td>
                        <td>{r.expiry_date ? String(r.expiry_date) : "-"}</td>
                        <td>{r.days_left != null ? `${r.days_left} days` : "-"}</td>
                        <td>
                          <span
                            className={
                              status === "critical"
                                ? "er-badge er-badge-critical"
                                : status === "warning"
                                ? "er-badge er-badge-warning"
                                : "er-badge er-badge-safe"
                            }
                          >
                            {r.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
