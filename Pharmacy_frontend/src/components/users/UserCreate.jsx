// src/components/users/UserCreate.jsx
import React, { useState, useEffect } from "react";
import { createUserOnBackend } from "../../api/users";
import "./users.css";

export default function UserCreate({ onClose, onCreated, nextUserId }) {
  const [formData, setFormData] = useState({
    userId: nextUserId || "USR001",
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
    isActive: true,
  });

  // if nextUserId changes (e.g., after reload), update field
  useEffect(() => {
    setFormData((prev) => ({
      ...prev,
      userId: nextUserId || "USR001",
    }));
  }, [nextUserId]);

  const handleChange = (e) =>
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleCheckbox = (e) =>
    setFormData((prev) => ({ ...prev, isActive: e.target.checked }));

  async function handleSubmit(e) {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      alert("Passwords do not match!");
      return;
    }

    const payload = {
      email: formData.email,
      full_name: formData.fullName,
      password: formData.password,
      is_active: formData.isActive,
    };

    try {
      await createUserOnBackend(payload);
      alert("User created!");
      if (onCreated) onCreated();
    } catch (err) {
      console.error("Create user failed:", err);
      alert("Failed to create user on server. Please try again.");
    }
  }

  return (
    <div className="user-modal-overlay">
      <div className="user-modal">
        <div className="user-modal-header">
          <h3>Add New User</h3>
          <button className="user-modal-close" onClick={onClose}>
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="formGroup">
            <label>User ID:</label>
            <input type="text" value={formData.userId} readOnly />
          </div>

          <div className="formGroup">
            <label>Full Name:</label>
            <input
              name="fullName"
              value={formData.fullName}
              onChange={handleChange}
              required
            />
          </div>

          <div className="formGroup">
            <label>Email (Login ID):</label>
            <input
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              required
            />
          </div>

          <div className="formGroup">
            <label>Password:</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
            />
          </div>

          <div className="formGroup">
            <label>Confirm Password:</label>
            <input
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
            />
          </div>

          <div className="formGroup checkboxGroup">
            <label>
              <input
                type="checkbox"
                checked={formData.isActive}
                onChange={handleCheckbox}
              />
              Active User
            </label>
          </div>

          <div className="user-modal-footer">
            <button
              type="button"
              className="user-btn-cancel"
              onClick={onClose}
            >
              Cancel
            </button>
            <button type="submit" className="user-btn-submit">
              Create User
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
