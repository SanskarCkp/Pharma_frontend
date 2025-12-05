import React, { useState, useEffect } from "react";
import "./notifications.css";
import { authFetch } from "../../api/http"; // add this at the top


const API_BASE_URL = import.meta.env.VITE_API_URL;

const Notifications = () => {
  const [emailEnabled, setEmailEnabled] = useState(false);
  const [smsEnabled, setSmsEnabled] = useState(false);

  const [lowStock, setLowStock] = useState(false);
  const [expiry, setExpiry] = useState(false);
  const [dailyReports, setDailyReports] = useState(false);

  const [emailAddress, setEmailAddress] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");

  const [smtpServer, setSmtpServer] = useState("");
  const [port, setPort] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);

  // GET Notification Settings
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await authFetch(`${API_BASE_URL}/api/v1/settings/notifications/`);
        if (!res.ok) {
          console.warn("Settings not found");
          return;
        }

        const n = await res.json();

        setEmailEnabled(n.enable_email);
        setLowStock(n.low_stock_alerts);
        setExpiry(n.expiry_alerts);
        setDailyReports(n.daily_reports);
        setEmailAddress(n.notification_email || "");

        setSmsEnabled(n.enable_sms);
        setPhoneNumber(n.sms_phone || "");

        setSmtpServer(n.smtp_host || "");
        setPort(n.smtp_port || "");
        setUsername(n.smtp_username || "");
        setPassword(n.smtp_password || "");
      } catch (error) {
        console.error("Error fetching settings:", error);
      }
    };

    fetchSettings();
  }, []);

  // PUT - Save settings
  const handleSave = async () => {
    setLoading(true);

    const settingsData = {
      enable_email: emailEnabled,
      low_stock_alerts: lowStock,
      expiry_alerts: expiry,
      daily_reports: dailyReports,
      notification_email: emailAddress,

      enable_sms: smsEnabled,
      sms_phone: phoneNumber,

      smtp_host: smtpServer,
      smtp_port: port,
      smtp_username: username,
      smtp_password: password,
    };

    try {
      const res = await authFetch(`${API_BASE_URL}/api/v1/settings/notifications/`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settingsData),
      });

      if (!res.ok) throw new Error("Failed to save");

      alert("✅ Notification settings saved!");

    } catch (error) {
      console.error("Save error:", error);
      alert("❌ Failed to save settings");
    } finally {
      setLoading(false);
    }
  };

  // POST - SMTP test
  const handleTestConnection = async () => {
    try {
      const res = await authFetch(`${API_BASE_URL}/api/v1/settings/notifications/test/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          smtp_host: smtpServer,
          smtp_port: port,
          smtp_username: username,
          smtp_password: password,
        }),
      });

      const data = await res.json();
      alert("SMTP Test: " + (data.message || "Success"));
    } catch (error) {
      alert("❌ SMTP test failed");
    }
  };

  return (
    <div className="tax-section notifications-container">
      <h2 style={{ marginBottom: "16px" }}>Notification Preferences</h2>

      {/* EMAIL */}
      <div className="tax-card">
        <h3>Email Notifications</h3>

        <div className="payment-row">
          <label>Enable Email Notifications</label>
          <label className="switch">
            <input
              type="checkbox"
              checked={emailEnabled}
              onChange={() => setEmailEnabled(!emailEnabled)}
            />
            <span className="slider"></span>
          </label>
        </div>

        {emailEnabled && (
          <>
            <div className="payment-row">
              <label>Low Stock Alerts</label>
              <label className="switch">
                <input
                  type="checkbox"
                  checked={lowStock}
                  onChange={() => setLowStock(!lowStock)}
                />
                <span className="slider"></span>
              </label>
            </div>

            <div className="payment-row">
              <label>Expiry Alerts</label>
              <label className="switch">
                <input
                  type="checkbox"
                  checked={expiry}
                  onChange={() => setExpiry(!expiry)}
                />
                <span className="slider"></span>
              </label>
            </div>

            <div className="payment-row">
              <label>Daily Reports</label>
              <label className="switch">
                <input
                  type="checkbox"
                  checked={dailyReports}
                  onChange={() => setDailyReports(!dailyReports)}
                />
                <span className="slider"></span>
              </label>
            </div>

            <div className="alert-field">
              <label>Email Address</label>
              <input
                type="email"
                placeholder="Enter email"
                value={emailAddress}
                onChange={(e) => setEmailAddress(e.target.value)}
              />
            </div>
          </>
        )}
      </div>

      {/* SMS */}
      <div className="tax-card">
        <h3>SMS Notifications</h3>

        <div className="payment-row">
          <label>Enable SMS Notifications</label>
          <label className="switch">
            <input
              type="checkbox"
              checked={smsEnabled}
              onChange={() => setSmsEnabled(!smsEnabled)}
            />
            <span className="slider"></span>
          </label>
        </div>

        {smsEnabled && (
          <div className="alert-field">
            <label>Phone Number</label>
            <input
              type="tel"
              placeholder="Enter phone number"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
            />
          </div>
        )}
      </div>

      {/* SMTP */}
      <div className="tax-card">
        <h3>SMTP Settings</h3>

        <div className="alert-row-horizontal">
          <div className="alert-field">
            <label>SMTP Server</label>
            <input
              type="text"
              value={smtpServer}
              onChange={(e) => setSmtpServer(e.target.value)}
            />
          </div>

          <div className="alert-field">
            <label>Port</label>
            <input
              type="number"
              value={port}
              onChange={(e) => setPort(e.target.value)}
            />
          </div>
        </div>

        <div className="alert-row-horizontal">
          <div className="alert-field">
            <label>Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>

          <div className="alert-field">
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
        </div>

        <button className="save-btn" onClick={handleTestConnection}>
          Test Connection
        </button>
      </div>

      <button className="save-btn" onClick={handleSave} disabled={loading}>
        {loading ? "Saving..." : "Save Notifications"}
      </button>
    </div>
  );
};

export default Notifications;
