import React, { useEffect, useState } from "react";
import "./SalesPurchaseReport.css";
import { Bar } from "react-chartjs-2";
import { Link, useLocation } from "react-router-dom";
import { authFetch } from "../../api/http";
import { apiUrl } from "../../api/base";

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

const PURCHASE_SUMMARY_API = apiUrl("reports/purchases/summary/");
const EXPORT_URL = apiUrl("reports/exports/");

export default function PurchaseReport() {
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState(null);

  /** ⭐ FILTER STATE */
  const [monthsRange, setMonthsRange] = useState("Last 10 Months");

  /** Convert "Last 6 Months" → 6 */
  function getMonths(label) {
    return parseInt(label.replace("Last ", "").replace(" Months", ""));
  }

  /** ⭐ XLSX FILE DOWNLOAD */
  async function handleExport(reportType) {
    try {
      const formData = new FormData();
      formData.append("report_type", reportType);
      formData.append("params", JSON.stringify({ months: getMonths(monthsRange) }));
      const res = await authFetch(EXPORT_URL, { method: "POST", body: formData });
      if (!res.ok) throw new Error(`Export failed (${res.status})`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${reportType.toLowerCase()}-${Date.now()}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert(err.message || "Export failed");
    }
  }

  /** ⭐ FETCH PURCHASE SUMMARY WITH MONTHS FILTER */
  const fetchSummary = async () => {
    setLoading(true);
    setError(null);

    try {
      const months = getMonths(monthsRange);

      const res = await authFetch(`${PURCHASE_SUMMARY_API}?months=${months}`);

      if (!res.ok) throw new Error(`Request failed (${res.status})`);

      const data = await res.json();

      setSummary({
        total_purchase: data.total_purchase ?? 0,
        total_orders: data.total_orders ?? 0,
        monthly: data.trend.map((t) => ({
          month: t.month,
          value: t.orders ?? 0,
        })),
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  /** Re-fetch summary when filter changes */
  useEffect(() => {
    fetchSummary();
  }, [monthsRange]);

  if (loading) return <div style={{ padding: 20 }}>Loading...</div>;
  if (error) return <div style={{ color: "red", padding: 20 }}>{error}</div>;
  if (!summary) return null;

  const chartData = {
    labels: summary.monthly.map((m) => m.month),
    datasets: [
      {
        label: "Purchases",
        data: summary.monthly.map((m) => m.value),
        backgroundColor: "#13b57d",
        borderRadius: 6,
      },
    ],
  };

  return (
    <div className="pr-wrap">
      {/* HEADER */}
      <div className="pr-header">
        <div>
          <h2 className="pr-title">Reports & Analytics</h2>
          <p className="pr-sub">View detailed reports and insights</p>
        </div>

        {/* FILTER + EXPORT */}
        <div className="report-controls">
          <select
            className="report-select"
            value={monthsRange}
            onChange={(e) => setMonthsRange(e.target.value)}
          >
            <option>Last 6 Months</option>
            <option>Last 10 Months</option>
            <option>Last 12 Months</option>
          </select>

          <button
            className="report-export-btn"
            onClick={() => handleExport("STOCK_LEDGER")}
          >
            Export
          </button>
        </div>
      </div>

      {/* TABS */}
      <div className="pr-tabs">
        <Link to="/reports/sales" className={location.pathname === "/reports/sales" ? "active" : ""}>Sales Report</Link>
        <Link to="/reports/purchases" className={location.pathname === "/reports/purchases" ? "active" : ""}>Purchase Report</Link>
        <Link to="/reports/expiry" className={location.pathname === "/reports/expiry" ? "active" : ""}>Expiry Report</Link>
        
      </div>

      {/* KPI CARDS */}
      <div className="pr-cards">
        <div className="pr-card card-green">
          <p>Total Purchase</p>
          <h3>₹ {Number(summary.total_purchase).toLocaleString()}</h3>
        </div>
        <div className="pr-card card-orange">
          <p>Total Orders</p>
          <h3>{summary.total_orders}</h3>
        </div>
      </div>

      {/* CHART */}
      <div className="pr-chart-card">
        <h4>Monthly Purchase Trend</h4>
        <div className="pr-chart">
          <Bar
            data={chartData}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: { legend: { display: false } },
              scales: {
                x: { grid: { display: false } },
                y: { beginAtZero: true, grid: { color: "#eee" } },
              },
            }}
          />
        </div>
      </div>
    </div>
  );
}
