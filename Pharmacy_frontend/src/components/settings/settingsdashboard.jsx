// src/components/settings/SettingsDashboard.jsx
import React, { useState, useEffect } from "react";
import { Home, AlertCircle, CreditCard, Database, Bell } from "lucide-react";
import "./settingsdashboard.css";
import TaxBillingConfiguration from "./TaxBillingConfiguration";
import Notifications from "./Notifications";
import BackupRestore from "./BackupRestore";
import { authFetch } from "../../api/http";

const API_BASE_URL = import.meta.env.VITE_API_URL;

const SettingsDashboard = () => {
  const [activeSection, setActiveSection] = useState("Business Details");
  const [loading, setLoading] = useState(false);
  const [businessExists, setBusinessExists] = useState(false);

  const settingsSections = [
    { name: "Business Details", icon: <Home size={24} /> },
    { name: "Alert Thresholds", icon: <AlertCircle size={24} /> },
    { name: "Tax & Billing", icon: <CreditCard size={24} /> },
    { name: "Backup & Restore", icon: <Database size={24} /> },
    { name: "Notifications", icon: <Bell size={24} /> },
  ];

  const [formData, setFormData] = useState({
    business_name: "",
    email: "",
    phone: "",
    address: "",
    owner_name: "",
    registration_date: "",
    gst_number: "",
    pharmacy_license_number: "",
    drug_license_number: "",
  });

  const [alertData, setAlertData] = useState({
    low_stock_threshold: "",
    out_of_stock_alert: "No",
    critical_expiry_days: "",
    warning_expiry_days: "",
    check_frequency: "",
    auto_remove_expired: "Manually only",
  });

  // -------------------------------------------------------
  // FETCH BUSINESS DETAILS
  // -------------------------------------------------------
  const fetchBusinessDetails = async () => {
    try {
      const res = await authFetch(`${API_BASE_URL}/api/v1/settings/business-profile/`);
      if (res.ok) {
        const data = await res.json();
        setBusinessExists(true);

        setFormData({
          business_name: data.business_name || "",
          email: data.email || "",
          phone: data.phone || "",
          address: data.address || "",
          owner_name: data.owner_name || "",
          registration_date: data.registration_date || "",
          gst_number: data.gst_number || "",
          pharmacy_license_number: data.pharmacy_license_number || "",
          drug_license_number: data.drug_license_number || "",
        });
      }
    } catch (err) {
      console.error("Business fetch error:", err);
    }
  };

  // -------------------------------------------------------
  // FETCH ALERT SETTINGS (Correct Backend: /settings/app/)
  // -------------------------------------------------------
  const fetchAlertSettings = async () => {
    try {
      const res = await authFetch(`${API_BASE_URL}/api/v1/settings/app/`);
      if (!res.ok) return;

      const data = await res.json();
      const alerts = data.alerts || {};

      setAlertData({
        low_stock_threshold: alerts.ALERT_LOW_STOCK_DEFAULT || "",
        out_of_stock_alert: alerts.OUT_OF_STOCK_ACTION || "No",
        critical_expiry_days: alerts.ALERT_EXPIRY_CRITICAL_DAYS || "",
        warning_expiry_days: alerts.ALERT_EXPIRY_WARNING_DAYS || "",
        check_frequency: alerts.ALERT_CHECK_FREQUENCY || "",
        auto_remove_expired: alerts.AUTO_REMOVE_EXPIRED || "Manually only",
      });
    } catch (err) {
      console.error("Alert fetch error:", err);
    }
  };

  useEffect(() => {
    fetchBusinessDetails();
    fetchAlertSettings();
  }, []);

  // -------------------------------------------------------
  // HANDLERS
  // -------------------------------------------------------
  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });
  const handleAlertChange = (e) => setAlertData({ ...alertData, [e.target.name]: e.target.value });

  // -------------------------------------------------------
  // SAVE BUSINESS INFO
  // -------------------------------------------------------
  const handleSave = async () => {
    setLoading(true);
    try {
      const method = businessExists ? "PUT" : "POST";

      const response = await authFetch(`${API_BASE_URL}/api/v1/settings/business-profile/`, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        alert("Business details saved!");
        setBusinessExists(true);
      } else {
        alert("Failed to save business details");
      }
    } finally {
      setLoading(false);
    }
  };

  // -------------------------------------------------------
  // SAVE ALERT SETTINGS → /settings/app/save (correct)
  // -------------------------------------------------------
  const handleAlertSave = async () => {
    setLoading(true);

    try {
      const payload = {
        alerts: {
          ALERT_LOW_STOCK_DEFAULT: alertData.low_stock_threshold,
          OUT_OF_STOCK_ACTION: alertData.out_of_stock_alert,
          ALERT_EXPIRY_CRITICAL_DAYS: alertData.critical_expiry_days,
          ALERT_EXPIRY_WARNING_DAYS: alertData.warning_expiry_days,
          ALERT_CHECK_FREQUENCY: alertData.check_frequency,
          AUTO_REMOVE_EXPIRED: alertData.auto_remove_expired,
        },
      };

      const response = await authFetch(`${API_BASE_URL}/api/v1/settings/app/save`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        alert("Alert thresholds saved!");
        fetchAlertSettings();
      } else {
        alert("Failed to save alert settings");
      }
    } catch (err) {
      console.error(err);
      alert("Error saving alert settings");
    } finally {
      setLoading(false);
    }
  };

  // -------------------------------------------------------
  // UI
  // -------------------------------------------------------
  return (
    <div className="settings-container">
      <h1 className="settings-title">Settings</h1>
      <h2 className="settings-heading">Manage application configuration</h2>

      <div className="settings-tab-container">
        {settingsSections.map((section) => (
          <div
            key={section.name}
            className={`settings-tab ${activeSection === section.name ? "active" : ""}`}
            onClick={() => setActiveSection(section.name)}
          >
            {section.icon}
            <span>{section.name}</span>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 40 }}>
        {/* --------------------------------------------- */}
        {/* BUSINESS DETAILS UI */}
        {/* --------------------------------------------- */}
        {activeSection === "Business Details" && (
          <div className="business-section">
            <h2><Home size={28} /> Business Information</h2>

            <div className="business-form">
              {Object.entries(formData).map(([key, value]) => (
                <div className="form-row" key={key}>
                  <label>{key.replace(/_/g, " ").toUpperCase()}</label>

                  {key === "address" ? (
                    <textarea name={key} value={value} onChange={handleChange} />
                  ) : key === "registration_date" ? (
                    <input type="date" name={key} value={value} onChange={handleChange} />
                  ) : (
                    <input type="text" name={key} value={value} onChange={handleChange} />
                  )}
                </div>
              ))}

              <button className="save-btn" onClick={handleSave} disabled={loading}>
                {loading ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        )}

        {/* --------------------------------------------- */}
        {/* ALERT THRESHOLDS UI */}
        {/* --------------------------------------------- */}
        {activeSection === "Alert Thresholds" && (
          <div className="alert-section">
            <h2><AlertCircle size={28} /> Alert Configuration</h2>

            <div className="alert-card">
              <h3>Inventory Alerts</h3>

              <div className="alert-row-horizontal">
                <div className="alert-field">
                  <label>Low Stock Threshold</label>
                  <input
                    type="number"
                    name="low_stock_threshold"
                    value={alertData.low_stock_threshold}
                    onChange={handleAlertChange}
                  />
                </div>

                <div className="alert-field">
                  <label>Out of Stock Alert</label>
                  <select
                    name="out_of_stock_alert"
                    value={alertData.out_of_stock_alert}
                    onChange={handleAlertChange}
                  >
                    <option value="No">No</option>
                    <option value="Yes">Yes</option>
                  </select>
                </div>
              </div>

              <h3>Expiry Alerts</h3>
              <div className="alert-row-horizontal">
                <div className="alert-field">
                  <label>Critical Expiry Days</label>
                  <input
                    type="number"
                    name="critical_expiry_days"
                    value={alertData.critical_expiry_days}
                    onChange={handleAlertChange}
                  />
                </div>

                <div className="alert-field">
                  <label>Warning Expiry Days</label>
                  <input
                    type="number"
                    name="warning_expiry_days"
                    value={alertData.warning_expiry_days}
                    onChange={handleAlertChange}
                  />
                </div>
              </div>

              <div className="alert-row-horizontal">
                <div className="alert-field">
                  <label>Auto Remove Expired</label>
                  <select
                    name="auto_remove_expired"
                    value={alertData.auto_remove_expired}
                    onChange={handleAlertChange}
                  >
                    <option value="Manually only">Manually only</option>
                    <option value="Automatically">Automatically</option>
                    <option value="Auto Remove (after 7 days)">Auto Remove (after 7 days)</option>
                  </select>
                </div>

                {/* empty placeholder to keep 2-column layout and same width */}
                <div className="alert-field alert-field-empty" />
              </div>




{/* 
              <div className="alert-row-horizontal">
                <div className="alert-field">
                  <label>Check Frequency (hours)</label>
                  <input
                    type="number"
                    name="check_frequency"
                    value={alertData.check_frequency}
                    onChange={handleAlertChange}
                  />
                </div>

                <div className="alert-field">
                  <label>Auto Remove Expired</label>
                  <select
                    name="auto_remove_expired"
                    value={alertData.auto_remove_expired}
                    onChange={handleAlertChange}
                  >
                    <option value="Manually only">Manually only</option>
                    <option value="Automatically">Automatically</option>
                    <option value="Auto Remove (after 7 days)">
                      Auto Remove (after 7 days)
                    </option>
                  </select>
                </div>
              </div> */}

              <button className="save-btn" onClick={handleAlertSave} disabled={loading}>
                {loading ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        )}

        {activeSection === "Tax & Billing" && <TaxBillingConfiguration />}
        {activeSection === "Backup & Restore" && <BackupRestore />}
        {activeSection === "Notifications" && <Notifications />}
      </div>
    </div>
  );
};

export default SettingsDashboard;
