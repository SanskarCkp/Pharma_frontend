// src/components/sidebar.jsx
import React, { useState } from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";

import {
  LayoutDashboard,
  Boxes,
  Layers,
  FileText,
  Store,
  UserCircle,
  ShoppingCart,
  Hourglass,
  BarChart2,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { MedicalCrossLogo } from "./common/logo";
import "./Sidebar.css";

// ⬅️ use the logout from api/auth instead of ../utils/logout
import { useAuth } from "../context/AuthContext";

const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { logout } = useAuth();

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen((prev) => !prev);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  const otherMenuItems = [
    { path: "/dashboard", activeMatch: "/dashboard", label: "Dashboard", icon: <LayoutDashboard size={18} /> },
    { path: "/inventory/medicines/", activeMatch: "/inventory", label: "Inventory", icon: <Boxes size={18} /> },
    { path: "/billgeneration/billlist", activeMatch: "/billgeneration", label: "Billing", icon: <FileText size={18} /> },
    { path: "/reports/sales", activeMatch: "/reports", label: "Reports", icon: <BarChart2 size={18} /> },
    { path: "/suppliers", activeMatch: "/suppliers", label: "Suppliers", icon: <Store size={18} /> },
    { path: "/masters/customers", activeMatch: "/masters/customers", label: "Customers", icon: <UserCircle size={18} /> },
    { path: "/expiryalrets", activeMatch: "/expiryalrets", label: "Expiry Alerts", icon: <Hourglass size={18} /> },
    { path: "/settings", activeMatch: "/settings", label: "Settings", icon: <ShoppingCart size={18} /> },

    
    // { path: "/retention-policies", label: "Retention Policies", icon: <ShoppingCart size={18} /> },
    // { path: "/consentledger", label: "Consent Ledger", icon: <BookText size={18} /> },
    // { path: "/vendorreturns", label: "Supplier Returns", icon: <Undo2 size={18} /> },
    // { path: "/transferlines", label: "Transfer Lines", icon: <ArrowLeftRight size={18} /> },
    // { path: "/prescriptions", label: "Prescriptions", icon: <FileText size={18} /> },
    // { path: "/saleslines", label: "Sales Lines", icon: <ReceiptText size={18} /> },
    // { path: "/h1registerentries", label: "Register Entries", icon: <ClipboardCheck size={18} /> },
    // { path: "/ndpsdailyentries", label: "NDPS Daily Entries", icon: <ClipboardList size={18} /> },
    // { path: "/user-devices", label: "User Devices", icon: <Smartphone size={18} /> },
    // { path: "/transfer-vouchers", label: "Transfer Vouchers", icon: <ArrowLeftRight size={18} /> },
    // { path: "/breach-logs", label: "Breach Logs", icon: <ShieldAlert size={18} /> },
    // { path: "/audit-logs", label: "Audit Logs", icon: <FileSignature size={18} /> },
    // { path: "/recall-events", label: "Recall Events", icon: <RefreshCcw size={18} /> },
    // { path: "/purchase-lines", label: "Purchase Lines", icon: <ShoppingCart size={18} /> },
    // { path: "/sales-invoices", label: "Sales Invoices", icon: <Receipt size={18} /> },
    // { path: "/unitofmeasurement", label: "Unit of Measurement", icon: <Pill size={18} /> },
    // { path: "/medicineforms", label: "Medicine Forms", icon: <Pill size={18} /> },
    // { path: "/medicinecategories", label: "Medicine Categories", icon: <FolderTree size={18} /> },

  ];

  // 🔥 real logout handler
  const handleLogoutClick = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <>
      {/* Mobile Header with Hamburger and Logo */}
      <div className="mobile-header">
        <button
          className="hamburger-btn"
          onClick={toggleMobileMenu}
          aria-label="Toggle menu"
        >
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
          <div className="mobile-logo-wrap">
            <MedicalCrossLogo size={40} />
            <span className="mobile-brand">Keshav Medicals</span>
          </div>
      </div>

      {/* Overlay for mobile */}
      {isMobileMenuOpen && (
        <div
          className="sidebar-overlay"
          onClick={closeMobileMenu}
        />
      )}

      {/* Sidebar */}
      <div className={`sidebar-container ${isMobileMenuOpen ? 'mobile-open' : ''}`}>
        {/* Header */}
        <div className="sidebar-header">
          <div className="sidebar-logo-wrap">
            <MedicalCrossLogo size={48} />
            <div className="sidebar-brand-multi">
              <span className="brand-line1">Keshav Medicals</span>
              <span className="brand-line2">Management System</span>
            </div>
          </div>
        </div>

        <nav className="sidebar-menu">
        {/* Masters */}
        <NavLink
          to="/masters"
          onClick={closeMobileMenu}
          className={() => {
            // Exclude suppliers, customers, and products so they have their own highlighting
            const isExcluded = location.pathname.startsWith("/suppliers") ||
                              location.pathname.startsWith("/masters/customers") ||
                              location.pathname.startsWith("/masters/products");

            if (isExcluded) {
              return "sidebar-link";
            }

            const masterMatches = ["/masters", "/medicinecategories", "/medicineforms", "/unitofmeasurement", "/hsncode"];
            const active = masterMatches.some(
              (m) => location.pathname === m || location.pathname.startsWith(`${m}/`)
            );
            return `sidebar-link ${active ? "active" : ""}`;
          }}
        >
          <span className="sidebar-icon"><Layers size={18} /></span>
          <span className="sidebar-label">Masters</span>
        </NavLink>

        {/* Other Menu Items */}
        {otherMenuItems.map((item, idx) => (
          <NavLink
            key={idx}
            to={item.path}
            onClick={closeMobileMenu}
            className={() => {
              let active = location.pathname.startsWith(item.activeMatch);

              // Special case for Suppliers: also match Supplier-related product pages
              if (item.label === "Suppliers" && location.pathname.startsWith("/masters/products")) {
                active = true;
              }

              return `sidebar-link ${active ? "active" : ""}`;
            }}
          >
            <span className="sidebar-icon">{item.icon}</span>
            <span className="sidebar-label">{item.label}</span>
          </NavLink>
        ))}

        {/* 🔥 LOGOUT BUTTON */}
        <button
          type="button"
          onClick={() => {
            handleLogoutClick();
            closeMobileMenu();
          }}
          className="sidebar-link logout-btn"
          style={{
            marginTop: "20px",
            color: "#e53935",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            fontWeight: 600,
            border: "none",
            background: "transparent",
            cursor: "pointer",
          }}
        >
          <span className="sidebar-icon">
            <LogOut size={18} />
          </span>
          <span className="sidebar-label">Logout</span>
        </button>
      </nav>
      </div>
    </>
  );
};

export default Sidebar;
