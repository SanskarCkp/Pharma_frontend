// src/pages/VerifyOtp.jsx
import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { verifyOtp } from "../api/auth";

export default function VerifyOtp() {
  const loc = useLocation();
  const preEmail = loc.state?.email || "";
  const [email] = useState(preEmail);
  const [otp, setOtp] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErr("");
    setLoading(true);
    try {
      const data = await verifyOtp(email, otp);
      // navigate to set new password and pass uid & token (ephemeral)
      navigate("/set-new-password", { state: { uid: data.uid, token: data.token, email } });
    } catch (error) {
      setErr(error.message || "OTP verification failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card max-w-md mx-auto p-6">
      <h2 className="text-xl font-semibold mb-4">Verify OTP</h2>
      <p className="text-sm mb-4">
        Enter the 6-digit OTP sent to <strong>{email || "your email"}</strong>.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">OTP</label>
          <input
            type="text"
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
            inputMode="numeric"
            pattern="\d{6}"
            required
            className="w-full rounded border px-3 py-2"
            placeholder="123456"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-indigo-600 text-white py-2 rounded"
        >
          {loading ? "Verifying..." : "Verify OTP"}
        </button>
      </form>

      {err && <div className="mt-3 text-sm text-red-600">{err}</div>}
      <div className="mt-3 text-sm">
        <button onClick={() => navigate("/forgot-password")} className="underline">
          Edit email
        </button>
      </div>
    </div>
  );
}
