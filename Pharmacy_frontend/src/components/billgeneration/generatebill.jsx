import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./billgeneration.css";
import { authFetch } from "../../api/http";
import { apiUrl } from "../../api/base";

const PAYMENT_METHODS_URL = apiUrl("settings/payment-methods/");
const BILLING_MEDICINES_URL = apiUrl("sales/billing/medicines/");
const BATCHES_URL = apiUrl("catalog/batches/");
const INVOICES_URL = apiUrl("sales/invoices/");

export default function GenerateBill() {
  const navigate = useNavigate();

  const [customer, setCustomer] = useState({
    name: "",
    phone: "",
    email: "",
    city: "",
  });

  const [products, setProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [cart, setCart] = useState([]);
  const [gst, setGst] = useState(12);

  // NEW STATES 🔥
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [uomType, setUomType] = useState("LOOSE");
  const [qtyInput, setQtyInput] = useState(1);
  const [unitsPerStrip, setUnitsPerStrip] = useState(10);

  // Payment
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [selectedMethod, setSelectedMethod] = useState("");
  const [amountPaying, setAmountPaying] = useState("");

  const locationId = 1;

  // ------------------ FETCH PAYMENT METHODS ------------------
  useEffect(() => {
    async function loadPM() {
      try {
        const res = await authFetch(PAYMENT_METHODS_URL);
        const data = await res.json();
        const items = Array.isArray(data) ? data : data.results || [];
        setPaymentMethods(items);
      } catch {
        setPaymentMethods([]);
      }
    }
    loadPM();
  }, []);

  // ------------------ FETCH PRODUCTS ------------------
  useEffect(() => {
    const controller = new AbortController();

    async function fetchProducts() {
      try {
        const params = new URLSearchParams({
          location_id: String(locationId),
          q: searchTerm || "",
        });

        const res = await authFetch(
          `${BILLING_MEDICINES_URL}?${params.toString()}`,
          { signal: controller.signal }
        );
        if (!res.ok) return setProducts([]);

        const data = await res.json();
        setProducts(
          data.map((p) => ({
            id: p.product_id,
            name: p.name,
            mrp: Number(p.mrp || 0),
            gstPercent: Number(p.gst_percent || 0),
            stock: p.stock || 0,
            units_per_strip: p.units_per_strip || 10,
          }))
        );
      } catch (e) {
        if (e.name !== "AbortError") setProducts([]);
      }
    }

    fetchProducts();
    return () => controller.abort();
  }, [searchTerm]);

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  async function fetchBatchLotId(productId) {
    try {
      const res = await authFetch(`${BATCHES_URL}?product_id=${productId}`);
      const data = await res.json();
      const rows = Array.isArray(data) ? data : data.results || [];
      return rows.length ? rows[0].id : null;
    } catch {
      return null;
    }
  }

  // ---------------------------------------------
  // NEW FLOW: WHEN PRODUCT CLICKED → OPEN UOM CARD
  // ---------------------------------------------
  const openUOMCard = (product) => {
    setSelectedProduct(product);
    setUnitsPerStrip(product.units_per_strip || 10);
    setUomType("LOOSE");
    setQtyInput(1);
  };

  const addProductWithUOM = async () => {
    if (!selectedProduct) return;

    const batchLotId = await fetchBatchLotId(selectedProduct.id);

    const qtyBase =
      uomType === "LOOSE"
        ? qtyInput
        : qtyInput * selectedProduct.units_per_strip;

    setCart((prev) => [
      ...prev,
      {
        ...selectedProduct,
        qty: qtyInput,
        qty_base: qtyBase,
        sold_uom: uomType,
        batch_lot_id: batchLotId,
      },
    ]);

    setSelectedProduct(null);
  };

  // -------------------- UPDATED FUNCTION 🔥 --------------------
  const updateQty = (id, delta) => {
    setCart(
      cart.map((item) => {
        if (item.id !== id) return item;

        const newQty = Math.max(1, item.qty + delta);

        const newQtyBase =
          item.sold_uom === "LOOSE"
            ? newQty
            : newQty * (item.units_per_strip || 10);

        return {
          ...item,
          qty: newQty,
          qty_base: newQtyBase,
        };
      })
    );
  };

  const removeItem = (id) => setCart(cart.filter((item) => item.id !== id));

  const subtotal = cart.reduce((sum, item) => sum + item.mrp * item.qty, 0);
  const gstAmount = (subtotal * gst) / 100;
  const total = subtotal + gstAmount;

  // ------------------ SUBMIT INVOICE ------------------
  const submitInvoice = async (paymentMethodId, amountPaid) => {
    if (!customer.name || !customer.phone) {
      alert("Please fill customer name and phone.");
      return;
    }
    if (cart.length === 0) {
      alert("Cart is empty. Please add products.");
      return;
    }

    const withoutBatch = cart.filter((item) => !item.batch_lot_id);
    if (withoutBatch.length) {
      alert("Some items do not have stock batches. Add stock before billing.");
      return;
    }

    const lines = cart.map((item) => ({
      product: item.id,
      batch_lot: item.batch_lot_id,
      qty_base: String(item.qty_base || item.qty),
      sold_uom: item.sold_uom || "BASE",
      rate_per_base: String(item.mrp),
      discount_amount: "0",
      tax_percent: String(item.gstPercent || gst),
    }));

    const payload = {
      location: locationId,
      invoice_date: new Date().toISOString(),
      customer_name: customer.name,
      customer_phone: customer.phone,
      customer_email: customer.email || "",
      customer_city: customer.city || "",
      lines,
      payment_method: paymentMethodId,
      amount_paid: amountPaid !== undefined ? amountPaid : total,
    };

    try {
      const res = await authFetch(INVOICES_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const t = await res.text();
        alert("Invoice failed: " + t);
        return;
      }

      const invoice = await res.json();
      navigate(`/billgeneration/invoice/${invoice.id}`);
    } catch (e) {
      alert("Payment failed");
      console.error(e);
    }
  };

  const cardStyle = {
    padding: "1rem",
    border: "1px solid #d1d5db",
    borderRadius: "8px",
    backgroundColor: "#ffffff",
  };

  return (
    <div className="billgeneration-page" style={{ maxWidth: "1200px", margin: "auto", padding: "1rem" }}>
      <h1 className="page-title" style={{ fontWeight: "600", marginBottom: "1.5rem" }}>
        Billing & Invoicing
      </h1>

      <div className="grid-container" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "1rem", fontSize: "0.9rem" }}>
        
        {/* CUSTOMER INFO */}
        <div className="card" style={cardStyle}>
          <h3 style={{ marginBottom: "1rem", fontWeight: "600" }}>Customer Information</h3>
          <label>Customer Name</label>
          <input
            type="text"
            value={customer.name}
            placeholder="Enter customer name"
            onChange={(e) => setCustomer({ ...customer, name: e.target.value })}
          />
          <label style={{ marginTop: "0.75rem" }}>Phone</label>
          <input
            type="text"
            value={customer.phone}
            placeholder="Phone number"
            onChange={(e) => setCustomer({ ...customer, phone: e.target.value })}
          />
          <label style={{ marginTop: "0.75rem" }}>Email</label>
          <input
            type="email"
            value={customer.email}
            placeholder="Customer email"
            onChange={(e) => setCustomer({ ...customer, email: e.target.value })}
          />
          <label style={{ marginTop: "0.75rem" }}>City</label>
          <input
            type="text"
            value={customer.city}
            placeholder="Customer city"
            onChange={(e) => setCustomer({ ...customer, city: e.target.value })}
          />
        </div>

        {/* MEDICINES */}
        <div className="card" style={cardStyle}>
          <h3 style={{ marginBottom: "1rem", fontWeight: "600" }}>Select Medicines</h3>
          <input
            type="text"
            placeholder="Search medicines..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <div style={{ maxHeight: "360px", overflowY: "auto" }}>
            {filteredProducts.map((product) => (
              <div
                key={product.id}
                style={{
                  marginBottom: "0.5rem",
                  padding: "0.75rem",
                  border: "1px solid #e5e7eb",
                  borderRadius: "6px",
                  display: "flex",
                  justifyContent: "space-between",
                }}
              >
                <div>
                  <strong>{product.name}</strong>
                  <div style={{ fontSize: "0.75rem", color: "#6b7280" }}>
                    Stock: {product.stock} | ₹{product.mrp}
                  </div>
                </div>

                <button
                  onClick={() => openUOMCard(product)}
                  style={{
                    backgroundColor: "#22c55e",
                    color: "white",
                    border: "none",
                    borderRadius: "999px",
                    padding: "0.25rem 0.75rem",
                    fontSize: "1.3rem",
                  }}
                >
                  +
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* CART */}
        <div className="card" style={cardStyle}>
          <h3 style={{ marginBottom: "1rem", fontWeight: "600" }}>Cart Items</h3>
          {/* --- UOM Selection Card Appears Inside Cart --- */}
          {selectedProduct && (
            <div className="uom-card" style={{ marginBottom: "1rem", border: "1px solid #e5e7eb", padding: "10px", borderRadius: "8px", background: "#f3f4f6" }}>
              <h4>Select UOM for <span style={{ color: "#22c55e" }}>{selectedProduct.name}</span></h4>
              <label>Choose UOM</label>
              <select value={uomType} onChange={(e) => setUomType(e.target.value)}>
                <option value="LOOSE">Loose</option>
                <option value="STRIP">Strip</option>
              </select>
              {uomType === "STRIP" && (
                <p style={{ fontSize: "0.8rem", color: "#555" }}>
                  Units per strip: {selectedProduct.units_per_strip}
                </p>
              )}
              <label>Enter Quantity</label>
              <input
                type="number"
                min="1"
                value={qtyInput}
                onChange={(e) => setQtyInput(Number(e.target.value))}
              />
              <div style={{ marginTop: "10px", display: "flex", gap: "10px" }}>
                <button onClick={addProductWithUOM} className="generate-btn">Add to Cart</button>
                <button
                  onClick={() => setSelectedProduct(null)}
                  style={{ background: "red", color: "#fff", padding: "10px", borderRadius: "6px", border: "none" }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
          {cart.length === 0 ? (
            <p style={{ color: "#6b7280" }}>No items added.</p>
          ) : (
            <table className="cart-table" style={{ width: "100%" }}>
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Qty</th>
                  <th>Price</th>
                  <th>Total</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {cart.map((item) => (
                  <tr key={item.id}>
                    <td>
                      {item.name}
                      <br />
                      <span style={{ fontSize: "0.75rem", color: "#6b7280" }}>
                        ({item.sold_uom})
                      </span>
                    </td>
                    <td style={{ textAlign: "center" }}>
                      <button onClick={() => updateQty(item.id, -1)}>−</button>
                      <span style={{ margin: "0 6px" }}>{item.qty}</span>
                      <button onClick={() => updateQty(item.id, 1)}>+</button>
                    </td>
                    <td>₹{item.mrp.toFixed(2)}</td>
                    <td>₹{(item.qty * item.mrp).toFixed(2)}</td>
                    <td>
                      <button
                        style={{ color: "red", fontSize: "1.2rem" }}
                        onClick={() => removeItem(item.id)}
                      >
                        ×
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* SUMMARY */}
        <div className="card" style={cardStyle}>
          <h3 style={{ marginBottom: "1rem", fontWeight: "600" }}>Bill Summary</h3>
          <p style={{ display: "flex", justifyContent: "space-between" }}>
            <span>Subtotal:</span> <strong>₹{subtotal.toFixed(2)}</strong>
          </p>
          <p style={{ display: "flex", justifyContent: "space-between" }}>
            <span>GST ({gst}%):</span> <strong>₹{gstAmount.toFixed(2)}</strong>
          </p>
          <hr />
          <p
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: "1.2rem",
            }}
          >
            <strong>Total:</strong> <strong>₹{total.toFixed(2)}</strong>
          </p>

          {/* PAYMENT METHOD */}
          <div style={{ marginTop: "1rem" }}>
            <label style={{ fontWeight: "600" }}>Select Payment Method</label>
            <select
              style={{
                width: "100%",
                padding: "0.6rem",
                marginTop: "0.4rem",
                borderRadius: "8px",
                border: "1px solid #ccc",
              }}
              value={selectedMethod}
              onChange={(e) => setSelectedMethod(e.target.value)}
            >
              <option value="">-- Choose Payment Method --</option>
              {paymentMethods.map((method) => (
                <option key={method.id} value={method.id}>
                  {method.name}
                </option>
              ))}
            </select>
          </div>

          {/* AMOUNT */}
          <div style={{ marginTop: "1rem" }}>
            <label style={{ fontWeight: "600" }}>Amount Paying</label>
            <input
              type="number"
              placeholder="Enter Amount"
              value={amountPaying}
              onChange={(e) => setAmountPaying(e.target.value)}
              style={{
                width: "100%",
                padding: "0.6rem",
                marginTop: "0.4rem",
                borderRadius: "8px",
                border: "1px solid #ccc",
              }}
            />
          </div>

          <button
            className="generate-btn"
            style={{ width: "100%", marginTop: "1rem" }}
            onClick={() => submitInvoice(selectedMethod, parseFloat(amountPaying))}
            disabled={!selectedMethod || !amountPaying}
          >
            Complete Payment
          </button>
        </div>
      </div>
    </div>
  );
}
