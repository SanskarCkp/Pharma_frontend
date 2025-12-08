import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import "./addroles.css";
import { useAlert } from "../../ui/alert-provider";

const AddRole = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { showAlert } = useAlert();

  const [formData, setFormData] = useState({
    code: "",
    label: "",
  });

  useEffect(() => {
    if (id) {
      fetch(`http://127.0.0.1:8000/api/roles/${id}/`)
        .then((res) => res.json())
        .then((data) => setFormData(data));
    }
  }, [id]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const url = id
      ? `http://127.0.0.1:8000/api/roles/${id}/`
      : `http://127.0.0.1:8000/api/roles/`;

    const method = id ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData),
    });

    if (res.ok) {
      showAlert(id ? "Role Updated Successfully!" : "Role Added Successfully!", "Success");
      navigate("/masters/roles");
    } else {
      showAlert("Failed!", "Error");
    }
  };

  return (
    <div className="roles-container">
      <h1 className="roles-title">{id ? "Update Role" : "Add Role"}</h1>

      <form className="roles-form" onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Role Code:</label>
          <input type="text" name="code" value={formData.code} onChange={handleChange} required />
        </div>

        <div className="form-group">
          <label>Role Label:</label>
          <input type="text" name="label" value={formData.label} onChange={handleChange} required />
        </div>

        <div className="form-actions">
          <button type="button" className="cancel-btn" onClick={() => navigate("/masters/roles")}>
            Cancel
          </button>

          <button type="submit" className="submit-btn">
            {id ? "Update" : "Save"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AddRole;
