import React, { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { authFetch } from "../../api/http";
import { useAlert } from "../ui/alert-provider";
import styles from "./vendorsdashboard.module.css";
import { Store, PhoneCall, Mail, Plus } from "lucide-react";


const VendorsDashboard = () => {
  const cx = (...classes) => classes.filter(Boolean).join(" ");
  const { showAlert } = useAlert();
  const [Suppliers, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [inactivePage, setInactivePage] = useState(1);
  const navigate = useNavigate();
  const ITEMS_PER_PAGE = 15;
  const API_BASE_URL = import.meta.env.VITE_API_URL;

  const VENDORS_API = `${API_BASE_URL}/api/v1/procurement/vendors/`;

  // Fetch Suppliers
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

        // Fetch summary for each Supplier
        const vendorsWithSummary = await Promise.all(
          vendorsList.map(async (Supplier) => {
            try {
              const sumRes = await authFetch(
                `${VENDORS_API}${Supplier.id}/summary/`
              );
              const summary = await sumRes.json();

              return {
                ...Supplier,
                products_count: summary.products,
                orders_count: summary.total_orders,
              };
            } catch (err) {
              return { ...Supplier, products_count: 0, orders_count: 0 };
            }
          })
        );

        setVendors(vendorsWithSummary);
      } catch (err) {
        console.error("Error fetching Suppliers:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchVendors();
  }, []);

  // Filter Suppliers and separate by status
  const { activeSuppliers, inactiveSuppliers } = useMemo(() => {
    const filtered = Suppliers.filter((v) => {
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

    const active = filtered.filter((v) => v.is_active === true || v.is_active === undefined);
    const inactive = filtered.filter((v) => v.is_active === false);

    return { activeSuppliers: active, inactiveSuppliers: inactive };
  }, [Suppliers, search]);

  // Pagination for active suppliers
  const activeTotalPages = Math.max(1, Math.ceil(activeSuppliers.length / ITEMS_PER_PAGE));
  const paginatedActiveSuppliers = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return activeSuppliers.slice(start, start + ITEMS_PER_PAGE);
  }, [activeSuppliers, currentPage]);

  // Pagination for inactive suppliers
  const inactiveTotalPages = Math.max(1, Math.ceil(inactiveSuppliers.length / ITEMS_PER_PAGE));
  const paginatedInactiveSuppliers = useMemo(() => {
    const start = (inactivePage - 1) * ITEMS_PER_PAGE;
    return inactiveSuppliers.slice(start, start + ITEMS_PER_PAGE);
  }, [inactiveSuppliers, inactivePage]);

  // Reset to page 1 when search changes
  useEffect(() => {
    setCurrentPage(1);
    setInactivePage(1);
  }, [search]);

  // Navigation
  const openVendor = (id) => navigate(`/suppliers/viewdetails/${id}`);

  const goEdit = (e, id) => {
    e.stopPropagation();
    navigate(`/suppliers/edit/${id}`);
  };

  // Toggle Supplier Active/Inactive Status
  const handleToggleStatus = async (e, id, currentStatus) => {
    e.stopPropagation();
    const newStatus = !currentStatus;

    try {
      const res = await authFetch(`${VENDORS_API}${id}/`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          is_active: newStatus,
        }),
      });

      if (res.ok) {
        showAlert(
          `Supplier ${newStatus ? "activated" : "deactivated"} successfully!`,
          "Success"
        );
        // Update the supplier status in the list
        setVendors((prev) =>
          prev.map((v) => (v.id === id ? { ...v, is_active: newStatus } : v))
        );
      } else {
        // Try to get error message from response
        let errorMessage = "Failed to update supplier status";
        try {
          const errorData = await res.json();
          if (errorData.detail) {
            errorMessage = errorData.detail;
          } else if (errorData.message) {
            errorMessage = errorData.message;
          }
        } catch (parseErr) {
          console.error("Failed to parse error response:", parseErr);
        }
        showAlert(errorMessage, "Error");
      }
    } catch (err) {
      console.error("Toggle status failed:", err);
      showAlert("Failed to update status: " + (err.message || "Unknown error"), "Error");
    }
  };

  return (
    <div className={cx(styles["customers-container"], styles["Suppliers-page"])}>
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
          placeholder="Search Suppliers name / contact person / phone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <p className={styles["loading-text"]}>Loading Suppliers...</p>
      ) : activeSuppliers.length === 0 && inactiveSuppliers.length === 0 ? (
        <div className={styles["no-Suppliers-box"]}>
          <p>No Suppliers found.</p>
        </div>
      ) : (
        <>
          {/* Active Suppliers Section */}
          {activeSuppliers.length > 0 && (
            <div className={styles["supplier-section"]}>
              <div className={styles["section-header"]}>
                <h2 className={styles["section-title"]}>
                  Active Suppliers ({activeSuppliers.length})
                </h2>
              </div>
              <div className={styles["cards-grid"]}>
                {paginatedActiveSuppliers.map((Supplier) => {
            const id = Supplier.id;
            const name =
              Supplier.vendor_name ?? Supplier.name ?? Supplier.company_name ?? "Untitled Supplier";
            const phone =
              Supplier.vendor_contact ?? Supplier.contact_phone ?? Supplier.phone ?? "-";
            const contactPerson =
              Supplier.vendor_contact_person ?? Supplier.contact_person ?? Supplier.person_name ?? "-";
            const email = Supplier.vendor_email ?? Supplier.email ?? "-";

            return (
              <div key={id} className={styles["Supplier-card"]}>
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
                        {Supplier.products_count}
                      </div>
                      <div className={styles["metric-label"]}>Products</div>
                    </div>
                    <div className={styles.metric}>
                      <div className={styles["metric-value"]}>
                        {Supplier.orders_count}
                      </div>
                      <div className={styles["metric-label"]}>Orders</div>
                    </div>
                  </div>
                </div>

                <div className={styles["card-footer"]}>
                  <button
                    className={cx(
                      styles["status-toggle"],
                      styles.active
                    )}
                    onClick={(e) => handleToggleStatus(e, id, Supplier.is_active)}
                    title="Click to deactivate"
                  >
                    <span className={styles["toggle-slider"]}></span>
                    <span className={styles["toggle-label"]}>Active</span>
                  </button>
                </div>
              </div>
            );
          })}
              </div>

              {/* Pagination for Active Suppliers */}
              {activeTotalPages > 1 && (
                <div className={styles["pagination"]}>
                  <button
                    className={styles["pagination-btn"]}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    Prev
                  </button>
                  <span className={styles["page-info"]}>
                    Page {currentPage} of {activeTotalPages}
                  </span>
                  <button
                    className={styles["pagination-btn"]}
                    onClick={() => setCurrentPage((p) => Math.min(activeTotalPages, p + 1))}
                    disabled={currentPage === activeTotalPages}
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Inactive Suppliers Section */}
          {inactiveSuppliers.length > 0 && (
            <div className={styles["supplier-section"]}>
              <div className={styles["section-header"]}>
                <h2 className={styles["section-title"]}>
                  Inactive Suppliers ({inactiveSuppliers.length})
                </h2>
              </div>
              <div className={styles["cards-grid"]}>
                {paginatedInactiveSuppliers.map((Supplier) => {
                  const id = Supplier.id;
                  const name =
                    Supplier.vendor_name ?? Supplier.name ?? Supplier.company_name ?? "Untitled Supplier";
                  const phone =
                    Supplier.vendor_contact ?? Supplier.contact_phone ?? Supplier.phone ?? "-";
                  const contactPerson =
                    Supplier.vendor_contact_person ?? Supplier.contact_person ?? Supplier.person_name ?? "-";
                  const email = Supplier.vendor_email ?? Supplier.email ?? "-";

                  return (
                    <div key={id} className={styles["Supplier-card"]}>
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
                              {Supplier.products_count}
                            </div>
                            <div className={styles["metric-label"]}>Products</div>
                          </div>
                          <div className={styles.metric}>
                            <div className={styles["metric-value"]}>
                              {Supplier.orders_count}
                            </div>
                            <div className={styles["metric-label"]}>Orders</div>
                          </div>
                        </div>
                      </div>

                      <div className={styles["card-footer"]}>
                        <button
                          className={cx(
                            styles["status-toggle"],
                            styles.inactive
                          )}
                          onClick={(e) => handleToggleStatus(e, id, Supplier.is_active)}
                          title="Click to activate"
                        >
                          <span className={styles["toggle-slider"]}></span>
                          <span className={styles["toggle-label"]}>Inactive</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Pagination for Inactive Suppliers */}
              {inactiveTotalPages > 1 && (
                <div className={styles["pagination"]}>
                  <button
                    className={styles["pagination-btn"]}
                    onClick={() => setInactivePage((p) => Math.max(1, p - 1))}
                    disabled={inactivePage === 1}
                  >
                    Prev
                  </button>
                  <span className={styles["page-info"]}>
                    Page {inactivePage} of {inactiveTotalPages}
                  </span>
                  <button
                    className={styles["pagination-btn"]}
                    onClick={() => setInactivePage((p) => Math.min(inactiveTotalPages, p + 1))}
                    disabled={inactivePage === inactiveTotalPages}
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default VendorsDashboard;
