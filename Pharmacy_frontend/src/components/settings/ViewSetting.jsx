import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import styles from "./addsettings.module.css";
import { authFetch } from "../../api/http";

const ViewSetting = () => {
  const navigate = useNavigate();
  const { key } = useParams();
  const [formData, setFormData] = useState({
    key: "",
    value: "",
    description: ""
  });

  useEffect(() => {
    authFetch(`http://127.0.0.1:8000/api/v1/settings/settings/${encodeURIComponent(key)}/`)
      .then(res => res.json())
      .then(data => {
        setFormData({
          key: data.key || "",
          value: data.value || "",
          description: data.description || ""
        });
      })
      .catch(err => console.error("Failed to fetch setting", err));
  }, [key]);

  return (
    <div className={styles["customers-container"]}>
      <h1 className={styles["customers-title"]}>View Setting</h1>

      <div className={styles["customers-form"]}>

        <div className={styles["form-row"]}>
          <div className={styles["form-group"]}>
            <label>Key</label>
            <input type="text" value={formData.key} readOnly />
          </div>

          <div className={styles["form-group"]}>
            <label>Value</label>
            <input type="text" value={formData.value} readOnly />
          </div>
        </div>

        <div className={styles["form-row"]}>
          <div className={styles["form-group"]}>
            <label>Description</label>
            <textarea value={formData.description} readOnly />
          </div>
        </div>

        <div className={styles["form-actions"]}>
          <button className={styles["cancel-btn"]} onClick={() => navigate("/settings")}>
            Back
          </button>
        </div>
      </div>
    </div>
  );
};

export default ViewSetting;
