import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, Trash2 } from "lucide-react";
import "./createorder.css";
import "../../inventory/inventory.css";
import { authFetch } from "../../../api/http";
import { getDefaultLocationId } from "../../../config/location";
import { useAlert } from "../../ui/alert-provider";

// Same categories as in AddMedicine component
const MEDICINE_CATEGORIES = [
  { id: 'tablet', name: 'Tablet' },
  { id: 'capsule', name: 'Capsule' },
  { id: 'syrup', name: 'Syrup/Suspension' },
  { id: 'injection', name: 'Injection/Vial' },
  { id: 'ointment', name: 'Ointment/Cream' },
  { id: 'drops', name: 'Drops (Eye/Ear/Nasal)' },
  { id: 'inhaler', name: 'Inhaler' },
  { id: 'powder', name: 'Powder/Sachet' },
  { id: 'gel', name: 'Gel' },
  { id: 'spray', name: 'Spray' },
  { id: 'lotion', name: 'Lotion/Solution' },
  { id: 'shampoo', name: 'Shampoo' },
  { id: 'soap', name: 'Soap/Bar' },
  { id: 'bandage', name: 'Bandage/Dressing' },
  { id: 'mask', name: 'Mask (Surgical/N95)' },
];

const API_BASE = import.meta.env.VITE_API_URL?.replace(/\/+$/, "");
const DEFAULT_LOCATION_ID = getDefaultLocationId();

const CreateOrder = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const Supplier = location.state?.Supplier;
  const { showAlert } = useAlert();

  const [vendorData, setVendorData] = useState(null);
  const [orderDate, setOrderDate] = useState(new Date().toISOString().slice(0, 10));
  const [expectedDate, setExpectedDate] = useState("");
  const [notes, setNotes] = useState("");

  const [cart, setCart] = useState([]);

  const [showAddProduct, setShowAddProduct] = useState(true);
  const [manualProductName, setManualProductName] = useState("");
  const [manualQty, setManualQty] = useState(1);
  const [manualCategory, setManualCategory] = useState("");

  const [totalItems, setTotalItems] = useState(0);

  useEffect(() => {
    if (!Supplier) {
      navigate("/suppliers");
      return;
    }

    const fetchVendor = async () => {
      try {
        const res = await authFetch(`${API_BASE}/api/v1/procurement/vendors/${Supplier.id}/`);
        if (!res.ok) return;
        const data = await res.json();
        setVendorData(data);
      } catch (err) {
        console.error("Supplier fetch error:", err);
      }
    };

    fetchVendor();
  }, [Supplier, navigate]);

  useEffect(() => {
    const totalQty = cart.reduce((acc, it) => acc + (Number(it.quantity) || 0), 0);
    setTotalItems(totalQty);
  }, [cart]);

  const generateProductCode = (name) => {
    const slug = name.toUpperCase().replace(/[^A-Z0-9]+/g, "").slice(0, 6);
    const rand = Math.floor(Math.random() * 9000) + 1000;
    return `${slug || "PRD"}${rand}`;
  };

  const handleAddManualProduct = () => {
    if (!manualProductName.trim()) return showAlert("Enter product name", "Error");
    if (!manualCategory) return showAlert("Select category", "Error");
    if (!manualQty || Number(manualQty) <= 0) return showAlert("Enter valid quantity", "Error");

    const newItem = {
      uid: `cart_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      id: null, // No product ID yet - will be created when order is submitted
      name: manualProductName.trim(),
      quantity: Number(manualQty),
      expected_unit_cost: 0,
      category: manualCategory,
      isNew: true,
    };

    setCart((prev) => [...prev, newItem]);
    setManualProductName("");
    setManualQty(1);
    setManualCategory("");
  };

  const handleQuantityChange = (uid, value) =>
    setCart((prev) =>
      prev.map((it) => (it.uid === uid ? { ...it, quantity: Number(value) || 0 } : it))
    );

  const handleDelete = (uid) =>
    setCart((prev) => prev.filter((it) => it.uid !== uid));

  const handleCreateOrder = async () => {
    if (!vendorData?.id) return showAlert("Supplier not loaded", "Error");

    const orderRows = cart.filter((r) => Number(r.quantity) > 0);
    if (orderRows.length === 0) return showAlert("Add at least one product", "Error");

  const lines = orderRows.map((r) => {
    const line = {
      qty_packs_ordered: Number(r.quantity),
      expected_unit_cost: String(r.expected_unit_cost || 0),
    };
    if (r.id) line.product = r.id;
    else line.requested_name = r.name;
    return line;
  });

  // SAFETY FILTER → remove any invalid line
  const cleanedLines = lines.filter(
    l => l.product || l.requested_name
  );

    const payload = {
      vendor: Number(vendorData.id),
      location: DEFAULT_LOCATION_ID,
      order_date: orderDate,
      expected_date: expectedDate || null,
      status: "DRAFT",
      note: notes || "",
      lines: cleanedLines,
    };

    try {
      const res = await authFetch(`${API_BASE}/api/v1/procurement/purchase-orders/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        console.log("❌ PO Create Failed:", err);   // Print full backend error
        showAlert(JSON.stringify(err, null, 2), "Error");
        return;
      }

      // Order created successfully - navigate to purchase orders page with supplier info
      showAlert("Order created successfully!", "Success");
      navigate("/masters/products/purchase-orders", {
        state: { Supplier: vendorData }
      });
    } catch (err) {
      console.error("Order error:", err);
      showAlert("Error creating order", "Error");
    }
  };
  
  if (!vendorData) return null;

  return (
    <div className="createorder-container">
      {/* Header Section - Back button */}
      <div className="page-header-section">
        <button className="back-btn" onClick={() => navigate(-1)}>
          <ArrowLeft size={18} />
          Back
        </button>
      </div>

      {/* Header Card */}
      <div className="page-header-card">
        <h1 className="page-title">Create Order</h1>
      </div>

      {/* Main */}
      <div className="order-main">
        <div className="left-section">
          {/* Supplier Info */}
          <div className="kpi-card">
            <h3>Supplier Info</h3>
            <div className="kpi-item">
              <label>Supplier:</label>
              <span>{vendorData.name}</span>
            </div>
            <div className="kpi-item">
              <label>Order Date:</label>
              <input
                type="date"
                value={orderDate}
                onChange={(e) => setOrderDate(e.target.value)}
              />
            </div>
          </div>

          {/* Products */}
          <div className="kpi-card add-product-card">
            <div className="card-header">
              <h3>Order Items</h3>
            </div>

            {showAddProduct && (
              <div className="add-product-box">
                <input
                  type="text"
                  placeholder="Enter product name"
                  value={manualProductName}
                  onChange={(e) => setManualProductName(e.target.value)}
                />
                <select
                  value={manualCategory}
                  onChange={(e) => setManualCategory(e.target.value)}
                >
                  <option value="">Select Category</option>
                  {MEDICINE_CATEGORIES.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  min="1"
                  value={manualQty}
                  onChange={(e) => setManualQty(e.target.value)}
                  placeholder="Enter quantity"
                />
                <button className="submit-btn" onClick={handleAddManualProduct}>
                  Add
                </button>
              </div>
            )}
          </div>

          {/* Additional Info */}
          <div className="kpi-card">
            <h3>Additional Information</h3>
            <div className="kpi-item">
              <label>Expected Delivery:</label>
              <input
                type="date"
                value={expectedDate}
                onChange={(e) => setExpectedDate(e.target.value)}
              />
            </div>
            <div className="kpi-item" style={{ flexDirection: "column", alignItems: "flex-start" }}>
              <label>Notes:</label>
              <textarea
                placeholder="Enter notes..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Right Section */}
        <div className="right-section">
          <div className="kpi-card summary-card">
            <h3>Summary</h3>
            <div className="kpi-item">Total Items: {totalItems}</div>
            
            {cart.length > 0 && (
              <div className="cart-items" style={{ marginTop: "20px" }}>
                <h4 style={{ marginBottom: "10px" }}>Cart Items:</h4>
                <div className="cart-list" style={{ maxHeight: "400px", overflowY: "auto" }}>
                  {cart.map((item) => (
                    <div key={item.uid} className="cart-item" style={{ 
                      padding: "10px", 
                      border: "1px solid #e0e0e0", 
                      borderRadius: "4px", 
                      marginBottom: "8px",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center"
                    }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: "500" }}>{item.name}</div>
                        <div style={{ fontSize: "12px", color: "#666" }}>
                          {MEDICINE_CATEGORIES.find((c) => c.id === item.category)?.name || "—"}
                        </div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <input
                          type="number"
                          min="0"
                          value={item.quantity}
                          onChange={(e) => handleQuantityChange(item.uid, e.target.value)}
                          style={{ width: "60px", padding: "4px", textAlign: "center" }}
                        />
                        <button
                          onClick={() => handleDelete(item.uid)}
                          title="Delete product"
                          style={{ 
                            background: "none", 
                            border: "none", 
                            cursor: "pointer",
                            padding: "4px"
                          }}
                        >
                          <Trash2 size={16} color="#ef4444" strokeWidth={2} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="form-actions">
            <button className="submit-btn" onClick={handleCreateOrder}>
              Create Order
            </button>
            <button className="cancel-btn" onClick={() => navigate(-1)}>
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateOrder;