import React, { useState } from "react";
import "./vendorreturns.css";
import { useAlert } from "../ui/alert-provider";

const VendorReturns = () => {
  const { showAlert } = useAlert();
  const [idCounter, setIdCounter] = useState(1);
  const [returns, setReturns] = useState([]);

  // Generate ID like VRN001
  const generateReturnId = (counter) => `VRN${String(counter).padStart(3, "0")}`;

  const [formData, setFormData] = useState({
    id: generateReturnId(idCounter),
    vendorId: "",
    purchaseLineId: "",
    batchLotId: "",
    qtyBase: "",
    reason: "",
    creditNoteNo: "",
    creditNoteDate: "",
    status: "INITIATED",
    createdAt: new Date().toLocaleString(),
  });

  // Handle input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  // Handle submit
  const handleSubmit = (e) => {
    e.preventDefault();

    const now = new Date().toLocaleString();
    const newReturn = { ...formData, createdAt: now };

    setReturns([...returns, newReturn]);

    showAlert(
      `Vendor Return Created!\n
Return ID: ${newReturn.id}
Vendor ID: ${newReturn.vendorId}
Purchase Line ID: ${newReturn.purchaseLineId}
Batch Lot ID: ${newReturn.batchLotId}
Quantity (Base): ${newReturn.qtyBase}
Reason: ${newReturn.reason}
Credit Note No: ${newReturn.creditNoteNo}
Credit Note Date: ${newReturn.creditNoteDate}
Status: ${newReturn.status}
Created At: ${newReturn.createdAt}`,
      "Success"
    );

    // Reset form
    const nextCounter = idCounter + 1;
    setIdCounter(nextCounter);
    setFormData({
      id: generateReturnId(nextCounter),
      vendorId: "",
      purchaseLineId: "",
      batchLotId: "",
      qtyBase: "",
      reason: "",
      creditNoteNo: "",
      creditNoteDate: "",
      status: "INITIATED",
      createdAt: new Date().toLocaleString(),
    });
  };

  return (
    <div className="vendorreturns">
      <h2>Vendor Returns</h2>

      {/* ===== FORM SECTION ===== */}
      <form onSubmit={handleSubmit} className="vendorReturnForm">
        <div className="formGroup">
          <label>Return ID:</label>
          <input type="text" name="id" value={formData.id} readOnly />
        </div>

        <div className="formGroup">
          <label>Vendor ID:</label>
          <input
            type="text"
            name="vendorId"
            value={formData.vendorId}
            onChange={handleChange}
            placeholder="Enter Vendor ID"
            required
          />
        </div>

        <div className="formGroup">
          <label>Purchase Line ID:</label>
          <input
            type="text"
            name="purchaseLineId"
            value={formData.purchaseLineId}
            onChange={handleChange}
            placeholder="Enter Purchase Line ID"
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
          <label>Reason:</label>
          <input
            type="text"
            name="reason"
            value={formData.reason}
            onChange={handleChange}
            placeholder="Enter Return Reason"
          />
        </div>

        <div className="formGroup">
          <label>Credit Note No:</label>
          <input
            type="text"
            name="creditNoteNo"
            value={formData.creditNoteNo}
            onChange={handleChange}
            placeholder="Enter Credit Note Number"
          />
        </div>

        <div className="formGroup">
          <label>Credit Note Date:</label>
          <input
            type="date"
            name="creditNoteDate"
            value={formData.creditNoteDate}
            onChange={handleChange}
          />
        </div>

        <div className="formGroup">
          <label>Status:</label>
          <select name="status" value={formData.status} onChange={handleChange}>
            <option value="INITIATED">INITIATED</option>
            <option value="CREDITED">CREDITED</option>
            <option value="CLOSED">CLOSED</option>
          </select>
        </div>

        <div className="formGroup">
          <label>Created At:</label>
          <input type="text" value={formData.createdAt} readOnly />
        </div>

        <button type="submit" className="submitBtn">
          Create Vendor Return
        </button>
      </form>

      {/* ===== LIST SECTION ===== */}
      <div className="vendorReturnList">
        <h3>📋 Vendor Return Records</h3>
        {returns.length === 0 ? (
          <p className="noRecords">No vendor returns found.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Return ID</th>
                <th>Vendor ID</th>
                <th>Purchase Line ID</th>
                <th>Batch Lot ID</th>
                <th>Qty (Base)</th>
                <th>Reason</th>
                <th>Credit Note No</th>
                <th>Credit Note Date</th>
                <th>Status</th>
                <th>Created At</th>
              </tr>
            </thead>
            <tbody>
              {returns.map((r, i) => (
                <tr key={i}>
                  <td>{r.id}</td>
                  <td>{r.vendorId}</td>
                  <td>{r.purchaseLineId}</td>
                  <td>{r.batchLotId}</td>
                  <td>{r.qtyBase}</td>
                  <td>{r.reason}</td>
                  <td>{r.creditNoteNo}</td>
                  <td>{r.creditNoteDate}</td>
                  <td
                    style={{
                      color:
                        r.status === "INITIATED"
                          ? "#f39c12"
                          : r.status === "CREDITED"
                          ? "blue"
                          : "green",
                      fontWeight: "600",
                    }}
                  >
                    {r.status}
                  </td>
                  <td>{r.createdAt}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default VendorReturns;
