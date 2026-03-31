// src/components/user/login.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Logo from "../common/logo";
import MedicalCarousel from "../common/MedicalCarousel";
import { login as apiLogin } from "../../api/auth";
import { fetchUsersFromBackend } from "../../api/users";

export default function Login() {
  const [form, setForm] = useState({ username: "", password: "" });
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [carouselOn, setCarouselOn] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [userList, setUserList] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    async function load() {
      try {
        const data = await fetchUsersFromBackend();
        const arr = Array.isArray(data) ? data : (data ? [data] : []);
        const normalized = arr.map((u) => {
          const username = u.username ?? u.email ?? "";
          const first = u.first_name ?? "";
          const last = u.last_name ?? "";
          const fullName = u.full_name || `${first} ${last}`.trim() || username;
          return { email: u.email ?? username, username, fullName };
        });
        setUserList(normalized);
      } catch (e) {
        console.warn("Failed to load users from backend, falling back to localStorage", e);
        try {
          const stored = localStorage.getItem("app_users");
          if (stored) {
            const parsed = JSON.parse(stored);
            setUserList(parsed.map((u) => ({ email: u.email, username: u.email, fullName: u.fullName || "" })));
          }
        } catch (err) {}
      }
    }
    load();
  }, []);

  const onChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const onSubmit = async (e) => {
    e.preventDefault();
    setErr("");
    setLoading(true);
    try {
      await apiLogin(form.username, form.password);
      setCarouselOn(true);
      setTimeout(() => {
        setCarouselOn(false);
        navigate("/dashboard", { replace: true });
      }, 1200);
    } catch (error) {
      setErr(error.message || "Invalid credentials. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-gray-50">
      <img src="/assets/medical-bg.jpg" alt="medical background" className="absolute inset-0 w-full h-full object-cover" />
      <div className="absolute inset-0 bg-[#BEE3F8]/65" />
      <Logo />

      <div className="z-30 relative w-full max-w-[980px] px-4">
        <div className="mx-auto flex items-center justify-center gap-8">
          <div style={{ width: 420 }} />
          <div aria-live="polite" onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)} className="relative" style={{ width: 420 }}>
            <div className="origin-top transition-all duration-450" style={{ transformOrigin: "top center", perspective: 800 }}>
              <div className="relative rounded-xl bg-white/95 backdrop-blur-sm overflow-hidden shadow" style={{ border: "1px solid rgba(0,0,0,0.04)" }}>
                <div className="px-6 py-6 text-center select-none">
                  <h2 className="text-2xl font-semibold text-slate-800">Login to an account</h2>
                </div>

                <div className="px-6 overflow-hidden" style={{ transition: "max-height 420ms", maxHeight: hovered ? 420 : 0 }}>
                  <div className="pt-4 pb-6" style={{ transform: hovered ? "translateY(0)" : "translateY(-10px)", opacity: hovered ? 1 : 0 }}>
                    <form onSubmit={onSubmit} className="space-y-5">
                      <div>
                        <label className="text-sm font-medium text-gray-700">User (Name / Email) <span className="text-rose-500">*</span></label>
                        <select name="username" value={form.username} onChange={onChange} className="mt-2 block w-full rounded-md border px-3 py-3">
                          <option value="">Select user</option>
                          {userList.map((u, idx) => (
                            <option key={idx} value={u.email || u.username}>
                              {u.fullName ? `${u.fullName} (${u.email || u.username})` : (u.email || u.username)}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="text-sm font-medium text-gray-700">Password <span className="text-rose-500">*</span></label>
                        <div className="relative mt-2">
                          <input name="password" type={showPwd ? "text" : "password"} value={form.password} onChange={onChange} className="block w-full rounded-md border px-3 py-3 pr-14" placeholder="Enter password" />
                          <button type="button" onClick={() => setShowPwd(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">{showPwd ? "Hide" : "Show"}</button>
                        </div>
                      </div>

                      {err && <div className="text-sm text-rose-600">{err}</div>}

                      <div>
                        <button type="submit" disabled={loading} className="w-full rounded-md bg-emerald-600 text-white py-3">{loading ? "Logging in..." : "Login"}</button>
                      </div>

                      <div className="flex items-center justify-between text-xs mt-1">
                        <button type="button" className="text-gray-600 hover:underline" onClick={() => navigate("/reset-password")}>Forgot password?</button>
                        <button type="button" className="text-gray-600 hover:underline" onClick={() => navigate("/users")}>Create user</button>
                      </div>
                    </form>
                  </div>
                </div>
              </div>

              <div className="absolute left-4 right-4 -bottom-3 rounded-lg pointer-events-none transition-opacity duration-300" style={{ height: 20 }} />
            </div>
          </div>
          <div style={{ width: 420 }} />
        </div>
      </div>

      <MedicalCarousel show={carouselOn} />
    </div>
  );
}
