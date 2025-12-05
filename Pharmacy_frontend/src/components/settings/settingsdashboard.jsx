import React, { useEffect, useState } from "react";
import { Home, AlertCircle, CreditCard, Database, Bell } from "lucide-react";
import "./settingsdashboard.css";
import TaxBillingConfiguration from "./TaxBillingConfiguration";
import Notifications from "./Notifications";
import BackupRestore from "./BackupRestore";
import { authFetch } from "../../api/http";
import { apiUrl } from "../../api/base";

const SETTINGS_GROUP = apiUrl("settings/app/");
const SETTINGS_SAVE = apiUrl("settings/app/save");
const BUSINESS_PROFILE_URL = apiUrl("settings/business-profile/");
const NOTIFICATION_TEST_URL = apiUrl("settings/notifications/test/");

const SettingsDashboard = () => {
  const [activeSection, setActiveSection] = useState("Business Details");
  const [savingSection, setSavingSection] = useState(null);

  const tabs = [
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

  const [notificationData, setNotificationData] = useState({
    enable_email: false,
    low_stock_alerts: false,
    expiry_alerts: false,
    daily_reports: false,
    notification_email: "",
    enable_sms: false,
    sms_phone: "",
    smtp_host: "",
    smtp_port: "",
    smtp_username: "",
    smtp_password: "",
  });

  const toBool = (val) => {
    if (typeof val === "boolean") return val;
    if (typeof val === "string") return ["true", "1", "yes", "on"].includes(val.toLowerCase());
    return false;
  };

  const fetchGroupSettings = async () => {
    try {
      const res = await authFetch(SETTINGS_GROUP);
      if (!res.ok) throw new Error("Failed to load grouped settings");
      const payload = await res.json();

      const alerts = payload.alerts || {};
      setAlertData({
        low_stock_threshold: alerts.ALERT_LOW_STOCK_DEFAULT || "",
        out_of_stock_alert: alerts.OUT_OF_STOCK_ACTION || "",
        critical_expiry_days: alerts.ALERT_EXPIRY_CRITICAL_DAYS || "",
        warning_expiry_days: alerts.ALERT_EXPIRY_WARNING_DAYS || "",
        check_frequency: alerts.ALERT_CHECK_FREQUENCY || "",
        auto_remove_expired: alerts.AUTO_REMOVE_EXPIRED || "",
      });

      const tax = payload.tax || {};
      const invoice = payload.invoice || {};
      setTaxData((prev) => ({
        ...prev,
        gst_rate: tax.TAX_GST_RATE || "",
        tax_method: tax.TAX_CALC_METHOD || "",
        cgst_rate: tax.TAX_CGST_RATE || "",
        sgst_rate: tax.TAX_SGST_RATE || "",
        invoice_prefix: invoice.INVOICE_PREFIX || "",
        invoice_start: invoice.INVOICE_START || "",
        invoice_template: invoice.INVOICE_TEMPLATE || "",
        invoice_footer: invoice.INVOICE_FOOTER || "",
      }));

      const backups = payload.backups || {};
      setBackupData((prev) => ({
        ...prev,
        auto_backup_enabled: toBool(backups.AUTO_BACKUP_ENABLED),
        frequency: backups.AUTO_BACKUP_FREQUENCY || "",
        backup_time: backups.AUTO_BACKUP_TIME || "",
      }));

      const notify = payload.notifications || {};
      setNotificationData((prev) => ({
        ...prev,
        enable_email: toBool(notify.NOTIFY_EMAIL_ENABLED),
        low_stock_alerts: toBool(notify.NOTIFY_LOW_STOCK),
        expiry_alerts: toBool(notify.NOTIFY_EXPIRY),
        daily_reports: toBool(notify.NOTIFY_DAILY_REPORT),
        notification_email: notify.NOTIFY_EMAIL || "",
        enable_sms: toBool(notify.NOTIFY_SMS_ENABLED),
        sms_phone: notify.NOTIFY_SMS_PHONE || "",
        smtp_host: notify.SMTP_HOST || "",
        smtp_port: notify.SMTP_PORT || "",
        smtp_username: notify.SMTP_USER || "",
        smtp_password: notify.SMTP_PASSWORD || "",
      }));
    } catch (err) {
      console.error(err);
    }
  };

  const fetchBusinessProfile = async () => {
    try {
      const res = await authFetch(BUSINESS_PROFILE_URL);
      if (!res.ok) throw new Error("Failed to load business profile");
      const data = await res.json();
      setBusinessData((prev) => ({ ...prev, ...data }));
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchBusinessProfile();
    fetchGroupSettings();
  }, []);

  const saveBusinessProfile = async () => {
    setSavingSection("business_profile");
    try {
      const res = await authFetch(BUSINESS_PROFILE_URL, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(businessData),
      });
      if (!res.ok) throw new Error("Save failed");
      alert("Business details saved");
      fetchBusinessProfile();
    } catch (err) {
      console.error(err);
      alert("Failed to save business details");
    } finally {
      setSavingSection(null);
    }
  };

  const saveSection = async (key) => {
    setSavingSection(key);
    let payload = {};
    if (key === "alert_thresholds") {
      payload.alerts = {
        ALERT_LOW_STOCK_DEFAULT: alertData.low_stock_threshold,
        OUT_OF_STOCK_ACTION: alertData.out_of_stock_alert,
        ALERT_EXPIRY_CRITICAL_DAYS: alertData.critical_expiry_days,
        ALERT_EXPIRY_WARNING_DAYS: alertData.warning_expiry_days,
        ALERT_CHECK_FREQUENCY: alertData.check_frequency,
        AUTO_REMOVE_EXPIRED: alertData.auto_remove_expired,
      };
    } else if (key === "tax_billing") {
      payload = {
        tax: {
          TAX_GST_RATE: taxData.gst_rate,
          TAX_CALC_METHOD: taxData.tax_method,
          TAX_CGST_RATE: taxData.cgst_rate,
          TAX_SGST_RATE: taxData.sgst_rate,
        },
        invoice: {
          INVOICE_PREFIX: taxData.invoice_prefix,
          INVOICE_START: taxData.invoice_start,
          INVOICE_TEMPLATE: taxData.invoice_template,
          INVOICE_FOOTER: taxData.invoice_footer,
        },
      };
    } else if (key === "backup_restore") {
      payload.backups = {
        AUTO_BACKUP_ENABLED: backupData.auto_backup_enabled,
        AUTO_BACKUP_FREQUENCY: backupData.frequency,
        AUTO_BACKUP_TIME: backupData.backup_time,
      };
    } else if (key === "notifications") {
      payload.notifications = {
        NOTIFY_EMAIL_ENABLED: notificationData.enable_email,
        NOTIFY_LOW_STOCK: notificationData.low_stock_alerts,
        NOTIFY_EXPIRY: notificationData.expiry_alerts,
        NOTIFY_DAILY_REPORT: notificationData.daily_reports,
        NOTIFY_EMAIL: notificationData.notification_email,
        NOTIFY_SMS_ENABLED: notificationData.enable_sms,
        NOTIFY_SMS_PHONE: notificationData.sms_phone,
        SMTP_HOST: notificationData.smtp_host,
        SMTP_PORT: notificationData.smtp_port,
        SMTP_USER: notificationData.smtp_username,
        SMTP_PASSWORD: notificationData.smtp_password,
      };
    }

    try {
      const res = await authFetch(SETTINGS_SAVE, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Save failed");
      alert("Settings saved");
      fetchGroupSettings();
    } catch (err) {
      console.error(err);
      alert("Failed to save settings");
    } finally {
      setSavingSection(null);
    }
  };

  const handleBusinessChange = (e) => {
    const { name, value } = e.target;
    setBusinessData((prev) => ({ ...prev, [name]: value }));
  };

  const handleAlertChange = (e) => {
    const { name, value } = e.target;
    setAlertData((prev) => ({ ...prev, [name]: value }));
  };

  const updateTaxField = (name, value) => {
    setTaxData((prev) => ({ ...prev, [name]: value }));
  };

  const updateNotificationField = (name, value) => {
    setNotificationData((prev) => ({ ...prev, [name]: value }));
  };

  const updateBackupField = (name, value) => {
    setBackupData((prev) => ({ ...prev, [name]: value }));
  };

  const handleNotificationTest = async () => {
    try {
      const res = await authFetch(NOTIFICATION_TEST_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          smtp_host: notificationData.smtp_host,
          smtp_port: notificationData.smtp_port,
          smtp_username: notificationData.smtp_username,
          smtp_password: notificationData.smtp_password,
        }),
      });
      const response = await res.json().catch(() => ({}));
      alert(response.message || (res.ok ? "SMTP test succeeded" : "SMTP test failed"));
    } catch (err) {
      console.error(err);
      alert("SMTP test failed");
    }
  };

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
        {activeSection === "Business Details" && (
          <div className="business-section">
            <h2>
              <Home size={28} /> Business Information
            </h2>

            <div className="business-form">
              {Object.entries(businessData).map(([key, value]) => (
                <div className="form-row" key={key}>
                  <label>{key.replace(/_/g, " ").toUpperCase()}</label>
                  {key === "address" ? (
                    <textarea name={key} value={value || ""} onChange={handleBusinessChange} />
                  ) : key === "registration_date" ? (
                    <input type="date" name={key} value={value || ""} onChange={handleBusinessChange} />
                  ) : (
                    <input type="text" name={key} value={value || ""} onChange={handleBusinessChange} />
                  )}
                </div>
              ))}

              <button className="save-btn" onClick={saveBusinessProfile} disabled={savingSection === "business_profile"}>
                {savingSection === "business_profile" ? "Saving..." : "Save"}
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
                  <label>Check Frequency</label>
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
              </div>

              <button className="save-btn" onClick={() => saveSection("alert_thresholds")} disabled={savingSection === "alert_thresholds"}>
                {savingSection === "alert_thresholds" ? "Saving..." : "Save"}
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
