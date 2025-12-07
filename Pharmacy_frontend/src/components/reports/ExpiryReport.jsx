import React, { useEffect, useState } from "react";
import { authFetch } from "../../api/http";
import { apiUrl } from "../../api/base";
import ReportLayout from "./common/ReportLayout";
import ReportTabs from "./common/ReportTabs";
import { exportReport } from "./utils/exportUtils";

const EXPIRY_API = apiUrl("reports/expiry/");

export default function ExpiryReport() {
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState([]);
  const [error, setError] = useState(null);
  const [windowFilter, setWindowFilter] = useState("all");

  const handleExport = () => {
    exportReport("EXPIRY_STATUS", { window: windowFilter });
  };

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
    <ReportLayout
      title="Reports & Analytics"
      subtitle="View detailed reports and insights"
      headerActions={
        <button className="report-export-btn" onClick={handleExport}>
          Export
        </button>
      }
    >
      <ReportTabs />

      <div className="report-table-card">
        <h4>Medicine Expiry Tracking</h4>

        <div className="report-filter-row">
          <label>Window:</label>
          <div className="report-filter-buttons">
            <button
              className={windowFilter === "all" ? "report-filter-btn active" : "report-filter-btn"}
              onClick={() => setWindowFilter("all")}
            >
              All
            </button>

            <button
              className={windowFilter === "warning" ? "report-filter-btn active" : "report-filter-btn"}
              onClick={() => setWindowFilter("warning")}
            >
              Warning
            </button>

            <button
              className={windowFilter === "critical" ? "report-filter-btn active" : "report-filter-btn"}
              onClick={() => setWindowFilter("critical")}
            >
              Critical
            </button>
          </div>
        </div>

        <div className="report-table-wrap">
          {loading ? (
            <div className="report-loading">Loading...</div>
          ) : error ? (
            <div className="report-error">Error: {error}</div>
          ) : (
            <table className="report-table">
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
                    <td colSpan="6" className="report-table-no-data">
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
                                ? "report-badge report-badge-critical"
                                : status === "warning"
                                ? "report-badge report-badge-warning"
                                : "report-badge report-badge-safe"
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
    </ReportLayout>
  );
}
