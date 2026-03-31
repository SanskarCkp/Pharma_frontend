// src/components/user/ResetPassword.jsx
import React, { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { forgotPassword, verifyOtp, resetPassword } from "../../api/auth";

export default function ResetPassword() {
  const location = useLocation();
  const navigate = useNavigate();
  const prefillEmail = location.state?.username || location.state?.email || "";

  const [step, setStep] = useState(1);
  const [email, setEmail] = useState(prefillEmail);
  const [otp, setOtp] = useState("");
  const [uid, setUid] = useState(null);
  const [token, setToken] = useState(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  const RESEND_SECONDS = 60;
  const [secondsLeft, setSecondsLeft] = useState(0);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (secondsLeft <= 0) { clearInterval(intervalRef.current); intervalRef.current = null; return; }
    if (!intervalRef.current) {
      intervalRef.current = setInterval(() => setSecondsLeft(s => Math.max(0, s - 1)), 1000);
    }
    return () => { clearInterval(intervalRef.current); intervalRef.current = null; };
  }, [secondsLeft]);

  const startCountdown = () => setSecondsLeft(RESEND_SECONDS);

  const handleSendOtp = async () => {
    setError(""); setInfo("");
    if (!email || !email.includes("@")) { setError("Please enter a valid email."); return; }
    setLoading(true);
    try {
      const res = await forgotPassword(email);
      setInfo(res?.detail || "If an account exists, an OTP was sent.");
      setStep(2);
      startCountdown();
    } catch (err) {
      setError(err.message || "Failed to request OTP.");
      console.error("forgotPassword error:", err);
    } finally { setLoading(false); }
  };

  const handleVerifyOtp = async () => {
    setError(""); setInfo("");
    if (!otp || otp.length !== 6) { setError("Please enter the 6-digit OTP."); return; }
    setLoading(true);
    try {
      const data = await verifyOtp(email, otp);
      setUid(data.uid); setToken(data.token);
      setStep(3); setInfo("OTP verified — set a new password.");
    } catch (err) {
      setError(err.message || "OTP verification failed."); console.error("verifyOtp error:", err);
    } finally { setLoading(false); }
  };

  const handleReset = async () => {
    setError(""); setInfo("");
    if (!newPassword || newPassword.length < 8) { setError("Password must be at least 8 characters."); return; }
    if (newPassword !== confirmPassword) { setError("Passwords do not match."); return; }
    if (!uid || !token) { setError("Missing verification data. Restart the flow."); return; }
    setLoading(true);
    try {
      const res = await resetPassword(uid, token, newPassword);
      setInfo(res?.detail || "Password updated successfully. Redirecting to login...");
      setTimeout(() => navigate("/login"), 1200);
    } catch (err) {
      setError(err.message || "Failed to reset password."); console.error("resetPassword error:", err);
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <div className="w-full max-w-md bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Reset Password</h2>

        {step === 1 && (
          <>
            <p className="text-sm text-gray-600 mb-4">Enter the email associated with your account. We'll send a 6-digit OTP to that email.</p>
            <label className="block text-sm mb-1">Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full border rounded px-3 py-2 mb-4" placeholder="you@example.com" />
            <button onClick={handleSendOtp} disabled={loading} className="w-full bg-indigo-600 text-white py-2 rounded">{loading ? "Sending..." : "Send OTP"}</button>
          </>
        )}

        {step === 2 && (
          <>
            <p className="text-sm text-gray-600 mb-3">Enter the 6-digit OTP sent to <strong>{email}</strong>.</p>
            <label className="block text-sm mb-1">OTP</label>
            <input type="text" value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g,"").slice(0,6))} maxLength={6} className="w-full border rounded px-3 py-2 mb-3" placeholder="123456" />
            <div className="flex gap-3">
              <button onClick={handleVerifyOtp} disabled={loading} className="flex-1 bg-indigo-600 text-white py-2 rounded">{loading ? "Verifying..." : "Verify OTP"}</button>
              <button onClick={() => { setStep(1); setOtp(""); setError(""); setInfo(""); }} className="px-3 py-2 border rounded">Edit Email</button>
            </div>
            <div className="mt-3 flex justify-between items-center text-sm">
              {secondsLeft > 0 ? <span>Resend in {secondsLeft}s</span> : <button onClick={handleSendOtp} className="text-indigo-600 underline">Resend OTP</button>}
              <button onClick={() => navigate("/login")} className="text-gray-600 hover:underline">Cancel</button>
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <p className="text-sm text-gray-600 mb-3">Set a new password for <strong>{email}</strong>.</p>
            <label className="block text-sm mb-1">New Password</label>
            <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="w-full border rounded px-3 py-2 mb-3" placeholder="Minimum 8 characters" />
            <label className="block text-sm mb-1">Confirm Password</label>
            <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="w-full border rounded px-3 py-2 mb-4" />
            <div className="flex gap-3">
              <button onClick={handleReset} disabled={loading} className="flex-1 bg-indigo-600 text-white py-2 rounded">{loading ? "Saving..." : "Save Password"}</button>
              <button onClick={() => { setStep(1); setEmail(""); setOtp(""); setUid(null); setToken(null); setNewPassword(""); setConfirmPassword(""); setError(""); setInfo(""); }} className="px-3 py-2 border rounded">Start Over</button>
            </div>
          </>
        )}

        <div className="mt-4 min-h-[1.25rem]">
          {error && <div className="text-sm text-rose-600">{error}</div>}
          {!error && info && <div className="text-sm text-emerald-600">{info}</div>}
        </div>

        <div className="mt-5 text-center">
          <button onClick={() => navigate("/login")} className="text-gray-600 hover:underline">Back to login</button>
        </div>
      </div>
    </div>
  );
}
