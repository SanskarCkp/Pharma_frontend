// src/components/users/UserList.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./users.css";
import {
  fetchUsersFromBackend,
  deleteUserFromBackend,
  updateUserOnBackend,
} from "../../api/users";
import UserCreate from "./UserCreate";
import { useAlert } from "../ui/alert-provider";

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

const formatDateTime = (value) => {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString();
};

export default function UserList() {
  const { showAlert } = useAlert();
  const [users, setUsers] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
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
          id: u.id,
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

  const updateLocalUsers = (updated) => {
    setUsers(updated);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch {}
  };

  async function handleToggleStatus(user) {
    const targetStatus = !user.isActive;
    try {
      if (user.id) {
        await updateUserOnBackend(user.id, { is_active: targetStatus });
      }
      const updated = users.map((u) =>
        u.userId === user.userId ? { ...u, isActive: targetStatus } : u
      );
      updateLocalUsers(updated);
    } catch (err) {
      console.error("Failed to update status", err);
      showAlert("Failed to update status on server.", "Error");
    }
  }

  async function handleDelete(user) {
    const confirmDelete = window.confirm(`Delete user ${user.fullName}?`);
    if (!confirmDelete) return;
    try {
      if (user.id) {
        await deleteUserFromBackend(user.id);
      }
      const remaining = users.filter((u) => u.userId !== user.userId);
      updateLocalUsers(remaining);
    } catch (err) {
      console.error("Failed to delete user", err);
      showAlert("Failed to delete user on server.", "Error");
    }
  }

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
            &lt; Back
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
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u, idx) => (
                    <tr key={idx}>
                      <td>{u.userId}</td>
                      <td>{u.fullName}</td>
                      <td>{u.email}</td>
                      <td>{formatDateTime(u.createdAt)}</td>
                      <td style={{ color: u.isActive ? "green" : "red" }}>
                        {u.isActive ? "Active" : "Inactive"}
                      </td>
                      <td>
                        <div className="users-actions">
                          <button type="button" onClick={() => setEditingUser(u)}>
                            Edit
                          </button>
                          <button type="button" onClick={() => handleToggleStatus(u)}>
                            {u.isActive ? "Disable" : "Activate"}
                          </button>
                          <button
                            type="button"
                            className="danger"
                            onClick={() => handleDelete(u)}
                          >
                            Delete
                          </button>
                        </div>
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
      {editingUser && (
        <UserCreate
          mode="edit"
          user={editingUser}
          nextUserId={nextUserId}
          onClose={() => setEditingUser(null)}
          onUpdated={(updatedUser) => {
            const merged = users.map((u) =>
              u.userId === (updatedUser?.userId || u.userId) ? { ...u, ...updatedUser } : u
            );
            updateLocalUsers(merged);
            setEditingUser(null);
          }}
        />
      )}
    </div>
  );
}
