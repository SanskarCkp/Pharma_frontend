import React, { useEffect, useState, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { authFetch } from "../../api/http";
import { formatDateDDMMYYYY } from "../../utils/dateFormat";
import { useAlert } from "../ui/alert-provider";
import "./vendordetails.css";

const API_BASE_URL = import.meta.env.VITE_API_URL;

const VendorDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showAlert } = useAlert();

  const [Supplier, setVendor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [purchaseHistory, setPurchaseHistory] = useState([]);
  const [suppliedProducts, setSuppliedProducts] = useState([]);
  const [activeTab, setActiveTab] = useState("purchase");
  const [importing, setImporting] = useState(false);
  const [showFileTypeModal, setShowFileTypeModal] = useState(false);
  const fileInputRef = useRef(null);

  // Fetch Supplier Basic Details
  useEffect(() => {
    const fetchVendor = async () => {
      try {
        const res = await authFetch(`${API_BASE_URL}/api/v1/procurement/vendors/${id}/`);
        if (!res.ok) throw new Error("Supplier not found");
        const data = await res.json();
        setVendor(data);
      } catch (err) {
        console.error("Failed to fetch Supplier:", err);
        setVendor(null);
      } finally {
        setLoading(false);
      }
    };
    fetchVendor();
  }, [id]);

  // Fetch Purchase Orders
  useEffect(() => {
    if (!Supplier) return;

    const loadPurchaseHistory = async () => {
      try {
        const res = await authFetch(
          `${API_BASE_URL}/api/v1/procurement/purchase-orders/?Supplier=${Supplier.id}`
        );
        const data = await res.json();
        const orders = data.results || data || [];
        const filteredOrders = orders.filter(
          (ord) => Number(ord.Supplier) === Number(Supplier.id)
        );
        setPurchaseHistory(filteredOrders);
      } catch (err) {
        console.error("Error loading purchase history:", err);
      }
    };
    loadPurchaseHistory();
  }, [Supplier]);

  useEffect(() => {
    if (!Supplier) return;

    const loadSuppliedProducts = async () => {
      try {
        const res = await authFetch(
          `${API_BASE_URL}/api/v1/procurement/purchase-orders/?Supplier=${Supplier.id}`
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

          if (pData.preferred_vendor === Supplier.id) {
            products.push(pData);
          }
        }

        setSuppliedProducts(products);

      } catch (err) {
        console.error("Failed to fetch Supplier products:", err);
        setSuppliedProducts([]);
      }
    };

    loadSuppliedProducts();
  }, [Supplier]);


  const handleImportClick = () => {
    setShowFileTypeModal(true);
  };

  const handleFileTypeSelection = (fileType) => {
    setShowFileTypeModal(false);

    if (fileInputRef.current) {
      fileInputRef.current.value = null;
      // Set the accept attribute based on file type
      if (fileType === 'csv') {
        fileInputRef.current.accept = '.csv,text/csv';
      } else if (fileType === 'pdf') {
        fileInputRef.current.accept = 'application/pdf,.pdf';
      }
      fileInputRef.current.click();
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setImporting(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("vendor_id", Supplier.id);
    formData.append("location_id", Supplier.default_location || 1);

    try {
      // NEW MULTI-FILE ENDPOINT
      const res = await authFetch(
        `${API_BASE_URL}/api/v1/procurement/import-purchase-file/`,
        {
          method: "POST",
          body: formData,
        }
      );

      if (!res.ok) throw new Error("Import failed");

      const data = await res.json();
      showAlert(
        `Imported ${data.lines_created} Products successfully!`,
        "Import Success"
      );


      const ordersRes = await authFetch(
        `${API_BASE_URL}/api/v1/procurement/purchase-orders/?Supplier=${Supplier.id}`
      );
      const ordersData = await ordersRes.json();
      const filteredOrders = (ordersData.results || ordersData).filter(
        (ord) => Number(ord.Supplier) === Number(Supplier.id)
      );
      setPurchaseHistory(filteredOrders);
      setActiveTab("purchase");
    } catch (err) {
      console.error(err);
      showAlert("Failed to import file. Check the File type it must be CSV or PDF.", "Error");
    } finally {
      setImporting(false);
    }
  };

  if (loading) return <div className="Supplier-loading">Loading Supplier details...</div>;
  if (!Supplier) return <div className="Supplier-loading">Supplier not found!</div>;

  return (
    <div className="Supplier-details-wrap">
      {/* File Type Selection Modal */}
      {showFileTypeModal && (
        <div className="modal-backdrop" onClick={() => setShowFileTypeModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Select File Type to Import</h3>
              <button className="modal-close" onClick={() => setShowFileTypeModal(false)}>
                ✕
              </button>
            </div>
            <div className="modal-body">
              <p className="modal-description">Choose the file format you want to import:</p>
              <div className="file-type-options">
                <button
                  className="file-type-btn csv-btn"
                  onClick={() => handleFileTypeSelection('csv')}
                >
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M14 2V8H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M10 13H14M10 17H14M10 9H12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <span className="file-type-label">CSV File</span>
                  <span className="file-type-desc">Comma-separated values</span>
                </button>
                <button
                  className="file-type-btn pdf-btn"
                  onClick={() => handleFileTypeSelection('pdf')}
                >
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M14 2V8H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <span className="file-type-label">PDF File</span>
                  <span className="file-type-desc">Portable Document Format</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Hidden File Input */}
      <input
        type="file"
        accept="application/pdf,.csv"
        ref={fileInputRef}
        style={{ display: "none" }}
        onChange={handleFileChange}
      />

      {/* Page Header */}
      <div className="Supplier-header-section">
        <button className="back-btn" onClick={() => navigate("/suppliers")}>
          <ArrowLeft size={18} />
          Back
        </button>
      </div>
      
      <div className="Supplier-details-header">
        <div>
          <h2>{Supplier.name || "Supplier Details"}</h2>
          <p>Supplier Details </p>
        </div>
      </div>

      <div className="Supplier-details-grid">
        {/* Basic Info */}
        <div className="Supplier-detail-card">
          <h3>Basic Information</h3>
          <div className="Supplier-info-row">
            <span className="Supplier-info-label">Phone:</span>
            <span className="Supplier-info-value">{Supplier.contact_phone || "-"}</span>
          </div>
          <div className="Supplier-info-row">
            <span className="Supplier-info-label">Email:</span>
            <span className="Supplier-info-value">{Supplier.email || "-"}</span>
          </div>
          <div className="Supplier-info-row">
            <span className="Supplier-info-label">Address:</span>
            <span className="Supplier-info-value">{Supplier.address || "-"}</span>
          </div>
          <div className="Supplier-info-row">
            <span className="Supplier-info-label">GSTIN:</span>
            <span className="Supplier-info-value">{Supplier.gstin || "-"}</span>
          </div>
          <div className="Supplier-info-row">
            <span className="Supplier-info-label">Supplier Type:</span>
            <span className="Supplier-info-value">{Supplier.supplier_type || "-"}</span>
          </div>
        </div>

        {/* Supplier Status */}
        <div className="Supplier-detail-card">
          <h3>Supplier Status</h3>
          <div className="Supplier-info-row">
            <span className="Supplier-info-label">Status:</span>
            <span className="Supplier-info-value">
              <span className={`Supplier-status-badge ${Supplier.is_active ? "active" : "inactive"}`}>
                {Supplier.is_active ? "Active" : "Inactive"}
              </span>
            </span>
          </div>
          <div className="Supplier-info-row">
            <span className="Supplier-info-label">Rating:</span>
            <span className="Supplier-info-value">{Supplier.rating || "N/A"}</span>
          </div>
          <div className="Supplier-metrics-row">
            <div className="Supplier-metric">
              <div className="Supplier-metric-value">{suppliedProducts.length}</div>
              <div className="Supplier-metric-label">Products</div>
            </div>
            <div className="Supplier-metric">
              <div className="Supplier-metric-value">{purchaseHistory.length}</div>
              <div className="Supplier-metric-label">Orders</div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="Supplier-detail-card">
          <h3>Quick Actions</h3>
          <div className="Supplier-quick-actions">
            <button
              className="Supplier-action-btn"
              onClick={() => navigate(`/masters/products`, { state: { Supplier } })}
            >
              Create Order
            </button>
            {Supplier.supplier_type === "ONLINE" && (
              <button
                className="Supplier-action-btn"
                disabled={importing}
                onClick={handleImportClick}
              >
                {importing ? "Importing..." : "Import PDF or CSV"}
              </button>
            )}
            <button
              className="Supplier-action-btn"
              onClick={() => navigate(`/suppliers/edit/${id}`, { state: { Supplier } })}
            >
              Edit Supplier
            </button>
            <button
              className="Supplier-action-btn"
              onClick={() => navigate(`/masters/products/purchase-orders/`, { state: { Supplier } })}
            >
              Purchase Orders
            </button>
          </div>
        </div>

        {/* TAB SECTION */}
        <div className="Supplier-tabs-card">
          <div className="Supplier-tabs">
            <button
              className={`Supplier-tab ${activeTab === "purchase" ? "active" : ""}`}
              onClick={() => setActiveTab("purchase")}
            >
              Purchase History
            </button>
            <button
              className={`Supplier-tab ${activeTab === "products" ? "active" : ""}`}
              onClick={() => setActiveTab("products")}
            >
              Supplied Products
            </button>
          </div>

          <div className="Supplier-table-wrap">
            {activeTab === "purchase" && (
              <table className="Supplier-table">
                <thead>
                  <tr>
                    <th>PO No</th>
                    <th>Order Date</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {purchaseHistory.length === 0 ? (
                    <tr><td colSpan="3" className="Supplier-table-empty">No purchase history found.</td></tr>
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
              <table className="Supplier-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Category</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {suppliedProducts.length === 0 ? (
                    <tr><td colSpan="3" className="Supplier-table-empty">No products supplied.</td></tr>
                  ) : (
                    suppliedProducts.map((prod) => (
                      <tr key={prod.id}>
                        <td>{prod.name}</td>
                        <td>{prod.category_name || "-"}</td>
                        <td>
                          <span className={`Supplier-status-badge ${prod.is_active ? "active" : "inactive"}`}>
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
