import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Pill, Ruler, Calendar, Package, User } from "lucide-react";
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
  Users: `${API_BASE}/api/v1/accounts/users/`,
  // MedicineCategories: `${API_BASE}/api/v1/catalog/categories/`,
  MedicineForms: `${API_BASE}/api/v1/catalog/forms/`,
  // UnitsOfMeasurement: `${API_BASE}/api/v1/catalog/uoms/`,
  // paymentTerms: `${API_BASE}/api/v1/settings/payment-terms/`,
  rackLocations: `${API_BASE}/api/v1/inventory/rack-locations/`,
};

export default function MastersDashboard() {
  // states: null = loading, number >=0 = value, -1 = error
  const [usersTotal, setUsersTotal] = useState(null);
  const [ptTotal, setPtTotal] = useState(null);
  const [rlTotal, setRlTotal] = useState(null);
  const [mcTotal, setmcTotal] = useState(null);
  const [mfTotal, setmfTotal] = useState(null);
  const [umTotal, setumTotal] = useState(null);


  const [usersError, setUsersError] = useState(null);
  const [ptError, setPtError] = useState(null);
  const [rlError, setRlError] = useState(null);
  const [mcError, setmcError] = useState(null);
  const [mfError, setmfError] = useState(null);
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
    fetchCount(ENDPOINTS.Users, setUsersTotal, setUsersError);
    fetchCount(ENDPOINTS.MedicineCategories, setmcTotal, setmcError);
    fetchCount(ENDPOINTS.MedicineForms, setmfTotal, setmfError);
    fetchCount(ENDPOINTS.UnitsOfMeasurement, setumTotal, setumError);
    fetchCount(ENDPOINTS.paymentTerms, setPtTotal, setPtError);
    fetchCount(ENDPOINTS.rackLocations, setRlTotal, setRlError);

    return () => controller.abort();
  }, []);

  const items = [
    {
      path: "/masters/users",
      label: "Users",
      icon: <User size={28} />,
      total: usersTotal,
      accent: "blue",
    },
    // {
    //   path: "/medicinecategories",
    //   label: "Medicine Categories",
    //   icon: <Pill size={16} />,
    //   total: mcTotal,
    //   accent: "teal",
    // },
    {
      path: "/hsncode",
      label: "HSN Code",
      icon: <Pill size={16} />,
      total: mfTotal,
      accent: "orange",
    },
    // {
    //   path: "/unitofmeasurement",
    //   label: "Units of Measurement",
    //   icon: <Ruler size={16} />,
    //   total: umTotal,
    //   accent: "blue",
    // },
    // {
    //   path: "/masters/payment-terms",
    //   label: "Payment Terms",
    //   icon: <Calendar size={16} />,
    //   total: ptTotal,
    //   accent: "orange",
    // },
    {
      path: "/masters/rack-locations",
      label: "Rack Locations",
      icon: <Package size={16} />,
      total: rlTotal,
      accent: "blue",
    },
  ];

  const accentColors = {
    teal: {
      ring: "group-hover:border-teal-400",
      iconText: "text-teal-500",
      border: "border-teal-300",
    },
    orange: {
      ring: "group-hover:border-orange-400",
      iconText: "text-orange-500",
      border: "border-orange-300",
    },
    blue: {
      ring: "group-hover:border-sky-400",
      iconText: "text-sky-500",
      border: "border-sky-300",
    },
  };

  const renderTotal = (val) => {
    if (val === null) return <span className="text-xs">Loading…</span>;
    if (val === -1) return <span className="text-xs text-rose-500">Error</span>;
    return <span className="text-xs">{val}</span>;
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
          const accent = accentColors[it.accent] ?? accentColors.teal;

          return (
            <Link key={it.path} to={it.path} className="group">
              <div
                className={`relative rounded-xl border bg-white p-5 shadow-sm transition-all hover:shadow-md ${accent.border}`}
                style={{ minHeight: 120 }}
              >
                {/* top-right small icon pill */}
                <div
                  className={`absolute right-4 top-4 inline-flex items-center justify-center rounded-md border border-gray-200 p-2 text-gray-600 ${accent.ring}`}
                  aria-hidden
                >
                  <span className={`${accent.iconText}`}>{it.icon}</span>
                </div>

                {/* Title */}
                <div className="mb-6 pr-12">
                  <h2 className="text-lg font-medium text-gray-800">{it.label}</h2>
                </div>

                {/* Footer with compact badge */}
                <div className="flex items-center gap-3 text-sm text-gray-500">
                  <span>Total Items:</span>
                  <span className="inline-flex h-7 min-w-[1.6rem] items-center justify-center rounded-full border border-gray-200 px-2 text-xs text-gray-700 bg-white">
                    {renderTotal(it.total)}
                  </span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* optional debug errors */}
      <div className="mt-4 text-sm text-rose-600">
        {usersError && <div>Users load error: {usersError}</div>}
        {/* {ptError && <div>Payment terms load error: {ptError}</div>} */}
        {rlError && <div>Rack locations load error: {rlError}</div>}
        {/* {mcError && <div>Medicine categories load error: {mcError}</div>} */}
        {mfError && <div>Medicine forms load error: {mfError}</div>}
        {/* {umError && <div>Units load error: {umError}</div>} */}
      </div>
    </div>
  );
}
