import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./customersdashboard.module.css";
import "../inventory/inventory.css";
import { Eye, Trash2 } from "lucide-react";
import { useAlert } from "../ui/alert-provider";
import { authFetch } from "../../api/http";
import { apiUrl } from "../../api/base";

const CUSTOMERS_URL = apiUrl("customers/");

const CustomersDashboard = () => {
  const cx = (...classes) => classes.filter(Boolean).join(" ");
  const { showAlert } = useAlert();
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
      const url = new URL(CUSTOMERS_URL, window.location.origin);
      url.searchParams.set("stats", "true");
      if (filter !== "none") url.searchParams.set("filter", filter);

      const res = await authFetch(url.toString());
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
      const res = await authFetch(CUSTOMERS_URL);
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
      const res = await authFetch(`${CUSTOMERS_URL}${id}/`, { method: "DELETE" });
      if (res.ok) {
        showAlert("Customer deleted!", "Success");
        fetchCustomers();
        fetchStats(kpiFilter);
      } else {
        showAlert("Delete failed!", "Error");
      }
    } catch (err) {
      showAlert("Error deleting customer.", "Error");
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
        <div className="inv-table-wrap">
          {loading ? (
            <div style={{ padding: 20 }}>Loading...</div>
          ) : (
            <table className="inv-table">
              <thead>
                <tr>
                  <th>Customer ID</th>
                  <th>Name</th>
                  <th>Phone</th>
                  <th>Email</th>
                  <th>Type</th>
                  <th>City</th>
                  <th>Status</th>
                  <th style={{ width: 140, textAlign: "center" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {customers.length ? (
                  customers.map((c) => (
                    <tr key={c.id}>
                      <td>{c.code || "-"}</td>
                      <td
                        style={{ cursor: "pointer", color: "#2563eb" }}
                        onClick={() => navigate(`/masters/customers/${c.id}`)}
                      >
                        {c.name}
                      </td>
                      <td>{c.phone || "-"}</td>
                      <td>{c.email || "-"}</td>
                      <td>{c.type || "-"}</td>
                      <td>{c.city || "-"}</td>
                      <td>
                        <span
                          className={`badge ${
                            c.is_active ? "green" : "red"
                          }`}
                        >
                          {c.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>
                       <td className="inv-actions-cell">
                         <div style={{ display: "inline-flex", gap: 8 }}>
                           <button
                             className="inv-icon"
                             title="View details"
                             onClick={() => navigate(`/masters/customers/${c.id}`)}
                             style={{ padding: "6px 10px", display: "inline-flex", alignItems: "center", justifyContent: "center" }}
                           >
                             <Eye size={16} />
                           </button>
                           <button
                             className="inv-icon danger"
                             title="Delete"
                             onClick={() => handleDelete(c.id)}
                             style={{ padding: "6px 10px", display: "inline-flex", alignItems: "center", justifyContent: "center" }}
                           >
                             <Trash2 size={16} />
                           </button>
                         </div>
                       </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="8" style={{ textAlign: "center", padding: 14 }}>
                      No customers found
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
