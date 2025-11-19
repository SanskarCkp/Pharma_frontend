import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, Trash2 } from "lucide-react";
import "./createorder.css";
import { authFetch } from "../../../api/http";

const API_BASE = import.meta.env.VITE_API_URL?.replace(/\/+$/, "");

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

  const [showAddProduct, setShowAddProduct] = useState(false);
  const [manualProductName, setManualProductName] = useState("");
  const [manualQty, setManualQty] = useState(1);
  const [manualCategory, setManualCategory] = useState("");

  const [totalItems, setTotalItems] = useState(0);

  useEffect(() => {
    if (!vendor) {
      navigate("/masters/vendors");
      return;
    }

    const fetchVendor = async () => {
      try {
        const res = await authFetch(`${API_BASE}/procurement/vendors/${vendor.id}/`);
        if (!res.ok) return;
        const data = await res.json();
        setVendorData(data);
      } catch (err) {
        console.error("Vendor fetch error:", err);
      }
    };

    fetchVendor();
  }, [vendor, navigate]);

  const fetchProductsAndCategories = async () => {
    try {
      const pRes = await authFetch(`${API_BASE}/catalog/products/`);
      const pData = await pRes.json();
      const productList = Array.isArray(pData.results) ? pData.results : pData;

      const cRes = await authFetch(`${API_BASE}/catalog/categories/`);
      let categoryList = [];
      if (cRes.ok) {
        const cData = await cRes.json();
        categoryList = Array.isArray(cData.results) ? cData.results : cData;
      }

      setCategories(categoryList);

      const normalized = productList.map((p) => ({
        uid: `p_${p.id}`,
        id: p.id,
        name: p.name,
        quantity: Number(p.pack_unit) || 0, // <-- use pack_unit from DB
        expected_unit_cost: p.purchase_price || 0,
        category: typeof p.category === "object" ? p.category.id : p.category || null,
        isNew: false,
      }));

      setItems(normalized);
    } catch (err) {
      console.error("Fetch error:", err);
    }
  };

  useEffect(() => {
    if (vendorData) fetchProductsAndCategories();
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
      base_unit: "NOS",
      pack_unit: String(manualQty),
      units_per_pack: 1,
      base_unit_step: 1,
      gst_percent: 0,
      reorder_level: 0,
      description: "",
      storage_instructions: "",
      is_sensitive: false,
      is_active: true,
      category: Number(manualCategory),
      preferred_vendor: Number(vendorData.id),
    };

    try {
      const productRes = await authFetch(`${API_BASE}/catalog/products/`, {
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
        isNew: false,
      };

      setItems((prev) => [...prev, newItem]);

      setManualProductName("");
      setManualQty(1);
      setManualCategory("");
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

  const handleDelete = (uid) =>
    setItems((prev) => prev.filter((it) => it.uid !== uid));

  const handleCreateOrder = async () => {
    if (!vendorData?.id) return alert("Vendor not loaded");

    const orderRows = items.filter((r) => Number(r.quantity) > 0);
    if (orderRows.length === 0) return alert("Add at least one product");

    // ⭐ FIXED: backend expects `product` field, not `product_id`
    const lines = orderRows.map((r) => ({
      product: Number(r.id),
      qty_packs_ordered: Number(r.quantity),
    }));


    const netTotal = orderRows.reduce(
    (acc, it) => acc + (Number(it.quantity) * Number(it.expected_unit_cost) || 0),
    0
);


    const payload = {
      vendor: Number(vendorData.id),
      location: Number(vendorData.default_location || vendorData.location_id || 1),
      order_date: orderDate,
      expected_date: expectedDate || null,
      note: notes || "",
      lines,
      net_total: netTotal  // <-- add this
    };

    try {
      const res = await authFetch(`${API_BASE}/procurement/purchase-orders/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        console.log("❌ PO Create Failed:", err);
        alert("Order failed");
        return;
      }

      alert("Order created successfully!");
      navigate("/procurement/orders");
    } catch (err) {
      console.error("Order error:", err);
      alert("Error creating order");
    }
  };

  if (!vendorData) return null;

  return (
    <div className="createorder-container">
      <div className="page-header">
        <button className="back-btn" onClick={() => navigate(-1)}>
          <ArrowLeft size={18} />
          <span>Back</span>
        </button>
        <h1 className="page-title">Create Order</h1>
      </div>

      <div className="order-main">
        <div className="left-section">
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

                <button className="submit-btn" onClick={handleAddManualProduct}>
                  Add & Create Product
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
                    <th></th>
                  </tr>
                </thead>

                <tbody>
                  {items.map((item) => (
                    <tr key={item.uid}>
                      <td>{item.name}</td>

                      <td>
                        {
                          (categories.find((c) => String(c.id) === String(item.category)) ||
                            {}).name || "—"
                        }
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
    </div>
  );
};

export default CreateOrder;
