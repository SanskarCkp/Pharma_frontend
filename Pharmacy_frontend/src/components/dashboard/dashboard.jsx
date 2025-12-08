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
const EXPIRY_ALERTS_URL = apiUrl("inventory/expiry-alerts/");
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
  const [expirySummary, setExpirySummary] = useState({ critical: 0, warning: 0, safe: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let ignore = false;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const [summaryRes, monthlyRes, expiryRes] = await Promise.all([
          authFetch(SUMMARY_URL),
          authFetch(MONTHLY_URL),
          authFetch(`${EXPIRY_ALERTS_URL}?bucket=all`).catch(() => null),
        ]);
        if (!summaryRes.ok) throw new Error(`Dashboard summary failed (${summaryRes.status})`);
        if (!monthlyRes.ok) throw new Error(`Monthly chart failed (${monthlyRes.status})`);
        if (ignore) return;
        const summaryJson = await summaryRes.json();
        const monthlyJson = await monthlyRes.json();
        setSummary(summaryJson);
        setMonthlySeries(Array.isArray(monthlyJson) ? monthlyJson : []);
        
        // Fetch expiry data if available
        if (expiryRes && expiryRes.ok) {
          const expiryJson = await expiryRes.json();
          setExpirySummary(expiryJson.summary || { critical: 0, warning: 0, safe: 0 });
        }
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
          title: "Expiry Alerts",
          value: (expirySummary.critical ?? 0) + (expirySummary.warning ?? 0),
          sub: `${expirySummary.critical ?? 0} Critical | ${expirySummary.warning ?? 0} Warning`,
          color: "#E74C3C",
        },
        {
          title: "Today's Sales",
          value: formatCurrency(summary?.sales?.today_amount),
          sub: `${summary?.sales?.today_bills ?? 0} invoices`,
          color: "#3498DB",
        },
        {
          title: "Today's Profit",
          value: formatCurrency(summary?.sales?.today_profit ?? 0),
          sub: summary?.sales?.profit_margin ? `${summary.sales.profit_margin}% margin` : "Profit margin",
          color: "#13b57d",
        },
      ]
    : [
        { title: "Total Medicines", value: "0", sub: "", color: "#2ECC71" },
        { title: "Expiry Alerts", value: "0", sub: "0 Critical | 0 Warning", color: "#E74C3C" },
        { title: "Today's Sales", value: "0", sub: "", color: "#3498DB" },
        { title: "Today's Profit", value: "0", sub: "", color: "#13b57d" },
      ];

  const lowStockCard = summary
    ? {
        title: "Low Stock Alerts",
        value: summary?.totals?.low_stock ?? 0,
        sub: "Needs immediate attention",
        color: "#F39C12",
      }
    : { title: "Low Stock Alerts", value: "0", sub: "", color: "#F39C12" };

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
          <h2 className="page-title">Dashboard</h2>
          <p className="page-subtitle">Welcome back! Here's what's happening today.</p>
        </div>
        <div className="page-actions">
          <button className="btn btn-primary" onClick={handleRefresh}>
            Refresh
          </button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px", marginBottom: "24px", width: "100%" }}>
        {cards.map((card, index) => (
          <div
            key={index}
            className="dashboard-stat-card shadow bg-white p-4 rounded-xl border border-gray-100"
            style={{ cursor: "pointer" }}
            onClick={() => {
              if (card.title.includes("Expiry")) {
                window.location.href = "/expiry-alerts";
              } else if (card.title.includes("Medicines")) {
                window.location.href = "/inventory/medicines";
              } else if (card.title.includes("Sales")) {
                window.location.href = "/reports/sales";
              } else if (card.title.includes("Profit")) {
                window.location.href = "/reports/sales";
              }
            }}
          >
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
              <Legend />
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
        <div
          className="dashboard-stat-card shadow bg-white p-5 rounded-xl border border-gray-100"
          style={{ cursor: "pointer" }}
          onClick={() => {
            window.location.href = "/inventory/medicines?tab=low";
          }}
        >
          <div className="font-medium text-gray-600">{lowStockCard.title}</div>
          <div className="text-2xl font-bold mt-1">{lowStockCard.value}</div>
          <div className="text-sm mt-1" style={{ color: lowStockCard.color }}>
            {lowStockCard.sub}
          </div>
        </div>

        <div className="p-5 bg-white rounded-xl shadow border border-gray-100">
          <h3 className="font-semibold mb-3">Recent Sales</h3>
          {recentSales.length === 0 && <p className="text-gray-500 text-sm">No sales yet.</p>}
          {recentSales.map((sale, index) => (
            <div
              className="flex justify-between py-3 border-b last:border-b-0"
              key={`${sale.invoice_no || index}-${sale.invoice_date}`}
            >
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
      </div>
    </div>
  );
};

export default Dashboard;
