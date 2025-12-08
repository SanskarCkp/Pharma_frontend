import React, { useEffect, useState } from "react";
import { Line, Bar, Doughnut } from "react-chartjs-2";
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
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Tooltip, Legend);

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

  // Calculate additional metrics
  const revenueGrowth = summary.monthly.length >= 2
    ? ((summary.monthly[summary.monthly.length - 1].revenue - summary.monthly[summary.monthly.length - 2].revenue) / summary.monthly[summary.monthly.length - 2].revenue * 100).toFixed(1)
    : 0;


  const peakMonth = summary.monthly.reduce((max, m) => m.revenue > max.revenue ? m : max, summary.monthly[0]);
  const avgMonthlyRevenue = (summary.total_revenue / summary.monthly.length).toFixed(0);

  // Line chart for revenue trend
  const lineChartData = {
    labels: summary.monthly.map((m) => m.month),
    datasets: [
      {
        label: "Revenue (₹)",
        data: summary.monthly.map((m) => m.revenue),
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

  // Bar chart for comparative view
  const barChartData = {
    labels: summary.monthly.map((m) => m.month),
    datasets: [
      {
        label: "Revenue (₹)",
        data: summary.monthly.map((m) => m.revenue),
        backgroundColor: summary.monthly.map((m) =>
          m === peakMonth ? "#13b57d" : "rgba(19, 181, 125, 0.6)"
        ),
        borderRadius: 8,
        borderWidth: 0,
      },
    ],
  };

  // Get top and bottom performing months
  const sortedMonths = [...summary.monthly].sort((a, b) => b.revenue - a.revenue);
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
          title="Total Revenue"
          value={`₹ ${summary.total_revenue.toLocaleString()}`}
          subtitle={`${revenueGrowth > 0 ? '+' : ''}${revenueGrowth}% from last month`}
          variant="green"
        />
        <KPICard
          title="Total Transactions"
          value={summary.total_transactions}
          subtitle="Completed orders"
          variant="orange"
        />
        <KPICard
          title="Average Bill Value"
          value={`₹ ${summary.avg_bill_value}`}
          subtitle="Per transaction"
          variant="blue"
        />
        <KPICard
          title="Avg Monthly Revenue"
          value={`₹ ${Number(avgMonthlyRevenue).toLocaleString()}`}
          subtitle={`Peak: ${peakMonth?.month}`}
          variant="purple"
        />
      </div>

      <div className="report-charts-grid">
        <div className="report-chart-card chart-primary">
          <h4>Revenue Trend Analysis</h4>
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
                      label: (context) => `Revenue: ₹${context.parsed.y.toLocaleString()}`
                    }
                  }
                },
                scales: {
                  y: {
                    beginAtZero: true,
                    ticks: {
                      callback: (value) => '₹' + value.toLocaleString()
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
                      label: (context) => `Revenue: ₹${context.parsed.y.toLocaleString()}`
                    }
                  }
                },
                scales: {
                  x: { grid: { display: false } },
                  y: {
                    beginAtZero: true,
                    ticks: {
                      callback: (value) => '₹' + value.toLocaleString()
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
          <h4 className="insight-title">Top Performing Months</h4>
          <div className="insight-list">
            {topMonths.map((m, i) => (
              <div key={i} className="insight-item">
                <div className="insight-rank">#{i + 1}</div>
                <div className="insight-details">
                  <span className="insight-label">{m.month}</span>
                  <span className="insight-value">₹ {m.revenue.toLocaleString()}</span>
                </div>
                <div className="insight-bar">
                  <div
                    className="insight-bar-fill"
                    style={{ width: `${(m.revenue / topMonths[0].revenue) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="report-insight-card">
          <h4 className="insight-title">Needs Attention</h4>
          <div className="insight-list">
            {bottomMonths.map((m, i) => (
              <div key={i} className="insight-item">
                <div className="insight-rank warning">#{sortedMonths.length - i}</div>
                <div className="insight-details">
                  <span className="insight-label">{m.month}</span>
                  <span className="insight-value">₹ {m.revenue.toLocaleString()}</span>
                </div>
                <div className="insight-bar">
                  <div
                    className="insight-bar-fill warning"
                    style={{ width: `${(m.revenue / topMonths[0].revenue) * 100}%` }}
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
              <span className="stat-label">Peak Revenue Month</span>
              <span className="stat-value">{peakMonth?.month}</span>
            </div>
            <div className="stat-row">
              <span className="stat-label">Peak Revenue Amount</span>
              <span className="stat-value">₹ {peakMonth?.revenue.toLocaleString()}</span>
            </div>
            <div className="stat-row">
              <span className="stat-label">Monthly Average</span>
              <span className="stat-value">₹ {Number(avgMonthlyRevenue).toLocaleString()}</span>
            </div>
            <div className="stat-row">
              <span className="stat-label">Growth Rate</span>
              <span className={`stat-value ${revenueGrowth >= 0 ? 'positive' : 'negative'}`}>
                {revenueGrowth > 0 ? '+' : ''}{revenueGrowth}%
              </span>
            </div>
          </div>
        </div>
      </div>
    </ReportLayout>
  );
}
