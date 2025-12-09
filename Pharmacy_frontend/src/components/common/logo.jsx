// src/components/common/logo.jsx
import React from "react";

// Medical Cross Logo Component (Red square, white square, green cross)
export const MedicalCrossLogo = ({ size = 56, className = "" }) => {
  return (
    <div
      className={`flex items-center justify-center flex-shrink-0 ${className}`}
      style={{
        width: size,
        height: size,
      }}
      aria-hidden
    >
      <svg width={size} height={size} viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Outer red square with rounded corners */}
        <rect x="0" y="0" width="56" height="56" rx="12" fill="#dc2626" />
        {/* Middle white square with rounded corners */}
        <rect x="6" y="6" width="44" height="44" rx="8" fill="#ffffff" />
        {/* Inner green cross - vertical bar */}
        <rect x="24" y="18" width="8" height="20" rx="2" fill="#22c55e" />
        {/* Inner green cross - horizontal bar */}
        <rect x="18" y="24" width="20" height="8" rx="2" fill="#22c55e" />
      </svg>
    </div>
  );
};

export default function Logo() {
  return (
    <div
      className="absolute top-5 left-5 z-50 flex items-center gap-3 p-2 rounded-lg"
      style={{
        background: "rgba(255,255,255,0.08)",
        backdropFilter: "blur(6px)",
        WebkitBackdropFilter: "blur(6px)",
      }}
    >
      {/* Medical Cross Logo */}
      <MedicalCrossLogo size={56} />

      {/* brand text (keeps compact) */}
      <div className="flex flex-col leading-tight select-none">
        <span className="text-white font-extrabold text-[16px] tracking-wide drop-shadow-sm">
          KESHAV MEDICALS
        </span>
        <span className="text-white font-semibold text-[13px] opacity-95 -mt-0.5">
          CENTRE
        </span>
      </div>
    </div>
  );
}
