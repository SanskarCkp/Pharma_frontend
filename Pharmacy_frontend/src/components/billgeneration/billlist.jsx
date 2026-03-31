import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./billgeneration.css";
import { authFetch } from "../../api/http";

const API_BASE = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000/api/v1";

export default function BillList() {
  const navigate = useNavigate();
  const [bills, setBills] = useState([]);
  const [kpis, setKpis] = useState({
    totalBills: 0,
    totalProducts: 0,
    totalRevenue: 0,
    changeBills: 0,
    changeProducts: 0,
    changeRevenue: 0,
  });

  useEffect(() => {
    async function load() {
      try {
        const today = new Date();
        const first = new Date(today.getFullYear(), today.getMonth(), 1)
          .toISOString()
          .slice(0, 10);
        const last = new Date(today.getFullYear(), today.getMonth() + 1, 0)
          .toISOString()
          .slice(0, 10);

        const statsRes = await authFetch(
          `${API_BASE}/sales/billing/stats/?from=${first}&to=${last}`
        );
        if (statsRes.ok) {
          const stats = await statsRes.json();
          setKpis({
            totalBills: stats.total_bills || 0,
            totalProducts: stats.total_products_sold || 0,
            totalRevenue: stats.total_revenue || 0,
            changeBills: 0,
            changeProducts: 0,
            changeRevenue: 0,
          });
        }

        const listRes = await authFetch(
          `${API_BASE}/sales/invoices/?ordering=-invoice_date`
        );
        if (listRes.ok) {
          const data = await listRes.json();
          setBills(Array.isArray(data) ? data : data.results || []);
        } else {
          setBills([]);
        }
      } catch {
        setBills([]);
      }
    }
    load();
  }, []);

  const formatMoney = (v) => `₹${Number(v || 0).toFixed(2)}`;

  return (
    <div
      className="billgeneration-page"
      style={{ maxWidth: "1200px", margin: "auto" }}
    >
      {/* Header Section */}
      <div
        className="header-section"
        style={{
          marginBottom: "2rem",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <h1
          className="page-title"
          style={{ fontWeight: "600", color: "#111827" }}
        >
          Bill Generation
        </h1>

        <button
          className="generate-btn"
          style={{
            backgroundColor: "#14b8a6",
            borderRadius: "999px",
            padding: "0.5rem 1.2rem",
            fontWeight: 500,
          }}
          onClick={() => navigate("/billgeneration/generate")}
        >
          + Generate New Bill
        </button>
      </div>

      {/* KPI Cards */}
      <div
        className="kpi-container"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: "1rem",
          marginBottom: "2rem",
        }}
      >
        <div
          className="kpi-card"
          style={{
            border: "1px solid #14b8a6",
            borderRadius: "8px",
            backgroundColor: "#f0fdfa",
            textAlign: "center",
            padding: "1rem",
          }}
        >
          <h4 style={{ color: "#0f766e" }}>Total Bills (This Month)</h4>
          <p
            style={{
              fontWeight: "600",
              fontSize: "1.25rem",
              color: "#115e59",
            }}
          >
            {kpis.totalBills}
          </p>
          <small style={{ color: "#134e4a" }}>
            Total bills generated in{" "}
            {new Date().toLocaleString("default", { month: "long" })}
          </small>
        </div>

        <div
          className="kpi-card"
          style={{
            border: "1px solid #14b8a6",
            borderRadius: "8px",
            backgroundColor: "#f0fdfa",
            textAlign: "center",
            padding: "1rem",
          }}
        >
          <h4 style={{ color: "#0f766e" }}>
            Total Products Sold (This Month)
          </h4>
          <p
            style={{
              fontWeight: "600",
              fontSize: "1.25rem",
              color: "#115e59",
            }}
          >
            {kpis.totalProducts}
          </p>
          <small style={{ color: "#134e4a" }}>
            Total items sold this month
          </small>
        </div>

        <div
          className="kpi-card"
          style={{
            border: "1px solid #14b8a6",
            borderRadius: "8px",
            backgroundColor: "#f0fdfa",
            textAlign: "center",
            padding: "1rem",
          }}
        >
          <h4 style={{ color: "#0f766e" }}>Total Revenue (This Month)</h4>
          <p
            style={{
              fontWeight: "600",
              fontSize: "1.25rem",
              color: "#115e59",
            }}
          >
            {formatMoney(kpis.totalRevenue)}
          </p>
          <small style={{ color: "#134e4a" }}>
            Revenue generated in{" "}
            {new Date().toLocaleString("default", { month: "long" })}
          </small>
        </div>
      </div>

      {/* Bills Table */}
      <table
        className="bill-table"
        style={{
          width: "100%",
          borderCollapse: "separate",
          borderSpacing: "0 8px",
        }}
      >
        <thead
          style={{
            backgroundColor: "#f3f4f6",
            textAlign: "left",
            color: "#6b7280",
          }}
        >
          <tr>
            <th style={{ padding: "0.75rem" }}>Bill ID</th>
            <th style={{ padding: "0.75rem" }}>Transaction Date</th>
            <th style={{ padding: "0.75rem" }}>Customer Name</th>
            <th style={{ padding: "0.75rem" }}>Total Amount</th>
            <th style={{ padding: "0.75rem" }}>Payment</th>
            <th style={{ padding: "0.75rem", textAlign: "center" }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {bills.length === 0 ? (
            <tr>
              <td
                colSpan="6"
                className="no-data"
                style={{ padding: "1rem", textAlign: "center" }}
              >
                No bills found
              </td>
            </tr>
          ) : (
            bills.map((bill) => (
              <tr
                key={bill.id}
                style={{
                  backgroundColor: "white",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                  borderRadius: "6px",
                  marginBottom: "0.5rem",
                }}
              >
                <td style={{ padding: "0.75rem" }}>{bill.invoice_no}</td>
                <td style={{ padding: "0.75rem" }}>
                  {bill.invoice_date
                    ? new Date(bill.invoice_date).toLocaleString()
                    : ""}
                </td>
                <td style={{ padding: "0.75rem" }}>
                  {bill.customer_name || bill.customer?.name || "-"}
                </td>
                <td style={{ padding: "0.75rem" }}>
                  {formatMoney(bill.net_total)}
                </td>
                <td style={{ padding: "0.75rem" }}>{bill.payment_status}</td>
                <td style={{ padding: "0.75rem", textAlign: "center" }}>
                  <button
                    onClick={() =>
                      navigate(`/billgeneration/invoice/${bill.id}`)
                    }
                    style={{
                      backgroundColor: "#14b8a6",
                      color: "white",
                      border: "none",
                      borderRadius: "4px",
                      padding: "0.3rem 0.7rem",
                      cursor: "pointer",
                    }}
                  >
                    View
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

