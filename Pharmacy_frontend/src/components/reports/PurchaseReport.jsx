import React, { useEffect, useState } from "react";
import { Bar, Line } from "react-chartjs-2";
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
  PointElement,
  LineElement,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, Tooltip, Legend);

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

  // Calculate additional metrics
  const purchaseGrowth = summary.monthly.length >= 2
    ? ((summary.monthly[summary.monthly.length - 1].value - summary.monthly[summary.monthly.length - 2].value) / summary.monthly[summary.monthly.length - 2].value * 100).toFixed(1)
    : 0;

  const peakMonth = summary.monthly.reduce((max, m) => m.value > max.value ? m : max, summary.monthly[0]);
  const avgMonthlyPurchase = (summary.total_purchase / summary.monthly.length).toFixed(0);
  const avgOrdersPerMonth = (summary.total_orders / summary.monthly.length).toFixed(0);
  const avgOrderValue = summary.total_orders > 0 ? (summary.total_purchase / summary.total_orders).toFixed(0) : 0;

  // Bar chart data
  const barChartData = {
    labels: summary.monthly.map((m) => m.month),
    datasets: [
      {
        label: "Purchase Orders",
        data: summary.monthly.map((m) => m.value),
        backgroundColor: summary.monthly.map((m) =>
          m === peakMonth ? "#13b57d" : "rgba(19, 181, 125, 0.6)"
        ),
        borderRadius: 8,
        borderWidth: 0,
      },
    ],
  };

  // Line chart for trend analysis
  const lineChartData = {
    labels: summary.monthly.map((m) => m.month),
    datasets: [
      {
        label: "Purchase Orders",
        data: summary.monthly.map((m) => m.value),
        borderWidth: 3,
        borderColor: "#13b57d",
        backgroundColor: "rgba(19, 181, 125, 0.1)",
        pointBackgroundColor: "#13b57d",
        pointBorderColor: "#fff",
        pointBorderWidth: 2,
        pointRadius: 5,
        pointHoverRadius: 7,
        tension: 0.4,
        fill: true,
      },
    ],
  };

  // Get top and bottom performing months
  const sortedMonths = [...summary.monthly].sort((a, b) => b.value - a.value);
  const topMonths = sortedMonths.slice(0, 3);
  const bottomMonths = sortedMonths.slice(-3).reverse();

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
          subtitle={`${purchaseGrowth > 0 ? '+' : ''}${purchaseGrowth}% from last month`}
          variant="green"
        />
        <KPICard
          title="Total Orders"
          value={summary.total_orders}
          subtitle="Purchase orders placed"
          variant="orange"
        />
        <KPICard
          title="Avg Order Value"
          value={`₹ ${Number(avgOrderValue).toLocaleString()}`}
          subtitle="Per purchase order"
          variant="blue"
        />
        <KPICard
          title="Avg Monthly Orders"
          value={avgOrdersPerMonth}
          subtitle={`Peak: ${peakMonth?.month}`}
          variant="purple"
        />
      </div>

      <div className="report-charts-grid">
        <div className="report-chart-card chart-primary">
          <h4>Purchase Order Trend</h4>
          <div className="report-chart-wrapper">
            <Line
              data={lineChartData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: { display: false },
                  tooltip: {
                    callbacks: {
                      label: (context) => `Orders: ${context.parsed.y}`
                    }
                  }
                },
                scales: {
                  y: {
                    beginAtZero: true,
                    ticks: {
                      stepSize: 1
                    }
                  }
                }
              }}
            />
          </div>
        </div>

        <div className="report-chart-card chart-secondary">
          <h4>Monthly Comparison</h4>
          <div className="report-chart-wrapper">
            <Bar
              data={barChartData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: { display: false },
                  tooltip: {
                    callbacks: {
                      label: (context) => `Orders: ${context.parsed.y}`
                    }
                  }
                },
                scales: {
                  x: { grid: { display: false } },
                  y: {
                    beginAtZero: true,
                    ticks: {
                      stepSize: 1
                    }
                  }
                }
              }}
            />
          </div>
        </div>
      </div>

      <div className="report-insights-grid">
        <div className="report-insight-card">
          <h4 className="insight-title">Most Active Months</h4>
          <div className="insight-list">
            {topMonths.map((m, i) => (
              <div key={i} className="insight-item">
                <div className="insight-rank">#{i + 1}</div>
                <div className="insight-details">
                  <span className="insight-label">{m.month}</span>
                  <span className="insight-value">{m.value} Orders</span>
                </div>
                <div className="insight-bar">
                  <div
                    className="insight-bar-fill"
                    style={{ width: `${(m.value / topMonths[0].value) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="report-insight-card">
          <h4 className="insight-title">Lower Activity Months</h4>
          <div className="insight-list">
            {bottomMonths.map((m, i) => (
              <div key={i} className="insight-item">
                <div className="insight-rank warning">#{sortedMonths.length - i}</div>
                <div className="insight-details">
                  <span className="insight-label">{m.month}</span>
                  <span className="insight-value">{m.value} Orders</span>
                </div>
                <div className="insight-bar">
                  <div
                    className="insight-bar-fill warning"
                    style={{ width: `${(m.value / topMonths[0].value) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="report-insight-card stats-card">
          <h4 className="insight-title">Quick Stats</h4>
          <div className="stats-list">
            <div className="stat-row">
              <span className="stat-label">Peak Purchase Month</span>
              <span className="stat-value">{peakMonth?.month}</span>
            </div>
            <div className="stat-row">
              <span className="stat-label">Peak Orders Count</span>
              <span className="stat-value">{peakMonth?.value} Orders</span>
            </div>
            <div className="stat-row">
              <span className="stat-label">Monthly Average Spend</span>
              <span className="stat-value">₹ {Number(avgMonthlyPurchase).toLocaleString()}</span>
            </div>
            <div className="stat-row">
              <span className="stat-label">Growth Rate</span>
              <span className={`stat-value ${purchaseGrowth >= 0 ? 'positive' : 'negative'}`}>
                {purchaseGrowth > 0 ? '+' : ''}{purchaseGrowth}%
              </span>
            </div>
          </div>
        </div>
      </div>
    </ReportLayout>
  );
}
