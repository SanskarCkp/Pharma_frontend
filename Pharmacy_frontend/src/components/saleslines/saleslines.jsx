import React, { useState } from "react";
import "./saleslines.css";
import { useAlert } from "../ui/alert-provider";

const Saleslines = () => {
  const { showAlert } = useAlert();
  const [idCounter, setIdCounter] = useState(1);
  const [salesLines, setSalesLines] = useState([]);

  // Generate auto ID like SL001
  const generateId = (counter) => `SL${String(counter).padStart(3, "0")}`;

  const [formData, setFormData] = useState({
    id: generateId(idCounter),
    saleInvoiceId: "",
    productId: "",
    batchLotId: "",
    qtyBase: "",
    soldUom: "BASE",
    ratePerBase: "",
    taxPercent: "",
    taxAmount: "",
    lineTotal: "",
    requiresPrescription: false,
  });

  // Handle change for inputs
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === "checkbox" ? checked : value,
    });
  };

  // Auto calculate tax and line total when relevant values change
  const handleAutoCalc = (name, value) => {
    const updatedForm = {
      ...formData,
      [name]: value,
    };

    const qty = parseFloat(updatedForm.qtyBase) || 0;
    const rate = parseFloat(updatedForm.ratePerBase) || 0;
    const taxPercent = parseFloat(updatedForm.taxPercent) || 0;

    const subtotal = qty * rate;
    const taxAmount = (subtotal * taxPercent) / 100;
    const total = subtotal + taxAmount;

    setFormData({
      ...updatedForm,
      taxAmount: taxAmount.toFixed(2),
      lineTotal: total.toFixed(2),
    });
  };

  // Handle submit
  const handleSubmit = (e) => {
    e.preventDefault();

    const newLine = {
      ...formData,
      id: generateId(idCounter),
    };

    setSalesLines([...salesLines, newLine]);

    showAlert(
      `Sales Line Created!\n\n` +
        `ID: ${newLine.id}\n` +
        `Invoice ID: ${newLine.saleInvoiceId}\n` +
        `Product ID: ${newLine.productId}\n` +
        `Batch Lot ID: ${newLine.batchLotId}\n` +
        `Qty: ${newLine.qtyBase} ${newLine.soldUom}\n` +
        `Rate per Base: ₹${newLine.ratePerBase}\n` +
        `Tax: ${newLine.taxPercent}% (₹${newLine.taxAmount})\n` +
        `Total: ₹${newLine.lineTotal}\n` +
        `Prescription Required: ${newLine.requiresPrescription ? "Yes" : "No"}`,
      "Success"
    );

    // Reset form
    const nextCounter = idCounter + 1;
    setIdCounter(nextCounter);
    setFormData({
      id: generateId(nextCounter),
      saleInvoiceId: "",
      productId: "",
      batchLotId: "",
      qtyBase: "",
      soldUom: "BASE",
      ratePerBase: "",
      taxPercent: "",
      taxAmount: "",
      lineTotal: "",
      requiresPrescription: false,
    });
  };

  return (
    <div className="saleslines">
      <h2>Create Sales Line</h2>

      {/* ===== FORM SECTION ===== */}
      <form onSubmit={handleSubmit} className="salesForm">
        <div className="formGroup">
          <label>ID:</label>
          <input type="text" name="id" value={formData.id} readOnly />
        </div>

        <div className="formGroup">
          <label>Sale Invoice ID:</label>
          <input
            type="text"
            name="saleInvoiceId"
            value={formData.saleInvoiceId}
            onChange={handleChange}
            required
          />
        </div>

        <div className="formGroup">
          <label>Product ID:</label>
          <input
            type="text"
            name="productId"
            value={formData.productId}
            onChange={handleChange}
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
            required
          />
        </div>

        <div className="formGroup">
          <label>Quantity (Base Units):</label>
          <input
            type="number"
            step="0.001"
            name="qtyBase"
            value={formData.qtyBase}
            onChange={(e) => handleAutoCalc("qtyBase", e.target.value)}
            required
          />
        </div>

        <div className="formGroup">
          <label>Sold UOM:</label>
          <select
            name="soldUom"
            value={formData.soldUom}
            onChange={handleChange}
          >
            <option value="BASE">BASE</option>
            <option value="PACK">PACK</option>
          </select>
        </div>

        <div className="formGroup">
          <label>Rate per Base (₹):</label>
          <input
            type="number"
            step="0.01"
            name="ratePerBase"
            value={formData.ratePerBase}
            onChange={(e) => handleAutoCalc("ratePerBase", e.target.value)}
            required
          />
        </div>

        <div className="formGroup">
          <label>Tax Percent (%):</label>
          <input
            type="number"
            step="0.01"
            name="taxPercent"
            value={formData.taxPercent}
            onChange={(e) => handleAutoCalc("taxPercent", e.target.value)}
            required
          />
        </div>

        <div className="formGroup">
          <label>Tax Amount (₹):</label>
          <input type="text" name="taxAmount" value={formData.taxAmount} readOnly />
        </div>

        <div className="formGroup">
          <label>Line Total (₹):</label>
          <input type="text" name="lineTotal" value={formData.lineTotal} readOnly />
        </div>

        <div className="formGroup checkboxGroup">
          <label>
            <input
              type="checkbox"
              name="requiresPrescription"
              checked={formData.requiresPrescription}
              onChange={handleChange}
            />
            Requires Prescription
          </label>
          <p
            className="statusText"
            style={{
              color: formData.requiresPrescription ? "green" : "red",
            }}
          >
            {formData.requiresPrescription
              ? "✅ Prescription required for this sale."
              : "❌ No prescription required."}
          </p>
        </div>

        <button type="submit" className="submitBtn">
          Create Sales Line
        </button>
      </form>

      {/* ===== LIST SECTION ===== */}
      <div className="salesList">
        <h3>📋 Sales Line Records</h3>
        {salesLines.length === 0 ? (
          <p className="noRecords">No sales lines created yet.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Invoice ID</th>
                <th>Product ID</th>
                <th>Batch Lot ID</th>
                <th>Qty</th>
                <th>UOM</th>
                <th>Rate</th>
                <th>Tax %</th>
                <th>Tax Amt</th>
                <th>Total</th>
                <th>Prescription</th>
              </tr>
            </thead>
            <tbody>
              {salesLines.map((line, index) => (
                <tr key={index}>
                  <td>{line.id}</td>
                  <td>{line.saleInvoiceId}</td>
                  <td>{line.productId}</td>
                  <td>{line.batchLotId}</td>
                  <td>{line.qtyBase}</td>
                  <td>{line.soldUom}</td>
                  <td>₹{line.ratePerBase}</td>
                  <td>{line.taxPercent}%</td>
                  <td>₹{line.taxAmount}</td>
                  <td>₹{line.lineTotal}</td>
                  <td>
                    {line.requiresPrescription ? (
                      <span className="yes">Yes</span>
                    ) : (
                      <span className="no">No</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default Saleslines;
