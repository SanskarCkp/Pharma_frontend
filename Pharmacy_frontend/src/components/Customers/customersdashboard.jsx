import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./customersdashboard.module.css";
import { Eye, Trash2 } from "lucide-react";

// Normalize API base to ensure /api/v1 suffix exists
const rawBase = (import.meta.env.VITE_API_URL || "").trim().replace(/\/+$/, "");
const API_BASE = rawBase.endsWith("/api/v1") ? rawBase : `${rawBase}/api/v1`;

const CustomersDashboard = () => {
  const cx = (...classes) => classes.filter(Boolean).join(" ");
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
      let url = `${API_BASE}/customers/?stats=true`;
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
      const res = await fetch(`${API_BASE}/customers/`);
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
      const res = await fetch(`${API_BASE}/customers/${id}/`, { method: "DELETE" });
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
    <div className={styles["customers-container"]}>
      {/* ------------------- HEADER WITH DROPDOWN ------------------- */}
      <div className={`${styles["dashboard-header"]} mb-4`}>
        <div className={styles["header-left"]}>
          <h1 className={styles["customers-title"]}>Customer Management</h1>
          <h2 className={styles["customer-heading"]}>Manage customer information and history</h2>
        </div>
        <div className={styles["header-right"]}>
          <select
            className={styles["kpi-dropdown-header"]}
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
      <div className="bg-white shadow rounded-xl p-5 mb-6">
        {loadingStats && <span className={styles["small-loading"]}>Loading KPIs...</span>}

        <div className={`grid grid-cols-3 gap-4 mb-4 ${styles["kpi-cards-wrap"]}`}>
          <div className={`${styles["kpi-card"]} ${styles.small}`}>
            <h3>Total Customers</h3>
            <p>{stats.total_customers}</p>
          </div>

          <div className={`${styles["kpi-card"]} ${styles.small}`}>
            <h3>Avg Purchase Value</h3>
            <p>Rs {stats.avg_purchase_value}</p>
          </div>

          <div className={`${styles["kpi-card"]} ${styles.small}`}>
            <h3>Active Customers</h3>
            <p>{stats.active_customers}</p>
          </div>
        </div>

        {/* ------------------- CUSTOMER TABLE ------------------- */}
        <div className={styles["customers-list"]}>
          <div className={`${styles["customer-directory-header"]} mb-4`}>
            <h3>Customer Directory</h3>
            {/* <button className="add-btn" onClick={() => navigate("/masters/customers/add")}>
              + Add Customer
            </button> */}
          </div>

          {loading ? (
            <p>Loading customers...</p>
          ) : (
            <table className={styles["customers-table"]}>
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
                        className={styles["customer-name-link"]}
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
                          <span className={styles["status-active"]}>Active</span>
                        ) : (
                          <span className={styles["status-inactive"]}>Inactive</span>
                        )}
                      </td>
                      <td className={styles["actions-cell"]}>
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
                    <td colSpan="8" className={styles["no-data"]}>
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
