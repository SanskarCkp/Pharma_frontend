import React, { useState, useEffect } from "react";
import { Home, AlertCircle, CreditCard, Database, Bell } from "lucide-react";
import "./settingsdashboard.css";
import TaxBillingConfiguration from "./TaxBillingConfiguration";
import Notifications from "./Notifications";
import BackupRestore from "./BackupRestore";

const API_BASE_URL = import.meta.env.VITE_API_URL;

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

  const [businessData, setBusinessData] = useState({
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
    out_of_stock_alert: "",
    critical_expiry_days: "",
    warning_expiry_days: "",
    check_frequency: "",
    auto_remove_expired: "",
  });

  const [taxData, setTaxData] = useState({
    gst_rate: "",
    tax_method: "",
    cgst_rate: "",
    sgst_rate: "",
    invoice_prefix: "",
    invoice_start: "",
    invoice_template: "",
    invoice_footer: "",
    cash_payment: false,
    card_payment: false,
    upi_payment: false,
    credit_sales: false,
  });

  const [backupData, setBackupData] = useState({
    backup_type: "",
    last_backup_at: "",
    last_backup_size: "",
    last_backup_status: "",
    auto_backup_enabled: false,
    frequency: "",
    backup_time: "",
    restore_file_name: "",
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

  // -------------------------------------------------------
  // SAVE BUSINESS INFO
  // -------------------------------------------------------
  const handleSave = async () => {
    setLoading(true);
    try {
      const method = businessExists ? "PUT" : "POST";

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
        alert("Business details saved!");
        setBusinessExists(true);
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
      setSavingSection(null);
    }
  };

  // -------------------------------------------------------
  // SAVE ALERT SETTINGS → /settings/app/save (correct)
  // -------------------------------------------------------
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
        {tabs.map((section) => (
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
              {Object.entries(businessData).map(([key, value]) => (
                <div className="form-row" key={key}>
                  <label>{key.replace(/_/g, " ").toUpperCase()}</label>
                  {key === "address" ? (
                    <textarea name={key} value={value} onChange={handleChange} />
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
                    value={alertData.low_stock_threshold || ""}
                    onChange={handleAlertChange}
                  />
                </div>

                <div className="alert-field">
                  <label>Out of Stock Alert</label>
                  <select
                    name="out_of_stock_alert"
                    value={alertData.out_of_stock_alert || ""}
                    onChange={handleAlertChange}
                  >
                    <option value="">Select</option>
                    <option value="Yes">Yes</option>
                    <option value="No">No</option>
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
                    value={alertData.critical_expiry_days || ""}
                    onChange={handleAlertChange}
                  />
                </div>

                <div className="alert-field">
                  <label>Warning Expiry Days</label>
                  <input
                    type="number"
                    name="warning_expiry_days"
                    value={alertData.warning_expiry_days || ""}
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
                    value={alertData.check_frequency || ""}
                    onChange={handleAlertChange}
                  />
                </div>

                <div className="alert-field">
                  <label>Auto Remove Expired</label>
                  <select
                    name="auto_remove_expired"
                    value={alertData.auto_remove_expired || ""}
                    onChange={handleAlertChange}
                  >
                    <option value="">Select</option>
                    <option value="Manually only">Manually only</option>
                    <option value="Automatically">Automatically</option>
                  </select>
                </div>
              </div> */}

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

        {activeSection === "Tax & Billing" && (
          <TaxBillingConfiguration
            data={taxData}
            onFieldChange={updateTaxField}
            onTogglePayment={updateTaxField}
            onSave={() => saveSection("tax_billing")}
            saving={savingSection === "tax_billing"}
          />
        )}

        {activeSection === "Backup & Restore" && (
          <BackupRestore
            data={backupData}
            onFieldChange={updateBackupField}
            onSave={() => saveSection("backup_restore")}
            saving={savingSection === "backup_restore"}
          />
        )}

        {activeSection === "Notifications" && (
          <Notifications
            data={notificationData}
            onFieldChange={updateNotificationField}
            onToggle={updateNotificationField}
            onSave={() => saveSection("notifications")}
            onTest={handleNotificationTest}
            saving={savingSection === "notifications"}
          />
        )}
      </div>
    </div>
  );
};

export default SettingsDashboard;
