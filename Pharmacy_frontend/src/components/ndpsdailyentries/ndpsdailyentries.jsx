import React, { useState } from "react";
import "./ndpsdailyentries.css";
import { useAlert } from "../ui/alert-provider";

const NdpsDailyEntries = () => {
  const { showAlert } = useAlert();
  const [idCounter, setIdCounter] = useState(1);
  const [entries, setEntries] = useState([]);

  // Generate ID like NDPS001, NDPS002...
  const generateId = (counter) => `NDPS${String(counter).padStart(3, "0")}`;

  const [formData, setFormData] = useState({
    id: generateId(idCounter),
    saleLineId: "",
    openingBalance: "",
    qtyIssued: "",
    closingBalance: "",
    entryDate: new Date().toISOString().split("T")[0],
  });

  // Handle field change
  const handleChange = (e) => {
    const { name, value } = e.target;

    // If qtyIssued or openingBalance changes, auto-update closingBalance
    if (name === "openingBalance" || name === "qtyIssued") {
      const opening = name === "openingBalance" ? +value : +formData.openingBalance;
      const issued = name === "qtyIssued" ? +value : +formData.qtyIssued;
      const closing = opening - issued;
      setFormData({
        ...formData,
        [name]: value,
        closingBalance: isNaN(closing) ? "" : closing,
      });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  // Handle form submit
  const handleSubmit = (e) => {
    e.preventDefault();

    const newEntry = { ...formData };
    setEntries([...entries, newEntry]);

    showAlert(
      `NDPS Daily Entry Created!\n\n` +
        `ID: ${newEntry.id}\n` +
        `Sale Line ID: ${newEntry.saleLineId}\n` +
        `Opening Balance: ${newEntry.openingBalance}\n` +
        `Qty Issued: ${newEntry.qtyIssued}\n` +
        `Closing Balance: ${newEntry.closingBalance}\n` +
        `Entry Date: ${newEntry.entryDate}`,
      "Success"
    );

    const nextCounter = idCounter + 1;
    setIdCounter(nextCounter);
    setFormData({
      id: generateId(nextCounter),
      saleLineId: "",
      openingBalance: "",
      qtyIssued: "",
      closingBalance: "",
      entryDate: new Date().toISOString().split("T")[0],
    });
  };

  return (
    <div className="ndpsdailyentries">
      <h2>Create NDPS Daily Entry</h2>

      {/* ===== FORM SECTION ===== */}
      <form onSubmit={handleSubmit} className="ndpsForm">
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
          <label>Opening Balance:</label>
          <input
            type="number"
            name="openingBalance"
            value={formData.openingBalance}
            onChange={handleChange}
            placeholder="Enter Opening Balance"
            required
          />
        </div>

        <div className="formGroup">
          <label>Qty Issued:</label>
          <input
            type="number"
            name="qtyIssued"
            value={formData.qtyIssued}
            onChange={handleChange}
            placeholder="Enter Quantity Issued"
            required
          />
        </div>

        <div className="formGroup">
          <label>Closing Balance:</label>
          <input
            type="number"
            name="closingBalance"
            value={formData.closingBalance}
            readOnly
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
      <div className="ndpsList">
        <h3>📋 NDPS Daily Entries</h3>
        {entries.length === 0 ? (
          <p className="noRecords">No entries created yet.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Sale Line ID</th>
                <th>Opening Balance</th>
                <th>Qty Issued</th>
                <th>Closing Balance</th>
                <th>Entry Date</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry, index) => (
                <tr key={index}>
                  <td>{entry.id}</td>
                  <td>{entry.saleLineId}</td>
                  <td>{entry.openingBalance}</td>
                  <td>{entry.qtyIssued}</td>
                  <td>{entry.closingBalance}</td>
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

export default NdpsDailyEntries;
