import React, { useState } from "react";
import "./prescriptions.css";
import { useAlert } from "../ui/alert-provider";

const Prescriptions = () => {
  const { showAlert } = useAlert();
  const [idCounter, setIdCounter] = useState(1);
  const [prescriptions, setPrescriptions] = useState([]);

  // Generate next Prescription ID like RX001
  const generateId = (counter) => `RX${String(counter).padStart(3, "0")}`;

  const [formData, setFormData] = useState({
    id: generateId(idCounter),
    saleInvoiceId: "",
    patientName: "",
    patientAge: "",
    prescriberName: "",
    prescriberRegNo: "",
    rxImageUrl: "",
    schedulesCaptured: "",
    capturedAt: new Date().toLocaleString(),
  });

  // Handle input change
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  // Handle form submit
  const handleSubmit = (e) => {
    e.preventDefault();

    const newPrescription = {
      ...formData,
      capturedAt: new Date().toLocaleString(),
    };

    setPrescriptions([...prescriptions, newPrescription]);

    showAlert(
      `Prescription Created!\n
Prescription ID: ${newPrescription.id}
Patient: ${newPrescription.patientName}
Prescriber: ${newPrescription.prescriberName}
Invoice ID: ${newPrescription.saleInvoiceId}
Captured At: ${newPrescription.capturedAt}`,
      "Success"
    );

    // Reset form
    const nextCounter = idCounter + 1;
    setIdCounter(nextCounter);
    setFormData({
      id: generateId(nextCounter),
      saleInvoiceId: "",
      patientName: "",
      patientAge: "",
      prescriberName: "",
      prescriberRegNo: "",
      rxImageUrl: "",
      schedulesCaptured: "",
      capturedAt: new Date().toLocaleString(),
    });
  };

  return (
    <div className="prescriptions">
      <h2>Create Prescription</h2>

      {/* ===== FORM SECTION ===== */}
      <form onSubmit={handleSubmit} className="prescriptionForm">
        <div className="formGroup">
          <label>Prescription ID:</label>
          <input type="text" name="id" value={formData.id} readOnly />
        </div>

        <div className="formGroup">
          <label>Sale Invoice ID:</label>
          <input
            type="text"
            name="saleInvoiceId"
            value={formData.saleInvoiceId}
            onChange={handleChange}
            placeholder="Enter Invoice ID"
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
          <label>Patient Age:</label>
          <input
            type="number"
            name="patientAge"
            value={formData.patientAge}
            onChange={handleChange}
            placeholder="Enter Age"
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
          />
        </div>

        <div className="formGroup">
          <label>Prescription Image URL:</label>
          <input
            type="text"
            name="rxImageUrl"
            value={formData.rxImageUrl}
            onChange={handleChange}
            placeholder="Enter Image URL"
          />
        </div>

        <div className="formGroup">
          <label>Schedules Captured:</label>
          <input
            type="text"
            name="schedulesCaptured"
            value={formData.schedulesCaptured}
            onChange={handleChange}
            placeholder="e.g. H, H1"
          />
        </div>

        <div className="formGroup">
          <label>Captured At:</label>
          <input type="text" value={formData.capturedAt} readOnly />
        </div>

        <button type="submit" className="submitBtn">
          Create Prescription
        </button>
      </form>

      {/* ===== LIST SECTION ===== */}
      <div className="prescriptionList">
        <h3>📋 Prescription Records</h3>
        {prescriptions.length === 0 ? (
          <p className="noRecords">No prescriptions created yet.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Prescription ID</th>
                <th>Invoice ID</th>
                <th>Patient Name</th>
                <th>Age</th>
                <th>Prescriber</th>
                <th>Reg No</th>
                <th>Schedules</th>
                <th>Image URL</th>
                <th>Captured At</th>
              </tr>
            </thead>
            <tbody>
              {prescriptions.map((rx, index) => (
                <tr key={index}>
                  <td>{rx.id}</td>
                  <td>{rx.saleInvoiceId}</td>
                  <td>{rx.patientName}</td>
                  <td>{rx.patientAge}</td>
                  <td>{rx.prescriberName}</td>
                  <td>{rx.prescriberRegNo}</td>
                  <td>{rx.schedulesCaptured}</td>
                  <td>
                    {rx.rxImageUrl ? (
                      <a href={rx.rxImageUrl} target="_blank" rel="noreferrer">
                        View
                      </a>
                    ) : (
                      "N/A"
                    )}
                  </td>
                  <td>{rx.capturedAt}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default Prescriptions;
