import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import styles from "./addlocations.module.css";

const ViewLocation = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [location, setLocation] = useState(null);

  const fetchLocation = async () => {
    const res = await fetch(`http://127.0.0.1:8000/api/v1/locations/locations/${id}/`);
    const data = await res.json();
    setLocation(data);
  };

  useEffect(() => {
    fetchLocation();
  }, []);

  if (!location) return <p>Loading...</p>;

  return (
    <div className={styles["customers-container"]}>
      <h1 className={styles["customers-title"]}>View Location</h1>

      <div className={styles["customers-form"]}>

        <div className={styles["form-row"]}>
          <div className={styles["form-group"]}>
            <label>Code</label>
            <input value={location.code} disabled />
          </div>

          <div className={styles["form-group"]}>
            <label>Name</label>
            <input value={location.name} disabled />
          </div>
        </div>

        <div className={styles["form-row"]}>
          <div className={styles["form-group"]}>
            <label>Type</label>
            <input value={location.type} disabled />
          </div>

          <div className={styles["form-group"]}>
            <label>GSTIN</label>
            <input value={location.gstin} disabled />
          </div>
        </div>

        <div className={styles["form-row"]}>
          <div className={styles["form-group"]}>
            <label>Address</label>
            <textarea value={location.address} disabled></textarea>
          </div>
        </div>

        <div className={styles["checkbox-group"]}>
          <label>Active</label>
          <input type="checkbox" checked={location.is_active} disabled />
        </div>

        <div className={styles["form-actions"]}>
          <button className={styles["cancel-btn"]} onClick={() => navigate("/masters/locations")}>Back</button>
        </div>

      </div>
    </div>
  );
};

export default ViewLocation;
