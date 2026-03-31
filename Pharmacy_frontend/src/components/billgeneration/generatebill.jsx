import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./billgeneration.css";
import { authFetch } from "../../api/http";

const API_BASE = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000/api/v1";

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

  const locationId = 1;

  useEffect(() => {
    const controller = new AbortController();

    async function fetchProducts() {
      try {
        const params = new URLSearchParams({
          location_id: String(locationId),
          q: searchTerm || "",
        });

        const res = await authFetch(
          `${API_BASE}/sales/billing/medicines/?${params.toString()}`,
          { signal: controller.signal }
        );
        if (!res.ok) {
          setProducts([]);
          return;
        }
        const data = await res.json();
        const mapped = data.map((p) => ({
          id: p.product_id,
          name: p.name,
          mrp: Number(p.mrp || 0),
          gstPercent: Number(p.gst_percent || 0),
          stock: p.stock || 0,
        }));
        setProducts(mapped);
      } catch (e) {
        if (e.name !== "AbortError") {
          setProducts([]);
        }
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
      const res = await authFetch(
        `${API_BASE}/catalog/batches/?product=${productId}`
      );
      if (!res.ok) {
        return null;
      }
      const data = await res.json();
      const rows = Array.isArray(data) ? data : data.results || [];
      if (!rows.length) return null;
      return rows[0].id;
    } catch {
      return null;
    }
  }

  const addToCart = async (product) => {
    if (!product) return;

    const exists = cart.find((item) => item.id === product.id);
    if (exists) {
      setCart(
        cart.map((item) =>
          item.id === product.id ? { ...item, qty: item.qty + 1 } : item
        )
      );
      return;
    }

    let batchLotId = null;
    try {
      batchLotId = await fetchBatchLotId(product.id);
    } catch {
      batchLotId = null;
    }

    setCart([
      ...cart,
      {
        ...product,
        qty: 1,
        batch_lot_id: batchLotId,
      },
    ]);
  };

  const updateQty = (id, delta) => {
    setCart(
      cart.map((item) =>
        item.id === id ? { ...item, qty: Math.max(1, item.qty + delta) } : item
      )
    );
  };

  const removeItem = (id) => setCart(cart.filter((item) => item.id !== id));

  const subtotal = cart.reduce(
    (sum, item) => sum + item.mrp * item.qty,
    0
  );
  const gstAmount = (subtotal * gst) / 100;
  const total = subtotal + gstAmount;

  const submitInvoice = async (opts = { autoPrint: false }) => {
    if (!customer.name || !customer.phone || cart.length === 0) {
      alert("Please fill all customer info and add items to cart.");
      return;
    }

    const withoutBatch = cart.filter((item) => !item.batch_lot_id);
    if (withoutBatch.length) {
      alert(
        "Some items do not have an associated stock batch. Please create batches/stock entries for these medicines in the backend before billing."
      );
      return;
    }

    const lines = cart.map((item) => ({
      product: item.id,
      batch_lot: item.batch_lot_id,
      qty_base: String(item.qty),
      sold_uom: "BASE",
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
    };

    try {
      const res = await authFetch(`${API_BASE}/sales/invoices/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        let msg = "Failed to create invoice";
        try {
          const errJson = await res.json();
          msg += `: ${JSON.stringify(errJson)}`;
        } catch {
          const errText = await res.text();
          if (errText) msg += `: ${errText}`;
        }
        console.error(msg);
        alert(msg);
        return;
      }
      const invoice = await res.json();

      await authFetch(
        `${API_BASE}/sales/invoices/${invoice.id}/complete-payment/`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mode: "CASH", amount: "auto" }),
        }
      );

      const suffix = opts.autoPrint ? "?print=1" : "";
      navigate(`/billgeneration/invoice/${invoice.id}${suffix}`);
    } catch (e) {
      console.error(e);
      alert("Failed to save and complete payment");
    }
  };

  const cardStyle = {
    padding: "1rem",
    border: "1px solid #d1d5db",
    borderRadius: "8px",
    backgroundColor: "#ffffff",
  };

  return (
    <div
      className="billgeneration-page"
      style={{ maxWidth: "1200px", margin: "auto", padding: "1rem" }}
    >
      <h1
        className="page-title"
        style={{ fontWeight: "600", marginBottom: "1.5rem" }}
      >
        Billing &amp; Invoicing
      </h1>

      <div
        className="grid-container"
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr 1fr",
          gap: "1rem",
          fontSize: "0.9rem",
        }}
      >
        {/* Customer Information */}
        <div className="card" style={cardStyle}>
          <h3 style={{ marginBottom: "1rem", fontWeight: "600" }}>
            Customer Information
          </h3>
          <label>Customer Name</label>
          <input
            type="text"
            placeholder="Enter customer name"
            value={customer.name}
            onChange={(e) => setCustomer({ ...customer, name: e.target.value })}
            style={{
              width: "100%",
              padding: "0.5rem",
              marginBottom: "1rem",
              borderRadius: "4px",
              border: "1px solid #d1d5db",
            }}
          />
          <label>Phone Number</label>
          <input
            type="text"
            placeholder="Enter phone number"
            value={customer.phone}
            onChange={(e) =>
              setCustomer({ ...customer, phone: e.target.value })
            }
            style={{
              width: "100%",
              padding: "0.5rem",
              borderRadius: "4px",
              border: "1px solid #d1d5db",
            }}
          />
          <label style={{ marginTop: "0.75rem" }}>Customer Email</label>
          <input
            type="email"
            placeholder="Enter customer email"
            value={customer.email}
            onChange={(e) =>
              setCustomer({ ...customer, email: e.target.value })
            }
            style={{
              width: "100%",
              padding: "0.5rem",
              borderRadius: "4px",
              border: "1px solid #d1d5db",
              marginBottom: "0.75rem",
            }}
          />
          <label>City</label>
          <input
            type="text"
            placeholder="Enter city"
            value={customer.city}
            onChange={(e) =>
              setCustomer({ ...customer, city: e.target.value })
            }
            style={{
              width: "100%",
              padding: "0.5rem",
              borderRadius: "4px",
              border: "1px solid #d1d5db",
            }}
          />
        </div>

        {/* Select Medicines */}
        <div className="card" style={cardStyle}>
          <h3 style={{ marginBottom: "1rem", fontWeight: "600" }}>
            Select Medicines
          </h3>
          <input
            type="text"
            placeholder="Search medicines..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: "100%",
              padding: "0.5rem",
              marginBottom: "1rem",
              borderRadius: "4px",
              border: "1px solid #e5e7eb",
            }}
          />

          <div style={{ maxHeight: "360px", overflowY: "auto" }}>
            {filteredProducts.map((product) => (
              <div
                key={product.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "0.75rem",
                  borderRadius: "6px",
                  border: "1px solid #e5e7eb",
                  marginBottom: "0.5rem",
                }}
              >
                <div>
                  <div style={{ fontWeight: 500 }}>{product.name}</div>
                  <div
                    style={{
                      fontSize: "0.75rem",
                      color: "#6b7280",
                      marginTop: "0.25rem",
                    }}
                  >
                    Stock: {product.stock} &nbsp; | &nbsp; ₹
                    {product.mrp.toFixed(2)}
                  </div>
                </div>
                <button
                  onClick={() => addToCart(product)}
                  style={{
                    backgroundColor: "#22c55e",
                    color: "white",
                    border: "none",
                    borderRadius: "999px",
                    padding: "0.25rem 0.75rem",
                    cursor: "pointer",
                    fontSize: "1.25rem",
                  }}
                >
                  +
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Cart Items */}
        <div className="card" style={cardStyle}>
          <h3 style={{ marginBottom: "1rem", fontWeight: "600" }}>Cart Items</h3>
          {cart.length === 0 ? (
            <p style={{ color: "#6b7280", fontSize: "0.9rem" }}>
              No items added yet.
            </p>
          ) : (
            <table className="cart-table">
              <thead>
                <tr>
                  <th>Item</th>
                  <th style={{ textAlign: "center" }}>Qty</th>
                  <th style={{ textAlign: "right" }}>Price</th>
                  <th style={{ textAlign: "right" }}>Total</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {cart.map((item) => (
                  <tr key={item.id}>
                    <td>{item.name}</td>
                    <td style={{ textAlign: "center" }}>
                      <button
                        onClick={() => updateQty(item.id, -1)}
                        style={{
                          backgroundColor: "#e5e7eb",
                          border: "none",
                          borderRadius: "4px",
                          padding: "0 0.5rem",
                          cursor: "pointer",
                        }}
                      >
                        -
                      </button>
                      <span style={{ margin: "0 0.5rem" }}>{item.qty}</span>
                      <button
                        onClick={() => updateQty(item.id, 1)}
                        style={{
                          backgroundColor: "#e5e7eb",
                          border: "none",
                          borderRadius: "4px",
                          padding: "0 0.5rem",
                          cursor: "pointer",
                        }}
                      >
                        +
                      </button>
                    </td>
                    <td style={{ textAlign: "right" }}>₹{item.mrp.toFixed(2)}</td>
                    <td style={{ textAlign: "right" }}>
                      ₹{(item.qty * item.mrp).toFixed(2)}
                    </td>
                    <td style={{ textAlign: "center" }}>
                      <button
                        onClick={() => removeItem(item.id)}
                        style={{
                          backgroundColor: "transparent",
                          border: "none",
                          cursor: "pointer",
                          color: "#ef4444",
                          fontSize: "1.1rem",
                        }}
                        title="Remove item"
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

        {/* Bill Summary */}
        <div className="card" style={cardStyle}>
          <h3 style={{ marginBottom: "1rem", fontWeight: "600" }}>Bill Summary</h3>

          <div
            style={{
              border: "1px solid #d1d5db",
              borderRadius: "6px",
              padding: "1rem",
            }}
          >
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th
                    style={{
                      textAlign: "left",
                      borderBottom: "1px solid #d1d5db",
                      paddingBottom: "0.5rem",
                    }}
                  >
                    Item
                  </th>
                  <th
                    style={{
                      textAlign: "center",
                      borderBottom: "1px solid #d1d5db",
                      paddingBottom: "0.5rem",
                    }}
                  >
                    Qty
                  </th>
                  <th
                    style={{
                      textAlign: "right",
                      borderBottom: "1px solid #d1d5db",
                      paddingBottom: "0.5rem",
                    }}
                  >
                    Price
                  </th>
                  <th
                    style={{
                      textAlign: "right",
                      borderBottom: "1px solid #d1d5db",
                      paddingBottom: "0.5rem",
                    }}
                  >
                    Total
                  </th>
                </tr>
              </thead>
              <tbody>
                {cart.map((item) => (
                  <tr key={item.id}>
                    <td style={{ padding: "0.3rem 0" }}>{item.name}</td>
                    <td style={{ textAlign: "center" }}>{item.qty}</td>
                    <td style={{ textAlign: "right" }}>
                      ₹{item.mrp.toFixed(2)}
                    </td>
                    <td style={{ textAlign: "right" }}>
                      ₹{(item.qty * item.mrp).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <hr style={{ margin: "0.5rem 0" }} />

            <p
              style={{
                display: "flex",
                justifyContent: "space-between",
                margin: "0.2rem 0",
              }}
            >
              <span>Subtotal:</span>
              <span>₹{subtotal.toFixed(2)}</span>
            </p>

            <p
              style={{
                display: "flex",
                justifyContent: "space-between",
                margin: "0.2rem 0",
              }}
            >
              <span>GST ({gst}%):</span>
              <span>₹{gstAmount.toFixed(2)}</span>
            </p>

            <hr style={{ margin: "0.5rem 0" }} />

            <p
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontWeight: "600",
                fontSize: "1.2rem",
              }}
            >
              <span>Total:</span>
              <span>₹{total.toFixed(2)}</span>
            </p>
          </div>

          <button
            onClick={() => submitInvoice({ autoPrint: false })}
            className="generate-btn"
            style={{
              marginTop: "1rem",
              backgroundColor: "#14b8a6",
              color: "white",
              width: "100%",
              borderRadius: "6px",
              padding: "0.7rem",
              cursor: "pointer",
              fontWeight: "600",
            }}
          >
            Complete Payment
          </button>
          <button
            onClick={() => submitInvoice({ autoPrint: true })}
            className="generate-btn"
            style={{
              marginTop: "0.75rem",
              backgroundColor: "#0f766e",
              color: "white",
              width: "100%",
              borderRadius: "6px",
              padding: "0.7rem",
              cursor: "pointer",
              fontWeight: "600",
            }}
          >
            Print Bill (Cash)
          </button>
        </div>
      </div>
    </div>
  );
}
