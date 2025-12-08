import React from "react";
import "../styles/reports.css";

export default function ReportLayout({ title, subtitle, children, headerActions }) {
  return (
    <div className="report-wrap">
      <div className="report-header">
        <div>
          <h2 className="report-title">{title}</h2>
          <p className="report-subtitle">{subtitle}</p>
        </div>
        {headerActions && <div className="report-header-actions">{headerActions}</div>}
      </div>
      {children}
    </div>
  );
}
