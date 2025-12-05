import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./billgeneration.css";
import { authFetch } from "../../api/http";
import { apiUrl } from "../../api/base";
import { getDefaultLocationId } from "../../config/location";

const PAYMENT_METHODS_URL = apiUrl("settings/payment-methods/");
const INVENTORY_GLOBAL_URL = apiUrl("inventory/medicines/global/");
const MEDICINE_DETAIL_URL = (batchId) => apiUrl(`inventory/medicines/${batchId}/`);
const INVOICES_URL = apiUrl("sales/invoices/");

const numberOrZero = (value, digits = null) => {
  const num = Number(value);
  if (!Number.isFinite(num)) return 0;
  if (digits === null) return num;
  return Number(num.toFixed(digits));
};

const formatCurrency = (value) => {
  const num = numberOrZero(value, 2);
  return `Rs.${num.toFixed(2)}`;
};

const qtyToString = (value) => {
  const num = numberOrZero(value, 3);
  return num.toFixed(3);
};

const deriveUnitsPerPack = (med = {}) => {
  const parse = (v) => numberOrZero(v);
  if (med.units_per_pack) {
    const n = parse(med.units_per_pack);
    if (n > 0) return n;
  }
  const tabletsPerStrip = parse(med.tablets_per_strip);
  const stripsPerBox = parse(med.strips_per_box);
  if (tabletsPerStrip && stripsPerBox) {
    return tabletsPerStrip * stripsPerBox;
  }
  if (tabletsPerStrip) return tabletsPerStrip;
  return 1;
};

export default function GenerateBill() {
  const navigate = useNavigate();
  const locationId = getDefaultLocationId();

  const [customer, setCustomer] = useState({ name: "", phone: "", email: "", city: "" });
  const [products, setProducts] = useState([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [productsError, setProductsError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [cart, setCart] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedUomKey, setSelectedUomKey] = useState("BASE");
  const [qtyInput, setQtyInput] = useState(1);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [selectedMethod, setSelectedMethod] = useState("");
  const [amountPaying, setAmountPaying] = useState("");
  const [inventoryRefreshTick, setInventoryRefreshTick] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const dispatchInventoryRefresh = () => {
    try {
      window.dispatchEvent(new CustomEvent("inventory:refresh"));
    } catch {
      /* ignore */
    }
  };

  useEffect(() => {
    const handler = () => setInventoryRefreshTick((prev) => prev + 1);
    window.addEventListener("inventory:refresh", handler);
    return () => window.removeEventListener("inventory:refresh", handler);
  }, []);

  useEffect(() => {
    async function loadPaymentMethods() {
      try {
        const res = await authFetch(PAYMENT_METHODS_URL);
        const data = await res.json();
        const list = Array.isArray(data) ? data : data.results || [];
        setPaymentMethods(list);
      } catch (err) {
        console.error(err);
        setPaymentMethods([]);
      }
    }
    loadPaymentMethods();
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    async function fetchProducts() {
      setProductsLoading(true);
      setProductsError("");
      try {
        const params = new URLSearchParams();
        if (locationId) params.set("location_id", String(locationId));
        if (searchTerm) params.set("q", searchTerm.trim());
        params.set("status", "IN_STOCK");
        const res = await authFetch(`${INVENTORY_GLOBAL_URL}?${params.toString()}`, { signal: controller.signal });
        if (!res.ok) {
          throw new Error(`Failed to load inventory (${res.status})`);
        }
        const data = await res.json();
        const list = Array.isArray(data) ? data : data.results || [];
        setProducts(
          list.map((row) => ({
            batch_id: row.batch_id,
            batch_number: row.batch_number,
            product_id: row.product_id,
            name: row.medicine_name || row.medicine_id || "",
            stock_base: numberOrZero(row.quantity),
            mrp: numberOrZero(row.mrp, 2),
            base_uom: row.uom || "units",
            rack: row.rack || "",
            status: row.status,
          }))
        );
      } catch (err) {
        if (err.name === "AbortError") return;
        console.error(err);
        setProducts([]);
        setProductsError(err.message || "Unable to load inventory");
      } finally {
        setProductsLoading(false);
      }
    }

    fetchProducts();
    return () => controller.abort();
  }, [searchTerm, inventoryRefreshTick, locationId]);

  const fetchBatchDetail = async (batchId) => {
    const params = new URLSearchParams();
    if (locationId) params.set("location_id", String(locationId));
    const res = await authFetch(
      params.toString() ? `${MEDICINE_DETAIL_URL(batchId)}?${params.toString()}` : MEDICINE_DETAIL_URL(batchId)
    );
    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || "Unable to fetch batch detail");
    }
    return res.json();
  };

  const openUOMCard = async (product) => {
    if (!product?.batch_id) return;
    setLoadingDetail(true);
    setSelectedProduct(null);
    try {
      const detail = await fetchBatchDetail(product.batch_id);
      const medicine = detail.medicine || {};
      const inventory = detail.inventory || {};
      const baseLabel = medicine.base_uom?.name || product.base_uom || "Units";
      const sellingLabel = medicine.selling_uom?.name || "";
      const gstPercent = numberOrZero(medicine.gst_percent);
      const packPrice = numberOrZero(medicine.mrp || product.mrp, 2);
      const unitsPerPack = Math.max(1, deriveUnitsPerPack(medicine));
      const ratePerBase = unitsPerPack > 0 ? packPrice / unitsPerPack : packPrice;
      const availableBase = numberOrZero(inventory.stock_on_hand_base || product.stock_base || 0);

      const options = [];
      if (unitsPerPack > 0) {
        const packLabelText = sellingLabel?.trim()
          ? sellingLabel.trim()
          : `${baseLabel} Pack`;
        options.push({
          key: "PACK",
          code: "PACK",
          displayLabel: `${packLabelText} (${unitsPerPack} ${baseLabel})`,
          factor: unitsPerPack,
        });
      }
      options.push({
        key: "BASE",
        code: "BASE",
        displayLabel: `${baseLabel} (base)`,
        factor: 1,
      });

      const detailData = {
        batch_id: product.batch_id,
        batch_number: product.batch_number,
        product_id: product.product_id,
        name: medicine.name || product.name,
        gstPercent,
        packPrice,
        ratePerBase,
        availableBase,
        baseLabel,
        uomOptions: options,
      };

      setSelectedProduct(detailData);
      setSelectedUomKey(options[0]?.key || "BASE");
      setQtyInput(options[0] && availableBase > 0 ? 1 : 0);
    } catch (err) {
      console.error(err);
      alert(err.message || "Unable to load medicine details. Please try again.");
    } finally {
      setLoadingDetail(false);
    }
  };

  const selectedOption = selectedProduct?.uomOptions?.find((o) => o.key === selectedUomKey) || null;
  const maxQtyForSelected = useMemo(() => {
    if (!selectedProduct || !selectedOption) return undefined;
    if (!selectedProduct.availableBase || selectedProduct.availableBase <= 0) return 0;
    const factor = selectedOption.factor || 1;
    if (factor <= 0) return undefined;
    return Math.floor(selectedProduct.availableBase / factor);
  }, [selectedProduct, selectedOption]);

  useEffect(() => {
    if (!selectedProduct || maxQtyForSelected === undefined) return;
    if (maxQtyForSelected === 0) {
      setQtyInput(0);
    } else if (qtyInput <= 0) {
      setQtyInput(1);
    } else if (qtyInput > maxQtyForSelected) {
      setQtyInput(maxQtyForSelected);
    }
  }, [selectedProduct, maxQtyForSelected]);

  const addProductWithUOM = () => {
    if (!selectedProduct || !selectedOption) return;
    if (!maxQtyForSelected || maxQtyForSelected <= 0) {
      alert("No stock available for this unit.");
      return;
    }
    const qty = Math.max(1, Math.min(qtyInput || 1, maxQtyForSelected));
    const conversionFactor = selectedOption.factor || 1;
    const qtyBase = qty * conversionFactor;
    const soldLabel = selectedOption.displayLabel;
    const soldCode = selectedOption.code;
    const unitPrice = soldCode === "PACK" ? selectedProduct.packPrice : selectedProduct.ratePerBase;

    setCart((prev) => {
      const next = [...prev];
      const idx = next.findIndex((item) => item.batch_id === selectedProduct.batch_id);
      const line = {
        batch_id: selectedProduct.batch_id,
        batch_number: selectedProduct.batch_number,
        product_id: selectedProduct.product_id,
        name: selectedProduct.name,
        gstPercent: selectedProduct.gstPercent,
        packPrice: selectedProduct.packPrice,
        ratePerBase: selectedProduct.ratePerBase,
        unitPrice,
        qty,
        qty_base: qtyBase,
        sold_uom_code: soldCode,
        sold_uom_label: soldLabel,
        conversionFactor,
        availableBase: selectedProduct.availableBase,
      };
      if (idx >= 0) {
        next[idx] = line;
      } else {
        next.push(line);
      }
      return next;
    });
    setSelectedProduct(null);
    setSelectedUomKey("BASE");
    setQtyInput(1);
  };

  const updateQty = (batchId, delta) => {
    setCart((prev) =>
      prev.map((item) => {
        if (item.batch_id !== batchId) return item;
        const desired = Math.max(1, item.qty + delta);
        const maxQty = item.conversionFactor > 0 && item.availableBase
          ? Math.max(1, Math.floor(item.availableBase / item.conversionFactor))
          : undefined;
        const qty = maxQty ? Math.min(desired, maxQty) : desired;
        return {
          ...item,
          qty,
          qty_base: qty * (item.conversionFactor || 1),
        };
      })
    );
  };

  const removeItem = (batchId) => {
    setCart((prev) => prev.filter((item) => item.batch_id !== batchId));
  };

  const totals = useMemo(() => {
    let subtotal = 0;
    let taxAmount = 0;
    cart.forEach((item) => {
      const lineSubtotal = numberOrZero(item.unitPrice) * numberOrZero(item.qty);
      subtotal += lineSubtotal;
      const pct = numberOrZero(item.gstPercent);
      taxAmount += lineSubtotal * (pct / 100);
    });
    return { subtotal, taxAmount, total: subtotal + taxAmount };
  }, [cart]);

  useEffect(() => {
    if (!cart.length) {
      setAmountPaying("");
      return;
    }
    if (!amountPaying) {
      const amt = totals.total;
      if (amt > 0) {
        setAmountPaying(numberOrZero(amt, 2).toFixed(2));
      }
    }
  }, [cart, totals.total]);

  const submitInvoice = async () => {
    if (submitting) return;
    if (!customer.name || !customer.phone || !customer.city) {
      alert("Customer name, phone, and city are required.");
      return;
    }
    if (!cart.length) {
      alert("Cart is empty. Please add medicines.");
      return;
    }
    if (!selectedMethod) {
      alert("Select a payment method.");
      return;
    }
    const amountPaid = parseFloat(amountPaying);
    if (!Number.isFinite(amountPaid) || amountPaid <= 0) {
      alert("Enter a valid payment amount.");
      return;
    }

    const missingBatch = cart.find((item) => !item.batch_id);
    if (missingBatch) {
      alert("One or more items are missing batch information. Remove them and try again.");
      return;
    }

    const lines = cart.map((item) => ({
      product: item.product_id,
      batch_lot: item.batch_id,
      qty_base: qtyToString(item.qty_base),
      sold_uom: item.sold_uom_code || "BASE",
      rate_per_base: numberOrZero(item.ratePerBase, 4).toFixed(4),
      discount_amount: "0",
      tax_percent: numberOrZero(item.gstPercent, 2).toFixed(2),
    }));

    const payload = {
      location: locationId,
      invoice_date: new Date().toISOString(),
      customer_name: customer.name,
      customer_phone: customer.phone,
      customer_email: customer.email || "",
      customer_city: customer.city || "",
      lines,
      payment_method: selectedMethod,
      amount_paid: amountPaid,
    };

    try {
      setSubmitting(true);
      const res = await authFetch(INVOICES_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `Invoice failed (${res.status})`);
      }
      const data = await res.json();
      dispatchInventoryRefresh();
      setCart([]);
      setSelectedProduct(null);
      setAmountPaying("");
      setSelectedMethod("");
      setSearchTerm("");
      navigate(`/billgeneration/invoice/${data.id}`);
    } catch (err) {
      console.error(err);
      alert(err.message || "Unable to submit invoice");
    } finally {
      setSubmitting(false);
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
      <h1 className="page-title" style={{ fontWeight: 600, marginBottom: "1.5rem" }}>
        Billing & Invoicing
      </h1>

      <div className="grid-container" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "1rem", fontSize: "0.9rem" }}>
        <div className="card" style={cardStyle}>
          <h3 style={{ marginBottom: "1rem", fontWeight: 600 }}>Customer Information</h3>
          <label>Customer Name *</label>
          <input value={customer.name} onChange={(e) => setCustomer({ ...customer, name: e.target.value })} placeholder="Enter customer name" />
          <label style={{ marginTop: "0.75rem" }}>Phone *</label>
          <input value={customer.phone} onChange={(e) => setCustomer({ ...customer, phone: e.target.value })} placeholder="Phone number" />
          <label style={{ marginTop: "0.75rem" }}>Email</label>
          <input value={customer.email} onChange={(e) => setCustomer({ ...customer, email: e.target.value })} placeholder="Customer email" />
          <label style={{ marginTop: "0.75rem" }}>City *</label>
          <input value={customer.city} onChange={(e) => setCustomer({ ...customer, city: e.target.value })} placeholder="Customer city" />
        </div>

        <div className="card" style={cardStyle}>
          <h3 style={{ marginBottom: "1rem", fontWeight: 600 }}>Select Medicines</h3>
          <input type="text" placeholder="Search medicines..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          <div style={{ maxHeight: "360px", overflowY: "auto", marginTop: "0.75rem" }}>
            {productsLoading && <p>Loading medicines...</p>}
            {!productsLoading && productsError && <p style={{ color: "#dc2626" }}>{productsError}</p>}
            {!productsLoading && !productsError && !products.length && <p>No medicines available.</p>}
            {products.map((product) => (
              <div
                key={product.batch_id}
                style={{
                  marginBottom: "0.5rem",
                  padding: "0.75rem",
                  border: "1px solid #e5e7eb",
                  borderRadius: "6px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div>
                  <strong>{product.name}</strong>
                  <div style={{ fontSize: "0.75rem", color: "#6b7280" }}>
                    Batch: {product.batch_number || "-"} | Stock: {product.stock_base} {product.base_uom}
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
                  title="Add to bill"
                >
                  +
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="card" style={cardStyle}>
          <h3 style={{ marginBottom: "1rem", fontWeight: 600 }}>Cart Items</h3>
          {loadingDetail && <p>Loading medicine details...</p>}
          {selectedProduct && (
            <div className="uom-card" style={{ marginBottom: "1rem", border: "1px solid #e5e7eb", padding: "12px", borderRadius: "8px", background: "#f3f4f6" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h4 style={{ margin: 0 }}>Sell {selectedProduct.name}</h4>
                <button onClick={() => setSelectedProduct(null)} style={{ border: "none", background: "transparent", fontSize: "1.1rem" }}>x</button>
              </div>
              <p style={{ fontSize: "0.8rem", color: "#555" }}>
                Available: {numberOrZero(selectedProduct.availableBase)} {selectedProduct.baseLabel}
              </p>
              <label>Unit of Measure</label>
              <select value={selectedUomKey} onChange={(e) => setSelectedUomKey(e.target.value)}>
                {selectedProduct.uomOptions.map((opt) => (
                  <option key={opt.key} value={opt.key}>
                    {opt.displayLabel}
                  </option>
                ))}
              </select>
              <label style={{ marginTop: "0.5rem" }}>Quantity</label>
              <input
                type="number"
                min={maxQtyForSelected && maxQtyForSelected > 0 ? 1 : 0}
                value={qtyInput}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  if (!Number.isFinite(val)) {
                    setQtyInput(1);
                    return;
                  }
                  const max = maxQtyForSelected;
                  if (max !== undefined && max > 0) {
                    setQtyInput(Math.max(1, Math.min(val, max)));
                  } else {
                    setQtyInput(Math.max(0, val));
                  }
                }}
              />
              {maxQtyForSelected !== undefined && (
                <p style={{ fontSize: "0.75rem", color: "#6b7280", marginTop: "0.25rem" }}>
                  {maxQtyForSelected > 0 ? `Max available: ${maxQtyForSelected}` : "Out of stock for this unit"}
                </p>
              )}
              <div style={{ marginTop: "10px", display: "flex", gap: "10px" }}>
                <button onClick={addProductWithUOM} className="generate-btn" disabled={!maxQtyForSelected || maxQtyForSelected <= 0}>
                  Add to Cart
                </button>
                <button onClick={() => setSelectedProduct(null)} style={{ background: "#f87171", color: "#fff", padding: "10px", borderRadius: "6px", border: "none" }}>
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
                  <tr key={item.batch_id}>
                    <td>
                      {item.name}
                      <br />
                      <span style={{ fontSize: "0.75rem", color: "#6b7280" }}>
                        Batch {item.batch_number || "-"} ({item.sold_uom_label})
                      </span>
                    </td>
                    <td style={{ textAlign: "center" }}>
                      <button onClick={() => updateQty(item.batch_id, -1)} disabled={item.qty <= 1}>
                        -
                      </button>
                      <span style={{ margin: "0 6px" }}>{item.qty}</span>
                      <button onClick={() => updateQty(item.batch_id, 1)}>+</button>
                    </td>
                    <td>{formatCurrency(item.unitPrice)}</td>
                    <td>{formatCurrency(item.unitPrice * item.qty)}</td>
                    <td>
                      <button style={{ color: "#dc2626" }} onClick={() => removeItem(item.batch_id)}>
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="card" style={cardStyle}>
          <h3 style={{ marginBottom: "1rem", fontWeight: 600 }}>Bill Summary</h3>
          <p style={{ display: "flex", justifyContent: "space-between" }}>
            <span>Subtotal:</span> <strong>{formatCurrency(totals.subtotal)}</strong>
          </p>
          <p style={{ display: "flex", justifyContent: "space-between" }}>
            <span>GST:</span> <strong>{formatCurrency(totals.taxAmount)}</strong>
          </p>
          <hr />
          <p style={{ display: "flex", justifyContent: "space-between", fontSize: "1.2rem" }}>
            <strong>Total:</strong> <strong>{formatCurrency(totals.total)}</strong>
          </p>

          <div style={{ marginTop: "1rem" }}>
            <label style={{ fontWeight: 600 }}>Payment Method</label>
            <select
              style={{ width: "100%", padding: "0.6rem", marginTop: "0.4rem", borderRadius: "8px", border: "1px solid #ccc" }}
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

          <div style={{ marginTop: "1rem" }}>
            <label style={{ fontWeight: 600 }}>Amount Paying</label>
            <input
              type="number"
              placeholder="Enter Amount"
              value={amountPaying}
              onChange={(e) => setAmountPaying(e.target.value)}
              style={{ width: "100%", padding: "0.6rem", marginTop: "0.4rem", borderRadius: "8px", border: "1px solid #ccc" }}
            />
          </div>

          <button
            className="generate-btn"
            style={{ width: "100%", marginTop: "1rem" }}
            onClick={submitInvoice}
            disabled={submitting || !cart.length}
          >
            {submitting ? "Processing..." : "Complete Payment"}
          </button>
        </div>
      </div>
    </div>
  );
}
