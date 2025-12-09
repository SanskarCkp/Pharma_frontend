import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Pill, Ruler, Calendar, Package } from "lucide-react";
import { authFetch } from "../../api/http";
import "./Masters.css";

/**
 * MastersDashboard - realtime totals for:
 *  - Payment Terms
 *  - Rack Locations
 *
 * Uses VITE_API_URL normalization consistent with your other files.
 */

const rawBase = import.meta.env.VITE_API_URL || "";
const normalizeBase = (u) =>
  u
    .trim()
    .replace(/\/+$/g, "")
    .replace(/\/api\/v1$/i, "");
const API_BASE = normalizeBase(rawBase);

const ENDPOINTS = {
  // MedicineCategories: `${API_BASE}/api/v1/catalog/categories/`,
  // UnitsOfMeasurement: `${API_BASE}/api/v1/catalog/uoms/`,
  // paymentTerms: `${API_BASE}/api/v1/settings/payment-terms/`,
  rackLocations: `${API_BASE}/api/v1/inventory/rack-locations/`,
};

export default function MastersDashboard() {
  // states: null = loading, number >=0 = value, -1 = error
  const [ptTotal, setPtTotal] = useState(null);
  const [rlTotal, setRlTotal] = useState(null);
  const [mcTotal, setmcTotal] = useState(null);
  const [umTotal, setumTotal] = useState(null);


  const [ptError, setPtError] = useState(null);
  const [rlError, setRlError] = useState(null);
  const [mcError, setmcError] = useState(null);
  const [umError, setumError] = useState(null);

  useEffect(() => {
    const controller = new AbortController();
    const signal = controller.signal;

    const fetchCount = async (url, setValue, setErr) => {
      setErr(null);
      setValue(null); // mark loading
      try {
        // If you need auth, add: headers: { Authorization: `Bearer ${token}`, Accept: "application/json" }
        const res = await authFetch(url, { method: "GET", headers: { Accept: "application/json" }, signal });
        if (!res.ok) throw new Error(`Failed (${res.status})`);
        const data = await res.json();

        let count;
        if (Array.isArray(data)) {
          count = data.length;
        } else if (typeof data?.count === "number") {
          count = data.count;
        } else if (Array.isArray(data?.results)) {
          count = data.results.length;
        } else {
          // unexpected shape — treat as empty
          count = 0;
        }
        setValue(count);
      } catch (err) {
        if (err.name === "AbortError") return;
        console.error("Count load error:", url, err);
        setErr(err.message || "Error");
        setValue(-1);
      }
    };

    // run them in parallel
    // fetchCount(ENDPOINTS.MedicineCategories, setmcTotal, setmcError);
    // fetchCount(ENDPOINTS.UnitsOfMeasurement, setumTotal, setumError);
    // fetchCount(ENDPOINTS.paymentTerms, setPtTotal, setPtError);
    fetchCount(ENDPOINTS.rackLocations, setRlTotal, setRlError);

    return () => controller.abort();
  }, []);

  const items = [
    {
      path: "/masters/rack-locations",
      label: "Rack Locations",
      icon: <Package size={16} />,
      total: rlTotal,
      color: "teal",
    },
  ];

  const renderTotal = (val) => {
    if (val === null) return "Loading…";
    if (val === -1) return "Error";
    return val;
  };

  return (
    <div className="masters-wrap">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Master Data Management</h1>
          <p className="page-subtitle">Manage all configurable fields and dropdown options</p>
        </div>
      </div>

      {/* Grid */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((it) => {
          return (
            <Link key={it.path} to={it.path} className="group">
              <div className={`master-card ${it.color}`}>
                <h2>{it.label}</h2>
                <div className="flex">
                  <span>Total Items:</span>
                  <span>{renderTotal(it.total)}</span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* optional debug errors */}
      <div className="mt-4 text-sm text-rose-600">
        {/* {ptError && <div>Payment terms load error: {ptError}</div>} */}
        {rlError && <div>Rack locations load error: {rlError}</div>}
        {/* {mcError && <div>Medicine categories load error: {mcError}</div>} */}
        {/* {umError && <div>Units load error: {umError}</div>} */}
      </div>
    </div>
  );
}
