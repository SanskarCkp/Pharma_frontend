import React from "react";
import "../styles/reports.css";

export default function KPICard({ title, value, subtitle, variant = "default" }) {
  return (
    <div className={`kpi-card kpi-card-${variant}`}>
      <p className="kpi-label">{title}</p>
      <h3 className="kpi-value">{value}</h3>
      {subtitle && <span className="kpi-subtitle">{subtitle}</span>}
    </div>
  );
}
