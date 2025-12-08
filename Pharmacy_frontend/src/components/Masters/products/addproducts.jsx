import React, { useState, useEffect } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import "./addproducts.css";
import { authFetch } from "../../../api/http";
import { useAlert } from "../../ui/alert-provider";

const API_BASE_URL = import.meta.env.VITE_API_URL;

const AddProduct = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const location = useLocation();
  const vendorFromState = location.state?.vendor; // passed vendor
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
    preferred_vendor: vendorFromState?.id || "",
  });

  useEffect(() => {
    if (id) {
      authFetch(`${API_BASE_URL}/catalog/products/${id}/`)
        .then((res) => res.json())
        .then((data) =>
          setFormData({
            ...data,
            preferred_vendor: data.preferred_vendor || vendorFromState?.id || "",
          })
        );
    }
  }, [id, vendorFromState]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({ ...formData, [name]: type === "checkbox" ? checked : value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const url = id
      ? `${API_BASE_URL}/catalog/products/${id}/`
      : `${API_BASE_URL}/catalog/products/`;
    const method = id ? "PUT" : "POST";

    const payload = {
      ...formData,
      mrp: Number(formData.mrp),
      units_per_pack: Number(formData.units_per_pack),
      base_unit_step: Number(formData.base_unit_step),
      preferred_vendor: formData.preferred_vendor ? Number(formData.preferred_vendor) : null,
    };

    const res = await authFetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      showAlert(id ? "Product Updated Successfully!" : "Product Added Successfully!", "Success");
      navigate("/procurement/orders/create", { state: { vendor: vendorFromState, refresh: true } });
    } else {
      const errText = await res.text();
      console.error(errText);
      showAlert("Failed to save product!", "Error");
    }
  };

  return (
    <div className="vendors-container">
      <h1 className="vendors-title">{id ? "Update Product" : "Add Product"}</h1>
      <form className="vendors-form" onSubmit={handleSubmit}>
        <div className="form-row">
          <div className="form-group">
            <label>Name:</label>
            <input type="text" name="name" value={formData.name} onChange={handleChange} required />
          </div>
          <div className="form-group">
            <label>HSN:</label>
            <input type="text" name="hsn" value={formData.hsn} onChange={handleChange} />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Schedule:</label>
            <select name="schedule" value={formData.schedule} onChange={handleChange}>
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
            <input type="text" name="pack_size" value={formData.pack_size} onChange={handleChange} />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Manufacturer:</label>
            <input type="text" name="manufacturer" value={formData.manufacturer} onChange={handleChange} />
          </div>
          <div className="form-group">
            <label>MRP:</label>
            <input type="number" name="mrp" value={formData.mrp} onChange={handleChange} step="0.01"/>
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Base Unit:</label>
            <input type="text" name="base_unit" value={formData.base_unit} onChange={handleChange} />
          </div>
          <div className="form-group">
            <label>Pack Unit:</label>
            <input type="text" name="pack_unit" value={formData.pack_unit} onChange={handleChange} />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Units Per Pack:</label>
            <input type="number" name="units_per_pack" value={formData.units_per_pack} onChange={handleChange} step="0.001"/>
          </div>
          <div className="form-group">
            <label>Base Unit Step:</label>
            <input type="number" name="base_unit_step" value={formData.base_unit_step} onChange={handleChange} step="0.001"/>
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Preferred Vendor:</label>
            <input type="number" name="preferred_vendor" value={formData.preferred_vendor} readOnly />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group checkbox-group">
            <label>
              <input type="checkbox" name="is_sensitive" checked={formData.is_sensitive} onChange={handleChange}/> Sensitive Drug
            </label>
          </div>
          <div className="form-group checkbox-group">
            <label>
              <input type="checkbox" name="is_active" checked={formData.is_active} onChange={handleChange}/> Active
            </label>
          </div>
        </div>

        <div className="form-actions">
          <button type="button" className="cancel-btn" onClick={() => navigate("/procurement/orders/create", { state: { vendor: vendorFromState, refresh: true } })}>
            Cancel
          </button>
          <button type="submit" className="submit-btn">{id ? "Update" : "Save"}</button>
        </div>
      </form>
    </div>
  );
};

export default AddProduct;
