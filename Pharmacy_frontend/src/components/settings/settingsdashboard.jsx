import React, { useState, useEffect } from "react";
import { Home, AlertCircle, CreditCard, Database, Bell } from "lucide-react";
import "./settingsdashboard.css";
import TaxBillingConfiguration from "./TaxBillingConfiguration";
import Notifications from "./Notifications";
import BackupRestore from "./BackupRestore";

const API_BASE_URL = import.meta.env.VITE_API_URL;

// ---- AUTH HELPERS -------------------------------------------------

// Read the token exactly as stored in localStorage
const getToken = () => {
  const token = localStorage.getItem("access_token"); // <-- your key
  if (!token) {
    console.warn("[AUTH] access_token not found in localStorage");
  }
  return token;
};

const getAuthHeaders = () => {
  const token = getToken();
  if (!token) return {};

  // For JWT/SimpleJWT:
  return { Authorization: `Bearer ${token}` };

  // If you're using DRF TokenAuthentication instead, use:
  // return { Authorization: `Token ${token}` };
};

// -------------------------------------------------------------------

const SettingsDashboard = () => {
  const [activeSection, setActiveSection] = useState(null);
  const [loading, setLoading] = useState(false);

  const [businessExists, setBusinessExists] = useState(false);
  const [alertExists, setAlertExists] = useState(false);

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

  // ---------------------------------------------------------
  // FETCH BUSINESS DETAILS & ALERT SETTINGS
  // ---------------------------------------------------------
  useEffect(() => {
    const fetchBusinessDetails = async () => {
      try {
        console.log("[API] GET business-profile");
        const res = await fetch(
          `${API_BASE_URL}/api/v1/settings/business-profile/`,
          {
            method: "GET",
            headers: {
              ...getAuthHeaders(),
            },
          }
        );

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
        } else if (res.status === 401) {
          const text = await res.text();
          console.error("❌ Unauthorized (business-profile):", text);
        } else {
          const text = await res.text();
          console.error(
            "❌ Failed to fetch business details. Status:",
            res.status,
            text
          );
        }
      } catch (error) {
        console.error("❌ Error fetching business:", error);
      }
    };

    const fetchAlertSettings = async () => {
      try {
        console.log("[API] GET alert-thresholds");
        const res = await fetch(
          `${API_BASE_URL}/api/v1/settings/alert-thresholds/`,
          {
            method: "GET",
            headers: {
              ...getAuthHeaders(),
            },
          }
        );

        if (res.ok) {
          const data = await res.json();
          setAlertExists(true);

          setAlertData({
            low_stock_threshold: data.low_stock_threshold || "",
            out_of_stock_alert: data.out_of_stock_alert || "No",
            critical_expiry_days: data.critical_expiry_days || "",
            warning_expiry_days: data.warning_expiry_days || "",
            check_frequency: data.check_frequency || "",
            auto_remove_expired: data.auto_remove_expired || "Manually only",
          });
        } else if (res.status === 401) {
          const text = await res.text();
          console.error("❌ Unauthorized (alert-thresholds):", text);
        } else {
          const text = await res.text();
          console.error(
            "❌ Failed to fetch alert settings. Status:",
            res.status,
            text
          );
        }
      } catch (error) {
        console.error("❌ Error fetching alert data:", error);
      }
    };

    fetchBusinessDetails();
    fetchAlertSettings();
  }, []);

  // ---------------------------------------------------------
  // FORM HANDLERS
  // ---------------------------------------------------------
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleAlertChange = (e) => {
    setAlertData({ ...alertData, [e.target.name]: e.target.value });
  };

  // ---------------------------------------------------------
  // SAVE BUSINESS DETAILS (POST or PUT)
  // ---------------------------------------------------------
  const handleSave = async () => {
    setLoading(true);
    try {
      const method = businessExists ? "PUT" : "POST";
      console.log("[API]", method, "business-profile");

      const response = await fetch(
        `${API_BASE_URL}/api/v1/settings/business-profile/`,
        {
          method,
          headers: {
            "Content-Type": "application/json",
            ...getAuthHeaders(),
          },
          body: JSON.stringify(formData),
        }
      );

      if (response.ok) {
        alert("✅ Business details saved successfully!");
        setBusinessExists(true);
      } else if (response.status === 401) {
        const text = await response.text();
        console.error("❌ Unauthorized (save business-profile):", text);
        alert("❌ Unauthorized. Please log in again.");
      } else {
        const text = await response.text();
        console.error(
          "❌ Failed to save business details. Status:",
          response.status,
          text
        );
        alert("❌ Failed to save business details");
      }
    } catch (err) {
      console.error("Error:", err);
      alert("❌ Failed to save business details");
    } finally {
      setLoading(false);
    }
  };

  // ---------------------------------------------------------
  // SAVE ALERT THRESHOLDS (POST or PUT)
  // ---------------------------------------------------------
  const handleAlertSave = async () => {
    setLoading(true);

    try {
      const method = alertExists ? "PUT" : "POST";
      console.log("[API]", method, "alert-thresholds");

      const response = await fetch(
        `${API_BASE_URL}/api/v1/settings/alert-thresholds/`,
        {
          method,
          headers: {
            "Content-Type": "application/json",
            ...getAuthHeaders(),
          },
          body: JSON.stringify(alertData),
        }
      );

      if (response.ok) {
        alert("✅ Alert thresholds saved!");
        setAlertExists(true);
      } else if (response.status === 401) {
        const text = await response.text();
        console.error("❌ Unauthorized (save alert-thresholds):", text);
        alert("❌ Unauthorized. Please log in again.");
      } else {
        const text = await response.text();
        console.error(
          "❌ Failed to save alert settings. Status:",
          response.status,
          text
        );
        alert("❌ Failed to save alert settings");
      }
    } catch (err) {
      console.error(err);
      alert("❌ Failed to save alert settings");
    } finally {
      setLoading(false);
    }
  };

  // ---------------------------------------------------------
  // UI
  // ---------------------------------------------------------
  return (
    <div className="settings-container">
      <h1 className="settings-title">Settings</h1>
      <h2 className="settings-heading">Manage application configuration</h2>

      <div className="settings-tab-container">
        {settingsSections.map((section) => (
          <div
            key={section.name}
            className={`settings-tab ${
              activeSection === section.name ? "active" : ""
            }`}
            onClick={() => setActiveSection(section.name)}
          >
            {section.icon}
            <span>{section.name}</span>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 40 }}>
        {activeSection === "Business Details" && (
          <div className="business-section">
            <h2>
              <Home size={28} /> Business Information
            </h2>

            <div className="business-form">
              {Object.entries(formData).map(([key, value]) => (
                <div className="form-row" key={key}>
                  <label>{key.replace(/_/g, " ").toUpperCase()}</label>

                  {key === "address" ? (
                    <textarea
                      name={key}
                      value={value}
                      onChange={handleChange}
                    />
                  ) : key === "registration_date" ? (
                    <input
                      type="date"
                      name={key}
                      value={value}
                      onChange={handleChange}
                    />
                  ) : (
                    <input
                      type="text"
                      name={key}
                      value={value}
                      onChange={handleChange}
                    />
                  )}
                </div>
              ))}

              <button
                className="save-btn"
                onClick={handleSave}
                disabled={loading}
              >
                {loading ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        )}

        {activeSection === "Alert Thresholds" && (
          <div className="alert-section">
            <h2>
              <AlertCircle size={28} /> Alert Configuration
            </h2>

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
                  <label>Check Frequency</label>
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
              </div>

              <button
                className="save-btn"
                onClick={handleAlertSave}
                disabled={loading}
              >
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
