import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { authFetch } from "../../api/http"; // Use this if you handle auth (token) in your project
import { useAlert } from "../ui/alert-provider";
import "./addvendors.css";

const API_BASE_URL = import.meta.env.VITE_API_URL; // e.g. http://127.0.0.1:8000/api/v1

const EditVendor = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { showAlert } = useAlert();

  const [loading, setLoading] = useState(true);
  const [paymentTermsList, setPaymentTermsList] = useState([]);
  const [formData, setFormData] = useState({
    name: "",
    gstin: "",
    contact_phone: "",
    email: "",
    contact_person: "",
    address: "",
    product_info: "",
    payment_terms: "",
    bank_name: "",
    account_no: "",
    ifsc: "",
    notes: "",
    rating: "",
    is_active: true,
  });

  // Fetch payment terms list (correct endpoint!)
  useEffect(() => {
    const loadTerms = async () => {
      try {
        // Endpoint is BASE_URL/settings/payment-terms/ (no extra /api/v1!)
        const res = await authFetch(`${API_BASE_URL}/api/v1/settings/payment-terms/`);
        const data = await res.json();
        // Handle paginated and plain array
        const list = data.results ? data.results : data;
        setPaymentTermsList(Array.isArray(list) ? list : []);
      } catch (error) {
        console.error("Error loading payment terms", error);
        setPaymentTermsList([]);
      }
    };
    loadTerms();
  }, []);

  // Fetch Supplier data
  useEffect(() => {
    const loadVendor = async () => {
      setLoading(true);
      try {
        const res = await authFetch(`${API_BASE_URL}/api/v1/procurement/vendors/${id}/`);
        if (!res.ok) throw new Error(`Fetch error: ${res.status}`);
        const data = await res.json();
        setFormData({
          name: data.name || "",
          gstin: data.gstin || "",
          contact_phone: data.contact_phone || "",
          email: data.email || "",
          contact_person: data.contact_person || "",
          address: data.address || "",
          product_info: data.product_info || "",
          payment_terms: String(data.payment_terms || ""),
          bank_name: data.bank_name || "",
          account_no: data.account_no || "",
          ifsc: data.ifsc || "",
          notes: data.notes || "",
          rating: data.rating || "",
          is_active: !!data.is_active,
        });
      } catch (error) {
        console.error("Error loading Supplier", error);
        showAlert("Failed to load Supplier information.", "Error");
      } finally {
        setLoading(false);
      }
    };
    if (id) loadVendor();
  }, [id]);

  // Controlled input change
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  // Submit update
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await authFetch(`${API_BASE_URL}/api/v1/procurement/vendors/${id}/`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        showAlert("Supplier Updated Successfully!", "Success");
        navigate("/suppliers");
      } else {
        const errData = await res.json();
        showAlert("Failed to Update Supplier! " + JSON.stringify(errData), "Error");
      }
    } catch (err) {
      console.error("Error updating Supplier:", err);
      showAlert("Error updating Supplier. See console for details.", "Error");
    }
  };

  if (loading) {
    return <div className="Suppliers-container"><p>Loading...</p></div>;
  }

  return (
    <div className="Suppliers-container">
      {/* Page Header */}
      <div className="page-header">
        <button className="back-btn" onClick={() => navigate(-1)}>
          <ArrowLeft size={18} />
          <span>Back</span>
        </button>
        <h1 className="Suppliers-title">Edit Supplier</h1>
      </div>

      <form className="Suppliers-form" onSubmit={handleSubmit}>
        {/* BASIC INFORMATION */}
        <div className="section-card">
          <h2 className="section-heading">Basic Information</h2>
          <div className="row">
            <div className="field">
              <label>Supplier Name *</label>
              <input type="text" name="name" value={formData.name} onChange={handleChange} required />
            </div>
             <div className="field">
  <label>Supplier Type *</label>
  <select
    name="supplier_type"
    value={formData.supplier_type}
    onChange={handleChange}
    required
  >
    <option value="">-- Select Supplier Type --</option>
    <option value="OFFLINE">Manual Order in ERP</option>
    <option value="ONLINE">External Website (PDF Import)</option>
  </select>
</div>
            <div className="field">
              <label>Contact Person *</label>
              <input type="text" name="contact_person" value={formData.contact_person} onChange={handleChange} />
            </div>
          </div>
          <div className="row">
            <div className="field">
              <label>Phone Number *</label>
              <input type="text" name="contact_phone" value={formData.contact_phone} onChange={handleChange} />
            </div>
            <div className="field">
              <label>Email Address *</label>
              <input type="email" name="email" value={formData.email} onChange={handleChange} />
            </div>
          </div>
          <div className="row">
            <div className="field">
              <label>GST Number *</label>
              <input type="text" name="gstin" value={formData.gstin} onChange={handleChange} />
            </div>
            <div className="field">
              <label>Status</label>
              <select
                name="is_active"
                value={formData.is_active ? "1" : "0"}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.value === "1" })}
              >
                <option value="1">Active</option>
                <option value="0">Inactive</option>
              </select>
            </div>
          </div>
          <div className="field full">
            <label>Address *</label>
            <textarea name="address" value={formData.address} onChange={handleChange}></textarea>
          </div>
        </div>

        {/* PRODUCTS */}
        <div className="section-card">
          <h2 className="section-heading">Products & Supply Information</h2>
          <div className="field full">
            <label>What Products Can This Supplier Deliver? *</label>
            <textarea
              name="product_info"
              value={formData.product_info}
              onChange={handleChange}
              placeholder="Eg: Antibiotics, Surgical Items, Diabetic Medicines, etc."
            ></textarea>
          </div>
        </div>

        {/* PAYMENT TERMS */}
        <div className="section-card">
          <h2 className="section-heading">Business Terms</h2>
          <div className="row">
            <div className="field">
              <label>Payment Terms *</label>
              <select name="payment_terms" value={formData.payment_terms} onChange={handleChange} required>
                <option value="">Select</option>
                {paymentTermsList.map((pt) => (
                  <option key={pt.id} value={pt.id}>{pt.name}</option>
                ))}
              </select>
            </div>
            <div className="field"></div>
          </div>
        </div>

        {/* BANK DETAILS */}
        <div className="section-card">
          <h2 className="section-heading">Banking Information (Optional)</h2>
          <div className="row">
            <div className="field">
              <label>Bank Name</label>
              <input type="text" name="bank_name" value={formData.bank_name} onChange={handleChange} />
            </div>
            <div className="field">
              <label>Account Number</label>
              <input type="text" name="account_no" value={formData.account_no} onChange={handleChange} />
            </div>
          </div>
          <div className="row">
            <div className="field">
              <label>IFSC Code</label>
              <input type="text" name="ifsc" value={formData.ifsc} onChange={handleChange} />
            </div>
            <div className="field"></div>
          </div>
        </div>

        {/* NOTES */}
        <div className="section-card">
          <h2 className="section-heading">Additional Notes</h2>
          <div className="field full">
            <textarea name="notes" value={formData.notes} onChange={handleChange}></textarea>
          </div>
        </div>

        {/* BUTTONS */}
        <div className="action-row">
          <button type="button" className="cancel-btn" onClick={() => navigate("/suppliers")}>
            Cancel
          </button>
          <button type="submit" className="save-btn">Update</button>
        </div>
      </form>
    </div>
  );
};

export default EditVendor;
