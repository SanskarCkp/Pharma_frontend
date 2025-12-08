import React, { useEffect, useMemo, useState } from "react";
import { authFetch } from "../../api/http";
import { apiUrl } from "../../api/base";
import ReportLayout from "../reports/common/ReportLayout";
import { exportReport } from "../reports/utils/exportUtils";
import "../reports/styles/reports.css";
import "../reports/ExpiryReport.css";

const EXPIRY_ALERTS_API = apiUrl("inventory/expiry-alerts/");
const SETTINGS_API = apiUrl("settings/app/");

const STATUS_ORDER = ["all", "critical", "warning", "safe"];
const STATUS_LABEL = {
  all: "All",
  critical: "Critical",
  warning: "Warning",
  safe: "Safe",
};

export default function ExpiryAlerts() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [items, setItems] = useState([]);
  const [summary, setSummary] = useState({ critical: 0, warning: 0, safe: 0 });
  const [thresholds, setThresholds] = useState({ critical: 30, warning: 60 });
  const [bucket, setBucket] = useState("all");

  const filteredItems = useMemo(() => {
    if (bucket === "all") return items;
    return items.filter(
      (it) => (it.status || "").toLowerCase() === bucket.toLowerCase()
    );
  }, [items, bucket]);

  const fetchThresholds = async () => {
    try {
      const res = await authFetch(SETTINGS_API);
      if (!res.ok) return;
      const data = await res.json();
      const alerts = data.alerts || {};
      setThresholds({
        critical: parseInt(alerts.ALERT_EXPIRY_CRITICAL_DAYS ?? 30, 10),
        warning: parseInt(alerts.ALERT_EXPIRY_WARNING_DAYS ?? 60, 10),
      });
    } catch (err) {
      console.error("Failed to load expiry thresholds", err);
    }
  };

  const fetchAlerts = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await authFetch(`${EXPIRY_ALERTS_API}?bucket=all`);
      if (!res.ok) throw new Error(`Failed to fetch (${res.status})`);
      const data = await res.json();
      setItems(data.items || []);
      setSummary(data.summary || { critical: 0, warning: 0, safe: 0 });
    } catch (err) {
      setError(err.message || "Unable to load expiry data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchThresholds();
    fetchAlerts();
  }, []);

  const handleExport = () => {
    exportReport("EXPIRY_STATUS", { bucket });
  };

  const badgeClass = (status) => {
    const s = (status || "").toLowerCase();
    if (s === "critical") return "er-badge er-badge-critical";
    if (s === "warning") return "er-badge er-badge-warning";
    return "er-badge er-badge-safe";
  };

  return (
    <ReportLayout
      title="Expiry Alerts"
      subtitle="Monitor medicines nearing expiration"
      headerActions={
        <button className="report-export-btn" onClick={handleExport} disabled={loading}>
          Export
        </button>
      }
    >
      <div className="er-wrap">
        <div className="er-kpis">
          <div className="er-kpi critical">
            <p>Critical (≤ {thresholds.critical} days)</p>
            <h3>{summary.critical ?? 0}</h3>
          </div>
          <div className="er-kpi warning">
            <p>
              Warning ({thresholds.critical + 1}–{thresholds.warning} days)
            </p>
            <h3>{summary.warning ?? 0}</h3>
          </div>
          <div className="er-kpi safe">
            <p>Safe (&gt; {thresholds.warning} days)</p>
            <h3>{summary.safe ?? 0}</h3>
          </div>
        </div>

        <div className="er-card">
          <div className="er-card-header">
            <div>
              <h4 className="er-card-title">Medicine Expiry Tracking</h4>
              <p className="er-card-sub">Live data shared across alerts and exports</p>
            </div>

            <div className="er-tabs">
              {STATUS_ORDER.map((key) => (
                <button
                  key={key}
                  className={bucket === key ? "er-tab active" : "er-tab"}
                  onClick={() => setBucket(key)}
                  disabled={loading}
                >
                  {STATUS_LABEL[key]}
                </button>
              ))}
            </div>
          </div>

          <div className="er-table-wrap">
            {loading ? (
              <div className="er-loading">Loading expiry data...</div>
            ) : error ? (
              <div className="er-error">Error: {error}</div>
            ) : (
              <table className="er-table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Batch</th>
                    <th>Expiry</th>
                    <th>Days Left</th>
                    <th>Status</th>
                    <th>Qty</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="er-no-data">
                        No items found.
                      </td>
                    </tr>
                  ) : (
                    filteredItems.map((r, i) => (
                      <tr key={`${r.batch_no}-${i}`}>
                        <td className="td-left">{r.product_name || r.product_id || "-"}</td>
                        <td>{r.batch_no || "-"}</td>
                        <td>{r.expiry_date || "-"}</td>
                        <td>{r.days_left != null ? `${r.days_left} days` : "-"}</td>
                        <td>
                          <span className={badgeClass(r.status)}>{r.status || "-"}</span>
                        </td>
                        <td>{r.quantity_base ?? r.quantity ?? "-"}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </ReportLayout>
  );
}
