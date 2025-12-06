import React, { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import "./dashboard.css";
import { authFetch } from "../../api/http";
import { apiUrl } from "../../api/base";

const SUMMARY_URL = apiUrl("dashboard/summary/");
const MONTHLY_URL = apiUrl("dashboard/monthly/");
const pieColors = ["#2ECC71", "#F1C40F", "#E74C3C"];

const formatCurrency = (value) =>
  `₹${Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const formatMonthLabel = (key) => {
  if (!key) return "";
  const [year, month] = key.split("-");
  const date = new Date(Number(year), Number(month) - 1, 1);
  return date.toLocaleDateString("en-IN", { month: "short", year: "numeric" });
};

const Dashboard = () => {
  const [summary, setSummary] = useState(null);
  const [monthlySeries, setMonthlySeries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let ignore = false;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const [summaryRes, monthlyRes] = await Promise.all([authFetch(SUMMARY_URL), authFetch(MONTHLY_URL)]);
        if (!summaryRes.ok) throw new Error(`Dashboard summary failed (${summaryRes.status})`);
        if (!monthlyRes.ok) throw new Error(`Monthly chart failed (${monthlyRes.status})`);
        if (ignore) return;
        const summaryJson = await summaryRes.json();
        const monthlyJson = await monthlyRes.json();
        setSummary(summaryJson);
        setMonthlySeries(Array.isArray(monthlyJson) ? monthlyJson : []);
      } catch (err) {
        console.error("Dashboard load failed", err);
        if (!ignore) setError(err.message || "Failed to load dashboard");
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    load();
    return () => {
      ignore = true;
    };
  }, [refreshKey]);

  const cards = summary
    ? [
        {
          title: "Total Medicines",
          value: summary?.totals?.medicines ?? 0,
          sub: `${summary?.totals?.low_stock ?? 0} low stock`,
          color: "#2ECC71",
        },
        {
          title: "Low Stock Alerts",
          value: summary?.totals?.low_stock ?? 0,
          sub: "Needs immediate attention",
          color: "#F39C12",
        },
        {
          title: "Today's Sales",
          value: formatCurrency(summary?.sales?.today_amount),
          sub: `${summary?.sales?.today_bills ?? 0} invoices`,
          color: "#3498DB",
        },
        {
          title: "Pending Bills",
          value: summary?.sales?.pending_bills ?? 0,
          sub: `${formatCurrency(summary?.sales?.pending_amount)} outstanding`,
          color: "#9B59B6",
        },
      ]
    : [
        { title: "Total Medicines", value: "—", sub: "", color: "#2ECC71" },
        { title: "Low Stock Alerts", value: "—", sub: "", color: "#F39C12" },
        { title: "Today's Sales", value: "—", sub: "", color: "#3498DB" },
        { title: "Pending Bills", value: "—", sub: "", color: "#9B59B6" },
      ];

  const inventoryStatus = summary?.inventory?.status || { in_stock: 0, low_stock: 0, out_of_stock: 0 };
  const inventoryData = [
    { name: "In Stock", value: Number(inventoryStatus.in_stock || 0) },
    { name: "Low Stock", value: Number(inventoryStatus.low_stock || 0) },
    { name: "Out of Stock", value: Number(inventoryStatus.out_of_stock || 0) },
  ];

  const chartSeries = monthlySeries.map((row) => ({
    month: formatMonthLabel(row.month),
    sales: Number(row.sales_total || 0),
    purchase: Number(row.purchases_total || 0),
  }));

  const recentSales = summary?.recent_sales || [];
  const lowStock = summary?.low_stock_items || [];

  const handleRefresh = () => setRefreshKey((n) => n + 1);

  if (loading) {
    return (
      <div className="dashboard-main">
        <p>Loading dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-main">
        <p style={{ color: "#b91c1c" }}>{error}</p>
        <button className="btn btn-primary" onClick={handleRefresh}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="dashboard-main">
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Welcome back! Here's what's happening today.</p>
        </div>
        <div className="page-actions">
          <button className="btn btn-primary" onClick={handleRefresh}>
            Refresh
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px', width: '100%' }}>
        {cards.map((card, index) => (
          <div key={index} className="dashboard-stat-card shadow bg-white p-4 rounded-xl border border-gray-100">
            <div className="font-medium text-gray-600">{card.title}</div>
            <div className="text-2xl font-bold mt-1">{card.value}</div>
            <div className="text-sm mt-1" style={{ color: card.color }}>
              {card.sub}
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-5">
        <div className="p-5 bg-white rounded-xl shadow border border-gray-100">
          <h3 className="font-semibold mb-3">Monthly Sales & Purchases</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={chartSeries}>
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="sales" fill="#3498DB" radius={[6, 6, 0, 0]} />
              <Bar dataKey="purchase" fill="#2ECC71" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="p-5 bg-white rounded-xl shadow border border-gray-100">
          <h3 className="font-semibold mb-3">Inventory Status</h3>
          <div className="flex items-center justify-center">
            <ResponsiveContainer width="75%" height={250}>
              <PieChart>
                <Pie data={inventoryData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                  {inventoryData.map((entry, index) => (
                    <Cell key={entry.name} fill={pieColors[index]} />
                  ))}
                </Pie>
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-5 mt-5">
        <div className="p-5 bg-white rounded-xl shadow border border-gray-100">
          <h3 className="font-semibold mb-3">Recent Sales</h3>
          {recentSales.length === 0 && <p className="text-gray-500 text-sm">No sales yet.</p>}
          {recentSales.map((sale, index) => (
            <div className="flex justify-between py-3 border-b" key={`${sale.invoice_no || index}-${sale.invoice_date}`}>
              <div>
                <div className="font-medium">{sale.customer_name || "-"}</div>
                <div className="text-gray-500 text-sm">
                  {sale.invoice_date ? new Date(sale.invoice_date).toLocaleString() : "-"}
                </div>
              </div>
              <div className="font-semibold">{formatCurrency(sale.amount)}</div>
            </div>
          ))}
        </div>

        <div className="p-5 bg-white rounded-xl shadow border border-gray-100">
          <h3 className="font-semibold mb-3">Low Stock Medicines</h3>
          {lowStock.length === 0 && <p className="text-gray-500 text-sm">Inventory is healthy 🎉</p>}
          {lowStock.map((item) => (
            <div key={item.product_id} className="mb-4">
              <div className="flex justify-between">
                <span className="font-medium">{item.product_name}</span>
                <span className="text-sm text-gray-600">
                  {Number(item.stock_base || 0)} units available
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
