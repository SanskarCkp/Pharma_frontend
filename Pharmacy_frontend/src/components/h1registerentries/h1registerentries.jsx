import React, { useState } from "react";
import "./h1registerentries.css";
import { useAlert } from "../ui/alert-provider";

const H1RegisterEntries = () => {
  const { showAlert } = useAlert();
  const [idCounter, setIdCounter] = useState(1);
  const [entries, setEntries] = useState([]);

  // Auto-generate ID like H1R001, H1R002...
  const generateId = (counter) => `H1R${String(counter).padStart(3, "0")}`;

  const [formData, setFormData] = useState({
    id: generateId(idCounter),
    saleLineId: "",
    patientName: "",
    prescriberName: "",
    prescriberRegNo: "",
    entryDate: new Date().toISOString().split("T")[0], // current date
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const newEntry = { ...formData };

    setEntries([...entries, newEntry]);

    showAlert(
      `H1 Register Entry Created!\n\n` +
        `ID: ${newEntry.id}\n` +
        `Sale Line ID: ${newEntry.saleLineId}\n` +
        `Patient: ${newEntry.patientName}\n` +
        `Prescriber: ${newEntry.prescriberName}\n` +
        `Reg No: ${newEntry.prescriberRegNo}\n` +
        `Entry Date: ${newEntry.entryDate}`,
      "Success"
    );

    // Reset form and increment ID
    const nextCounter = idCounter + 1;
    setIdCounter(nextCounter);
    setFormData({
      id: generateId(nextCounter),
      saleLineId: "",
      patientName: "",
      prescriberName: "",
      prescriberRegNo: "",
      entryDate: new Date().toISOString().split("T")[0],
    });
  };

  return (
    <div className="h1registerentries">
      <h2>Create H1 Register Entry</h2>

      {/* ===== FORM SECTION ===== */}
      <form onSubmit={handleSubmit} className="h1Form">
        <div className="formGroup">
          <label>ID:</label>
          <input type="text" name="id" value={formData.id} readOnly />
        </div>

        <div className="formGroup">
          <label>Sale Line ID:</label>
          <input
            type="text"
            name="saleLineId"
            value={formData.saleLineId}
            onChange={handleChange}
            placeholder="Enter Sale Line ID"
            required
          />
        </div>

        <div className="formGroup">
          <label>Patient Name:</label>
          <input
            type="text"
            name="patientName"
            value={formData.patientName}
            onChange={handleChange}
            placeholder="Enter Patient Name"
            required
          />
        </div>

        <div className="formGroup">
          <label>Prescriber Name:</label>
          <input
            type="text"
            name="prescriberName"
            value={formData.prescriberName}
            onChange={handleChange}
            placeholder="Enter Prescriber Name"
            required
          />
        </div>

        <div className="formGroup">
          <label>Prescriber Reg No:</label>
          <input
            type="text"
            name="prescriberRegNo"
            value={formData.prescriberRegNo}
            onChange={handleChange}
            placeholder="Enter Registration Number"
            required
          />
        </div>

        <div className="formGroup">
          <label>Entry Date:</label>
          <input
            type="date"
            name="entryDate"
            value={formData.entryDate}
            onChange={handleChange}
            required
          />
        </div>

        <button type="submit" className="submitBtn">
          Create Entry
        </button>
      </form>

      {/* ===== LIST SECTION ===== */}
      <div className="h1List">
        <h3>📋 H1 Register Entries</h3>
        {entries.length === 0 ? (
          <p className="noRecords">No entries created yet.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Sale Line ID</th>
                <th>Patient</th>
                <th>Prescriber</th>
                <th>Reg No</th>
                <th>Entry Date</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry, index) => (
                <tr key={index}>
                  <td>{entry.id}</td>
                  <td>{entry.saleLineId}</td>
                  <td>{entry.patientName}</td>
                  <td>{entry.prescriberName}</td>
                  <td>{entry.prescriberRegNo}</td>
                  <td>{entry.entryDate}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default H1RegisterEntries;
