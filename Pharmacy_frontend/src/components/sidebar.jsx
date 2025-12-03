// src/components/sidebar.jsx
import React from "react";
import { NavLink, useNavigate } from "react-router-dom";

import {
  LayoutDashboard,
  Settings,
  Package,
  ChevronDown,
  ChevronRight,
  Smartphone,
  Boxes,
  ShieldAlert,
  FileSignature,
  RefreshCcw,
  Receipt,
  Box,
  Pill,
  Layers,
  ShoppingBag,
  BookText,
  Undo2,
  ArrowLeftRight,
  FileText,
  ReceiptText,
  ClipboardCheck,
  ClipboardList,
  UserCog,
  Store,
  UserCircle,
  ShieldCheck,
  MapPin,
  ShoppingCart,
  FlaskRound,
  CreditCard,
  FolderTree,
  Hourglass,
  BarChart2,
  LogOut,
} from "lucide-react";
import "./Sidebar.css";

// ⬅️ use the logout from api/auth instead of ../utils/logout
import { logout as clearAuthTokens } from "../api/auth";

const Sidebar = () => {
  const navigate = useNavigate();

  const otherMenuItems = [
    { path: "/dashboard", label: "Dashboard", icon: <LayoutDashboard size={18} /> },
    { path: "/inventory/medicines/", label: "Inventory Management", icon: <Boxes size={18} /> },
    { path: "/billgeneration/billlist", label: "Billing", icon: <FileText size={18} /> },
    { path: "/reports/sales", label: "Reports", icon: <BarChart2 size={18} /> },
    { path: "/masters/vendors", label: "Suppliers", icon: <Store size={18} /> },
    { path: "/masters/customers", label: "Customers", icon: <UserCircle size={18} /> },
    { path: "/expiryalrets", label: "Expiry Alerts", icon: <Hourglass size={18} /> },
    { path: "/settings", label: "Settings", icon: <ShoppingCart size={18} /> },

    
    // { path: "/retention-policies", label: "Retention Policies", icon: <ShoppingCart size={18} /> },
    // { path: "/rackrules", label: "Rack Rules", icon: <Layers size={18} /> },
    // { path: "/batchlots", label: "Batch Lots", icon: <Box size={18} /> },
    // { path: "/purchases", label: "Purchases", icon: <ShoppingBag size={18} /> },
    // { path: "/consentledger", label: "Consent Ledger", icon: <BookText size={18} /> },
    // { path: "/vendorreturns", label: "Vendor Returns", icon: <Undo2 size={18} /> },
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
    try {
      // remove access + refresh tokens from localStorage
      clearAuthTokens();
    } catch (e) {
      console.warn("Failed to clear tokens on logout:", e);
    }
    // send user to login immediately
    navigate("/login", { replace: true });
  };

  return (
    <div className="sidebar-container">
      {/* Header */}
      <div className="sidebar-header">
        <div className="sidebar-logo-wrap">
          <img
            src="https://image2url.com/images/1762228868711-92532987-d9ed-48dc-902b-ffb845d41cdc.jpeg"
            alt="logo"
            className="sidebar-logo"
          />
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
          className={({ isActive }) => `sidebar-link ${isActive ? "active" : ""}`}
        >
          <span className="sidebar-icon"><Layers size={18} /></span>
          <span className="sidebar-label">Masters</span>
        </NavLink>

        {/* Other Menu Items */}
        {otherMenuItems.map((item, idx) => (
          <NavLink
            key={idx}
            to={item.path}
            className={({ isActive }) => `sidebar-link ${isActive ? "active" : ""}`}
          >
            <span className="sidebar-icon">{item.icon}</span>
            <span className="sidebar-label">{item.label}</span>
          </NavLink>
        ))}

        {/* 🔥 LOGOUT BUTTON */}
        <button
          type="button"
          onClick={handleLogoutClick}
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
  );
};

export default Sidebar;
