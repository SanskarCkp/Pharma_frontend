// src/components/users/users.jsx
import React, { useEffect, useState } from "react";
import "./users.css";
import { fetchUsersFromBackend, createUserOnBackend } from "../../api/users";

const STORAGE_KEY = "app_users";

const generateUserId = (counter) => `USR${String(counter).padStart(3, "0")}`;

export default function Users() {
  const [idCounter, setIdCounter] = useState(1);
  const [users, setUsers] = useState([]);
  const [loadingCreate, setLoadingCreate] = useState(false);

  const [formData, setFormData] = useState({
    userId: generateUserId(1),
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
    createdAt: "",
    isActive: true,
  });

  // Load saved users from localStorage + try to refresh from backend
  useEffect(() => {
    loadLocalUsers();
    loadUsersFromBackend();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function loadLocalUsers() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setUsers(parsed);
          if (parsed.length > 0) {
            const last = parsed[parsed.length - 1];
            const num = parseInt(String(last.userId || "").replace("USR", ""), 10);
            const next = !isNaN(num) ? num + 1 : 1;
            setIdCounter(next);
            setFormData((p) => ({ ...p, userId: generateUserId(next) }));
          }
        }
      }
    } catch (e) {
      console.error("Failed to load users from localStorage", e);
    }
  }

  async function loadUsersFromBackend() {
    try {
      const data = await fetchUsersFromBackend();
      // backend returns list of users (id, email, username, full_name, is_active, created_at/date_joined)
      const normalized = (Array.isArray(data) ? data : []).map((u, idx) => ({
        userId: u.userId || `USR${String(u.id || idx + 1).padStart(3, "0")}`,
        fullName: u.full_name || `${u.first_name || ""} ${u.last_name || ""}`.trim(),
        email: u.email || u.username || "",
        createdAt: u.created_at || u.date_joined || "",
        isActive: u.is_active ?? u.isActive ?? true,
      }));
      if (normalized.length) {
        setUsers(normalized);
        // update id counter using last id
        const lastNum = normalized.reduce((mx, u) => {
          const num = parseInt(String(u.userId || "").replace("USR", ""), 10);
          return isNaN(num) ? mx : Math.max(mx, num);
        }, 0);
        const next = lastNum + 1 || idCounter;
        setIdCounter(next);
        setFormData((p) => ({ ...p, userId: generateUserId(next) }));
        // optionally update localStorage to reflect server
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
        } catch {}
      }
    } catch (err) {
      // Backend unreachable / error — keep localStorage fallback but do not overwrite it
      console.warn("Could not load users from backend:", err);
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleCheckboxChange = (e) =>
    setFormData((prev) => ({ ...prev, isActive: e.target.checked }));

  const saveLocalFallback = (newUser) => {
    try {
      const updated = [...users, newUser];
      setUsers(updated);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.error("Failed to save fallback user locally", e);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.fullName.trim() || !formData.email.trim()) {
      alert("Full name and email are required.");
      return;
    }
    if (!formData.password || !formData.confirmPassword) {
      alert("Please enter password and confirm password.");
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      alert("Passwords do not match.");
      return;
    }

    setLoadingCreate(true);
    const now = new Date();
    const createdAt = now.toLocaleString();

    // Build payload for backend
    const backendPayload = {
      email: formData.email,
      full_name: formData.fullName,
      password: formData.password,
      is_active: formData.isActive,
    };

    try {
      const resp = await createUserOnBackend(backendPayload);
      // On success backend may return created user (or minimal response). Normalize it:
      const newUser = {
        userId: resp.userId || formData.userId,
        fullName: resp.full_name || resp.fullName || formData.fullName,
        email: resp.email || formData.email,
        createdAt: resp.created_at || createdAt,
        isActive: typeof resp.is_active !== "undefined" ? resp.is_active : formData.isActive,
      };

      // update UI (server is source of truth)
      const updatedUsers = [...users, newUser];
      setUsers(updatedUsers);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedUsers));
      } catch {}

      alert(`✅ User Created on server!\nUser ID: ${newUser.userId}\nEmail: ${newUser.email}`);
    } catch (err) {
      // Backend failed — fallback to local storage
      console.warn("Backend create failed, saving locally:", err);
      const fallbackUser = {
        userId: formData.userId,
        fullName: formData.fullName,
        email: formData.email,
        createdAt,
        isActive: formData.isActive,
      };
      saveLocalFallback(fallbackUser);

      const message =
        err?.message ||
        (err?.status ? `HTTP ${err.status}` : "Failed to create user on server.");
      alert(`⚠️ Failed to create user on server — saved locally as fallback.\n\nError: ${message}`);
    } finally {
      // reset form and id counter
      const nextCounter = idCounter + 1;
      setIdCounter(nextCounter);
      setFormData({
        userId: generateUserId(nextCounter),
        fullName: "",
        email: "",
        password: "",
        confirmPassword: "",
        createdAt: "",
        isActive: true,
      });
      setLoadingCreate(false);
    }
  };

  return (
    <div className="users">
      <h2>Create User</h2>
      <form onSubmit={handleSubmit} className="userForm">
        <div className="formGroup">
          <label>User ID:</label>
          <input type="text" name="userId" value={formData.userId} readOnly />
        </div>

        <div className="formRow">
          <div className="formGroup">
            <label>Full Name:</label>
            <input type="text" name="fullName" value={formData.fullName} onChange={handleChange} required />
          </div>

          <div className="formGroup">
            <label>Email (Login ID):</label>
            <input type="email" name="email" value={formData.email} onChange={handleChange} required />
          </div>
        </div>

        <div className="formRow">
          <div className="formGroup">
            <label>Password:</label>
            <input type="password" name="password" value={formData.password} onChange={handleChange} required />
          </div>
          <div className="formGroup">
            <label>Confirm Password:</label>
            <input type="password" name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} required />
          </div>
        </div>

        <div className="formGroup">
          <label>Created At:</label>
          <input type="text" value={formData.createdAt || new Date().toLocaleString()} readOnly />
        </div>

        <div className="formGroup checkboxGroup">
          <label>
            <input type="checkbox" name="isActive" checked={formData.isActive} onChange={handleCheckboxChange} />
            Active User
          </label>
        </div>

        <button type="submit" className="submitBtn" disabled={loadingCreate}>
          {loadingCreate ? "Creating..." : "Create User"}
        </button>
      </form>

      <div className="userList">
        <h3>📋 User Records</h3>
        {users.length === 0 ? (
          <p className="noRecords">No users found.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>User ID</th>
                <th>Full Name</th>
                <th>Email</th>
                <th>Created At</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u, idx) => (
                <tr key={idx}>
                  <td>{u.userId}</td>
                  <td>{u.fullName}</td>
                  <td>{u.email}</td>
                  <td>{u.createdAt}</td>
                  <td style={{ color: u.isActive ? "green" : "red" }}>{u.isActive ? "Active" : "Inactive"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
