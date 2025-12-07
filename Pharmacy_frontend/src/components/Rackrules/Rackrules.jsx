import React, { useState } from "react";
import "./Rackrules.css";
import { useAlert } from "../ui/alert-provider";

const Rackrules = () => {
  const { showAlert } = useAlert();
  const [idCounter, setIdCounter] = useState(1);
  const [rackRules, setRackRules] = useState([]);

  const generateId = (counter) => `RCK${String(counter).padStart(3, "0")}`;

  const [formData, setFormData] = useState({
    id: generateId(idCounter),
    manufacturerName: "",
    rackCode: "",
    isActive: false,
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === "checkbox" ? checked : value,
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const newRack = { ...formData };
    setRackRules([...rackRules, newRack]);

    showAlert(
      `Rack Rule Created!\nID: ${newRack.id}\nManufacturer: ${newRack.manufacturerName}\nRack Code: ${newRack.rackCode}\nStatus: ${
        newRack.isActive ? "Active" : "Inactive"
      }`,
      "Success"
    );

    // Increment ID and reset form
    const nextCounter = idCounter + 1;
    setIdCounter(nextCounter);
    setFormData({
      id: generateId(nextCounter),
      manufacturerName: "",
      rackCode: "",
      isActive: false,
    });
  };

  return (
    <div className="rackrules">
      <h2>Create Rack Rule</h2>

      {/* ===== FORM SECTION ===== */}
      <form onSubmit={handleSubmit} className="rackForm">
        <div className="formGroup">
          <label>ID:</label>
          <input type="text" name="id" value={formData.id} readOnly />
        </div>

        <div className="formGroup">
          <label>Manufacturer Name:</label>
          <input
            type="text"
            name="manufacturerName"
            value={formData.manufacturerName}
            onChange={handleChange}
            required
          />
        </div>

        <div className="formGroup">
          <label>Rack Code:</label>
          <input
            type="text"
            name="rackCode"
            value={formData.rackCode}
            onChange={handleChange}
            required
          />
        </div>

        <div className="formGroup checkbox">
          <label>
            <input
              type="checkbox"
              name="isActive"
              checked={formData.isActive}
              onChange={handleChange}
            />
            Active
          </label>
          <p
            className="statusText"
            style={{
              color: formData.isActive ? "green" : "red",
              fontWeight: 500,
              marginTop: "5px",
            }}
          >
            {formData.isActive
              ? "✅ This rack is active and ready to use."
              : "❌ This rack is inactive and not in use."}
          </p>
        </div>

        <button type="submit" className="submitBtn">
          Create Rack Rule
        </button>
      </form>

      {/* ===== LIST SECTION ===== */}
      <div className="rackList">
        <h3>📋 Rack Rule Records</h3>
        {rackRules.length === 0 ? (
          <p className="noRecords">No rack rules found.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Manufacturer Name</th>
                <th>Rack Code</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {rackRules.map((rack, index) => (
                <tr key={index}>
                  <td>{rack.id}</td>
                  <td>{rack.manufacturerName}</td>
                  <td>{rack.rackCode}</td>
                  <td style={{ color: rack.isActive ? "green" : "red" }}>
                    {rack.isActive ? "Active" : "Inactive"}
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

export default Rackrules;
