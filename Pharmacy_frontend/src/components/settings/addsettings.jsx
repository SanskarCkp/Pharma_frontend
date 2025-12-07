import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import styles from "./addsettings.module.css";

const AddSetting = () => {
  const cx = (...classes) => classes.filter(Boolean).join(" ");
  const navigate = useNavigate();
  const { key } = useParams();
  const [isEditMode, setIsEditMode] = useState(false);

  const [formData, setFormData] = useState({
    key: "",
    value: "",
    description: ""
  });

  useEffect(() => {
    if (key) {
      setIsEditMode(true);
      fetch(`http://127.0.0.1:8000/api/v1/settings/settings/${encodeURIComponent(key)}/`)
        .then(res => res.json())
        .then(data => {
          setFormData({
            key: data.key || "",
            value: data.value || "",
            description: data.description || ""
          });
        })
        .catch(err => console.error("Failed to fetch setting", err));
    }
  }, [key]);

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const url = isEditMode
        ? `http://127.0.0.1:8000/api/v1/settings/settings/${encodeURIComponent(key)}/`
        : `http://127.0.0.1:8000/api/v1/settings/settings/`;

      const method = isEditMode ? "PUT" : "POST";
      
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });

      if (res.ok) {
        alert(isEditMode ? "Setting Updated!" : "Setting Added!");
        navigate("/settings");   // redirect to settings dashboard
      } else {
        alert("Save failed");
      }
    } catch (error) {
      console.error(error);
      alert("Save failed");
    }
  };

  return (
    <div className={styles["customers-container"]}>
      <h1 className={styles["customers-title"]}>
        {isEditMode ? "Edit Setting" : "Add Setting"}
      </h1>

      <form className={styles["customers-form"]} onSubmit={handleSubmit}>

        <div className={styles["form-row"]}>
          <div className={styles["form-group"]}>
            <label>Key</label>
            <input
              type="text"
              name="key"
              value={formData.key}
              onChange={handleChange}
              placeholder="config.key.name"
              required
              readOnly={isEditMode}
            />
          </div>

          <div className={styles["form-group"]}>
            <label>Value</label>
            <input
              type="text"
              name="value"
              value={formData.value}
              onChange={handleChange}
              placeholder="value"
              required
            />
          </div>
        </div>

        <div className={styles["form-row"]}>
          <div className={styles["form-group"]}>
            <label>Description</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Short description (optional)"
            />
          </div>
        </div>

        <div className={styles["form-actions"]}>
          <button type="button" className={styles["cancel-btn"]} onClick={() => navigate("/settings")}>
            Cancel
          </button>
          <button type="submit" className={styles["submit-btn"]}>
            {isEditMode ? "Update" : "Save"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AddSetting;
