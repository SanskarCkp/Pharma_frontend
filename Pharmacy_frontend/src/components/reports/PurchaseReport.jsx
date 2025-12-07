import React, { useEffect, useState } from "react";
import { Bar } from "react-chartjs-2";
import { authFetch } from "../../api/http";
import { apiUrl } from "../../api/base";
import ReportLayout from "./common/ReportLayout";
import ReportTabs from "./common/ReportTabs";
import ReportControls from "./common/ReportControls";
import KPICard from "./common/KPICard";
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

const PURCHASE_SUMMARY_API = apiUrl("reports/purchases/summary/");

export default function PurchaseReport() {
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState(null);
  const [monthsRange, setMonthsRange] = useState("Last 10 Months");

  const fetchSummary = async () => {
    setLoading(true);
    setError(null);

    try {
      const months = getMonthsFromLabel(monthsRange);
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

  useEffect(() => {
    fetchSummary();
  }, [monthsRange]);

  const handleExport = () => {
    const months = getMonthsFromLabel(monthsRange);
    exportReport("STOCK_LEDGER", { months });
  };

  if (loading) return <div className="report-loading">Loading...</div>;
  if (error) return <div className="report-error">{error}</div>;
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

      <div className="kpi-cards">
        <KPICard
          title="Total Purchase"
          value={`₹ ${Number(summary.total_purchase).toLocaleString()}`}
          variant="green"
        />
        <KPICard
          title="Total Orders"
          value={summary.total_orders}
          variant="orange"
        />
      </div>

      <div className="report-chart-card">
        <h4>Monthly Purchase Trend</h4>
        <div className="report-chart-wrapper">
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
    </ReportLayout>
  );
}
