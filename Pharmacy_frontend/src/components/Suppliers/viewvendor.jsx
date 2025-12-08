import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { authFetch } from "../../api/http";
import "./addvendors.css";
const API_BASE_URL = import.meta.env.VITE_API_URL;

const ViewVendor = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [Supplier, setVendor] = useState(null);

  useEffect(() => {
    const fetchVendor = async () => {
      try {
        const res = await authFetch(`${API_BASE_URL}/api/v1/procurement/vendors/${id}/`);
        if (!res.ok) throw new Error("Supplier not found");
        const data = await res.json();
        setVendor(data);
      } catch (err) {
        console.error("Failed to fetch Supplier:", err);
      }
    };
    fetchVendor();
  }, [id]);

  if (!Supplier) return <p>Loading...</p>;

  return (
    <div className="Suppliers-container">
      <h1 className="Suppliers-title">View Supplier</h1>

      <div className="Suppliers-form">

        <div className="form-row">
          <div className="form-group">
            <label>Supplier Name:</label>
            <p>{Supplier.name}</p>
          </div>

          <div className="form-group">
            <label>GSTIN:</label>
            <p>{Supplier.gstin}</p>
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Contact Number:</label>
            <p>{Supplier.contact_phone}</p>
          </div>

          <div className="form-group">
            <label>Email:</label>
            <p>{Supplier.email}</p>
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Contact Person:</label>
            <p>{Supplier.contact_person}</p>
          </div>

          <div className="form-group">
            <label>Payment Terms:</label>
            <p>{Supplier.payment_terms}</p>
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Bank Name:</label>
            <p>{Supplier.bank_name}</p>
          </div>

          <div className="form-group">
            <label>Account No:</label>
            <p>{Supplier.account_no}</p>
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>IFSC:</label>
            <p>{Supplier.ifsc}</p>
          </div>

          <div className="form-group">
            <label>Rating:</label>
            <p>{Supplier.rating}</p>
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Address:</label>
            <p>{Supplier.address}</p>
          </div>

          <div className="form-group">
            <label>Notes:</label>
            <p>{Supplier.notes}</p>
          </div>
        </div>

        <div className="form-row">
          <div className="form-group checkbox-group">
            <label>Status:</label>
            <p>{Supplier.is_active ? "Active" : "Inactive"}</p>
          </div>
        </div>

        <div className="form-actions">
          <button className="cancel-btn" onClick={() => navigate("/suppliers")}>
            Back
          </button>
          <button className="submit-btn" onClick={() => navigate(`/suppliers/edit/${id}`)}>
            Edit
          </button>
        </div>

      </div>
    </div>
  );
};

export default ViewVendor;
