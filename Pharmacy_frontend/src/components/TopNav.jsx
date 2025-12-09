// src/components/TopNav.jsx
import React from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { MedicalCrossLogo } from "./common/logo";

export default function TopNav() {
  const navigate = useNavigate();
  const { logout, isAuthenticated } = useAuth();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const isLoggedIn = Boolean(isAuthenticated);

  return (
    <header className="w-full bg-white shadow-sm fixed top-0 left-0 right-0 z-50">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
        {/* Logo / Brand (left) */}
        <div
          className="flex items-center gap-3 cursor-pointer"
          onClick={() => navigate("/dashboard")}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === "Enter") navigate("/dashboard"); }}
        >
          <MedicalCrossLogo size={32} />
          <span className="font-semibold text-lg">Pharmacy App</span>
        </div>

        {/* Right: logout button (only show when logged in) */}
        <div className="flex items-center gap-3">
          {isLoggedIn && (
            <button
              onClick={handleLogout}
              aria-label="Log out"
              title="Log out"
              className="flex items-center gap-2 px-3 py-1 rounded-md hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M7 8v8a2 2 0 002 2h6" />
              </svg>
              <span className="hidden sm:inline text-sm">Logout</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
