// src/components/Masters/Products/EditProduct.jsx

import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import "./addproducts.css"; // reuse same CSS as AddProduct
import { authFetch } from "../../../api/http";
import { useAlert } from "../../ui/alert-provider";

const API_BASE_URL = import.meta.env.VITE_API_URL;

const EditProduct = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { showAlert } = useAlert();

  const [formData, setFormData] = useState({
    name: "",
    hsn: "",
    schedule: "",
    pack_size: "",
    manufacturer: "",
    mrp: "",
    base_unit: "",
    pack_unit: "",
    units_per_pack: "",
    base_unit_step: "1",
    is_sensitive: false,
    is_active: true,
  });

  // Fetch product details by ID and pre-fill form
  useEffect(() => {
    authFetch(`${API_BASE_URL}/catalog/products/${id}/`)
      .then((res) => res.json())
      .then((data) => setFormData(data))
      .catch((err) => console.error("Error fetching product:", err));
  }, [id]);

  // Handle form input changes
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === "checkbox" ? checked : value,
    });
  };

  // Handle form submission for update
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await authFetch(`${API_BASE_URL}/catalog/products/${id}/`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        showAlert("Product Updated Successfully!", "Success");
        navigate("/masters/products");
      } else {
        showAlert("Failed to update product!", "Error");
      }
    } catch (error) {
      console.error("Error updating product:", error);
    }
  };

  return (
    <div className="vendors-container">
      {/* ✅ Back button added */}
      <div className="editproduct-header">
        <button className="back-btn" onClick={() => navigate(-1)}>
          <ArrowLeft size={18} />
          <span>Back</span>
        </button>
        <h1 className="vendors-title">Update Product</h1>
      </div>

      <form className="vendors-form" onSubmit={handleSubmit}>
        <div className="form-row">
          <div className="form-group">
            <label>Name:</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label>HSN:</label>
            <input
              type="text"
              name="hsn"
              value={formData.hsn}
              onChange={handleChange}
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Schedule:</label>
            <select
              name="schedule"
              value={formData.schedule}
              onChange={handleChange}
            >
              <option value="">Select</option>
              <option value="OTC">OTC</option>
              <option value="H">H</option>
              <option value="H1">H1</option>
              <option value="X">X</option>
              <option value="NDPS">NDPS</option>
            </select>
          </div>

          <div className="form-group">
            <label>Pack Size:</label>
            <input
              type="text"
              name="pack_size"
              value={formData.pack_size}
              onChange={handleChange}
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Manufacturer:</label>
            <input
              type="text"
              name="manufacturer"
              value={formData.manufacturer}
              onChange={handleChange}
            />
          </div>

          <div className="form-group">
            <label>MRP:</label>
            <input
              type="number"
              name="mrp"
              value={formData.mrp}
              onChange={handleChange}
              step="0.01"
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Base Unit:</label>
            <input
              type="text"
              name="base_unit"
              value={formData.base_unit}
              onChange={handleChange}
            />
          </div>

          <div className="form-group">
            <label>Pack Unit:</label>
            <input
              type="text"
              name="pack_unit"
              value={formData.pack_unit}
              onChange={handleChange}
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Units Per Pack:</label>
            <input
              type="number"
              name="units_per_pack"
              value={formData.units_per_pack}
              onChange={handleChange}
            />
          </div>

          <div className="form-group">
            <label>Base Unit Step:</label>
            <input
              type="number"
              name="base_unit_step"
              value={formData.base_unit_step}
              onChange={handleChange}
              step="0.001"
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group checkbox-group">
            <label>
              <input
                type="checkbox"
                name="is_sensitive"
                checked={formData.is_sensitive}
                onChange={handleChange}
              />{" "}
              Sensitive Drug
            </label>
          </div>

          <div className="form-group checkbox-group">
            <label>
              <input
                type="checkbox"
                name="is_active"
                checked={formData.is_active}
                onChange={handleChange}
              />{" "}
              Active
            </label>
          </div>
        </div>

        <div className="form-actions">
          <button
            type="button"
            className="cancel-btn"
            onClick={() => navigate("/masters/products")}
          >
            Cancel
          </button>
          <button type="submit" className="submit-btn">
            Update
          </button>
        </div>
      </form>
    </div>
  );
};

export default EditProduct;
