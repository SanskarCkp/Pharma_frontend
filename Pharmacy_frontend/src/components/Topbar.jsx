import React from "react";
import "./topbar.css";

export default function Topbar() {
  return (
    <div className="app-topbar">
      <input
        type="search"
        className="app-topbar__search"
        placeholder="Search medicines, invoices, suppliers..."
        aria-label="Search"
      />
      <div className="app-topbar__actions">
        <button className="app-topbar__icon-btn" type="button" aria-label="Notifications">
          <span className="icon">🔔</span>
          <span className="badge">3</span>
        </button>
        <div className="app-topbar__profile">
          <div className="app-topbar__avatar">A</div>
          <div className="app-topbar__profile-meta">
            <div className="app-topbar__name">Admin</div>
            <div className="app-topbar__role">Pharmacist</div>
          </div>
          <span className="icon">👤</span>
        </div>
      </div>
    </div>
  );
}
