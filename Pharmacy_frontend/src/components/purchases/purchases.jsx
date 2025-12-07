import React, { useState } from "react";
import "./purchases.css";
import { useAlert } from "../ui/alert-provider";

const Purchases = () => {
  const { showAlert } = useAlert();
  const [purchases, setPurchases] = useState([]);

  const [formData, setFormData] = useState({
    vendorId: "",
    locationId: "",
    vendorInvoiceNo: "",
    invoiceDate: "",
    grossTotal: "",
    taxTotal: "",
    netTotal: "",
  });

  // Generate next Purchase ID automatically
  const generateId = () => {
    const nextNumber = purchases.length + 1;
    return `PUR${nextNumber.toString().padStart(3, "0")}`; // e.g., PUR001, PUR002
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const newPurchase = {
      id: generateId(),
      ...formData,
      createdAt: new Date().toLocaleString(),
    };

    setPurchases((prev) => [...prev, newPurchase]);
    showAlert("Purchase Created Successfully!", "Success");

    setFormData({
      vendorId: "",
      locationId: "",
      vendorInvoiceNo: "",
      invoiceDate: "",
      grossTotal: "",
      taxTotal: "",
      netTotal: "",
    });
  };

  return (
    <div className="purchases">
      <h2>Create Purchase Entry</h2>

      {/* ================= FORM ================= */}
      <form className="purchaseForm" onSubmit={handleSubmit}>
        <div className="formGroup">
          <label>Vendor ID:</label>
          <input
            name="vendorId"
            type="text"
            value={formData.vendorId}
            onChange={handleChange}
            placeholder="Enter Vendor ID"
            required
          />
        </div>

        <div className="formGroup">
          <label>Location ID:</label>
          <input
            name="locationId"
            type="text"
            value={formData.locationId}
            onChange={handleChange}
            placeholder="Enter Location ID"
            required
          />
        </div>

        <div className="formGroup">
          <label>Vendor Invoice No:</label>
          <input
            name="vendorInvoiceNo"
            type="text"
            value={formData.vendorInvoiceNo}
            onChange={handleChange}
            placeholder="Enter Invoice Number"
            required
          />
        </div>

        <div className="formGroup">
          <label>Invoice Date:</label>
          <input
            name="invoiceDate"
            type="date"
            value={formData.invoiceDate}
            onChange={handleChange}
            required
          />
        </div>

        <div className="formGroup">
          <label>Gross Total:</label>
          <input
            name="grossTotal"
            type="number"
            step="0.01"
            value={formData.grossTotal}
            onChange={handleChange}
            placeholder="Enter Gross Total"
            required
          />
        </div>

        <div className="formGroup">
          <label>Tax Total:</label>
          <input
            name="taxTotal"
            type="number"
            step="0.01"
            value={formData.taxTotal}
            onChange={handleChange}
            placeholder="Enter Tax Total"
            required
          />
        </div>

        <div className="formGroup">
          <label>Net Total:</label>
          <input
            name="netTotal"
            type="number"
            step="0.01"
            value={formData.netTotal}
            onChange={handleChange}
            placeholder="Enter Net Total"
            required
          />
        </div>

        <button className="submitBtn" type="submit">
          ➕ Create Purchase
        </button>
      </form>

      {/* ================= LIST ================= */}
      <div className="purchaseList">
        <h3>📋 Purchase Records</h3>

        {purchases.length === 0 ? (
          <p className="noRecords">No purchase records found.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Vendor ID</th>
                <th>Location ID</th>
                <th>Invoice No</th>
                <th>Date</th>
                <th>Gross</th>
                <th>Tax</th>
                <th>Net</th>
                <th>Created At</th>
              </tr>
            </thead>
            <tbody>
              {purchases.map((purchase, index) => (
                <tr key={index}>
                  <td>{purchase.id}</td>
                  <td>{purchase.vendorId}</td>
                  <td>{purchase.locationId}</td>
                  <td>{purchase.vendorInvoiceNo}</td>
                  <td>{purchase.invoiceDate}</td>
                  <td>{purchase.grossTotal}</td>
                  <td>{purchase.taxTotal}</td>
                  <td>{purchase.netTotal}</td>
                  <td>{purchase.createdAt}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default Purchases;
