import React, { useEffect, useState } from "react";
import { Bar } from "react-chartjs-2";
import { authFetch } from "../../api/http";
import { apiUrl } from "../../api/base";
import ReportLayout from "./common/ReportLayout";
import ReportTabs from "./common/ReportTabs";
import ReportControls from "./common/ReportControls";
import { exportReport, getMonthsFromLabel } from "./utils/exportUtils";

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

const TOP_SELLING_API = apiUrl("reports/sales/top-selling/");

export default function TopSellingReport() {
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState([]);
  const [error, setError] = useState(null);
  const [monthsRange, setMonthsRange] = useState("Last 6 Months");

  const handleExport = () => {
    const months = getMonthsFromLabel(monthsRange);
    exportReport("TOP_SELLING", { months });
  };

  const fetchData = async () => {
    setLoading(true);
    setError(null);

    const months = getMonthsFromLabel(monthsRange);

    try {
      const res = await authFetch(`${TOP_SELLING_API}?months=${months}`);

      if (!res.ok) throw new Error(`Failed (${res.status})`);

      const data = await res.json();
      setRows(data.table || []);
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [monthsRange]);

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
    <ReportLayout
      title="Reports & Analytics"
      subtitle="View detailed reports and insights"
    >
      <ReportTabs />

      <ReportControls
        showMonthFilter={true}
        monthsRange={monthsRange}
        onMonthsChange={setMonthsRange}
        onExport={handleExport}
      />

      <div className="report-table-card">
        <h4>Top 5 Best Selling Medicines</h4>

        <div className="report-table-wrap">
          {loading ? (
            <div className="report-loading">Loading...</div>
          ) : error ? (
            <div className="report-error">Error: {error}</div>
          ) : (
            <table className="report-table">
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
                  <tr>
                    <td colSpan="4" className="report-table-no-data">
                      No records found
                    </td>
                  </tr>
                ) : (
                  rows.map((r, i) => (
                    <tr key={i}>
                      <td>
                        <span className="report-rank">#{i + 1}</span>
                      </td>
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

      <div className="report-chart-card">
        <h4>Sales Distribution</h4>
        <div className="report-chart-wrapper">
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
    </ReportLayout>
  );
}
