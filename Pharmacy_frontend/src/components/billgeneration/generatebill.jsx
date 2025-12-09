import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./billgeneration.css";
import { authFetch } from "../../api/http";
import { apiUrl } from "../../api/base";
import { getDefaultLocationId } from "../../config/location";
import { useAlert } from "../ui/alert-provider";
import { MEDICINE_CATEGORIES_SIMPLE as MEDICINE_CATEGORIES } from "../../constants/medicineCategories";

const PAYMENT_METHODS_URL = apiUrl("settings/payment-methods/");
const INVENTORY_GLOBAL_URL = apiUrl("inventory/medicines/global/");
const MEDICINE_DETAIL_URL = (batchId) => apiUrl(`inventory/medicines/${batchId}/`);
const INVOICES_URL = apiUrl("sales/invoices/");
const CUSTOMERS_URL = apiUrl("customers/");
const CUSTOMER_SEARCH_URL = apiUrl("customers/search-by-phone/");

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

  const [customer, setCustomer] = useState({ name: "", phone: "", email: "", city: "", doctor: "" });
  const [customerSuggestions, setCustomerSuggestions] = useState([]);
  const [showCustomerSuggestions, setShowCustomerSuggestions] = useState(false);
  const [searchingCustomer, setSearchingCustomer] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [products, setProducts] = useState([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [productsError, setProductsError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [cart, setCart] = useState([]);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedProductForAdd, setSelectedProductForAdd] = useState(null);
  const [addQuantity, setAddQuantity] = useState(1);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [selectedMethod, setSelectedMethod] = useState("");
  const [otherPaymentMethod, setOtherPaymentMethod] = useState("");
  const [discount, setDiscount] = useState("");
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

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm.trim());
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Search customers by phone number
  useEffect(() => {
    const phone = customer.phone.trim();
    if (phone.length < 3) {
      setCustomerSuggestions([]);
      setShowCustomerSuggestions(false);
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setSearchingCustomer(true);
      try {
        const res = await authFetch(`${CUSTOMER_SEARCH_URL}?phone=${encodeURIComponent(phone)}`, {
          signal: controller.signal,
        });
        if (res.ok) {
          const data = await res.json();
          setCustomerSuggestions(Array.isArray(data) ? data : []);
          setShowCustomerSuggestions(true);
        } else {
          setCustomerSuggestions([]);
        }
      } catch (err) {
        if (err.name !== "AbortError") {
          console.warn("Customer search failed", err);
          setCustomerSuggestions([]);
        }
      } finally {
        setSearchingCustomer(false);
      }
    }, 300);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [customer.phone]);

  useEffect(() => {
    const controller = new AbortController();

    async function fetchProducts() {
      setProductsLoading(true);
      setProductsError("");
      try {
        const params = new URLSearchParams();
        if (locationId) params.set("location_id", String(locationId));
        if (debouncedSearchTerm) params.set("q", debouncedSearchTerm);
        if (categoryFilter && categoryFilter !== "All") {
          params.set("category_id", categoryFilter);
        }
        // Remove status filter to show all medicines from inventory
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
            category: row.category?.name || row.category_name || "",
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
  }, [debouncedSearchTerm, categoryFilter, inventoryRefreshTick, locationId]);

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

  const openAddModal = async (product) => {
    if (!product?.batch_id) return;
    setLoadingDetail(true);
    setSelectedProductForAdd(null);
    setAddQuantity(1);
    try {
      const detail = await fetchBatchDetail(product.batch_id);
      const medicine = detail.medicine || {};
      const inventory = detail.inventory || {};
      const packPrice = numberOrZero(medicine.mrp || product.mrp, 2);
      const unitsPerPack = Math.max(1, deriveUnitsPerPack(medicine));
      const availableBase = numberOrZero(inventory.stock_on_hand_base || product.stock_base || 0);
      const availableBoxes = unitsPerPack > 0 ? Math.floor(availableBase / unitsPerPack) : 0;

      if (availableBase <= 0) {
        showAlert("No stock available for this medicine.", "Stock Alert");
        return;
      }

      // Check if already in cart
      const existingItem = cart.find((item) => item.batch_id === product.batch_id);
      const currentQtyBase = existingItem ? numberOrZero(existingItem.qty_base) : 0;
      const remainingStock = availableBase - currentQtyBase;
      const remainingBoxes = unitsPerPack > 0 ? Math.floor(remainingStock / unitsPerPack) : 0;

      if (remainingStock <= 0) {
        showAlert("No more stock available for this medicine.", "Stock Alert");
        return;
      }

      const productData = {
        batch_id: product.batch_id,
        batch_number: product.batch_number,
        product_id: product.product_id,
        name: medicine.name || product.name,
        availableBase,
        remainingStock,
        currentQtyInCart: currentQtyBase,
        packPrice,
        unitsPerPack,
        availableBoxes,
        remainingBoxes,
      };

      setSelectedProductForAdd(productData);
      setShowAddModal(true);
    } catch (err) {
      console.error(err);
      showAlert(err.message || "Unable to load medicine details. Please try again.", "Error");
    } finally {
      setLoadingDetail(false);
    }
  };

  const addProductToCart = async () => {
    if (!selectedProductForAdd) return;
    
    const qtyToAdd = Math.max(1, Math.floor(numberOrZero(addQuantity)));
    if (qtyToAdd <= 0) {
      showAlert("Please enter a valid quantity.", "Validation Error");
      return;
    }

    if (qtyToAdd > selectedProductForAdd.remainingStock) {
      showAlert(`Only ${selectedProductForAdd.remainingStock} units available.`, "Stock Alert");
      return;
    }

    setLoadingDetail(true);
    try {
      const product = products.find(p => p.batch_id === selectedProductForAdd.batch_id);
      if (!product) {
        showAlert("Product not found.", "Error");
        return;
      }

      const detail = await fetchBatchDetail(product.batch_id);
      const medicine = detail.medicine || {};
      const inventory = detail.inventory || {};
      const gstPercent = numberOrZero(medicine.gst_percent);
      const packPrice = numberOrZero(medicine.mrp || product.mrp, 2);
      const unitsPerPack = Math.max(1, deriveUnitsPerPack(medicine));
      const ratePerBase = unitsPerPack > 0 ? packPrice / unitsPerPack : packPrice;
      const availableBase = numberOrZero(inventory.stock_on_hand_base || product.stock_base || 0);

      // Check if already in cart
      const existingItem = cart.find((item) => item.batch_id === selectedProductForAdd.batch_id);
      const currentQtyBase = existingItem ? numberOrZero(existingItem.qty_base) : 0;
      const newQtyBase = currentQtyBase + qtyToAdd;

      setCart((prev) => {
        const next = [...prev];
        const idx = next.findIndex((item) => item.batch_id === selectedProductForAdd.batch_id);
        const line = {
          batch_id: selectedProductForAdd.batch_id,
          batch_number: selectedProductForAdd.batch_number,
          product_id: selectedProductForAdd.product_id,
          name: selectedProductForAdd.name,
          gstPercent,
          packPrice,
          ratePerBase,
          unitPrice: ratePerBase,
          qty: newQtyBase,
          qty_base: newQtyBase,
          sold_uom_code: "BASE",
          sold_uom_label: "Loose",
          conversionFactor: 1,
          availableBase,
        };
        if (idx >= 0) {
          next[idx] = line;
        } else {
          next.push(line);
        }
        return next;
      });

      setShowAddModal(false);
      setSelectedProductForAdd(null);
      setAddQuantity(1);
    } catch (err) {
      console.error(err);
      showAlert(err.message || "Unable to add medicine to cart. Please try again.", "Error");
    } finally {
      setLoadingDetail(false);
    }
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
    // Clear discount if cart becomes empty
    if (cart.length === 1) {
      setDiscount("");
    }
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
    const totalBeforeDiscount = subtotal + taxAmount;
    const discountPercent = numberOrZero(discount);
    const discountAmount = totalBeforeDiscount * (discountPercent / 100);
    const finalTotal = Math.max(0, totalBeforeDiscount - discountAmount);
    return { 
      subtotal, 
      taxAmount, 
      total: totalBeforeDiscount,
      discountPercent,
      discount: discountAmount,
      finalTotal 
    };
  }, [cart, discount]);

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
    const discountPercent = numberOrZero(discount);
    if (discountPercent < 0) {
      showAlert("Discount percentage cannot be negative.", "Validation Error");
      return;
    }
    if (discountPercent > 100) {
      showAlert("Discount percentage cannot exceed 100%.", "Validation Error");
      return;
    }
    const amountPaid = totals.finalTotal;

    const missingBatch = cart.find((item) => !item.batch_id);
    if (missingBatch) {
      showAlert("One or more items are missing batch information. Remove them and try again.", "Validation Error");
      return;
    }

    // Calculate discount per line (proportional to line total)
    const totalBeforeDiscount = totals.total;
    const discountPerLine = totalBeforeDiscount > 0 
      ? totals.discount / totalBeforeDiscount 
      : 0;

    const lines = cart.map((item) => {
      const lineSubtotal = numberOrZero(item.unitPrice) * numberOrZero(item.qty);
      const lineDiscount = lineSubtotal * discountPerLine;
      return {
        product: item.product_id,
        batch_lot: item.batch_id,
        qty_base: qtyToString(item.qty_base),
        sold_uom: item.sold_uom_code || "BASE",
        rate_per_base: numberOrZero(item.ratePerBase, 4).toFixed(4),
        discount_amount: numberOrZero(lineDiscount, 2).toFixed(2),
        tax_percent: numberOrZero(item.gstPercent, 2).toFixed(2),
      };
    });

    // If customer is selected, use customer_id, otherwise use inline fields
    const payload = {
      location: locationId,
      invoice_date: new Date().toISOString(),
      ...(selectedCustomer ? { customer: selectedCustomer.id } : {}),
      customer_name: customer.name,
      customer_phone: customer.phone,
      customer_email: customer.email || "",
      customer_city: customer.city || "",
      doctor_name: customer.doctor || "",
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
          amount: totals.finalTotal
        })
      });

      // continue the remaining code
      dispatchInventoryRefresh();
      setCart([]);
      setDiscount("");
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
            <label style={{ position: "relative" }}>
              Phone *
              <input 
                value={customer.phone} 
                onChange={(e) => {
                  setCustomer({ ...customer, phone: e.target.value });
                  setSelectedCustomer(null);
                }} 
                onFocus={() => {
                  if (customerSuggestions.length > 0) {
                    setShowCustomerSuggestions(true);
                  }
                }}
                onBlur={() => {
                  // Delay hiding suggestions to allow click
                  setTimeout(() => setShowCustomerSuggestions(false), 200);
                }}
                placeholder="Type phone number to search existing customer" 
              />
              {showCustomerSuggestions && customerSuggestions.length > 0 && (
                <div style={{
                  position: "absolute",
                  top: "100%",
                  left: 0,
                  right: 0,
                  backgroundColor: "white",
                  border: "1px solid #ddd",
                  borderRadius: "4px",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                  zIndex: 1000,
                  maxHeight: "200px",
                  overflowY: "auto",
                  marginTop: "4px"
                }}>
                  {searchingCustomer && <div style={{ padding: "8px", color: "#666" }}>Searching...</div>}
                  {customerSuggestions.map((cust) => (
                    <div
                      key={cust.id}
                      onClick={() => {
                        setSelectedCustomer(cust);
                        setCustomer({
                          name: cust.name || "",
                          phone: cust.phone || "",
                          email: cust.email || "",
                          city: cust.city || "",
                          doctor: "",
                        });
                        setShowCustomerSuggestions(false);
                      }}
                      style={{
                        padding: "10px",
                        cursor: "pointer",
                        borderBottom: "1px solid #eee",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center"
                      }}
                      onMouseEnter={(e) => e.target.style.backgroundColor = "#f5f5f5"}
                      onMouseLeave={(e) => e.target.style.backgroundColor = "white"}
                    >
                      <div>
                        <div style={{ fontWeight: "500" }}>{cust.name}</div>
                        <div style={{ fontSize: "12px", color: "#666" }}>{cust.phone}</div>
                      </div>
                      {cust.city && (
                        <div style={{ fontSize: "12px", color: "#999" }}>{cust.city}</div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </label>
            <label>
              Email (optional)
              <input value={customer.email} onChange={(e) => setCustomer({ ...customer, email: e.target.value })} placeholder="Customer email" />
            </label>
            <label>
              City *
              <input value={customer.city} onChange={(e) => setCustomer({ ...customer, city: e.target.value })} placeholder="Customer city" />
            </label>
            <label className="full-width">
              Doctor
              <input value={customer.doctor} onChange={(e) => setCustomer({ ...customer, doctor: e.target.value })} placeholder="Doctor name (optional)" />
            </label>
          </div>
        </section>

        <section className="bill-card">
          <header>
            <h3>Select Medicines</h3>
            <span className="hint">Search & add to cart</span>
          </header>
          <div style={{ display: "flex", gap: "12px", marginBottom: "12px", flexWrap: "wrap" }}>
            <div style={{ flex: "2", minWidth: "250px" }}>
              <label style={{ display: "block", marginBottom: "4px", fontSize: "13px", fontWeight: "500", color: "#374151" }}>
                Search Medicines
              </label>
              <input
                className="input"
                type="text"
                placeholder="Search medicines..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ width: "100%" }}
              />
            </div>
            <div style={{ flex: "1", minWidth: "200px" }}>
              <label style={{ display: "block", marginBottom: "4px", fontSize: "13px", fontWeight: "500", color: "#374151" }}>
                Category Filter
              </label>
              <select
                className="input"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                style={{ width: "100%" }}
              >
                <option value="All">All Categories</option>
                {MEDICINE_CATEGORIES.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
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
                <button className="btn-chip" onClick={() => openAddModal(product)} title="Add to bill" disabled={loadingDetail}>
                  {loadingDetail ? "..." : "+"}
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

          {cart.length === 0 && (
            <div style={{ 
              padding: "40px 20px", 
              textAlign: "center",
              background: "#f9fafb",
              borderRadius: "8px",
              border: "1px dashed #d1d5db",
              marginTop: "12px"
            }}>
              <p style={{ 
                color: "#6b7280", 
                fontSize: "14px", 
                fontWeight: "500",
                margin: 0
              }}>
                No items added.
              </p>
              <p style={{ 
                color: "#9ca3af", 
                fontSize: "12px", 
                marginTop: "4px",
                margin: "4px 0 0 0"
              }}>
                Select medicines from the list above to add them to cart
              </p>
            </div>
          )}

          {cart.length > 0 && (
            <div className="cart-container" style={{ marginTop: "12px" }}>
              <table className="cart-table">
                <thead>
                  <tr>
                    <th style={{ minWidth: "200px" }}>Item</th>
                    <th style={{ width: "120px", textAlign: "center" }}>Qty</th>
                    <th style={{ width: "100px", textAlign: "right" }}>Price</th>
                    <th style={{ width: "100px", textAlign: "right" }}>Total</th>
                    <th style={{ width: "80px", textAlign: "center" }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {cart.map((item) => (
                    <tr key={item.batch_id}>
                      <td>
                        <div style={{ fontWeight: "600", color: "#111827", marginBottom: "4px", fontSize: "14px" }}>
                          {item.name}
                        </div>
                        <div className="meta" style={{ fontSize: "12px", lineHeight: "1.4" }}>
                          Batch: {item.batch_number || "-"}
                        </div>
                      </td>
                      <td className="qty-cell" style={{ justifyContent: "center" }}>
                        <button onClick={() => updateQty(item.batch_id, -1)} disabled={item.qty <= 1}>
                          -
                        </button>
                        <span>{item.qty}</span>
                        <button onClick={() => updateQty(item.batch_id, 1)}>+</button>
                      </td>
                      <td style={{ fontWeight: "500", textAlign: "right" }}>{formatCurrency(item.unitPrice)}</td>
                      <td style={{ fontWeight: "600", color: "#111827", textAlign: "right" }}>{formatCurrency(item.unitPrice * item.qty)}</td>
                      <td style={{ textAlign: "center" }}>
                        <button 
                          className="link-danger" 
                          onClick={() => removeItem(item.batch_id)}
                          style={{ fontSize: "13px", padding: "4px 8px" }}
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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
            <span>GST</span>
            <strong>{formatCurrency(totals.taxAmount)}</strong>
          </div>
          {totals.discountPercent > 0 && (
            <div className="summary-row" style={{ color: "#059669" }}>
              <span>Discount ({totals.discountPercent}%)</span>
              <strong>-{formatCurrency(totals.discount)}</strong>
            </div>
          )}

          <div className="summary-row total">
            <span>Total</span>
            <strong>{formatCurrency(totals.finalTotal)}</strong>
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
            Discount (%)
            <input
              type="number"
              step="0.01"
              min="0"
              max="100"
              placeholder="Enter discount percentage"
              value={discount}
              onChange={(e) => {
                const val = e.target.value;
                if (val === "" || (!isNaN(val) && parseFloat(val) >= 0 && parseFloat(val) <= 100)) {
                  setDiscount(val);
                }
              }}
            />
          </label>

          <button className="btn-primary wide" onClick={submitInvoice} disabled={submitting || !cart.length}>
            {submitting ? "Processing..." : "Complete Payment"}
          </button>
        </section>
      </div>

      {/* Add Product Modal */}
      {showAddModal && selectedProductForAdd && (
        <div className="add-modal-overlay" onClick={() => { setShowAddModal(false); setSelectedProductForAdd(null); setAddQuantity(1); setAddType("loose"); }}>
          <div className="add-modal" onClick={(e) => e.stopPropagation()}>
            <div className="add-modal-header">
              <h3>Add to Cart</h3>
              <button
                className="add-modal-close"
                onClick={() => {
                  setShowAddModal(false);
                  setSelectedProductForAdd(null);
                  setAddQuantity(1);
                  setAddType("loose");
                }}
                title="Close"
              >
                ×
              </button>
            </div>
            <div className="add-modal-body">
              <div className="add-product-info">
                <div className="add-product-name">{selectedProductForAdd.name}</div>
                <div className="add-product-details">
                  <div className="add-detail-item">
                    <span className="add-detail-label">Batch:</span>
                    <span className="add-detail-value">{selectedProductForAdd.batch_number || "-"}</span>
                  </div>
                  <div className="add-detail-item">
                    <span className="add-detail-label">Available Stock:</span>
                    <span className="add-detail-value stock-value">{selectedProductForAdd.remainingStock} units</span>
                  </div>
                  {selectedProductForAdd.currentQtyInCart > 0 && (
                    <div className="add-detail-item">
                      <span className="add-detail-label">Already in cart:</span>
                      <span className="add-detail-value">{selectedProductForAdd.currentQtyInCart} units</span>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="add-quantity-section">
                <label className="add-quantity-label">
                  Quantity <span className="required-asterisk">*</span>
                </label>
                <div className="add-quantity-input-wrapper">
                  <button
                    type="button"
                    className="add-quantity-btn decrease"
                    onClick={() => {
                      const newQty = Math.max(1, addQuantity - 1);
                      setAddQuantity(newQty);
                    }}
                    disabled={addQuantity <= 1}
                  >
                    −
                  </button>
                  <input
                    type="number"
                    min="1"
                    max={selectedProductForAdd.remainingStock}
                    value={addQuantity}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10) || 1;
                      setAddQuantity(Math.max(1, Math.min(val, selectedProductForAdd.remainingStock)));
                    }}
                    className="add-quantity-input"
                    autoFocus
                  />
                  <button
                    type="button"
                    className="add-quantity-btn increase"
                    onClick={() => {
                      const newQty = Math.min(selectedProductForAdd.remainingStock, addQuantity + 1);
                      setAddQuantity(newQty);
                    }}
                    disabled={addQuantity >= selectedProductForAdd.remainingStock}
                  >
                    +
                  </button>
                </div>
                <div className="add-quantity-hint">
                  Max: {selectedProductForAdd.remainingStock} units
                </div>
              </div>
            </div>
            
            <div className="add-modal-actions">
              <button
                className="add-modal-btn cancel-btn"
                onClick={() => {
                  setShowAddModal(false);
                  setSelectedProductForAdd(null);
                  setAddQuantity(1);
                  setAddType("loose");
                }}
              >
                Cancel
              </button>
              <button
                className="add-modal-btn primary-btn"
                onClick={addProductToCart}
                disabled={loadingDetail || !addQuantity || addQuantity <= 0 || addQuantity > selectedProductForAdd.remainingStock}
              >
                {loadingDetail ? "Adding..." : "Add to Cart"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
