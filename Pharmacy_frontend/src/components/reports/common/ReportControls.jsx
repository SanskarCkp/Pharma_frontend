import React from "react";
import "../styles/reports.css";

export default function ReportControls({
  showMonthFilter = false,
  monthsRange,
  onMonthsChange,
  onExport,
  children
}) {
  return (
    <div className="report-controls">
      {showMonthFilter && (
        <select
          className="report-select"
          value={monthsRange}
          onChange={(e) => onMonthsChange(e.target.value)}
        >
          <option>Last 6 Months</option>
          <option>Last 10 Months</option>
          <option>Last 12 Months</option>
        </select>
      )}
      {children}
      {onExport && (
        <button className="report-export-btn" onClick={onExport}>
          Export
        </button>
      )}
    </div>
  );
}
