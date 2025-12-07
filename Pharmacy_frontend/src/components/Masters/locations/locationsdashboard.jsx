import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./locationsdashboard.module.css";
import { Eye, Pencil, Trash2 } from "lucide-react";



const LocationsDashboard = () => {
  const cx = (...classes) => classes.filter(Boolean).join(" ");
  const [locations, setLocations] = useState([]);
  const navigate = useNavigate();

  const fetchLocations = async () => {
    const res = await fetch("http://127.0.0.1:8000/api/v1/locations/locations/");
    const data = await res.json();
    setLocations(data.results);   // <-- IMPORTANT
  };

  const handleDelete = async (id) => {
  if (!window.confirm("Are you sure you want to delete this location?")) return;

  await fetch(`http://127.0.0.1:8000/api/v1/locations/locations/${id}/`, {
    method: "DELETE",
  });

  fetchLocations();
};


  useEffect(() => {
    fetchLocations();
  }, []);

  return (
    <div className={styles["customers-container"]}>
      <div className="flex justify-between items-center">
        <h1 className={styles["customers-title"]}>Locations Management</h1>

        <button className={styles["add-btn"]} onClick={() => navigate("/masters/locations/add")}>
          + Add Location
        </button>
      </div>

      <h2 className={styles["customers-heading"]}>Manage Shop & Warehouse Locations inside the system</h2>

      <div className={styles["customers-list"]}>
        <h3>Locations List</h3>

        <table className={styles["customers-table"]}>
          <thead>
            <tr>
              <th>ID</th>
              <th>Code</th>
              <th>Name</th>
              <th>Type</th>
              <th>Address</th>
              <th>GSTIN</th>
              <th>Active</th>
               <th>Actions</th>   {/* NEW COLUMN */}
            </tr>
          </thead>

          <tbody>
            {locations.map((l) => (
              <tr key={l.id}>
                <td>{l.id}</td>
                <td>{l.code}</td>
                <td>{l.name}</td>
                <td>{l.type}</td>
                <td>{l.address}</td>
                <td>{l.gstin}</td>
                <td>{l.is_active ? "Yes" : "No"}</td>

                   <td className={styles["action-icons"]}>
          <Eye
            size={18}
            className={styles["view-icon"]}
            onClick={() => navigate(`/masters/locations/view/${l.id}`)}
          />
          <Pencil
            size={18}
            className={styles["edit-icon"]}
            onClick={() => navigate(`/masters/locations/edit/${l.id}`)}
          />
          <Trash2
            size={18}
            className={styles["delete-icon"]}
            onClick={() => handleDelete(l.id)}
          />
        </td>
              </tr>
            ))}

            {locations.length === 0 && (
              <tr>
                <td colSpan="7" className={styles["no-data"]}>No locations found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default LocationsDashboard;
