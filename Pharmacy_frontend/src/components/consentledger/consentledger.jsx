import React, { useState } from "react";
import "./consentledger.css";
import { useAlert } from "../ui/alert-provider";

const ConsentLedger = () => {
  const { showAlert } = useAlert();
  const [consents, setConsents] = useState([]);

  const [formData, setFormData] = useState({
    customerId: "",
    purpose: "",
    channel: "",
    consentedAt: new Date().toLocaleString(),
    version: "",
  });

  // Auto-generate ID for each new record
  const generateId = () => {
    const next = consents.length + 1;
    return `CL${next.toString().padStart(3, "0")}`; // CL001, CL002, ...
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const newConsent = {
      id: generateId(),
      ...formData,
      consentedAt: new Date().toLocaleString(),
    };

    setConsents([...consents, newConsent]);

    showAlert("Consent Record Created Successfully!", "Success");
    console.log("New Consent Record:", newConsent);

    // Reset form after submission
    setFormData({
      customerId: "",
      purpose: "",
      channel: "",
      consentedAt: new Date().toLocaleString(),
      version: "",
    });
  };

  return (
    <div className="consentledger">
      <h2>Create Consent Ledger Entry</h2>

      {/* ====== Form Section ====== */}
      <form className="consentForm" onSubmit={handleSubmit}>
        <div className="formGroup">
          <label>Customer ID:</label>
          <input
            type="text"
            name="customerId"
            value={formData.customerId}
            onChange={handleChange}
            placeholder="Enter Customer ID"
            required
          />
        </div>

        <div className="formGroup">
          <label>Purpose:</label>
          <input
            type="text"
            name="purpose"
            value={formData.purpose}
            onChange={handleChange}
            placeholder="Enter Purpose of Consent"
            required
          />
        </div>

        <div className="formGroup">
          <label>Channel:</label>
          <select
            name="channel"
            value={formData.channel}
            onChange={handleChange}
            required
          >
            <option value="">-- Select Channel --</option>
            <option value="EMAIL">Email</option>
            <option value="SMS">SMS</option>
            <option value="PHONE">Phone</option>
            <option value="WEB">Web</option>
          </select>
        </div>

        <div className="formGroup">
          <label>Consented At:</label>
          <input type="text" name="consentedAt" value={formData.consentedAt} readOnly />
        </div>

        <div className="formGroup">
          <label>Version:</label>
          <input
            type="text"
            name="version"
            value={formData.version}
            onChange={handleChange}
            placeholder="Enter Version (e.g. v1.0)"
          />
        </div>

        <button type="submit" className="submitBtn">
          ➕ Create Consent Record
        </button>
      </form>

      {/* ====== List Section ====== */}
      <div className="consentList">
        <h3>📋 Consent Ledger Records</h3>

        {consents.length === 0 ? (
          <p className="noRecords">No consent records found.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Customer ID</th>
                <th>Purpose</th>
                <th>Channel</th>
                <th>Consented At</th>
                <th>Version</th>
              </tr>
            </thead>
            <tbody>
              {consents.map((record, index) => (
                <tr key={index}>
                  <td>{record.id}</td>
                  <td>{record.customerId}</td>
                  <td>{record.purpose}</td>
                  <td>{record.channel}</td>
                  <td>{record.consentedAt}</td>
                  <td>{record.version}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default ConsentLedger;
