// src/components/Masters/Products/ViewProduct.jsx

import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import "./addproducts.css"; // same CSS as AddProduct / EditProduct
import { authFetch } from "../../../api/http";
const API_BASE_URL = import.meta.env.VITE_API_URL;

const ViewProduct = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState({
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
    is_active: true
  });

  useEffect(() => {
    authFetch(`${API_BASE_URL}/catalog/products/${id}/`)
      .then((res) => res.json())
      .then((data) => setProduct(data))
      .catch(err => console.error("Error fetching product:", err));
  }, [id]);

  return (
    <div className="Suppliers-container">
      <h1 className="Suppliers-title">View Product</h1>

      <form className="Suppliers-form">

        <div className="form-row">
          <div className="form-group">
            <label>Name:</label>
            <input type="text" value={product.name} readOnly />
          </div>

          <div className="form-group">
            <label>HSN:</label>
            <input type="text" value={product.hsn} readOnly />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Schedule:</label>
            <input type="text" value={product.schedule} readOnly />
          </div>

          <div className="form-group">
            <label>Pack Size:</label>
            <input type="text" value={product.pack_size} readOnly />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Manufacturer:</label>
            <input type="text" value={product.manufacturer} readOnly />
          </div>

          <div className="form-group">
            <label>MRP:</label>
            <input type="number" value={product.mrp} readOnly />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Base Unit:</label>
            <input type="text" value={product.base_unit} readOnly />
          </div>

          <div className="form-group">
            <label>Pack Unit:</label>
            <input type="text" value={product.pack_unit} readOnly />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Units Per Pack:</label>
            <input type="number" value={product.units_per_pack} readOnly />
          </div>

          <div className="form-group">
            <label>Base Unit Step:</label>
            <input type="number" value={product.base_unit_step} readOnly />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group checkbox-group">
            <label>
              <input type="checkbox" checked={product.is_sensitive} readOnly /> Sensitive Drug
            </label>
          </div>

          <div className="form-group checkbox-group">
            <label>
              <input type="checkbox" checked={product.is_active} readOnly /> Active
            </label>
          </div>
        </div>

        <div className="form-actions">
          <button type="button" className="cancel-btn" onClick={() => navigate("/masters/products")}>
            Back
          </button>
          
        </div>
      </form>
    </div>
  );
};

export default ViewProduct;
