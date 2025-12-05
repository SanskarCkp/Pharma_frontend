import React, { useEffect, useState } from "react";
import "./SalesPurchaseReport.css";
import { Line } from "react-chartjs-2";
import { Link, useLocation } from "react-router-dom";
import { authFetch } from "../../api/http"; // add this at the top

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend);

const API_BASE = import.meta.env.VITE_API_URL?.replace(/\/$/, "") || "";
const SALES_SUMMARY_API = `${API_BASE}/api/v1/reports/sales/summary/`;

export default function SalesReport() {
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState(null);
  const [serverError, setServerError] = useState(null);

  /** ⭐ FILTER STATE */
  const [monthsRange, setMonthsRange] = useState("Last 10 Months");

  /** Convert "Last 6 Months" → 6 */
  function getMonths(label) {
    return parseInt(label.replace("Last ", "").replace(" Months", ""));
  }

  /** ⭐ XLSX EXPORT — Safe download */
  function handleExport(reportType) {
    const form = document.createElement("form");
    form.method = "POST";
    form.action = `${API_BASE}/api/v1/reports/exports/`;
    form.style.display = "none";

    form.appendChild(Object.assign(document.createElement("input"), {
      type: "hidden",
      name: "report_type",
      value: reportType,
    }));

    form.appendChild(Object.assign(document.createElement("input"), {
      type: "hidden",
      name: "params",
      value: JSON.stringify({ months: getMonths(monthsRange) }),
    }));

    document.body.appendChild(form);
    form.submit();
    setTimeout(() => form.remove(), 1500);
  }

  /** ⭐ FETCH SUMMARY WITH FILTER APPLIED */
  const fetchSummary = async () => {
    setLoading(true);
    setServerError(null);

    try {
      const months = getMonths(monthsRange);
      const res = await fetch(`${SALES_SUMMARY_API}?months=${months}`, {
        method: "GET",
        headers: { Accept: "application/json" },
      });

      if (!res.ok) throw new Error(`Request failed (${res.status})`);

      const data = await res.json();

      setSummary({
        total_revenue: data.total_revenue,
        total_transactions: data.total_transactions,
        avg_bill_value: data.average_bill_value,
        monthly: data.trend.map((t) => ({
          month: t.month,
          revenue: t.total,
        })),
      });
    } catch (err) {
      setServerError(err.message);
    } finally {
      setLoading(false);
    }
  };

  /** Fetch again when filter changes */
  useEffect(() => {
    fetchSummary();
  }, [monthsRange]);

  if (loading) return <div style={{ padding: 20 }}>Loading...</div>;
  if (serverError) return <div style={{ color: "red" }}>{serverError}</div>;
  if (!summary) return null;

  const chartData = {
    labels: summary.monthly.map((m) => m.month),
    datasets: [
      {
        label: "Revenue",
        data: summary.monthly.map((m) => m.revenue),
        borderWidth: 2,
        borderColor: "#13b57d",
        pointBackgroundColor: "#13b57d",
        tension: 0.3,
      },
    ],
  };

  return (
    <div className="sr-wrap">
      <h2 className="sr-title">Reports & Analytics</h2>
      <p className="sr-sub">View detailed reports and insights</p>

      {/* Tabs */}
      <div className="sr-tabs">
        <Link to="/reports/sales" className={location.pathname === "/reports/sales" ? "active" : ""}>
          Sales Report
        </Link>
        <Link to="/reports/purchases" className={location.pathname === "/reports/purchases" ? "active" : ""}>
          Purchase Report
        </Link>
        <Link to="/reports/expiry" className={location.pathname === "/reports/expiry" ? "active" : ""}>
          Expiry Report
        </Link>
        
      </div>

      {/* Filter + Export */}
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
          onClick={() => handleExport("SALES_REGISTER")}
        >
          Export
        </button>
      </div>

      {/* KPI Cards */}
      <div className="sr-cards">
        <div className="sr-card green">
          <p>Total Revenue</p>
          <h3>₹ {summary.total_revenue.toLocaleString()}</h3>
        </div>
        <div className="sr-card orange">
          <p>Total Transactions</p>
          <h3>{summary.total_transactions}</h3>
        </div>
        <div className="sr-card blue">
          <p>Average Bill Value</p>
          <h3>₹ {summary.avg_bill_value}</h3>
        </div>
      </div>

      {/* Chart */}
      <div className="sr-chart-card">
        <h4>Monthly Sales Trend</h4>
        <div className="sr-chart-wrapper">
          <Line data={chartData} options={{ responsive: true, maintainAspectRatio: false }} />
        </div>
      </div>
    </div>
  );
}