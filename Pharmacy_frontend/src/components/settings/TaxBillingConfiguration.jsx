// src/components/TaxBilling/TaxBilling.jsx
import React, { useEffect, useState } from "react";
import "./taxbilling.css";
import { FileText } from "lucide-react";
import { authFetch } from "../../api/http"; // add this at the top



const API_BASE_URL = import.meta.env.VITE_API_URL;

const TaxBilling = () => {
  const [loading, setLoading] = useState(false);
  const [taxData, setTaxData] = useState({
    gstRate: "",
    taxMethod: "inclusive",
    cgstRate: "",
    sgstRate: "",
    invoicePrefix: "",
    invoiceStart: "",
    invoiceTemplate: "standard",
    invoiceFooter: "",
    cashPayment: true,
    cardPayment: false,
    upiPayment: false,
    creditSales: false,
  });

  // ---------------------------------------------
  // FETCH tax & billing settings from backend
  // ---------------------------------------------
  useEffect(() => {
    const fetchTaxData = async () => {
      try {
        const res = await authFetch(`${API_BASE_URL}/api/v1/settings/tax-billing/`);
        if (!res.ok) return;

        const data = await res.json();

        setTaxData({
          gstRate: data.gst_rate || "",
          taxMethod: data.tax_method || "inclusive",
          cgstRate: data.cgst_rate || "",
          sgstRate: data.sgst_rate || "",
          invoicePrefix: data.invoice_prefix || "",
          invoiceStart: data.invoice_start || "",
          invoiceTemplate: data.invoice_template || "standard",
          invoiceFooter: data.invoice_footer || "",
          cashPayment: data.cash_payment ?? true,
          cardPayment: data.card_payment ?? false,
          upiPayment: data.upi_payment ?? false,
          creditSales: data.credit_sales ?? false,
        });
      } catch (error) {
        console.error("Error fetching tax billing:", error);
      }
    };

    fetchTaxData();
  }, []);

  // ---------------------------------------------
  // FORM HANDLERS
  // ---------------------------------------------
  const handleTaxChange = (e) => {
    const { name, value } = e.target;
    setTaxData({ ...taxData, [name]: value });
  };

  const togglePayment = (key) => {
    setTaxData({ ...taxData, [key]: !taxData[key] });
  };

  // ----------------------------------------------------
  // POST METHOD — Save individual key/value
  // ----------------------------------------------------
  const saveKeyValue = async (key, value) => {
    await authFetch(`${API_BASE_URL}/api/v1/settings/settings/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, value }),
    });
  };

  // ----------------------------------------------------
  // PUT METHOD — Save FULL TaxBillingSettings
  // ----------------------------------------------------
  const saveFullTaxBilling = async () => {
    const payload = {
      gst_rate: taxData.gstRate,
      tax_method: taxData.taxMethod,
      cgst_rate: taxData.cgstRate,
      sgst_rate: taxData.sgstRate,
      invoice_prefix: taxData.invoicePrefix,
      invoice_start: taxData.invoiceStart,
      invoice_template: taxData.invoiceTemplate,
      invoice_footer: taxData.invoiceFooter,
      cash_payment: taxData.cashPayment,
      card_payment: taxData.cardPayment,
      upi_payment: taxData.upiPayment,
      credit_sales: taxData.creditSales,
    };

    await authFetch(`${API_BASE_URL}/api/v1/settings/tax-billing/`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  };

  // ----------------------------------------------------
  // SAVE FUNCTION — Runs BOTH POST + PUT
  // ----------------------------------------------------
  const handleTaxSave = async () => {
    setLoading(true);

    try {
      // ----- POST Save (Key-Value) -----
      const kvMappings = {
        gstRate: "TAX_GST_RATE",
        taxMethod: "TAX_CALC_METHOD",
        cgstRate: "TAX_CGST_RATE",
        sgstRate: "TAX_SGST_RATE",
        invoicePrefix: "INVOICE_PREFIX",
        invoiceStart: "INVOICE_START",
        invoiceTemplate: "INVOICE_TEMPLATE",
        invoiceFooter: "INVOICE_FOOTER",
        cashPayment: "CASH_PAYMENT",
        cardPayment: "CARD_PAYMENT",
        upiPayment: "UPI_PAYMENT",
        creditSales: "CREDIT_SALES",
      };

      for (let field in kvMappings) {
        await saveKeyValue(kvMappings[field], String(taxData[field]));
      }

      // ----- PUT Save (Full TaxBillingSettings) -----
      await saveFullTaxBilling();

      alert("✅ Tax & Billing Settings Saved Successfully!");

    } catch (err) {
      console.error("Save Error:", err);
      alert("❌ Failed to save settings");
    }

    setLoading(false);
  };

  return (
    <div className="tax-section">
      <h2 style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <FileText size={28} /> Tax & Billing Configuration
      </h2>

      {/* UI Layout Same as your original */}
      {/* ------------- TAX FORM ------------- */}
      <div className="tax-card">

        <h3>Tax Settings</h3>

        <div className="alert-row-horizontal">
          <div className="alert-field">
            <label>GST Rate (%)</label>
            <input
              type="number"
              name="gstRate"
              value={taxData.gstRate}
              onChange={handleTaxChange}
            />
          </div>

          <div className="alert-field">
            <label>Calculation Type</label>
            <select
              name="taxMethod"
              value={taxData.taxMethod}
              onChange={handleTaxChange}
            >
              <option value="inclusive">Tax Inclusive</option>
              <option value="exclusive">Tax Exclusive</option>
            </select>
          </div>
        </div>

        <div className="alert-row-horizontal">
          <div className="alert-field">
            <label>CGST (%)</label>
            <input
              type="number"
              name="cgstRate"
              value={taxData.cgstRate}
              onChange={handleTaxChange}
            />
          </div>

          <div className="alert-field">
            <label>SGST (%)</label>
            <input
              type="number"
              name="sgstRate"
              value={taxData.sgstRate}
              onChange={handleTaxChange}
            />
          </div>
        </div>

        <hr className="divider" />

        <h3>Invoice Settings</h3>

        <div className="alert-row-horizontal">
          <div className="alert-field">
            <label>Invoice Prefix</label>
            <input
              type="text"
              name="invoicePrefix"
              value={taxData.invoicePrefix}
              onChange={handleTaxChange}
            />
          </div>

          <div className="alert-field">
            <label>Start Number</label>
            <input
              type="number"
              name="invoiceStart"
              value={taxData.invoiceStart}
              onChange={handleTaxChange}
            />
          </div>
        </div>

        <div className="alert-row-horizontal">
          <div className="alert-field">
            <label>Invoice Template</label>
            <select
              name="invoiceTemplate"
              value={taxData.invoiceTemplate}
              onChange={handleTaxChange}
            >
              <option value="standard">Standard</option>
              <option value="modern">Detailed</option>
              <option value="minimal">Compact</option>
            </select>
          </div>

          <div className="alert-field">
            <label>Invoice Footer</label>
            <input
              type="text"
              name="invoiceFooter"
              value={taxData.invoiceFooter}
              onChange={handleTaxChange}
            />
          </div>
        </div>

        <hr className="divider" />

        <h3>Payment Methods</h3>

        <div className="payment-methods">
          {[
            ["cashPayment", "Cash Payment"],
            ["cardPayment", "Card Payment"],
            ["upiPayment", "UPI Payment"],
            ["creditSales", "Credit Sales"],
          ].map(([key, label]) => (
            <div className="payment-row" key={key}>
              <label>{label}</label>
              <label className="switch">
                <input
                  type="checkbox"
                  checked={taxData[key]}
                  onChange={() => togglePayment(key)}
                />
                <span className="slider"></span>
              </label>
            </div>
          ))}
        </div>

        <div className="save-btn-container">
          <button
            className="save-btn"
            onClick={handleTaxSave}
            disabled={loading}
          >
            {loading ? "Saving..." : "Save Settings"}
          </button>
        </div>

      </div>
    </div>
  );
};

export default TaxBilling;
