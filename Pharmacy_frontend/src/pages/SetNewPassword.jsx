// src/pages/SetNewPassword.jsx
import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { resetPasswordApi } from "../api/auth";

export default function SetNewPassword() {
  const loc = useLocation();
  const navigate = useNavigate();
  const state = loc.state || {};
  const { uid, token, email } = state;

  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // If user reached this page directly, send them back to start
    if (!uid || !token) {
      navigate("/forgot-password");
    }
  }, [uid, token, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErr("");
    setMsg("");

    if (newPassword !== confirm) {
      setErr("Passwords do not match.");
      return;
    }

    // Optional: you can add client-side password strength checks here

    setLoading(true);
    try {
      await resetPasswordApi(uid, token, newPassword);
      setMsg("Password updated successfully. Redirecting to login...");
      setTimeout(() => navigate("/login"), 1200);
    } catch (error) {
      setErr(error.message || "Failed to reset password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card max-w-md mx-auto p-6">
      <h2 className="text-xl font-semibold mb-4">Set New Password</h2>
      {email && <p className="text-sm mb-3">For: <strong>{email}</strong></p>}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">New password</label>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            className="w-full rounded border px-3 py-2"
            placeholder="Enter new password"
            minLength={8}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Confirm password</label>
          <input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
            className="w-full rounded border px-3 py-2"
            placeholder="Confirm password"
            minLength={8}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-indigo-600 text-white py-2 rounded"
        >
          {loading ? "Saving..." : "Save Password"}
        </button>
      </form>

      {err && <div className="mt-3 text-sm text-red-600">{err}</div>}
      {msg && <div className="mt-3 text-sm text-green-600">{msg}</div>}
    </div>
  );
}
