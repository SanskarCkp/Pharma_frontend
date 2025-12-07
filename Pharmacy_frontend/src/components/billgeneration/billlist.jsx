import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./billgeneration.css";
import { authFetch } from "../../api/http";
import { apiUrl } from "../../api/base";

const BILLING_STATS_URL = apiUrl("sales/billing/stats/");
const INVOICES_URL = apiUrl("sales/invoices/");

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
          `${BILLING_STATS_URL}?from=${first}&to=${last}`
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
          `${INVOICES_URL}?ordering=-invoice_date`
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
      style={{
        width: "100%",
        padding: "25px 45px",
        backgroundColor: "#ffff"
      }}
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
        <div>
          <h1
            className="page-title"
            style={{
              fontWeight: "700",
              color: "#111827",
              fontSize: "2rem",
              marginBottom: "0.5rem"
            }}
          >
            Bill Generation
          </h1>
          <p style={{ color: "#6b7280", fontSize: "0.95rem" }}>
            Manage and track all your billing transactions
          </p>
        </div>

        <button
          className="generate-btn"
          style={{
            backgroundColor: "#14b8a6",
            borderRadius: "8px",
            padding: "0.75rem 1.5rem",
            fontWeight: 600,
            color: "white",
            border: "none",
            cursor: "pointer",
            fontSize: "0.95rem",
            boxShadow: "0 2px 4px rgba(20, 184, 166, 0.3)",
            transition: "all 0.2s"
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
          gap: "1.5rem",
          marginBottom: "2.5rem",
        }}
      >
        <div
          className="kpi-card"
          style={{
            border: "1px solid #e5e7eb",
            borderRadius: "12px",
            backgroundColor: "#ffffff",
            padding: "1.75rem",
            boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
            transition: "all 0.2s"
          }}
        >
          <h4 style={{ color: "#6b7280", fontSize: "0.875rem", fontWeight: "500", marginBottom: "0.75rem", textTransform: "uppercase", letterSpacing: "0.5px" }}>
            TOTAL BILLS (THIS MONTH)
          </h4>
          <p
            style={{
              fontWeight: "700",
              fontSize: "2.25rem",
              color: "#111827",
              marginBottom: "0.5rem"
            }}
          >
            {kpis.totalBills}
          </p>
          <small style={{ color: "#6b7280", fontSize: "0.875rem" }}>
            Total bills generated in{" "}
            {new Date().toLocaleString("default", { month: "long" })}
          </small>
        </div>

        <div
          className="kpi-card"
          style={{
            border: "1px solid #e5e7eb",
            borderRadius: "12px",
            backgroundColor: "#ffffff",
            padding: "1.75rem",
            boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
            transition: "all 0.2s"
          }}
        >
          <h4 style={{ color: "#6b7280", fontSize: "0.875rem", fontWeight: "500", marginBottom: "0.75rem", textTransform: "uppercase", letterSpacing: "0.5px" }}>
            TOTAL PRODUCTS SOLD (THIS MONTH)
          </h4>
          <p
            style={{
              fontWeight: "700",
              fontSize: "2.25rem",
              color: "#111827",
              marginBottom: "0.5rem"
            }}
          >
            {kpis.totalProducts}
          </p>
          <small style={{ color: "#6b7280", fontSize: "0.875rem" }}>
            Total items sold this month
          </small>
        </div>

        <div
          className="kpi-card"
          style={{
            border: "1px solid #e5e7eb",
            borderRadius: "12px",
            backgroundColor: "#ffffff",
            padding: "1.75rem",
            boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
            transition: "all 0.2s"
          }}
        >
          <h4 style={{ color: "#6b7280", fontSize: "0.875rem", fontWeight: "500", marginBottom: "0.75rem", textTransform: "uppercase", letterSpacing: "0.5px" }}>
            TOTAL REVENUE (THIS MONTH)
          </h4>
          <p
            style={{
              fontWeight: "700",
              fontSize: "2.25rem",
              color: "#14b8a6",
              marginBottom: "0.5rem"
            }}
          >
            {formatMoney(kpis.totalRevenue)}
          </p>
          <small style={{ color: "#6b7280", fontSize: "0.875rem" }}>
            Revenue generated in{" "}
            {new Date().toLocaleString("default", { month: "long" })}
          </small>
        </div>
      </div>

      {/* Bills Table */}
      <div
        style={{
          backgroundColor: "white",
          borderRadius: "12px",
          boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
          overflow: "hidden",
          border: "1px solid #e5e7eb"
        }}
      >
        <table
          className="bill-table"
          style={{
            width: "100%",
            borderCollapse: "collapse",
          }}
        >
          <thead
            style={{
              backgroundColor: "#f9fafb",
              borderBottom: "1px solid #e5e7eb"
            }}
          >
            <tr>
              <th style={{ padding: "1rem", textAlign: "left", color: "#374151", fontWeight: "600", fontSize: "0.875rem" }}>Bill ID</th>
              <th style={{ padding: "1rem", textAlign: "left", color: "#374151", fontWeight: "600", fontSize: "0.875rem" }}>Transaction Date</th>
              <th style={{ padding: "1rem", textAlign: "left", color: "#374151", fontWeight: "600", fontSize: "0.875rem" }}>Customer Name</th>
              <th style={{ padding: "1rem", textAlign: "left", color: "#374151", fontWeight: "600", fontSize: "0.875rem" }}>Total Amount</th>
              <th style={{ padding: "1rem", textAlign: "left", color: "#374151", fontWeight: "600", fontSize: "0.875rem" }}>Payment</th>
              <th style={{ padding: "1rem", textAlign: "center", color: "#374151", fontWeight: "600", fontSize: "0.875rem" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {bills.length === 0 ? (
              <tr>
                <td
                  colSpan="6"
                  className="no-data"
                  style={{
                    padding: "3rem",
                    textAlign: "center",
                    color: "#9ca3af",
                    fontSize: "0.95rem"
                  }}
                >
                  No bills found
                </td>
              </tr>
            ) : (
              bills.map((bill) => (
                <tr
                  key={bill.id}
                  style={{
                    borderBottom: "1px solid #f3f4f6",
                    transition: "background-color 0.15s"
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#f9fafb"}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "white"}
                >
                  <td style={{ padding: "1rem", color: "#111827", fontWeight: "500" }}>{bill.invoice_no}</td>
                  <td style={{ padding: "1rem", color: "#6b7280" }}>
                    {bill.invoice_date
                      ? new Date(bill.invoice_date).toLocaleString()
                      : ""}
                  </td>
                  <td style={{ padding: "1rem", color: "#111827" }}>
                    {bill.customer_name || bill.customer?.name || "-"}
                  </td>
                  <td style={{ padding: "1rem", color: "#111827", fontWeight: "600" }}>
                    {formatMoney(bill.net_total)}
                  </td>
                  <td style={{ padding: "1rem", color: "#6b7280" }}>{bill.payment_status}</td>
                  <td style={{ padding: "1rem", textAlign: "center" }}>
                    <button
                      onClick={() =>
                        navigate(`/billgeneration/invoice/${bill.id}`)
                      }
                      style={{
                        backgroundColor: "#14b8a6",
                        color: "white",
                        border: "none",
                        borderRadius: "6px",
                        padding: "0.5rem 1rem",
                        cursor: "pointer",
                        fontWeight: "500",
                        fontSize: "0.875rem",
                        transition: "all 0.15s"
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#0f766e"}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "#14b8a6"}
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
    </div>
  );
}

