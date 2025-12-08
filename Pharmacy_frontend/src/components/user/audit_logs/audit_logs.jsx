import React, { useEffect, useState } from "react";
import "./audit_logs.css";
import { useAlert } from "../../ui/alert-provider";

// Toggle this to true if you want data to persist between refreshes
const USE_LOCAL_STORAGE = false;
const LS_KEY = "dummy_audit_logs";

const AuditLogs = () => {
  const { showAlert } = useAlert();
  const [logs, setLogs] = useState([]);
  const [formData, setFormData] = useState({
    id: "",
    actor_user_id: "",
    action: "",
    table_name: "",
    record_id: "",
    before_json: "",
    after_json: "",
    ip: "",
    user_agent: "",
    created_at: "",
  });
  const [editingId, setEditingId] = useState(null);
  const [loading] = useState(false);
  const [error] = useState("");

  // ---- initialize logs (from localStorage only) ----
  useEffect(() => {
    if (USE_LOCAL_STORAGE) {
      try {
        const raw = localStorage.getItem(LS_KEY);
        if (raw) {
          setLogs(JSON.parse(raw));
          return;
        }
      } catch (err) {
        console.error("Error loading logs from localStorage:", err);
      }
    }
    // Start with empty logs
    setLogs([]);
  }, []);

  const saveIfNeeded = (next) => {
    setLogs(next);
    if (USE_LOCAL_STORAGE) {
      try {
        localStorage.setItem(LS_KEY, JSON.stringify(next));
      } catch (err) {
        console.error("Error saving logs:", err);
      }
    }
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

  const toSafeString = (val) => {
    if (val === null || val === undefined) return "";
    if (typeof val === "string") return val;
    try {
      return JSON.stringify(val);
    } catch {
      return String(val);
    }
  };

  const preview = (val, len = 30) => {
    const text = toSafeString(val);
    return text.length > len ? `${text.slice(0, len)}...` : text;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const resetForm = () => {
    setFormData({
      id: "",
      actor_user_id: "",
      action: "",
      table_name: "",
      record_id: "",
      before_json: "",
      after_json: "",
      ip: "",
      user_agent: "",
      created_at: "",
    });
    setEditingId(null);
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const obj = {
      ...formData,
      id: editingId ? editingId : Math.max(0, ...logs.map((l) => Number(l.id) || 0)) + 1,
      created_at: toISOIfNeeded(formData.created_at) || new Date().toISOString(),
    };

    if (editingId) {
      const next = logs.map((l) => (l.id === editingId ? obj : l));
      saveIfNeeded(next);
      showAlert("Audit log updated successfully!", "Success");
    } else {
      const next = [obj, ...logs];
      saveIfNeeded(next);
      showAlert("Audit log created successfully!", "Success");
    }
    resetForm();
  };

  const handleEdit = (log) => {
    setFormData({
      id: log.id ?? "",
      actor_user_id: log.actor_user_id ?? "",
      action: log.action ?? "",
      table_name: log.table_name ?? "",
      record_id: log.record_id ?? "",
      before_json: toSafeString(log.before_json),
      after_json: toSafeString(log.after_json),
      ip: log.ip ?? "",
      user_agent: log.user_agent ?? "",
      created_at: toDatetimeLocal(log.created_at),
    });
    setEditingId(log.id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = (id) => {
    if (!window.confirm("Delete this audit log?")) return;
    const next = logs.filter((l) => l.id !== id);
    saveIfNeeded(next);
    showAlert("Audit log deleted successfully!", "Success");
  };

  return (
    <div className="audit-logs-container">
      <h2>Audit Logs</h2>

      <form className="audit-logs-form" onSubmit={handleSubmit}>
        <input
          type="text"
          name="id"
          placeholder="ID"
          value={formData.id}
          onChange={handleChange}
          disabled={!editingId}
        />
        <input
          type="text"
          name="actor_user_id"
          placeholder="Actor User ID"
          value={formData.actor_user_id}
          onChange={handleChange}
          required
        />
        <input
          type="text"
          name="action"
          placeholder="Action"
          value={formData.action}
          onChange={handleChange}
          required
        />
        <input
          type="text"
          name="table_name"
          placeholder="Table Name"
          value={formData.table_name}
          onChange={handleChange}
        />
        <input
          type="text"
          name="record_id"
          placeholder="Record ID"
          value={formData.record_id}
          onChange={handleChange}
        />
        <textarea
          name="before_json"
          placeholder="Before JSON"
          value={formData.before_json}
          onChange={handleChange}
          rows="3"
        />
        <textarea
          name="after_json"
          placeholder="After JSON"
          value={formData.after_json}
          onChange={handleChange}
          rows="3"
        />
        <input
          type="text"
          name="ip"
          placeholder="IP Address"
          value={formData.ip}
          onChange={handleChange}
        />
        <input
          type="text"
          name="user_agent"
          placeholder="User Agent"
          value={formData.user_agent}
          onChange={handleChange}
        />
        <label>
          Created At
          <input
            type="datetime-local"
            name="created_at"
            value={formData.created_at}
            onChange={handleChange}
          />
        </label>

        <button type="submit">{editingId ? "Update Log" : "Add Log"}</button>
      </form>

      <h3 className="audit-logs-list-title">
        {loading ? "Loading..." : error || "Audit Log Entries"}
      </h3>

      <table className="audit-logs-table">
        <thead>
          <tr>
            <th>#</th>
            <th>ID</th>
            <th>Actor User</th>
            <th>Action</th>
            <th>Table</th>
            <th>Record ID</th>
            <th>Before JSON</th>
            <th>After JSON</th>
            <th>IP</th>
            <th>User Agent</th>
            <th>Created At</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {logs.length > 0 ? (
            logs.map((log, idx) => {
              const beforeFull = toSafeString(log.before_json);
              const afterFull = toSafeString(log.after_json);
              return (
                <tr key={log.id || idx}>
                  <td>{idx + 1}</td>
                  <td>{log.id}</td>
                  <td>{log.actor_user_id}</td>
                  <td>{log.action}</td>
                  <td>{log.table_name}</td>
                  <td>{log.record_id}</td>
                  <td title={beforeFull}>{preview(log.before_json)}</td>
                  <td title={afterFull}>{preview(log.after_json)}</td>
                  <td>{log.ip}</td>
                  <td title={log.user_agent}>{preview(log.user_agent, 25)}</td>
                  <td>{log.created_at ? new Date(log.created_at).toLocaleString() : ""}</td>
                  <td>
                    <button className="edit-btn" onClick={() => handleEdit(log)}>
                      Edit
                    </button>
                    <button className="delete-btn" onClick={() => handleDelete(log.id)}>
                      Delete
                    </button>
                  </td>
                </tr>
              );
            })
          ) : (
            <tr>
              <td colSpan="12" style={{ textAlign: "center", padding: "10px" }}>
                No audit logs found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default AuditLogs;
