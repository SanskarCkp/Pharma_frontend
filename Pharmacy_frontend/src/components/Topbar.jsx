import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { authFetch } from "../api/http";
import "./topbar.css";

const API_BASE_URL = import.meta.env.VITE_API_URL;

export default function Topbar() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState({
    medicines: [],
    suppliers: [],
    customers: [],
    pages: [],
  });
  const [showResults, setShowResults] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const searchRef = useRef(null);
  const notifRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowResults(false);
      }
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Static page links for quick navigation search
  const staticPageLinks = [
    { label: "Dashboard", path: "/dashboard", keywords: "home overview" },
    { label: "Inventory - Medicines", path: "/inventory/medicines", keywords: "inventory medicines stock" },
    { label: "Add Medicine", path: "/inventory/medicines/add", keywords: "inventory add medicine" },
    { label: "Suppliers", path: "/suppliers", keywords: "vendors procurement" },
    { label: "Add Supplier", path: "/suppliers/add", keywords: "vendor new supplier" },
    { label: "Customers", path: "/customers", keywords: "clients customer directory" },
    { label: "Add Customer", path: "/customers/add", keywords: "customer new" },
    { label: "Billing - Bill List", path: "/billgeneration/billlist", keywords: "billing invoices bills" },
    { label: "Billing - Generate", path: "/billgeneration/generate", keywords: "billing create invoice" },
    { label: "Masters", path: "/masters", keywords: "masters admin" },
    { label: "Masters - Roles", path: "/masters/roles", keywords: "roles permissions" },
    { label: "Masters - Locations", path: "/masters/locations", keywords: "locations warehouse shop" },
    { label: "Masters - Products", path: "/masters/products", keywords: "products catalog" },
    { label: "Masters - Payment Terms", path: "/masters/payment-terms", keywords: "payment terms" },
    { label: "Masters - Rack Locations", path: "/masters/rack-locations", keywords: "rack locations" },
    { label: "Reports - Sales", path: "/reports/sales", keywords: "report sales" },
    { label: "Reports - Purchases", path: "/reports/purchases", keywords: "report purchase" },
    { label: "Reports - Expiry", path: "/reports/expiry", keywords: "report expiry" },
    { label: "Reports - Top Selling", path: "/reports/top-selling", keywords: "report top selling" },
    { label: "Expiry Alerts", path: "/expiryalrets", keywords: "expiry alerts" },
    { label: "Settings", path: "/settings", keywords: "settings configuration" },
    { label: "Retention Policies", path: "/retention-policies", keywords: "retention policies" },
    { label: "Consent Ledger", path: "/consentledger", keywords: "consent ledger" },
    { label: "Vendor Returns", path: "/vendorreturns", keywords: "vendor returns" },
    { label: "Transfer Lines", path: "/transferlines", keywords: "transfer lines" },
    { label: "Prescriptions", path: "/prescriptions", keywords: "prescriptions" },
    { label: "Sales Lines", path: "/saleslines", keywords: "sales lines" },
    { label: "H1 Register Entries", path: "/h1registerentries", keywords: "h1 register" },
    { label: "NDPS Daily Entries", path: "/ndpsdailyentries", keywords: "ndps daily" },
    { label: "User Devices", path: "/user-devices", keywords: "user devices" },
    { label: "Transfer Vouchers", path: "/transfer-vouchers", keywords: "transfer vouchers" },
    { label: "Breach Logs", path: "/breach-logs", keywords: "breach logs" },
    { label: "Audit Logs", path: "/audit-logs", keywords: "audit logs" },
    { label: "Recall Events", path: "/recall-events", keywords: "recall events" },
    { label: "Purchase Lines", path: "/purchase-lines", keywords: "purchase lines" },
    { label: "Sales Invoices", path: "/sales-invoices", keywords: "sales invoices" },
    { label: "Unit of Measurement", path: "/unitofmeasurement", keywords: "unit measurement" },
    { label: "Medicine Forms", path: "/medicineforms", keywords: "medicine forms" },
    { label: "Medicine Categories", path: "/medicinecategories", keywords: "medicine categories" },
  ];

  // Search function with debounce
  useEffect(() => {
    if (searchQuery.trim().length < 2) {
      setSearchResults({ medicines: [], suppliers: [], customers: [], pages: [] });
      setShowResults(false);
      return;
    }

    const debounceTimer = setTimeout(() => {
      performSearch(searchQuery);
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [searchQuery]);

  const performSearch = async (query) => {
    setLoading(true);
    try {
      const queryLower = query.toLowerCase();
      const pageMatches = staticPageLinks
        .filter(
          (p) =>
            p.label.toLowerCase().includes(queryLower) ||
            p.keywords.toLowerCase().includes(queryLower) ||
            p.path.toLowerCase().includes(queryLower)
        )
        .slice(0, 8);

      const [medicinesRes, suppliersRes, customersRes] = await Promise.all([
        authFetch(`${API_BASE_URL}/api/v1/inventory/medicines/?search=${encodeURIComponent(query)}`).catch(() => null),
        authFetch(`${API_BASE_URL}/api/v1/procurement/vendors/?search=${encodeURIComponent(query)}`).catch(() => null),
        authFetch(`${API_BASE_URL}/api/v1/customers/?search=${encodeURIComponent(query)}`).catch(() => null),
      ]);

      const medicines = medicinesRes?.ok ? (await medicinesRes.json()).results?.slice(0, 5) || [] : [];
      const suppliers = suppliersRes?.ok ? (await suppliersRes.json()).results?.slice(0, 5) || [] : [];
      const customers = customersRes?.ok ? (await customersRes.json()).results?.slice(0, 5) || [] : [];

      setSearchResults({ medicines, suppliers, customers, pages: pageMatches });
      setShowResults(true);
    } catch (error) {
      console.error("Search error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleResultClick = (type, idOrPath) => {
    setShowResults(false);
    setSearchQuery("");

    if (type === "medicine") {
      navigate(`/inventory/medicines/${idOrPath}`);
    } else if (type === "supplier") {
      navigate(`/suppliers/viewdetails/${idOrPath}`);
    } else if (type === "customer") {
      navigate(`/customers/${idOrPath}`);
    } else if (type === "page") {
      navigate(idOrPath);
    }
  };

  const totalResults =
    searchResults.medicines.length +
    searchResults.suppliers.length +
    searchResults.customers.length +
    searchResults.pages.length;

  return (
    <div className="app-topbar">
      <div className="search-container" ref={searchRef}>
        <input
          type="search"
          className="app-topbar__search"
          placeholder="Search medicines, invoices, suppliers..."
          aria-label="Search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onFocus={() => searchQuery.trim().length >= 2 && setShowResults(true)}
        />

        {showResults && (
          <div className="search-results-dropdown">
            {loading ? (
              <div className="search-loading">Searching...</div>
            ) : totalResults === 0 ? (
              <div className="search-no-results">No results found</div>
            ) : (
              <>
                {searchResults.pages.length > 0 && (
                  <div className="search-section">
                    <div className="search-section-title">Pages</div>
                    {searchResults.pages.map((page) => (
                      <div
                        key={page.path}
                        className="search-result-item"
                        onClick={() => handleResultClick("page", page.path)}
                      >
                        <span className="search-icon">⇢</span>
                        <div className="search-item-content">
                          <div className="search-item-name">{page.label}</div>
                          <div className="search-item-detail">{page.path}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {searchResults.medicines.length > 0 && (
                  <div className="search-section">
                    <div className="search-section-title">Medicines</div>
                    {searchResults.medicines.map((med) => (
                      <div
                        key={med.id}
                        className="search-result-item"
                        onClick={() => handleResultClick("medicine", med.id)}
                      >
                        <span className="search-icon">💊</span>
                        <div className="search-item-content">
                          <div className="search-item-name">{med.name || med.medicine_name}</div>
                          <div className="search-item-detail">
                            {med.generic_name ? `${med.generic_name} • ` : ""}
                            {med.manufacturer || ""}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {searchResults.suppliers.length > 0 && (
                  <div className="search-section">
                    <div className="search-section-title">Suppliers</div>
                    {searchResults.suppliers.map((supplier) => (
                      <div
                        key={supplier.id}
                        className="search-result-item"
                        onClick={() => handleResultClick("supplier", supplier.id)}
                      >
                        <span className="search-icon">🏪</span>
                        <div className="search-item-content">
                          <div className="search-item-name">
                            {supplier.vendor_name || supplier.name || supplier.company_name}
                          </div>
                          <div className="search-item-detail">
                            {supplier.vendor_contact || supplier.phone || ""}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {searchResults.customers.length > 0 && (
                  <div className="search-section">
                    <div className="search-section-title">Customers</div>
                    {searchResults.customers.map((customer) => (
                      <div
                        key={customer.id}
                        className="search-result-item"
                        onClick={() => handleResultClick("customer", customer.id)}
                      >
                        <span className="search-icon">👤</span>
                        <div className="search-item-content">
                          <div className="search-item-name">{customer.name}</div>
                          <div className="search-item-detail">
                            {customer.phone || customer.email || ""}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      <div className="app-topbar__actions">
        <div className="notif-wrapper" ref={notifRef}>
          <button
            className="app-topbar__icon-btn"
            type="button"
            aria-label="Notifications"
            onClick={() => setShowNotifications((prev) => !prev)}
          >
            <span className="icon">🔔</span>
            <span className="badge">0</span>
          </button>
          {showNotifications && (
            <div className="notif-dropdown">
              <div className="notif-header">Notifications</div>
              <div className="notif-empty">No new notifications</div>
            </div>
          )}
        </div>
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

