import React from "react";
import { Link, useLocation } from "react-router-dom";
import "../styles/reports.css";

const TABS = [
  { path: "/reports/sales", label: "Sales Report" },
  { path: "/reports/purchases", label: "Purchase Report" },
  { path: "/reports/expiry", label: "Expiry Report" },
];

export default function ReportTabs() {
  const location = useLocation();

  return (
    <div className="report-tabs">
      {TABS.map((tab) => (
        <Link
          key={tab.path}
          to={tab.path}
          className={location.pathname === tab.path ? "report-tab active" : "report-tab"}
        >
          {tab.label}
        </Link>
      ))}
    </div>
  );
}
