import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { authFetch } from "../../api/http";
import "./addvendors.css";
const API_BASE_URL = import.meta.env.VITE_API_URL;

const ViewVendor = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [vendor, setVendor] = useState(null);

  useEffect(() => {
    const fetchVendor = async () => {
      try {
        const res = await authFetch(`${API_BASE_URL}/api/v1/procurement/vendors/${id}/`);
        if (!res.ok) throw new Error("Vendor not found");
        const data = await res.json();
        setVendor(data);
      } catch (err) {
        console.error("Failed to fetch vendor:", err);
      }
    };
    fetchVendor();
  }, [id]);

  if (!vendor) return <p>Loading...</p>;

  return (
    <div className="vendors-container">
      <h1 className="vendors-title">View Vendor</h1>

      <div className="vendors-form">

        <div className="form-row">
          <div className="form-group">
            <label>Vendor Name:</label>
            <p>{vendor.name}</p>
          </div>

          <div className="form-group">
            <label>GSTIN:</label>
            <p>{vendor.gstin}</p>
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Contact Number:</label>
            <p>{vendor.contact_phone}</p>
          </div>

          <div className="form-group">
            <label>Email:</label>
            <p>{vendor.email}</p>
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Contact Person:</label>
            <p>{vendor.contact_person}</p>
          </div>

          <div className="form-group">
            <label>Payment Terms:</label>
            <p>{vendor.payment_terms}</p>
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Bank Name:</label>
            <p>{vendor.bank_name}</p>
          </div>

          <div className="form-group">
            <label>Account No:</label>
            <p>{vendor.account_no}</p>
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>IFSC:</label>
            <p>{vendor.ifsc}</p>
          </div>

          <div className="form-group">
            <label>Rating:</label>
            <p>{vendor.rating}</p>
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Address:</label>
            <p>{vendor.address}</p>
          </div>

          <div className="form-group">
            <label>Notes:</label>
            <p>{vendor.notes}</p>
          </div>
        </div>

        <div className="form-row">
          <div className="form-group checkbox-group">
            <label>Status:</label>
            <p>{vendor.is_active ? "Active" : "Inactive"}</p>
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
