import React, { useEffect, useState, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { authFetch } from "../../api/http";
import { formatDateDDMMYYYY } from "../../utils/dateFormat";
import "./vendordetails.css";

const API_BASE_URL = import.meta.env.VITE_API_URL;

const VendorDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [vendor, setVendor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [purchaseHistory, setPurchaseHistory] = useState([]);
  const [suppliedProducts, setSuppliedProducts] = useState([]);
  const [activeTab, setActiveTab] = useState("purchase");
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef(null);

  // Fetch Vendor Basic Details
  useEffect(() => {
    const fetchVendor = async () => {
      try {
        const res = await authFetch(`${API_BASE_URL}/api/v1/procurement/vendors/${id}/`);
        if (!res.ok) throw new Error("Vendor not found");
        const data = await res.json();
        setVendor(data);
      } catch (err) {
        console.error("Failed to fetch vendor:", err);
        setVendor(null);
      } finally {
        setLoading(false);
      }
    };
    fetchVendor();
  }, [id]);

  // Fetch Purchase Orders
  useEffect(() => {
    if (!vendor) return;

    const loadPurchaseHistory = async () => {
      try {
        const res = await authFetch(
          `${API_BASE_URL}/api/v1/procurement/purchase-orders/?vendor=${vendor.id}`
        );
        const data = await res.json();
        const orders = data.results || data || [];
        const filteredOrders = orders.filter(
          (ord) => Number(ord.vendor) === Number(vendor.id)
        );
        setPurchaseHistory(filteredOrders);
      } catch (err) {
        console.error("Error loading purchase history:", err);
      }
    };
    loadPurchaseHistory();
  }, [vendor]);

  useEffect(() => {
    if (!vendor) return;

    const loadSuppliedProducts = async () => {
      try {
        const res = await authFetch(
          `${API_BASE_URL}/api/v1/procurement/purchase-orders/?vendor=${vendor.id}`
        );
        const data = await res.json();
        const orders = data.results || data || [];

        const validOrders = orders.filter(
          (o) =>
            o.status === "PARTIALLY_RECEIVED" ||
            o.status === "COMPLETED"
        );

        let productIds = [];

        for (let order of validOrders) {
          const lineRes = await authFetch(
            `${API_BASE_URL}/api/v1/procurement/purchase-orders/${order.id}/lines/`
          );

          const lines = await lineRes.json();

          lines.forEach((line) => {
            if (line.product) {
              productIds.push(line.product);
            }
          });
        }

        productIds = [...new Set(productIds)];

        const products = [];

        for (let pId of productIds) {
          const pRes = await authFetch(`${API_BASE_URL}/api/v1/catalog/products/${pId}/`);
          const pData = await pRes.json();

          if (pData.preferred_vendor === vendor.id) {
            products.push(pData);
          }
        }

        setSuppliedProducts(products);

      } catch (err) {
        console.error("Failed to fetch vendor products:", err);
        setSuppliedProducts([]);
      }
    };

    loadSuppliedProducts();
  }, [vendor]);


  const handleImportClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = null;
      fileInputRef.current.click();
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setImporting(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("vendor_id", vendor.id);
    formData.append("location_id", vendor.default_location || 1);

    try {
      const res = await authFetch(`${API_BASE_URL}/api/v1/procurement/import-purchase-pdf/`, {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error("Import failed");

      const data = await res.json();
      alert(`Imported ${data.lines_created} lines successfully!`);

      const ordersRes = await authFetch(
        `${API_BASE_URL}/api/v1/procurement/purchase-orders/?vendor=${vendor.id}`
      );
      const ordersData = await ordersRes.json();
      const filteredOrders = (ordersData.results || ordersData).filter(
        (ord) => Number(ord.vendor) === Number(vendor.id)
      );
      setPurchaseHistory(filteredOrders);
      setActiveTab("purchase");
    } catch (err) {
      console.error(err);
      alert("Failed to import PDF. Check console for details.");
    } finally {
      setImporting(false);
    }
  };

  if (loading) return <div className="vendor-loading">Loading vendor details...</div>;
  if (!vendor) return <div className="vendor-loading">Vendor not found!</div>;

  return (
    <div className="vendor-details-wrap">
      {/* Hidden File Input */}
      <input
        type="file"
        accept="application/pdf"
        ref={fileInputRef}
        style={{ display: "none" }}
        onChange={handleFileChange}
      />

      {/* Page Header */}
      <div className="vendor-details-header">
        <button className="back-btn" onClick={() => navigate("/suppliers")}>
          <ArrowLeft size={18} />
          <span>Back</span>
        </button>
        <div>
          <h2>{vendor.name || "Vendor Details"}</h2>
          <p>Supplier Details & KPIs</p>
        </div>
      </div>

      <div className="vendor-details-grid">
        {/* Basic Info */}
        <div className="vendor-detail-card">
          <h3>Basic Information</h3>
          <div className="vendor-info-row">
            <span className="vendor-info-label">Phone:</span>
            <span className="vendor-info-value">{vendor.contact_phone || "-"}</span>
          </div>
          <div className="vendor-info-row">
            <span className="vendor-info-label">Email:</span>
            <span className="vendor-info-value">{vendor.email || "-"}</span>
          </div>
          <div className="vendor-info-row">
            <span className="vendor-info-label">Address:</span>
            <span className="vendor-info-value">{vendor.address || "-"}</span>
          </div>
          <div className="vendor-info-row">
            <span className="vendor-info-label">GSTIN:</span>
            <span className="vendor-info-value">{vendor.gstin || "-"}</span>
          </div>
          <div className="vendor-info-row">
            <span className="vendor-info-label">Supplier Type:</span>
            <span className="vendor-info-value">{vendor.supplier_type || "-"}</span>
          </div>
        </div>

        {/* Supplier Status */}
        <div className="vendor-detail-card">
          <h3>Supplier Status</h3>
          <div className="vendor-info-row">
            <span className="vendor-info-label">Status:</span>
            <span className="vendor-info-value">
              <span className={`vendor-status-badge ${vendor.is_active ? "active" : "inactive"}`}>
                {vendor.is_active ? "Active" : "Inactive"}
              </span>
            </span>
          </div>
          <div className="vendor-info-row">
            <span className="vendor-info-label">Payment Terms:</span>
            <span className="vendor-info-value">{vendor.payment_terms || "-"}</span>
          </div>
          <div className="vendor-info-row">
            <span className="vendor-info-label">Rating:</span>
            <span className="vendor-info-value">{vendor.rating || "N/A"}</span>
          </div>
          <div className="vendor-metrics-row">
            <div className="vendor-metric">
              <div className="vendor-metric-value">{suppliedProducts.length}</div>
              <div className="vendor-metric-label">Products</div>
            </div>
            <div className="vendor-metric">
              <div className="vendor-metric-value">{purchaseHistory.length}</div>
              <div className="vendor-metric-label">Orders</div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="vendor-detail-card">
          <h3>Quick Actions</h3>
          <div className="vendor-quick-actions">
            <button
              className="vendor-action-btn"
              onClick={() => navigate(`/masters/products`, { state: { vendor } })}
            >
              Create Order
            </button>
            <button
              className="vendor-action-btn"
              onClick={() => navigate(`/masters/products/vendor-catalog/${id}`, { state: { vendor } })}
            >
              View Catalog
            </button>
            {vendor.supplier_type === "ONLINE" && (
              <button
                className="vendor-action-btn"
                disabled={importing}
                onClick={handleImportClick}
              >
                {importing ? "Importing..." : "Import PDF"}
              </button>
            )}
            <button
              className="vendor-action-btn"
              onClick={() => navigate(`/suppliers/edit/${id}`, { state: { vendor } })}
            >
              Edit Supplier
            </button>
            <button
              className="vendor-action-btn"
              onClick={() => navigate(`/masters/products/purchase-orders/`, { state: { vendor } })}
            >
              Purchase Orders
            </button>
          </div>
        </div>

        {/* TAB SECTION */}
        <div className="vendor-tabs-card">
          <div className="vendor-tabs">
            <button
              className={`vendor-tab ${activeTab === "purchase" ? "active" : ""}`}
              onClick={() => setActiveTab("purchase")}
            >
              Purchase History
            </button>
            <button
              className={`vendor-tab ${activeTab === "products" ? "active" : ""}`}
              onClick={() => setActiveTab("products")}
            >
              Supplied Products
            </button>
          </div>

          <div className="vendor-table-wrap">
            {activeTab === "purchase" && (
              <table className="vendor-table">
                <thead>
                  <tr>
                    <th>PO No</th>
                    <th>Order Date</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {purchaseHistory.length === 0 ? (
                    <tr><td colSpan="3" className="vendor-table-empty">No purchase history found.</td></tr>
                  ) : (
                    purchaseHistory.map((order) => (
                      <tr key={order.id}>
                        <td>{order.po_number}</td>
                        <td>{formatDateDDMMYYYY(order.order_date)}</td>
                        <td>{order.status}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}

            {activeTab === "products" && (
              <table className="vendor-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Category</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {suppliedProducts.length === 0 ? (
                    <tr><td colSpan="3" className="vendor-table-empty">No products supplied.</td></tr>
                  ) : (
                    suppliedProducts.map((prod) => (
                      <tr key={prod.id}>
                        <td>{prod.name}</td>
                        <td>{prod.category_name || "-"}</td>
                        <td>
                          <span className={`vendor-status-badge ${prod.is_active ? "active" : "inactive"}`}>
                            {prod.is_active ? "Active" : "Inactive"}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default VendorDetails;
