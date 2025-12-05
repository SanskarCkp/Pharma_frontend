import React from "react";
import { Upload, ArrowUpCircle, Clock } from "lucide-react";
import "./backuprestore.css";

export default function BackupRestore({
  data,
  onFieldChange,
  onSave,
  saving,
}) {
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    onFieldChange(name, type === "checkbox" ? checked : value);
  };

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];
    if (file) {
      onFieldChange("restore_file_name", file.name);
    }
  };

  return (
    <div className="backup-restore-container">
      <h2 style={{ marginBottom: "16px" }}>Backup & Restore</h2>

      <div className="top-backup-row">
        <div className="tax-card backup-card">
          <div className="card-header import-header">
            <Upload className="import-icon" size={20} title="Import Backup" />
            <h3>Backup Data</h3>
          </div>
          <p>Create a backup of your pharmacy data</p>

          <div className="alert-row-horizontal">
            <div className="alert-field">
              <label>Backup Type</label>
              <select name="backup_type" value={data.backup_type || ""} onChange={handleChange}>
                <option value="">Select</option>
                <option value="full">Full Backup (All Data)</option>
                <option value="inventory">Inventory Only</option>
                <option value="customers">Customers Only</option>
                <option value="transactions">Transactions Only</option>
              </select>
            </div>
            <div className="alert-field">
              <label>Last Backup</label>
              <input type="text" value={data.last_backup_at || ""} disabled />
            </div>
          </div>

          <div className="alert-row-horizontal">
            <div className="alert-field">
              <label>Backup Size</label>
              <input type="text" value={data.last_backup_size || ""} disabled />
            </div>
            <div className="alert-field">
              <label>Status</label>
              <input type="text" value={data.last_backup_status || ""} disabled />
            </div>
          </div>

          <div className="save-btn-container">
            <button className="save-btn" type="button" onClick={onSave} disabled={saving}>
              {saving ? "Saving..." : "Save Backup Settings"}
            </button>
          </div>
        </div>

        <div className="tax-card backup-card">
          <div className="card-header">
            <h3>Restore Data</h3>
          </div>
          <p>Restore from a previous backup</p>

          <label className="drop-zone">
            <input type="file" onChange={handleFileChange} style={{ display: "none" }} />
            <ArrowUpCircle size={48} className="export-icon" />
            <p className="drop-text">Drop backup file here or click to browse</p>
            {data.restore_file_name && (
              <p className="file-name">Selected: {data.restore_file_name}</p>
            )}
          </label>
        </div>
      </div>

      <div className="tax-card backup-card">
        <div className="card-header">
          <Clock size={22} />
          <h3>Automatic Backup Schedule</h3>
        </div>
        <p>Configure automatic backup schedule</p>

        <div className="payment-row">
          <label>Enable Auto Backup</label>
          <label className="switch">
            <input
              type="checkbox"
              name="auto_backup_enabled"
              checked={Boolean(data.auto_backup_enabled)}
              onChange={handleChange}
            />
            <span className="slider"></span>
          </label>
        </div>

        {data.auto_backup_enabled && (
          <div className="alert-row-horizontal">
            <div className="alert-field">
              <label>Frequency</label>
              <select name="frequency" value={data.frequency || ""} onChange={handleChange}>
                <option value="">Select</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
            <div className="alert-field">
              <label>Backup Time</label>
              <input type="time" name="backup_time" value={data.backup_time || ""} onChange={handleChange} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
