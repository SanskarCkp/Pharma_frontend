import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import styles from "./addlocations.module.css";

const EditLocation = () => {
  const cx = (...classes) => classes.filter(Boolean).join(" ");
  const { id } = useParams();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    code: "",
    name: "",
    type: "SHOP",
    address: "",
    gstin: "",
    is_active: true,
  });

  const fetchLocation = async () => {
    const res = await fetch(`http://127.0.0.1:8000/api/v1/locations/locations/${id}/`);
    const data = await res.json();
    setFormData(data);
  };

  useEffect(() => {
    fetchLocation();
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === "checkbox" ? checked : value,
    });
  };

  const handleUpdate = async () => {
    await fetch(`http://127.0.0.1:8000/api/v1/locations/locations/${id}/`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData),
    });

    navigate("/masters/locations");
  };

  return (
    <div className={styles["customers-container"]}>
      <h1 className={styles["customers-title"]}>Edit Location</h1>

      <div className={styles["customers-form"]}>

        <div className={styles["form-row"]}>
          <div className={styles["form-group"]}>
            <label>Code</label>
            <input name="code" value={formData.code} onChange={handleChange} />
          </div>

          <div className={styles["form-group"]}>
            <label>Name</label>
            <input name="name" value={formData.name} onChange={handleChange} />
          </div>
        </div>

        <div className={styles["form-row"]}>
          <div className={styles["form-group"]}>
            <label>Type</label>
            <select name="type" value={formData.type} onChange={handleChange}>
              <option value="SHOP">SHOP</option>
              <option value="WAREHOUSE">WAREHOUSE</option>
            </select>
          </div>

          <div className={styles["form-group"]}>
            <label>GSTIN</label>
            <input name="gstin" value={formData.gstin} onChange={handleChange} />
          </div>
        </div>

        <div className={styles["form-row"]}>
          <div className={styles["form-group"]}>
            <label>Address</label>
            <textarea name="address" value={formData.address} onChange={handleChange}></textarea>
          </div>
        </div>

        <div className={styles["checkbox-group"]}>
          <label>Active</label>
          <input type="checkbox" name="is_active" checked={formData.is_active} onChange={handleChange} />
        </div>

        <div className={styles["form-actions"]}>
          <button className={styles["cancel-btn"]} onClick={() => navigate("/masters/locations")}>Cancel</button>
          <button className={styles["submit-btn"]} onClick={handleUpdate}>Update</button>
        </div>

      </div>
    </div>
  );
};

export default EditLocation;
