import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./customersdashboard.css";
import { Eye, Trash2 } from "lucide-react";

import { authFetch } from "../../../api/http";

const API_BASE = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000/api/v1";

const CustomersDashboard = () => {
  const [customers, setCustomers] = useState([]);
  const [stats, setStats] = useState({
    total_customers: 0,
    avg_purchase_value: 0,
    active_customers: 0,
  });

  const [loading, setLoading] = useState(true);
  const [loadingStats, setLoadingStats] = useState(false);
  const [error, setError] = useState(null);

  const fetchedOnce = useRef(false);
  const navigate = useNavigate();
  const [kpiFilter, setKpiFilter] = useState("none");

  const fetchStats = async (filter = "none") => {
    try {
      setLoadingStats(true);
      let url = `${API_BASE}/api/v1/customers/?stats=true`;
      if (filter !== "none") url += `&filter=${filter}`;

      const res = await fetch(url);
      if (!res.ok) throw new Error("Stats fetch error");

      const data = await res.json();

      setStats({
        total_customers: data.total_customers ?? 0,
        avg_purchase_value: data.avg_purchase_value ?? 0,
        active_customers: data.active_customers ?? 0,
      });
    } catch (err) {
      console.error("Stats Error:", err);
    } finally {
      setLoadingStats(false);
    }
  };

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const res = await authFetch(`${API_BASE}/api/v1/customers/`);
      if (!res.ok) throw new Error("Customers fetch error");

      const data = await res.json();
      const list = data.results || data;
      setCustomers(Array.isArray(list) ? list : []);
      setError(null);
    } catch (err) {
      console.error("Fetch customers error:", err);
      setError("Failed to fetch customers.");
      setCustomers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (fetchedOnce.current) return;
    fetchedOnce.current = true;

    fetchStats(kpiFilter);
    fetchCustomers();
  }, []);

  const handleKpiFilter = (e) => {
    const filter = e.target.value;
    setKpiFilter(filter);
    fetchStats(filter);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this customer?")) return;

    try {
      const res = await authFetch(`${API_BASE}/api/v1/customers/${id}/`, { method: "DELETE" });
      if (res.ok) {
        alert("Customer deleted!");
        fetchCustomers();
        fetchStats(kpiFilter);
      } else {
        alert("Delete failed!");
      }
    } catch (err) {
      alert("Error deleting customer.");
    }
  };

  return (
    <div className="customers-container">
      {/* ------------------- HEADER WITH DROPDOWN ------------------- */}
      <div className="dashboard-header mb-4">
        <div className="header-left">
          <h1 className="customers-title">Customer Management</h1>
          <h2 className="customer-heading">Manage customer information and history</h2>
        </div>
        <div className="header-right">
          <select
            className="kpi-dropdown-header"
            value={kpiFilter}
            onChange={handleKpiFilter}
          >
            <option value="day">Day</option>
            <option value="week">Week</option>
            <option value="month">Month</option>
            <option value="none">All</option>
          </select>
        </div>
      </div>

      {/* ------------------- KPI CARD SECTION ------------------- */}
      <div className="kpi-directory-container bg-white shadow rounded-xl p-5 mb-6">
        {loadingStats && <span className="small-loading">Loading KPIs…</span>}

        <div className="grid grid-cols-3 gap-4 mb-4 kpi-cards-wrap">
          <div className="kpi-card small">
            <h3>Total Customers</h3>
            <p>{stats.total_customers}</p>
          </div>

          <div className="kpi-card small">
            <h3>Avg Purchase Value</h3>
            <p>₹ {stats.avg_purchase_value}</p>
          </div>

          <div className="kpi-card small">
            <h3>Active Customers</h3>
            <p>{stats.active_customers}</p>
          </div>
        </div>

        {/* ------------------- CUSTOMER TABLE ------------------- */}
        <div className="customers-list">
          <div className="customer-directory-header mb-4">
            <h3>Customer Directory</h3>
            {/* <button className="add-btn" onClick={() => navigate("/masters/customers/add")}>
              + Add Customer
            </button> */}
          </div>

          {loading ? (
            <p>Loading customers...</p>
          ) : (
            <table className="customers-table">
              <thead>
                <tr>
                 <th>Customer ID</th>
                  <th>Name</th>
                  <th>Phone</th>
                  <th>Email</th>
                  <th>Type</th>
                  <th>City</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {customers.length ? (
                  customers.map((c, index) => (
                    <tr key={c.id}>
        {/* Customer Code */}
        <td>{c.code || "-"}</td>
                      <td
                        className="customer-name-link"
                        onClick={() => navigate(`/masters/customers/${c.id}`)}
                      >
                        {c.name}
                      </td>
                      <td>{c.phone || "-"}</td>
                      <td>{c.email || "-"}</td>
                      <td>{c.type || "-"}</td>
                      <td>{c.city || "-"}</td>
                      <td>
                        {c.is_active ? (
                          <span className="status-active">Active</span>
                        ) : (
                          <span className="status-inactive">Inactive</span>
                        )}
                      </td>
                      <td className="actions-cell">
                        <Eye
                          size={18}
                          className="action-icon view-icon"
                          onClick={() => navigate(`/masters/customers/${c.id}`)}
                        />
                        <Trash2
                          size={18}
                          className="action-icon delete-icon"
                          onClick={() => handleDelete(c.id)}
                        />
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="8" className="no-data">
                      No customers found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>

        {error && <p style={{ color: "red" }}>{error}</p>}
      </div>
    </div>
  );
};

export default CustomersDashboard;