// src/components/users/UserList.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./users.css";
import { fetchUsersFromBackend } from "../../api/users";
import UserCreate from "./UserCreate";

const STORAGE_KEY = "app_users";

const getNextUserId = (users) => {
  const maxNum = users.reduce((max, u) => {
    const raw = String(u.userId || "");
    const num = parseInt(raw.replace("USR", ""), 10);
    if (isNaN(num)) return max;
    return Math.max(max, num);
  }, 0);

  const nextNum = maxNum + 1 || 1;
  return `USR${String(nextNum).padStart(3, "0")}`;
};

export default function UserList() {
  const [users, setUsers] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    loadLocalUsers();
    loadUsersFromBackend();
  }, []);

  function loadLocalUsers() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setUsers(parsed);
        }
      }
    } catch (e) {
      console.error("Failed to load users from localStorage", e);
    }
  }

  async function loadUsersFromBackend() {
    try {
      const data = await fetchUsersFromBackend();

      const normalized = (Array.isArray(data) ? data : []).map((u, idx) => {
        const firstLast = `${u.first_name || ""} ${u.last_name || ""}`.trim();
        return {
          userId: u.userId || `USR${String(u.id || idx + 1).padStart(3, "0")}`,
          fullName: u.full_name || firstLast || u.username || "",
          email: u.email || "",
          createdAt: u.created_at || u.date_joined || "",
          isActive: u.is_active ?? u.isActive ?? true,
        };
      });

      if (normalized.length) {
        setUsers(normalized);
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
        } catch {}
      }
    } catch (err) {
      console.warn("Could not load users from backend:", err);
    }
  }

  const nextUserId = getNextUserId(users);

  return (
    <div className="users-page">
      <div className="users-shell">
        {/* Header row */}
        <div className="users-header">
          <div className="users-header-left">
            <button
              type="button"
              className="users-back-btn"
              onClick={() => navigate(-1)}
            >
              ← Back
            </button>
            <div className="users-title-block">
              <h2 className="users-title">Users</h2>
              <p className="users-subtitle">Manage all application users</p>
            </div>
          </div>

          <button
            className="users-add-btn"
            type="button"
            onClick={() => setShowCreate(true)}
          >
            + Add User
          </button>
        </div>

        {/* Card with table */}
        <div className="users-card">
          <h3 className="users-card-title">User Records</h3>
          {users.length === 0 ? (
            <div className="users-empty-row">
              No users yet. Click <strong>Add User</strong>.
            </div>
          ) : (
            <div className="userList">
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
                      <td style={{ color: u.isActive ? "green" : "red" }}>
                        {u.isActive ? "Active" : "Inactive"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {showCreate && (
        <UserCreate
          nextUserId={nextUserId}
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            loadUsersFromBackend();
            setShowCreate(false);
          }}
        />
      )}
    </div>
  );
}
