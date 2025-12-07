import React, { useEffect, useState } from "react";
import { Line } from "react-chartjs-2";
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
  PointElement,
  LineElement,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend);

const SALES_SUMMARY_API = apiUrl("reports/sales/summary/");

export default function SalesReport() {
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState(null);
  const [serverError, setServerError] = useState(null);
  const [monthsRange, setMonthsRange] = useState("Last 10 Months");

  const fetchSummary = async () => {
    setLoading(true);
    setServerError(null);

    try {
      const months = getMonthsFromLabel(monthsRange);
      const res = await authFetch(`${SALES_SUMMARY_API}?months=${months}`);

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

  useEffect(() => {
    fetchSummary();
  }, [monthsRange]);

  const handleExport = () => {
    const months = getMonthsFromLabel(monthsRange);
    exportReport("SALES_REGISTER", { months });
  };

  if (loading) return <div className="report-loading">Loading...</div>;
  if (serverError) return <div className="report-error">{serverError}</div>;
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
          title="Total Revenue"
          value={`₹ ${summary.total_revenue.toLocaleString()}`}
          variant="green"
        />
        <KPICard
          title="Total Transactions"
          value={summary.total_transactions}
          variant="orange"
        />
        <KPICard
          title="Average Bill Value"
          value={`₹ ${summary.avg_bill_value}`}
          variant="blue"
        />
      </div>

      <div className="report-chart-card">
        <h4>Monthly Sales Trend</h4>
        <div className="report-chart-wrapper">
          <Line data={chartData} options={{ responsive: true, maintainAspectRatio: false }} />
        </div>
      </div>
    </ReportLayout>
  );
}
