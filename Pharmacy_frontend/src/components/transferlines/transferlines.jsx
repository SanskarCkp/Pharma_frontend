import React, { useState } from "react";
import "./transferlines.css";
import { useAlert } from "../ui/alert-provider";

const TransferLines = () => {
  const { showAlert } = useAlert();
  const [idCounter, setIdCounter] = useState(1);
  const [transferLines, setTransferLines] = useState([]);

  // Generate next ID like TFL001
  const generateId = (counter) => `TFL${String(counter).padStart(3, "0")}`;

  const [formData, setFormData] = useState({
    id: generateId(idCounter),
    voucherId: "",
    batchLotId: "",
    qtyBase: "",
    createdAt: new Date().toLocaleString(),
  });

  // Handle input change
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  // Handle form submission
  const handleSubmit = (e) => {
    e.preventDefault();

    const newLine = {
      ...formData,
      createdAt: new Date().toLocaleString(),
    };

    setTransferLines([...transferLines, newLine]);

    showAlert(
      `Transfer Line Created!\n
Transfer Line ID: ${newLine.id}
Voucher ID: ${newLine.voucherId}
Batch Lot ID: ${newLine.batchLotId}
Quantity (Base): ${newLine.qtyBase}
Created At: ${newLine.createdAt}`,
      "Success"
    );

    // Reset form
    const nextCounter = idCounter + 1;
    setIdCounter(nextCounter);
    setFormData({
      id: generateId(nextCounter),
      voucherId: "",
      batchLotId: "",
      qtyBase: "",
      createdAt: new Date().toLocaleString(),
    });
  };

  return (
    <div className="transferlines">
      <h2>Transfer Lines</h2>

      {/* ===== FORM SECTION ===== */}
      <form onSubmit={handleSubmit} className="transferLineForm">
        <div className="formGroup">
          <label>Transfer Line ID:</label>
          <input type="text" name="id" value={formData.id} readOnly />
        </div>

        <div className="formGroup">
          <label>Voucher ID:</label>
          <input
            type="text"
            name="voucherId"
            value={formData.voucherId}
            onChange={handleChange}
            placeholder="Enter Voucher ID"
            required
          />
        </div>

        <div className="formGroup">
          <label>Batch Lot ID:</label>
          <input
            type="text"
            name="batchLotId"
            value={formData.batchLotId}
            onChange={handleChange}
            placeholder="Enter Batch Lot ID"
            required
          />
        </div>

        <div className="formGroup">
          <label>Quantity (Base Units):</label>
          <input
            type="number"
            name="qtyBase"
            value={formData.qtyBase}
            onChange={handleChange}
            placeholder="Enter Quantity"
            step="0.001"
            required
          />
        </div>

        <div className="formGroup">
          <label>Created At:</label>
          <input type="text" value={formData.createdAt} readOnly />
        </div>

        <button type="submit" className="submitBtn">
          Create Transfer Line
        </button>
      </form>

      {/* ===== LIST SECTION ===== */}
      <div className="transferLineList">
        <h3>📋 Transfer Line Records</h3>
        {transferLines.length === 0 ? (
          <p className="noRecords">No transfer lines found.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Transfer Line ID</th>
                <th>Voucher ID</th>
                <th>Batch Lot ID</th>
                <th>Qty (Base)</th>
                <th>Created At</th>
              </tr>
            </thead>
            <tbody>
              {transferLines.map((line, index) => (
                <tr key={index}>
                  <td>{line.id}</td>
                  <td>{line.voucherId}</td>
                  <td>{line.batchLotId}</td>
                  <td>{line.qtyBase}</td>
                  <td>{line.createdAt}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default TransferLines;
