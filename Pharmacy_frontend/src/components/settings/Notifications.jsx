import React, { useEffect, useState } from "react";
import "./notifications.css";
import { authFetch } from "../../api/http";
import { apiUrl } from "../../api/base";

const NOTIFICATIONS_URL = apiUrl("settings/notifications/");
const TEST_URL = apiUrl("settings/notifications/test/");

export default function Notifications() {
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // -------------------------
  // GET SETTINGS (on load)
  // -------------------------
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const res = await authFetch(NOTIFICATIONS_URL);
      if (res.ok) {
        const json = await res.json();
        setData(json || {});
      }
    } catch (err) {
      console.error("Fetch Error:", err);
    } finally {
      setLoading(false);
    }
  };

  // -------------------------
  // FIELD HANDLERS
  // -------------------------
  const onFieldChange = (name, value) => {
    setData((prev) => ({ ...prev, [name]: value }));
  };

  const onToggle = (key, value) => {
    setData((prev) => ({ ...prev, [key]: value }));
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    onFieldChange(name, value);
  };

  const toggle = (key) => {
    onToggle(key, !Boolean(data?.[key]));
  };

  // -------------------------
  // SAVE NOTIFICATIONS
  // -------------------------
  const onSave = async () => {
    setSaving(true);

    try {
      const method = data?.id ? "PUT" : "POST";
      const url = data?.id ? `${NOTIFICATIONS_URL}${data.id}/` : NOTIFICATIONS_URL;

      const res = await authFetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (res.ok) {
        alert("Saved successfully!");
        fetchData();
      } else {
        alert("Save failed.");
      }
    } catch (err) {
      console.error("Save Error:", err);
    } finally {
      setSaving(false);
    }
  };

  // -------------------------
  // TEST SMTP CONNECTION
  // -------------------------
  const onTest = async () => {
    try {
      const res = await authFetch(TEST_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const json = await res.json();
      alert(json.message || "Test completed");
    } catch (err) {
      console.error("Test Error:", err);
    }
  };

  if (loading) return <p>Loading...</p>;

  return (
    <div className="tax-section notifications-container">
      <h2 style={{ marginBottom: "16px" }}>Notification Preferences</h2>

      {/* EMAIL NOTIFICATIONS */}
      <div className="tax-card">
        <h3>Email Notifications</h3>

        <div className="payment-row">
          <label>Enable Email Notifications</label>
          <label className="switch">
            <input
              type="checkbox"
              checked={Boolean(data.enable_email)}
              onChange={() => toggle("enable_email")}
            />
            <span className="slider"></span>
          </label>
        </div>

        {data.enable_email && (
          <>
            <div className="payment-row">
              <label>Low Stock Alerts</label>
              <label className="switch">
                <input
                  type="checkbox"
                  checked={Boolean(data.low_stock_alerts)}
                  onChange={() => toggle("low_stock_alerts")}
                />
                <span className="slider"></span>
              </label>
            </div>

            <div className="payment-row">
              <label>Expiry Alerts</label>
              <label className="switch">
                <input
                  type="checkbox"
                  checked={Boolean(data.expiry_alerts)}
                  onChange={() => toggle("expiry_alerts")}
                />
                <span className="slider"></span>
              </label>
            </div>

            <div className="payment-row">
              <label>Daily Reports</label>
              <label className="switch">
                <input
                  type="checkbox"
                  checked={Boolean(data.daily_reports)}
                  onChange={() => toggle("daily_reports")}
                />
                <span className="slider"></span>
              </label>
            </div>

            <div className="alert-field">
              <label>Email Address</label>
              <input
                type="email"
                name="notification_email"
                value={data.notification_email || ""}
                onChange={handleChange}
              />
            </div>
          </>
        )}
      </div>

      {/* SMS NOTIFICATIONS */}
      <div className="tax-card">
        <h3>SMS Notifications</h3>

        <div className="payment-row">
          <label>Enable SMS Notifications</label>
          <label className="switch">
            <input
              type="checkbox"
              checked={Boolean(data.enable_sms)}
              onChange={() => toggle("enable_sms")}
            />
            <span className="slider"></span>
          </label>
        </div>

        {data.enable_sms && (
          <div className="alert-field">
            <label>Phone Number</label>
            <input
              type="tel"
              name="sms_phone"
              value={data.sms_phone || ""}
              onChange={handleChange}
            />
          </div>
        )}
      </div>

      {/* SMTP SETTINGS */}
      <div className="tax-card">
        <h3>SMTP Settings</h3>

        <div className="alert-row-horizontal">
          <div className="alert-field">
            <label>SMTP Server</label>
            <input
              type="text"
              name="smtp_host"
              value={data.smtp_host || ""}
              onChange={handleChange}
            />
          </div>

          <div className="alert-field">
            <label>Port</label>
            <input
              type="number"
              name="smtp_port"
              value={data.smtp_port || ""}
              onChange={handleChange}
            />
          </div>
        </div>

        <div className="alert-row-horizontal">
          <div className="alert-field">
            <label>Username</label>
            <input
              type="text"
              name="smtp_username"
              value={data.smtp_username || ""}
              onChange={handleChange}
            />
          </div>

          <div className="alert-field">
            <label>Password</label>
            <input
              type="password"
              name="smtp_password"
              value={data.smtp_password || ""}
              onChange={handleChange}
            />
          </div>
        </div>

        <button className="save-btn" type="button" onClick={onTest}>
          Test Connection
        </button>
      </div>

      {/* MAIN SAVE */}
      <button className="save-btn" onClick={onSave} disabled={saving}>
        {saving ? "Saving..." : "Save Notifications"}
      </button>
    </div>
  );
}