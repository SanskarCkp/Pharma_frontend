// src/components/users/UserCreate.jsx
import React, { useEffect, useMemo, useState } from "react";
import { createUserOnBackend, updateUserOnBackend } from "../../api/users";
import "./users.css";
import { useAlert } from "../ui/alert-provider";

const formatDateTime = (value) => {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString();
};

export default function UserCreate({
  mode = "create",
  user = null,
  onClose,
  onCreated,
  onUpdated,
  nextUserId,
}) {
  const { showAlert } = useAlert();
  const isEdit = mode === "edit";
  const [formData, setFormData] = useState({
    userId: user?.userId || nextUserId || "USR001",
    fullName: user?.fullName || "",
    email: user?.email || "",
    password: "",
    confirmPassword: "",
    isActive: user?.isActive ?? true,
    createdAt: user?.createdAt || new Date().toISOString(),
  });

  useEffect(() => {
    if (isEdit) return;
    setFormData((prev) => ({ ...prev, userId: nextUserId || "USR001" }));
  }, [isEdit, nextUserId]);

  useEffect(() => {
    if (!user) return;
    setFormData((prev) => ({
      ...prev,
      userId: user.userId || prev.userId,
      fullName: user.fullName || "",
      email: user.email || "",
      isActive: user.isActive ?? true,
      createdAt: user.createdAt || prev.createdAt,
    }));
  }, [user]);

  const handleChange = (e) =>
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleCheckbox = (e) =>
    setFormData((prev) => ({ ...prev, isActive: e.target.checked }));

  async function handleSubmit(e) {
    e.preventDefault();

<<<<<<< HEAD
    if (formData.password !== formData.confirmPassword) {
      alert("Passwords do not match!");
=======
    if (!isEdit) {
      if (formData.password !== formData.confirmPassword) {
        showAlert("Passwords do not match!", "Validation Error");
        return;
      }
    } else if (formData.password && formData.password !== formData.confirmPassword) {
      showAlert("Passwords do not match!", "Validation Error");
>>>>>>> 0c793b6c4be6821799b5169066cf22fa8f448f01
      return;
    }

    const payload = {
      email: formData.email,
      full_name: formData.fullName,
<<<<<<< HEAD
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

=======
      is_active: formData.isActive,
    };
    if (!isEdit || formData.password) {
      payload.password = formData.password;
    }

    try {
      if (isEdit) {
        await updateUserOnBackend(user?.id || user?.backendId || user?.userId, payload);
        showAlert("User updated successfully!", "Success");
        if (onUpdated) {
          onUpdated({
            ...user,
            fullName: payload.full_name,
            email: payload.email,
            isActive: payload.is_active,
          });
        }
      } else {
        const resp = await createUserOnBackend(payload);
        showAlert("User created successfully!", "Success");
        if (onCreated) onCreated(resp);
      }
      if (onClose) onClose();
    } catch (err) {
      console.error("Create/Update user failed:", err);
      showAlert("Failed to save user on server. Please try again.", "Error");
    }
  }

  const createdAtValue = useMemo(
    () => formatDateTime(formData.createdAt || new Date().toISOString()),
    [formData.createdAt]
  );

>>>>>>> 0c793b6c4be6821799b5169066cf22fa8f448f01
  return (
    <div className="user-modal-overlay">
      <div className="user-modal">
        <div className="user-modal-header">
<<<<<<< HEAD
          <h3>Add New User</h3>
          <button className="user-modal-close" onClick={onClose}>
            ×
=======
          <h3>{isEdit ? "Edit User" : "Add New User"}</h3>
          <button className="user-modal-close" onClick={onClose}>
            X
>>>>>>> 0c793b6c4be6821799b5169066cf22fa8f448f01
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
<<<<<<< HEAD
              required
=======
              required={!isEdit}
>>>>>>> 0c793b6c4be6821799b5169066cf22fa8f448f01
            />
          </div>

          <div className="formGroup">
            <label>Confirm Password:</label>
            <input
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
<<<<<<< HEAD
              required
            />
          </div>

=======
              required={!isEdit}
            />
          </div>

          <div className="formGroup">
            <label>Created At:</label>
            <input type="text" value={createdAtValue} readOnly />
          </div>

>>>>>>> 0c793b6c4be6821799b5169066cf22fa8f448f01
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
<<<<<<< HEAD
              Create User
=======
              {isEdit ? "Update User" : "Create User"}
>>>>>>> 0c793b6c4be6821799b5169066cf22fa8f448f01
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
