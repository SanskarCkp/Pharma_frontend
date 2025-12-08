import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./rolesdashboard.module.css";

const RolesDashboard = () => {
  const [roles, setRoles] = useState([]);
  const navigate = useNavigate();

  const fetchRoles = async () => {
    const res = await fetch("http://127.0.0.1:8000/api/roles/");
    const data = await res.json();
    setRoles(data);
  };

  useEffect(() => {
    fetchRoles();
  }, []);

  return (
    <div className={styles["customers-container"]}>
      <div className="flex justify-between items-center">
        <h1 className={styles["customers-title"]}>Roles Management</h1>

        <button className={styles["add-btn"]} onClick={() => navigate("/masters/roles/add")}>
          + Add Roles
        </button>
      </div>

      <h2 className={styles["customers-heading"]}>Manage users access roles inside the system</h2>

      <div className={styles["customers-list"]}>
        <h3>Roles List</h3>

        <table className={styles["customers-table"]}>
          <thead>
            <tr>
              <th>ID</th>
              <th>Code</th>
              <th>Label</th>
            </tr>
          </thead>

          <tbody>
            {roles.map((r) => (
              <tr key={r.id}>
                <td>{r.id}</td>
                <td>{r.code}</td>
                <td>{r.label}</td>
              </tr>
            ))}

            {roles.length === 0 && (
              <tr>
                <td colSpan="3" className={styles["no-data"]}>No roles found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default RolesDashboard;
