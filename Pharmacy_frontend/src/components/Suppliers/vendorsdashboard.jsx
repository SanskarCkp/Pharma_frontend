import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { authFetch } from "../../api/http";
import { useAlert } from "../ui/alert-provider";
import styles from "./vendorsdashboard.module.css";
import { Store, PhoneCall, Mail, Trash2, Plus } from "lucide-react";


const VendorsDashboard = () => {
  const cx = (...classes) => classes.filter(Boolean).join(" ");
  const { showAlert } = useAlert();
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const navigate = useNavigate();
  const API_BASE_URL = import.meta.env.VITE_API_URL;

  const VENDORS_API = `${API_BASE_URL}/api/v1/procurement/vendors/`;

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
  const openVendor = (id) => navigate(`/suppliers/viewdetails/${id}`);

  const goEdit = (e, id) => {
    e.stopPropagation();
    navigate(`/suppliers/edit/${id}`);
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
        showAlert("Failed to delete vendor", "Error");
      }
    } catch (err) {
      console.error("Delete failed:", err);
      showAlert("Delete failed", "Error");
    }
  };

  return (
    <div className={cx(styles["customers-container"], styles["vendors-page"])}>
      <div className={styles["header-row"]}>
        <div>
          <h1 className={styles["customers-title"]}>Supplier Management</h1>
          <p className={styles["customers-heading"]}>Manage Suppliers and Purchase Orders</p>
        </div>
        <button className={styles["add-supplier-btn"]} onClick={() => navigate("/suppliers/add")}>
          <Plus size={16} /> Add Supplier
        </button>
      </div>

      <div className={styles["search-row"]}>
        <input
          type="text"
          className={styles["search-input"]}
          placeholder="Search vendor name / contact person / phone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <p className={styles["loading-text"]}>Loading vendors...</p>
      ) : filtered.length === 0 ? (
        <div className={styles["no-vendors-box"]}>
          <p>No vendors found.</p>
        </div>
      ) : (
        <div className={styles["cards-grid"]}>
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
              <div key={id} className={styles["vendor-card"]}>
                <div className={styles["card-top"]} onClick={() => openVendor(id)}>
                  <div>
                    <div className={styles["card-title"]}>{name}</div>
                    <div className="contact-person-text">
                      Contact: {contactPerson}
                    </div>
                  </div>
                  <div className={styles["card-icon"]}>
                    <Store size={20} />
                  </div>
                </div>

                <div className={styles["card-body"]} onClick={() => openVendor(id)}>
                  <div className={styles["contact-row"]}>
                    <PhoneCall size={14} /> <span>{phone}</span>
                  </div>
                  <div className={styles["contact-row"]}>
                    <Mail size={14} /> <span>{email}</span>
                  </div>

                  <div className={styles["metrics-row"]}>
                    <div className={styles.metric}>
                      <div className={styles["metric-value"]}>
                        {vendor.products_count}
                      </div>
                      <div className={styles["metric-label"]}>Products</div>
                    </div>
                    <div className={styles.metric}>
                      <div className={styles["metric-value"]}>
                        {vendor.orders_count}
                      </div>
                      <div className={styles["metric-label"]}>Orders</div>
                    </div>
                  </div>
                </div>

                <div className={styles["card-footer"]}>
                  <div
                    className={cx(
                      styles["status-badge"],
                      vendor.is_active ? styles.active : styles.inactive
                    )}
                  >
                    {vendor.is_active ? "Active" : "Inactive"}
                  </div>

                  <div className={styles["action-icons"]}>
                    <Trash2
                      className={cx(styles.icon, styles.delete)}
                      size={30}
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
