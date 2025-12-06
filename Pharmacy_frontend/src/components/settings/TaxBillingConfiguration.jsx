import React, { useEffect, useState } from "react";
import "./taxbilling.css";
import { FileText } from "lucide-react";
import { authFetch } from "../../api/http";

// --------------------
// USE ENV BASE URL
// --------------------
const API_BASE = import.meta.env.VITE_API_URL?.replace(/\/+$/, "");
const API_URL = `${API_BASE}/api/v1/settings/tax-billing/`;

export default function TaxBillingConfiguration() {
  const [data, setData] = useState({});
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  // ------------------------
  // GET TAX SETTINGS
  // ------------------------
  const fetchData = async () => {
    try {
      const res = await authFetch(API_URL);
      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error("GET error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // ------------------------
  // HANDLE FIELD CHANGE
  // ------------------------
  const onFieldChange = (name, value) => {
    setData((prev) => ({ ...prev, [name]: value }));
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    onFieldChange(name, value);
  };

  const toggle = (key) => {
    setData((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const booleanRow = (key, label) => (
    <div className="payment-row" key={key}>
      <label>{label}</label>
      <label className="switch">
        <input type="checkbox" checked={Boolean(data?.[key])} onChange={() => toggle(key)} />
        <span className="slider"></span>
      </label>
    </div>
  );

  // ------------------------
  // SAVE BUTTON (POST/PUT)
  // ------------------------
  const onSave = async () => {
    setSaving(true);

    try {
      const method = data.id ? "PUT" : "POST";

      const res = await authFetch(API_URL, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const json = await res.json();
      setData(json);

      alert("Saved Successfully!");
    } catch (err) {
      console.error("Save error:", err);
      alert("Save Failed");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p>Loading Tax Settings...</p>;

  return (
    <div className="tax-section">
      <h2 style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <FileText size={28} /> Tax & Billing Configuration
      </h2>

      <div className="tax-card">
        <h3>Tax Settings</h3>

        <div className="alert-row-horizontal">
          <div className="alert-field">
            <label>GST Rate (%)</label>
            <input type="number" name="gst_rate" value={data.gst_rate || ""} onChange={handleChange} />
          </div>

          <div className="alert-field">
            <label>Calculation Type</label>
            <select name="tax_method" value={data.tax_method || ""} onChange={handleChange}>
              <option value="">Select</option>
              <option value="inclusive">Tax Inclusive</option>
              <option value="exclusive">Tax Exclusive</option>
            </select>
          </div>
        </div>

        <div className="alert-row-horizontal">
          <div className="alert-field">
            <label>CGST (%)</label>
            <input type="number" name="cgst_rate" value={data.cgst_rate || ""} onChange={handleChange} />
          </div>

          <div className="alert-field">
            <label>SGST (%)</label>
            <input type="number" name="sgst_rate" value={data.sgst_rate || ""} onChange={handleChange} />
          </div>
        </div>

        <hr className="divider" />

        <h3>Invoice Settings</h3>

        <div className="alert-row-horizontal">
          <div className="alert-field">
            <label>Invoice Prefix</label>
            <input type="text" name="invoice_prefix" value={data.invoice_prefix || ""} onChange={handleChange} />
          </div>

          <div className="alert-field">
            <label>Start Number</label>
            <input type="number" name="invoice_start" value={data.invoice_start || ""} onChange={handleChange} />
          </div>
        </div>

        <div className="alert-row-horizontal">
          <div className="alert-field">
            <label>Invoice Template</label>
            <select name="invoice_template" value={data.invoice_template || ""} onChange={handleChange}>
              <option value="">Select</option>
              <option value="standard">Standard</option>
              <option value="modern">Detailed</option>
              <option value="minimal">Compact</option>
            </select>
          </div>

          <div className="alert-field">
            <label>Invoice Footer</label>
            <input type="text" name="invoice_footer" value={data.invoice_footer || ""} onChange={handleChange} />
          </div>
        </div>

        <hr className="divider" />

        <h3>Payment Methods</h3>

        <div className="payment-methods">
          {[
            ["cash_payment", "Cash Payment"],
            ["card_payment", "Card Payment"],
            ["upi_payment", "UPI Payment"],
            ["credit_sales", "Credit Sales"],
          ].map(([key, label]) => booleanRow(key, label))}
        </div>

        <div className="save-btn-container">
          <button className="save-btn" onClick={onSave} disabled={saving}>
            {saving ? "Saving..." : "Save Settings"}
          </button>
        </div>
      </div>
    </div>
  );
}
