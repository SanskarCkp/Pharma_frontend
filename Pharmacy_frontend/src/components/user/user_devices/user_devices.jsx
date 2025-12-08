import React, { useEffect, useState } from "react";
import "./user_devices.css";
import { useAlert } from "../../ui/alert-provider";

const API_URL = "http://127.0.0.1:8000/api/user-devices/"; // adjust to your backend route

const UserDevices = () => {
  const { showAlert } = useAlert();
  const [devices, setDevices] = useState([]);
  const [formData, setFormData] = useState({
    user_id: "",
    device_id: "",
    user_agent: "",
    ip_address: "",
    is_active: false,
    issued_at: "",
    last_seen_at: "",
  });
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchDevices = async () => {
    try {
      setLoading(true);
      const res = await fetch(API_URL);
      if (!res.ok) throw new Error("Failed to fetch devices");
      const data = await res.json();
      setDevices(data);
    } catch (err) {
      console.error("Error fetching devices:", err);
      showAlert("Failed to load user device data. Please check your backend API.", "Error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDevices();
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const toDatetimeLocal = (iso) => {
    if (!iso) return "";
    const d = new Date(iso);
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
      d.getHours()
    )}:${pad(d.getMinutes())}`;
  };

  const toISOIfNeeded = (val) => (val ? new Date(val).toISOString() : "");

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        issued_at: toISOIfNeeded(formData.issued_at),
        last_seen_at: toISOIfNeeded(formData.last_seen_at),
      };

      const method = editingId ? "PUT" : "POST";
      const url = editingId ? `${API_URL}${editingId}/` : API_URL;

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed to save user device");

      setFormData({
        user_id: "",
        device_id: "",
        user_agent: "",
        ip_address: "",
        is_active: false,
        issued_at: "",
        last_seen_at: "",
      });
      setEditingId(null);
      fetchDevices();
      showAlert(editingId ? "Device updated successfully!" : "Device added successfully!", "Success");
    } catch (err) {
      console.error("Error saving device:", err);
      showAlert("Failed to save device. Please try again.", "Error");
    }
  };

  const handleEdit = (device) => {
    setFormData({
      user_id: device.user_id ?? "",
      device_id: device.device_id ?? "",
      user_agent: device.user_agent ?? "",
      ip_address: device.ip_address ?? "",
      is_active: !!device.is_active,
      issued_at: toDatetimeLocal(device.issued_at),
      last_seen_at: toDatetimeLocal(device.last_seen_at),
    });
    setEditingId(device.id);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this user device?")) return;
    try {
      const res = await fetch(`${API_URL}${id}/`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete device");
      fetchDevices();
      showAlert("Device deleted successfully!", "Success");
    } catch (err) {
      console.error("Error deleting device:", err);
      showAlert("Failed to delete device.", "Error");
    }
  };

  return (
    <div className="user-devices-container">
      <h2>User Devices</h2>

      {/* ⬇️ Form layout/styles now mirror Inventory Ledger exactly */}
      <form className="user-devices-form" onSubmit={handleSubmit}>
        <input
          type="text"
          name="user_id"
          placeholder="User ID"
          value={formData.user_id}
          onChange={handleChange}
          required
        />
        <input
          type="text"
          name="device_id"
          placeholder="Device ID"
          value={formData.device_id}
          onChange={handleChange}
          required
        />
        <input
          type="text"
          name="user_agent"
          placeholder="User Agent"
          value={formData.user_agent}
          onChange={handleChange}
        />
        <input
          type="text"
          name="ip_address"
          placeholder="IP Address"
          value={formData.ip_address}
          onChange={handleChange}
        />

        <label>
          Issued At
          <input
            type="datetime-local"
            name="issued_at"
            value={formData.issued_at}
            onChange={handleChange}
          />
        </label>
        <label>
          Last Seen At
          <input
            type="datetime-local"
            name="last_seen_at"
            value={formData.last_seen_at}
            onChange={handleChange}
          />
        </label>

        {/* Active checkbox styled as a form control, just above the button */}
        <label className="checkbox-inline">
          <input
            type="checkbox"
            name="is_active"
            checked={formData.is_active}
            onChange={handleChange}
          />
          Active
        </label>

        <button type="submit">
          {editingId ? "Update Device" : "Add Device"}
        </button>
      </form>

      <h3 className="user-devices-list-title">
        {loading ? "Loading Devices..." : "Device List"}
      </h3>

      <table className="user-devices-table">
        <thead>
          <tr>
            <th>#</th>
            <th>ID</th>
            <th>User ID</th>
            <th>Device ID</th>
            <th>User Agent</th>
            <th>IP Address</th>
            <th>Active</th>
            <th>Issued At</th>
            <th>Last Seen At</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {devices.length > 0 ? (
            devices.map((d, idx) => (
              <tr key={d.id}>
                <td>{idx + 1}</td>
                <td>{d.id}</td>
                <td>{d.user_id}</td>
                <td>{d.device_id}</td>
                <td title={d.user_agent}>{d.user_agent}</td>
                <td>{d.ip_address}</td>
                <td>{d.is_active ? "Yes" : "No"}</td>
                <td>{d.issued_at ? new Date(d.issued_at).toLocaleString() : ""}</td>
                <td>{d.last_seen_at ? new Date(d.last_seen_at).toLocaleString() : ""}</td>
                <td>
                  <button className="edit-btn" onClick={() => handleEdit(d)}>Edit</button>
                  <button className="delete-btn" onClick={() => handleDelete(d.id)}>Delete</button>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="10" style={{ textAlign: "center" }}>
                No user devices found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default UserDevices;
