import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import styles from "./addcustomers.module.css";

const rawBase = (import.meta.env.VITE_API_URL || "").trim().replace(/\/+$/, "");
const API_BASE = rawBase.endsWith("/api/v1") ? rawBase : `${rawBase}/api/v1`;

const AddCustomer = () => {
  const cx = (...classes) => classes.filter(Boolean).join(" ");
  const navigate = useNavigate();
  const { id } = useParams();

  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    gstin: "",
    type: "RETAIL",
    credit_limit: "0",
    outstanding_balance: "0",
    customer_category: "",
    price_tier: "",
    billing_address: "",
    shipping_address: "",
    city: "",
    state_code: "",
    pincode: "",
    consent_required: false,
    is_active: true,
  });

  // ✅ Load data if edit mode
  useEffect(() => {
    if (id) {
      fetch(`${API_BASE}/customers/${id}/`)
        .then((res) => res.json())
        .then((data) => {
          setFormData({
            name: data.name || "",
            phone: data.phone || "",
            email: data.email || "",
            gstin: data.gstin || "",
            type: data.type || "RETAIL",
            credit_limit: data.credit_limit?.toString() || "0",
            outstanding_balance: data.outstanding_balance?.toString() || "0",
            customer_category: data.customer_category || "",
            price_tier: data.price_tier || "",
            billing_address: data.billing_address || "",
            shipping_address: data.shipping_address || "",
            city: data.city || "",
            state_code: data.state_code || "",
            pincode: data.pincode || "",
            consent_required: data.consent_required || false,
            is_active: data.is_active ?? true,
          });
        })
        .catch((err) => console.error("Error loading customer:", err));
    }
  }, [id]);

  // ✅ Handle input change
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === "checkbox" ? checked : value,
    });
  };

  // ✅ Handle form submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const method = id ? "PUT" : "POST";
      const url = id
        ? `${API_BASE}/customers/${id}/`
        : `${API_BASE}/customers/`;

      console.log("Submitting payload:", formData);

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const errData = await res.json();
        console.error("Backend error:", errData);
        alert("Error saving customer: " + JSON.stringify(errData));
        return;
      }

      alert(id ? "Customer Updated Successfully!" : "Customer Added Successfully!");
      navigate("/masters/customers");
    } catch (error) {
      console.error("Error saving customer:", error);
    }
  };

  return (
    <div className={styles["customers-container"]}>
      <h1 className={styles["customers-title"]}>{id ? "Update Customer" : "Add Customer"}</h1>

      <form className={styles["customers-form"]} onSubmit={handleSubmit}>
        {/* Row 1: Name, Phone, Email */}
        <div className={styles["form-row"]}>
          <div className={styles["form-group"]}>
            <label>Name:</label>
            <input type="text" name="name" value={formData.name} onChange={handleChange} placeholder="Enter name" required />
          </div>

          <div className={styles["form-group"]}>
            <label>Phone:</label>
            <input type="text" name="phone" value={formData.phone} onChange={handleChange} placeholder="Enter phone" />
          </div>

          <div className={styles["form-group"]}>
            <label>Email:</label>
            <input type="email" name="email" value={formData.email} onChange={handleChange} placeholder="Enter email" />
          </div>
        </div>

        {/* Row 2: GSTIN, Type, Category */}
        <div className={styles["form-row"]}>
          <div className={styles["form-group"]}>
            <label>GSTIN:</label>
            <input type="text" name="gstin" value={formData.gstin} onChange={handleChange} placeholder="Enter GSTIN" />
          </div>

          <div className={styles["form-group"]}>
            <label>Type:</label>
            <select name="type" value={formData.type} onChange={handleChange}>
              <option value="RETAIL">Retail</option>
              <option value="WHOLESALE">Wholesale</option>
              <option value="HOSPITAL">Hospital</option>
            </select>
          </div>

          <div className={styles["form-group"]}>
            <label>Customer Category:</label>
            <input
              type="text"
              name="customer_category"
              value={formData.customer_category}
              onChange={handleChange}
              placeholder="Enter customer category"
            />
          </div>
        </div>

        {/* Row 3: Credit Limit, Outstanding Balance, Price Tier */}
        <div className={styles["form-row"]}>
          <div className={styles["form-group"]}>
            <label>Credit Limit:</label>
            <input
              type="number"
              name="credit_limit"
              value={formData.credit_limit}
              onChange={handleChange}
              placeholder="Enter credit limit"
            />
          </div>

          <div className={styles["form-group"]}>
            <label>Outstanding Balance:</label>
            <input
              type="number"
              name="outstanding_balance"
              value={formData.outstanding_balance}
              onChange={handleChange}
              placeholder="Enter outstanding balance"
            />
          </div>

          <div className={styles["form-group"]}>
            <label>Price Tier:</label>
            <input
              type="text"
              name="price_tier"
              value={formData.price_tier}
              onChange={handleChange}
              placeholder="Enter price tier"
            />
          </div>
        </div>

        {/* Row 4: Billing & Shipping Address */}
        <div className={styles["form-row"]}>
          <div className={styles["form-group"]}>
            <label>Billing Address:</label>
            <textarea name="billing_address" value={formData.billing_address} onChange={handleChange} placeholder="Billing address"></textarea>
          </div>

          <div className={styles["form-group"]}>
            <label>Shipping Address:</label>
            <textarea name="shipping_address" value={formData.shipping_address} onChange={handleChange} placeholder="Shipping address"></textarea>
          </div>
        </div>

        {/* Row 5: City, State, Pincode */}
        <div className={styles["form-row"]}>
          <div className={styles["form-group"]}>
            <label>City:</label>
            <input type="text" name="city" value={formData.city} onChange={handleChange} placeholder="City" />
          </div>

          <div className={styles["form-group"]}>
            <label>State Code:</label>
            <input type="text" name="state_code" value={formData.state_code} onChange={handleChange} placeholder="State code" />
          </div>

          <div className={styles["form-group"]}>
            <label>Pincode:</label>
            <input type="text" name="pincode" value={formData.pincode} onChange={handleChange} placeholder="Pincode" />
          </div>
        </div>

        {/* Row 6: Checkboxes */}
        <div className={styles["form-row"]}>
          <div className={cx(styles["form-group"], styles["checkbox-group"])}>
            <label>
              <input type="checkbox" name="consent_required" checked={formData.consent_required} onChange={handleChange} />
              Consent Required
            </label>
          </div>

          <div className={cx(styles["form-group"], styles["checkbox-group"])}>
            <label>
              <input type="checkbox" name="is_active" checked={formData.is_active} onChange={handleChange} />
              Active
            </label>
          </div>
        </div>

        {/* Actions */}
        <div className={styles["form-actions"]}>
          <button type="button" className={styles["cancel-btn"]} onClick={() => navigate("/masters/customers")}>
            Cancel
          </button>
          <button type="submit" className={styles["submit-btn"]}>
            {id ? "Update" : "Save"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AddCustomer;
