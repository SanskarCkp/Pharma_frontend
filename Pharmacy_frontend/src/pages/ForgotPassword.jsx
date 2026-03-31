// src/pages/ForgotPassword.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { forgotPassword } from "../api/auth";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMsg("");
    setLoading(true);
    try {
      await forgotPassword(email);
      // show generic success message and proceed to OTP entry
      setMsg("If an account exists for this email, a 6-digit OTP was sent. Check your email.");
      // navigate to verify OTP screen and pass email in state (uid/token will come after OTP)
      navigate("/verify-otp", { state: { email } });
    } catch (err) {
      setMsg(err.message || "Failed to request OTP.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card max-w-md mx-auto p-6">
      <h2 className="text-xl font-semibold mb-4">Forgot Password</h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full rounded border px-3 py-2"
            placeholder="you@example.com"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-indigo-600 text-white py-2 rounded"
        >
          {loading ? "Sending..." : "Send OTP"}
        </button>
      </form>

      {msg && <p className="mt-4 text-sm">{msg}</p>}
    </div>
  );
}
