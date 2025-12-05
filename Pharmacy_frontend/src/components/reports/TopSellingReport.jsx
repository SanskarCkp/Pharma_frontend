import React, { useEffect, useState } from "react";
import "./TopSellingReport.css";
import { Bar } from "react-chartjs-2";
import { authFetch } from "../../api/http"; // add this at the top
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend
} from "chart.js";
import { Link, useLocation } from "react-router-dom";

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

const API_BASE = import.meta.env.VITE_API_URL?.replace(/\/$/, "") || "";
const TOP_SELLING_API = `${API_BASE}/api/v1/reports/sales/top-selling/`;

export default function TopSellingReport() {
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState([]);
  const [error, setError] = useState(null);

  /** ⭐ FILTER STATE */
  const [monthsRange, setMonthsRange] = useState("Last 6 Months");

  /** Convert "Last 6 Months" → 6 */
  function getMonths(label) {
    return parseInt(label.replace("Last ", "").replace(" Months", ""));
  }

  /** ⭐ EXPORT (includes months filter) */
  function handleExport(reportType = "TOP_SELLING") {
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

  /** ⭐ Fetch data with months filter */
  useEffect(() => {
    fetchData();
  }, [monthsRange]);

  async function fetchData() {
    setLoading(true);
    setError(null);

    const months = getMonths(monthsRange);

    try {
      const res = await fetch(`${TOP_SELLING_API}?months=${months}`, {
        method: "GET",
        headers: { Accept: "application/json" },
      });

      if (!res.ok) throw new Error(`Failed (${res.status})`);

      const data = await res.json();
      setRows(data.table || []);
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setLoading(false);
    }
  }

  const labels = rows.map((r) => r.medicine_name);
  const units = rows.map((r) => r.units_sold);

  const chartData = {
    labels,
    datasets: [
      {
        label: "Units Sold",
        data: units,
        backgroundColor: "#13b57d",
        barThickness: 18,
        borderRadius: 6,
      },
    ],
  };

  return (
    <div className="ts-wrap">
      <div className="ts-header">
        <div>
          <h2 className="ts-title">Reports & Analytics</h2>
          <p className="ts-sub">View detailed reports and insights</p>
        </div>

        <div className="ts-controls">
          <select
            className="ts-select"
            value={monthsRange}
            onChange={(e) => setMonthsRange(e.target.value)}
          >
            <option>Last 6 Months</option>
            <option>Last 10 Months</option>
            <option>Last 12 Months</option>
          </select>

          <button className="report-export-btn" onClick={() => handleExport("TOP_SELLING")}>
            Export
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="ts-tabs">
        <Link to="/reports/sales" className={location.pathname === "/reports/sales" ? "ts-tab active" : "ts-tab"}>Sales Report</Link>
        <Link to="/reports/purchases" className={location.pathname === "/reports/purchases" ? "ts-tab active" : "ts-tab"}>Purchase Report</Link>
        <Link to="/reports/expiry" className={location.pathname === "/reports/expiry" ? "ts-tab active" : "ts-tab"}>Expiry Report</Link>
        {/* <Link to="/reports/top-selling" className={location.pathname === "/reports/top-selling" ? "ts-tab active" : "ts-tab"}>Top Selling</Link> */}
      </div>

      {/* TABLE */}
      <div className="ts-card">
        <h4 className="ts-card-title">Top 5 Best Selling Medicines</h4>

        <div className="ts-table-wrap">
          {loading ? (
            <div className="ts-loading">Loading...</div>
          ) : error ? (
            <div className="ts-error">Error: {error}</div>
          ) : (
            <table className="ts-table">
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Medicine Name</th>
                  <th>Units Sold</th>
                  <th>Revenue (₹)</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr><td colSpan="4" className="ts-no-data">No records found</td></tr>
                ) : (
                  rows.map((r, i) => (
                    <tr key={i}>
                      <td><span className="ts-rank">#{i + 1}</span></td>
                      <td className="td-left">{r.medicine_name}</td>
                      <td>{r.units_sold}</td>
                      <td>₹ {Number(r.revenue).toLocaleString()}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* CHART */}
      <div className="ts-chart-card">
        <h4 className="ts-card-title">Sales Distribution</h4>
        <div className="ts-chart">
          <Bar
            data={chartData}
            options={{
              indexAxis: "y",
              responsive: true,
              maintainAspectRatio: false,
              plugins: { legend: { display: false } },
              scales: {
                x: { beginAtZero: true, grid: { color: "#eee" } },
                y: { grid: { display: false } },
              },
            }}
          />
        </div>
      </div>
    </div>
  );
}