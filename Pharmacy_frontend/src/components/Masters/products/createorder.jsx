import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, Trash2 } from "lucide-react";
import "./createorder.css";
import { authFetch } from "../../../api/http";
import { getDefaultLocationId } from "../../../config/location";

const API_BASE = import.meta.env.VITE_API_URL?.replace(/\/+$/, "");
const DEFAULT_LOCATION_ID = getDefaultLocationId();

const CreateOrder = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const vendor = location.state?.vendor;

  const [vendorData, setVendorData] = useState(null);
  const [orderDate, setOrderDate] = useState(new Date().toISOString().slice(0, 10));
  const [expectedDate, setExpectedDate] = useState("");
  const [notes, setNotes] = useState("");

  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [uoms, setUoms] = useState([]);

  const [showAddProduct, setShowAddProduct] = useState(false);
  const [manualProductName, setManualProductName] = useState("");
  const [manualQty, setManualQty] = useState(1);
  const [manualCategory, setManualCategory] = useState("");
  const [manualUOM, setManualUOM] = useState("");

  const [totalItems, setTotalItems] = useState(0);

  // ⭐ Popup state
  const [popupMessage, setPopupMessage] = useState("");
  const [showPopup, setShowPopup] = useState(false);

  useEffect(() => {
    if (!vendor) {
      navigate("/masters/vendors");
      return;
    }

    const fetchVendor = async () => {
      try {
        const res = await authFetch(`${API_BASE}/api/v1/procurement/vendors/${vendor.id}/`);
        if (!res.ok) return;
        const data = await res.json();
        setVendorData(data);
      } catch (err) {
        console.error("Vendor fetch error:", err);
      }
    };

    fetchVendor();
  }, [vendor, navigate]);

  const fetchUOMs = async () => {
    try {
      const res = await authFetch(`${API_BASE}/api/v1/catalog/uoms/`);
      const data = await res.json();
      setUoms(Array.isArray(data) ? data : data.results || []);
    } catch (err) {
      console.error("UOM fetch error:", err);
    }
  };

  const fetchProductsAndCategories = async () => {
    try {
      const pRes = await authFetch(`${API_BASE}/api/v1/catalog/products/`);
      const pData = await pRes.json();
      const productList = Array.isArray(pData) ? pData : pData.results || [];

      const cRes = await authFetch(`${API_BASE}/api/v1/catalog/categories/`);
      let categoryList = [];
      if (cRes.ok) {
        const cData = await cRes.json();
        categoryList = Array.isArray(cData) ? cData : cData.results || [];
      }

      setCategories(categoryList);

      const normalized = productList.map((p) => ({
        uid: `p_${p.id}`,
        id: p.id,
        name: p.name,
        quantity: Number(p.pack_unit) || 0,
        expected_unit_cost: p.purchase_price || 0,
        category: typeof p.category === "object" ? p.category.id : p.category || null,
        uom: p.base_unit || "",
        isNew: false,
      }));

      setItems(normalized);
    } catch (err) {
      console.error("Fetch error:", err);
    }
  };

  useEffect(() => {
    if (vendorData) {
      fetchProductsAndCategories();
      fetchUOMs();
    }
  }, [vendorData]);

  useEffect(() => {
    const totalQty = items.reduce((acc, it) => acc + (Number(it.quantity) || 0), 0);
    setTotalItems(totalQty);
  }, [items]);

  const generateProductCode = (name) => {
    const slug = name.toUpperCase().replace(/[^A-Z0-9]+/g, "").slice(0, 6);
    const rand = Math.floor(Math.random() * 9000) + 1000;
    return `${slug || "PRD"}${rand}`;
  };

  const handleAddProduct = () => setShowAddProduct(true);

  const handleAddManualProduct = async () => {
    if (!manualProductName.trim()) return alert("Enter product name");
    if (!manualQty || Number(manualQty) <= 0) return alert("Enter valid qty");
    if (!manualCategory) return alert("Select category");
    if (!manualUOM) return alert("Select UOM");
    if (!vendorData?.id) return alert("Vendor not loaded");

    const productPayload = {
      code: generateProductCode(manualProductName.trim()),
      name: manualProductName.trim(),
      generic_name: "",
      dosage_strength: "",
      hsn: "",
      schedule: "OTC",
      pack_size: "",
      manufacturer: "",
      mrp: 0,
      base_unit: manualUOM,
      pack_unit: String(manualQty),
      units_per_pack: 1,
      base_unit_step: 1,
      gst_percent: 0,
      description: "",
      storage_instructions: "",
      is_sensitive: false,
      is_active: true,
      category: Number(manualCategory),
      preferred_vendor: Number(vendorData.id),
    };

    try {
      const productRes = await authFetch(`${API_BASE}/api/v1/catalog/products/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(productPayload),
      });

      if (!productRes.ok) {
        const err = await productRes.json();
        console.log("❌ Product Create Failed:", err);
        alert("Product save failed");
        return;
      }

      const created = await productRes.json();
      const newItem = {
        uid: `p_${created.id}`,
        id: created.id,
        name: created.name,
        quantity: Number(manualQty),
        expected_unit_cost: created.mrp || 0,
        category:
          typeof created.category === "object"
            ? created.category.id
            : created.category || Number(manualCategory),
        uom: manualUOM,
        isNew: false,
      };

      setItems((prev) => [...prev, newItem]);
      setManualProductName("");
      setManualQty(1);
      setManualCategory("");
      setManualUOM("");
      setShowAddProduct(false);
    } catch (err) {
      console.error("Manual product error:", err);
      alert("Error creating product");
    }
  };

  const handleQuantityChange = (uid, value) =>
    setItems((prev) =>
      prev.map((it) => (it.uid === uid ? { ...it, quantity: Number(value) || 0 } : it))
    );

  const handleUOMChange = (uid, value) =>
    setItems((prev) =>
      prev.map((it) => (it.uid === uid ? { ...it, uom: value } : it))
    );

  const handleDelete = (uid) =>
    setItems((prev) => prev.filter((it) => it.uid !== uid));

  const handleCreateOrder = async () => {
    if (!vendorData?.id) return alert("Vendor not loaded");

    const orderRows = items.filter((r) => Number(r.quantity) > 0);
    if (orderRows.length === 0) return alert("Add at least one product");

    const lines = orderRows.map((r) => ({
      product: r.id,
      requested_name: "",
      qty_packs_ordered: Number(r.quantity),
      expected_unit_cost: r.expected_unit_cost || null,
      gst_percent_override: null,
      uom: r.uom || null,
    }));

    const payload = {
      vendor: Number(vendorData.id),
      location: DEFAULT_LOCATION_ID,
      order_date: orderDate,
      expected_date: expectedDate || null,
      status: "DRAFT",
      note: notes || "",
      lines: lines,
    };

    try {
      const res = await authFetch(`${API_BASE}/api/v1/procurement/purchase-orders/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        console.log("❌ PO Create Failed:", err);
        setPopupMessage("Order creation failed!");
        setShowPopup(true);
        return;
      }

      // ✅ Show success popup
      setPopupMessage("Order created successfully!");
      setShowPopup(true);
    } catch (err) {
      console.error("Order error:", err);
      setPopupMessage("Error creating order");
      setShowPopup(true);
    }
  };

  if (!vendorData) return null;

  return (
    <div className="createorder-container">
      {/* Header */}
      <div className="page-header">
        <button className="back-btn" onClick={() => navigate(-1)}>
          <ArrowLeft size={18} />
          <span>Back</span>
        </button>
        <h1 className="page-title">Create Order</h1>
      </div>

      {/* Main */}
      <div className="order-main">
        <div className="left-section">
          {/* Supplier Info */}
          <div className="kpi-card">
            <h3>Supplier Info</h3>
            <div className="kpi-item">Supplier: {vendorData.name}</div>
            <div className="kpi-item">
              Order Date:
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
              <button className="add-btn" onClick={handleAddProduct}>
                + Add Product
              </button>
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
                  {categories.map((c) => (
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
                />
                <select
                  value={manualUOM}
                  onChange={(e) => setManualUOM(e.target.value)}
                >
                  <option value="">Select UOM</option>
                  {uoms.map((u) => (
                    <option key={u.id} value={u.code}>
                      {u.name}
                    </option>
                  ))}
                </select>
                <button className="submit-btn" onClick={handleAddManualProduct}>
                  Add
                </button>
              </div>
            )}

            {items.length === 0 ? (
              <div className="no-products">No products available.</div>
            ) : (
              <table className="products-table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Category</th>
                    <th>Qty</th>
                    <th>UOM</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.uid}>
                      <td>{item.name}</td>
                      <td>
                        {categories.find((c) => String(c.id) === String(item.category))
                          ?.name || "—"}
                      </td>
                      <td>
                        <input
                          type="number"
                          min="0"
                          value={item.quantity}
                          onChange={(e) =>
                            handleQuantityChange(item.uid, e.target.value)
                          }
                        />
                      </td>
                      <td>
                        <select
                          value={item.uom || ""}
                          onChange={(e) => handleUOMChange(item.uid, e.target.value)}
                        >
                          <option value="">Select</option>
                          {uoms.map((u) => (
                            <option key={u.id} value={u.code}>
                              {u.name}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <button
                          className="delete-btn"
                          onClick={() => handleDelete(item.uid)}
                        >
                          <Trash2 size={18} color="red" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Additional Info */}
          <div className="kpi-card">
            <h3>Additional Information</h3>
            <div className="kpi-item">
              Expected Delivery:
              <input
                type="date"
                value={expectedDate}
                onChange={(e) => setExpectedDate(e.target.value)}
              />
            </div>
            <div className="kpi-item">
              Notes:
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

      {/* ⭐ Popup */}
      {showPopup && (
        <div className="custom-popup-overlay">
          <div className="custom-popup-box">
            <h3>{popupMessage}</h3>
            <button
              className="submit-btn"
              onClick={() => setShowPopup(false)}
            >
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreateOrder;