import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./billgeneration.css";
import { authFetch } from "../../api/http";
import { apiUrl } from "../../api/base";
import { getDefaultLocationId } from "../../config/location";
import { useAlert } from "../ui/alert-provider";

const PAYMENT_METHODS_URL = apiUrl("settings/payment-methods/");
const INVENTORY_GLOBAL_URL = apiUrl("inventory/medicines/global/");
const MEDICINE_DETAIL_URL = (batchId) => apiUrl(`inventory/medicines/${batchId}/`);
const INVOICES_URL = apiUrl("sales/invoices/");

const HARDCODED_PAYMENT_METHODS = [
  { id: "cash", name: "Cash", type: "CASH" },
  { id: "upi", name: "UPI", type: "UPI" },
  { id: "card_credit", name: "Card - Credit", type: "CARD_CREDIT" },
  { id: "card_debit", name: "Card - Debit", type: "CARD_DEBIT" },
  { id: "net_banking", name: "Net Banking", type: "NET_BANKING" },
  { id: "on_credit", name: "On Credit", type: "CREDIT" },
  { id: "other", name: "Other", type: "OTHER" },
];

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
  const { showAlert } = useAlert();

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
  const [otherPaymentMethod, setOtherPaymentMethod] = useState("");
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
    setPaymentMethods(HARDCODED_PAYMENT_METHODS);
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
    // Fetch batch details
    const detail = await fetchBatchDetail(product.batch_id);
    const medicine = detail.medicine || {};
    const inventory = detail.inventory || {};

    // Fetch product info from catalog to get MRP & GST
    let productInfo = {};
    try {
      const res = await authFetch(`${PRODUCTS_API_URL}${product.product_id}/`);
      if (res.ok) {
        productInfo = await res.json();
      }
    } catch (err) {
      console.warn("Could not fetch product info:", err);
    }

    const baseLabel = medicine.base_uom?.name || product.base_uom || "Units";
    const sellingLabel = medicine.selling_uom?.name || "";
    // Prefer catalog MRP/GST if available
    const gstPercent = numberOrZero(productInfo.gst_percent || medicine.gst_percent);
    const packPrice = numberOrZero(productInfo.mrp || medicine.mrp || product.mrp, 2);

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
    showAlert(err.message || "Unable to load medicine details. Please try again.", "Error");
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
      showAlert("No stock available for this unit.", "Stock Alert");
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
  let cgstPercent = 0;
  let sgstPercent = 0;
  let cgstAmount = 0;
  let sgstAmount = 0;

  cart.forEach((item) => {
    const lineSubtotal = numberOrZero(item.unitPrice) * numberOrZero(item.qty);
    subtotal += lineSubtotal;

    const gstPercent = numberOrZero(item.gstPercent);
    const lineCgst = lineSubtotal * (gstPercent / 2 / 100); // 50% CGST
    const lineSgst = lineSubtotal * (gstPercent / 2 / 100); // 50% SGST

    cgstAmount += lineCgst;
    sgstAmount += lineSgst;
    cgstPercent = gstPercent / 2; // for display
    sgstPercent = gstPercent / 2; // for display
  });

  return {
    subtotal,
    cgstPercent,
    sgstPercent,
    cgstAmount,
    sgstAmount,
    total: subtotal + cgstAmount + sgstAmount,
  };
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
      showAlert("Customer name, phone, and city are required.", "Validation Error");
      return;
    }
    if (!cart.length) {
      showAlert("Cart is empty. Please add medicines.", "Validation Error");
      return;
    }
    if (!selectedMethod) {
      showAlert("Select a payment method.", "Validation Error");
      return;
    }
    if (selectedMethod === "other" && !otherPaymentMethod.trim()) {
      showAlert("Please specify the payment method for 'Other'.", "Validation Error");
      return;
    }
    const amountPaid = parseFloat(amountPaying);
    if (!Number.isFinite(amountPaid) || amountPaid <= 0) {
      showAlert("Enter a valid payment amount.", "Validation Error");
      return;
    }

    const missingBatch = cart.find((item) => !item.batch_id);
    if (missingBatch) {
      showAlert("One or more items are missing batch information. Remove them and try again.", "Validation Error");
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

      // 🔥 MAKE PAYMENT RIGHT HERE
      await authFetch(`${INVOICES_URL}${data.id}/complete-payment/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: selectedMethod,
          amount: amountPaying
        })
      });

      // continue the remaining code
      dispatchInventoryRefresh();
      setCart([]);
      setSelectedProduct(null);
      setAmountPaying("");
      setSelectedMethod("");
      setSearchTerm("");

      navigate(`/billgeneration/invoice/${data.id}`);
    } catch (err) {
      console.error(err);
      showAlert(err.message || "Unable to submit invoice", "Error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="billgeneration-page bill-shell">
      <div className="bill-header">
        <div>
          <p className="bill-kicker">Billing & Invoicing</p>
          <h1 className="bill-title">Create Invoice</h1>
          <p className="bill-subtitle">Add customer info, select medicines, and complete payment.</p>
        </div>
        <div className="bill-header-meta">
          <span className="pill success">{products.length || 0} items in stock</span>
          <span className="pill muted">Cart: {cart.length}</span>
        </div>
      </div>

      <div className="bill-grid">
        <section className="bill-card">
          <header>
            <h3>Customer Information</h3>
            <span className="hint">Required for invoice</span>
          </header>
          <div className="form-grid">
            <label>
              Customer Name *
              <input value={customer.name} onChange={(e) => setCustomer({ ...customer, name: e.target.value })} placeholder="Enter customer name" />
            </label>
            <label>
              Phone *
              <input value={customer.phone} onChange={(e) => setCustomer({ ...customer, phone: e.target.value })} placeholder="Phone number" />
            </label>
            <label>
              Email
              <input value={customer.email} onChange={(e) => setCustomer({ ...customer, email: e.target.value })} placeholder="Customer email" />
            </label>
            <label>
              City *
              <input value={customer.city} onChange={(e) => setCustomer({ ...customer, city: e.target.value })} placeholder="Customer city" />
            </label>
             <label>
              Consulting Doctor*
              <input value={customer.name} onChange={(e) => setCustomer({ ...customer, city: e.target.value })} placeholder="Consulting Doctor" />
            </label>
          </div>
        </section>

        <section className="bill-card">
          <header>
            <h3>Select Medicines</h3>
            <span className="hint">Search & add to cart</span>
          </header>
          <input
            className="input"
            type="text"
            placeholder="Search medicines..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <div className="list-scroll">
            {productsLoading && <p>Loading medicines...</p>}
            {!productsLoading && productsError && <p className="text-error">{productsError}</p>}
            {!productsLoading && !productsError && !products.length && <p className="text-muted">No medicines available.</p>}
            {products.map((product) => (
              <div key={product.batch_id} className="product-row">
                <div>
                  <strong>{product.name}</strong>
                  <div className="meta">
                    Batch: {product.batch_number || "-"} | Stock: {product.stock_base} {product.base_uom}
                  </div>
                </div>
                <button className="btn-chip" onClick={() => openUOMCard(product)} title="Add to bill">
                  +
                </button>
              </div>
            ))}
          </div>
        </section>

        <section className="bill-card">
          <header>
            <h3>Cart Items</h3>
            <span className="hint">Adjust quantity & remove</span>
          </header>

          {loadingDetail && <p>Loading medicine details...</p>}

          {selectedProduct && (
            <div className="uom-card">
              <div className="uom-head">
                <h4>Sell {selectedProduct.name}</h4>
                <button className="btn-ghost" onClick={() => setSelectedProduct(null)}>×</button>
              </div>
              <p className="meta">
                Available: {numberOrZero(selectedProduct.availableBase)} {selectedProduct.baseLabel}
              </p>
              <label>
                Unit of Measure
                <select value={selectedUomKey} onChange={(e) => setSelectedUomKey(e.target.value)}>
                  {selectedProduct.uomOptions.map((opt) => (
                    <option key={opt.key} value={opt.key}>
                      {opt.displayLabel}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Quantity
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
              </label>
              {maxQtyForSelected !== undefined && (
                <p className="meta">
                  {maxQtyForSelected > 0 ? `Max available: ${maxQtyForSelected}` : "Out of stock for this unit"}
                </p>
              )}
              <div className="uom-actions">
                <button className="btn-primary" onClick={addProductWithUOM} disabled={!maxQtyForSelected || maxQtyForSelected <= 0}>
                  Add to Cart
                </button>
                <button className="btn-secondary" onClick={() => setSelectedProduct(null)}>
                  Cancel
                </button>
              </div>
            </div>
          )}

          {cart.length === 0 ? (
            <p className="text-muted">No items added.</p>
          ) : (
            <table className="cart-table">
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
                      <div className="meta">Batch {item.batch_number || "-"} ({item.sold_uom_label})</div>
                    </td>
                    <td className="qty-cell">
                      <button onClick={() => updateQty(item.batch_id, -1)} disabled={item.qty <= 1}>
                        -
                      </button>
                      <span>{item.qty}</span>
                      <button onClick={() => updateQty(item.batch_id, 1)}>+</button>
                    </td>
                    <td>{formatCurrency(item.unitPrice)}</td>
                    <td>{formatCurrency(item.unitPrice * item.qty)}</td>
                    <td>
                      <button className="link-danger" onClick={() => removeItem(item.batch_id)}>
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <section className="bill-card summary-card">
          <header>
            <h3>Bill Summary</h3>
            <span className="hint">Review & collect payment</span>
          </header>
          <div className="summary-row">
            <span>Subtotal</span>
            <strong>{formatCurrency(totals.subtotal)}</strong>
          </div>
          <div className="summary-row">
  <span>CGST ({totals.cgstPercent}%)</span>
  <strong>{formatCurrency(totals.cgstAmount)}</strong>
</div>
<div className="summary-row">
  <span>SGST ({totals.sgstPercent}%)</span>
  <strong>{formatCurrency(totals.sgstAmount)}</strong>
</div>
<div className="summary-divider" />
<div className="summary-row total">
  <span>Total</span>
  <strong>{formatCurrency(totals.total)}</strong>
</div>

          <div className="summary-divider" />
          <div className="summary-row total">
            <span>Total</span>
            <strong>{formatCurrency(totals.total)}</strong>
          </div>

          <label className="summary-field">
            Payment Method
            <select value={selectedMethod} onChange={(e) => setSelectedMethod(e.target.value)}>
              <option value="">-- Choose Payment Method --</option>
              {paymentMethods.map((method) => (
                <option key={method.id} value={method.id}>
                  {method.name}
                </option>
              ))}
            </select>
          </label>

          {selectedMethod === "other" && (
            <label className="summary-field">
              Specify Payment Method *
              <input
                type="text"
                placeholder="Enter payment method"
                value={otherPaymentMethod}
                onChange={(e) => setOtherPaymentMethod(e.target.value)}
              />
            </label>
          )}

          <label className="summary-field">
            Amount Paying
            <input
              type="number"
              placeholder="Enter Amount"
              value={amountPaying}
              onChange={(e) => setAmountPaying(e.target.value)}
            />
          </label>

          <button className="btn-primary wide" onClick={submitInvoice} disabled={submitting || !cart.length}>
            {submitting ? "Processing..." : "Complete Payment"}
          </button>
        </section>
      </div>
    </div>
  );
}