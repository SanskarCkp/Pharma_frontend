import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./vendorsdashboard.css";
import { Store, PhoneCall, Mail, Eye, Trash2, Plus } from "lucide-react";


const VendorsDashboard = () => {
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const navigate = useNavigate();
  const API_BASE_URL = import.meta.env.VITE_API_URL;

  const VENDORS_API = `${API_BASE_URL}/api/v1/procurement/vendors/`;

  // Helper to include JWT token
  const authFetch = async (url, options = {}) => {
    const token = localStorage.getItem("access_token");

    return fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: token ? `Bearer ${token}` : "",
        ...(options.headers || {}),
      },
    });
  };

  // Fetch Vendors
  useEffect(() => {
    const fetchVendors = async () => {
      try {
        setLoading(true);

        const res = await authFetch(VENDORS_API);

        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const list = await res.json();

        let vendorsList = [];

        if (Array.isArray(list)) vendorsList = list;
        else if (list?.results) vendorsList = list.results;
        else if (list?.data) vendorsList = list.data;

        // Fetch summary for each vendor
        const vendorsWithSummary = await Promise.all(
          vendorsList.map(async (vendor) => {
            try {
              const sumRes = await authFetch(
                `${VENDORS_API}${vendor.id}/summary/`
              );
              const summary = await sumRes.json();

              return {
                ...vendor,
                products_count: summary.products,
                orders_count: summary.total_orders,
              };
            } catch (err) {
              return { ...vendor, products_count: 0, orders_count: 0 };
            }
          })
        );

        setVendors(vendorsWithSummary);
      } catch (err) {
        console.error("Error fetching vendors:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchVendors();
  }, []);

  // Filter vendors
  const filtered = vendors.filter((v) => {
    const name = v.vendor_name ?? v.name ?? v.company_name ?? "";
    const contactPerson =
      v.vendor_contact_person ?? v.contact_person ?? v.person_name ?? "";
    const phone = v.vendor_contact ?? v.contact_phone ?? v.phone ?? "";

    return (
      name.toLowerCase().includes(search.toLowerCase()) ||
      contactPerson.toLowerCase().includes(search.toLowerCase()) ||
      phone.toLowerCase().includes(search.toLowerCase())
    );
  });

  // Navigation
  const openVendor = (id) => navigate(`/masters/vendors/viewdetails/${id}`);

  const goEdit = (e, id) => {
    e.stopPropagation();
    navigate(`/masters/vendors/edit/${id}`);
  };

  // DELETE vendor
  const handleDelete = async (e, id) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this vendor?"))
      return;

    try {
      const res = await authFetch(`${VENDORS_API}${id}/`, {
        method: "DELETE",
      });

      if (res.ok) {
        setVendors((prev) => prev.filter((v) => v.id !== id));
      } else {
        alert("Failed to delete vendor");
      }
    } catch (err) {
      console.error("Delete failed:", err);
      alert("Delete failed");
    }
  };

  return (
    <div className="customers-container vendors-page">
      <div className="header-row">
        <h1 className="customers-title">Supplier Management</h1>
        <button className="add-supplier-btn" onClick={() => navigate("/masters/vendors/add")}>
          <Plus size={16} /> Add Supplier
        </button>
      </div>

      <p className="customers-heading">Manage Suppliers and Purchase Orders</p>

      <div className="search-row">
        <input
          type="text"
          className="search-input"
          placeholder="Search vendor name / contact person / phone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <p className="loading-text">Loading vendors...</p>
      ) : filtered.length === 0 ? (
        <div className="no-vendors-box">
          <p>No vendors found.</p>
        </div>
      ) : (
        <div className="cards-grid">
          {filtered.map((vendor) => {
            const id = vendor.id;
            const name =
              vendor.vendor_name ?? vendor.name ?? vendor.company_name ?? "Untitled Vendor";
            const phone =
              vendor.vendor_contact ?? vendor.contact_phone ?? vendor.phone ?? "-";
            const contactPerson =
              vendor.vendor_contact_person ?? vendor.contact_person ?? vendor.person_name ?? "-";
            const email = vendor.vendor_email ?? vendor.email ?? "-";

            return (
              <div key={id} className="vendor-card">
                <div className="card-top" onClick={() => openVendor(id)}>
                  <div>
                    <div className="card-title">{name}</div>
                    <div className="contact-person-text">
                      Contact: {contactPerson}
                    </div>
                  </div>
                  <div className="card-icon">
                    <Store size={20} />
                  </div>
                </div>

                <div className="card-body" onClick={() => openVendor(id)}>
                  <div className="contact-row">
                    <PhoneCall size={14} /> <span>{phone}</span>
                  </div>
                  <div className="contact-row">
                    <Mail size={14} /> <span>{email}</span>
                  </div>

                  <div className="metrics-row">
                    <div className="metric">
                      <div className="metric-value">
                        {vendor.products_count}
                      </div>
                      <div className="metric-label">Products</div>
                    </div>
                    <div className="metric">
                      <div className="metric-value">
                        {vendor.orders_count}
                      </div>
                      <div className="metric-label">Orders</div>
                    </div>
                  </div>
                </div>

                <div className="card-footer">
                  <div
                    className={`status-badge ${
                      vendor.is_active ? "active" : "inactive"
                    }`}
                  >
                    {vendor.is_active ? "Active" : "Inactive"}
                  </div>

                  <div className="action-icons">
                    <Eye
                      className="icon"
                      size={16}
                      onClick={(e) => goEdit(e, id)}
                    />
                    <Trash2
                      className="icon delete"
                      size={16}
                      onClick={(e) => handleDelete(e, id)}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default VendorsDashboard;
