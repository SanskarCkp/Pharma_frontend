import React, { useEffect, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { CheckCircle, Package, ClipboardList, ArrowLeft } from "lucide-react";
import "./receiveitems.css";
import { formatDateDDMMYYYY } from "../../../utils/dateFormat";
import { authFetch } from "../../../api/http";

const API_BASE_URL = import.meta.env.VITE_API_URL;

const ReceiveItems = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const location = useLocation();
  const vendor = location.state?.vendor || null;

  const [purchaseOrder, setPurchaseOrder] = useState(null);
  const [receivingDetails, setReceivingDetails] = useState(null);
  const [itemsReceived, setItemsReceived] = useState([]);
  const [summary, setSummary] = useState({
    total_ordered: 0,
    total_received: 0,
    completion: "0%",
  });

  const [category, setCategory] = useState([]);
  const [rackLocations, setRackLocations] = useState([]);
  const [loggedInUser, setLoggedInUser] = useState(null); // ✅ NEW
  const [loading, setLoading] = useState(true);

  // -----------------------------
  // FETCH USER, PO, LINES, RECEIVING, RACKS
  // -----------------------------
  useEffect(() => {
    const fetchDetails = async () => {
      setLoading(true);
      try {
        // 1️⃣ Fetch Logged-In User
        const userRes = await authFetch(`${API_BASE_URL}/accounts/`);

        if (userRes.ok) {
          const userData = await userRes.json();
          setLoggedInUser(userData);
        }

        // 2️⃣ Fetch PO
        const poRes = await authFetch(`${API_BASE_URL}/procurement/purchase-orders/${id}/`);
        if (!poRes.ok) throw new Error("PO not found");
        const poData = await poRes.json();

        // 3️⃣ Fetch Receiving Details
        const recRes = await authFetch(`${API_BASE_URL}/procurement/purchase-orders/${id}/receiving/`);
        const receivingData = recRes.ok ? await recRes.json() : null;

        // 4️⃣ Fetch PO Lines
        const linesRes = await authFetch(`${API_BASE_URL}/procurement/purchase-orders/${id}/lines/`);
        let linesData = [];
        if (linesRes.ok) {
          const linesJson = await linesRes.json();
          linesData = Array.isArray(linesJson) ? linesJson : linesJson?.lines || [];
        }

        // 5️⃣ Fetch Categories
        const categoryRes = await authFetch(`${API_BASE_URL}/catalog/categories/`);
        const categoryData = categoryRes.ok ? await categoryRes.json() : [];
        setCategory(Array.isArray(categoryData) ? categoryData : categoryData.results || []);

        // 6️⃣ Fetch Rack Locations
        const rackRes = await authFetch(`${API_BASE_URL}/inventory/rack-locations/`);
        const rackData = rackRes.ok ? await rackRes.json() : [];
        setRackLocations(Array.isArray(rackData) ? rackData : rackData.results || []);

        // 7️⃣ Resolve Product Names
        const productIdSet = new Set();
        linesData.forEach((item) => {
          if (typeof item.product === "number") productIdSet.add(item.product);
        });

        const productIdToName = {};
        await Promise.all(
          [...productIdSet].map(async (pid) => {
            const res = await authFetch(`${API_BASE_URL}/catalog/products/${pid}/`);
            if (res.ok) {
              const p = await res.json();
              productIdToName[pid] = p.name;
            }
          })
        );

        // 8️⃣ Build items table
        setItemsReceived(
          linesData.map((item) => ({
            id: item.id,
            po_line: item.id,
            product_id:
              item.product?.id || (typeof item.product === "object" ? item.product.id : item.product),
            product_name:
              item.product?.name ||
              item.product_details?.name ||
              productIdToName[item.product] ||
              "",
            ordered: item.qty_packs_ordered || 0,

            received_packs: "",
            received_base: "",
            damaged_base: "",

            batch: "",
            category: "",
            mfg_date: "",
            expiry_date: "",
            unit_cost: item.expected_unit_cost || "",
            mrp: item.mrp || "",
            rack_no: "",
          }))
        );

        const totalOrdered = linesData.reduce(
          (acc, item) => acc + Number(item.qty_packs_ordered || 0),
          0
        );
        setSummary({ total_ordered: totalOrdered, total_received: 0, completion: "0%" });

        const resolvedLocationId =
          poData.location_id ||
          (typeof poData.location === "number"
            ? poData.location
            : poData.location?.id) ||
          null;

        setPurchaseOrder({
          id: poData.id,
          po_number: poData.po_number,
          supplier: vendor ? vendor.name : poData.vendor_name || "",
          vendor_id: vendor?.id || poData.vendor?.id,
          location_id: resolvedLocationId,
          location: resolvedLocationId,
          order_date: poData.order_date,
          expected_date: poData.expected_date,
        });

        setReceivingDetails(receivingData);
      } catch (err) {
        console.error(err);
        setPurchaseOrder(null);
      } finally {
        setLoading(false);
      }
    };

    fetchDetails();
  }, [id]);

  // -----------------------------
  // HANDLE ITEM EDIT
  // -----------------------------
  const handleItemEdit = (idx, field, value) => {
    setItemsReceived((prev) =>
      prev.map((row, i) => (i === idx ? { ...row, [field]: value } : row))
    );
  };

  // -----------------------------
  // SUMMARY UPDATE
  // -----------------------------
  useEffect(() => {
    const totalReceived = itemsReceived.reduce(
      (acc, item) => acc + Number(item.received_packs || 0),
      0
    );
    const completion =
      summary.total_ordered > 0
        ? ((totalReceived / summary.total_ordered) * 100).toFixed(1) + "%"
        : "0%";

    setSummary((prev) => ({ ...prev, total_received: totalReceived, completion }));
  }, [itemsReceived, summary.total_ordered]);

  // -----------------------------
  // CREATE GRN (POST)
  // -----------------------------
  const handleCompleteReceiving = async () => {
    if (!purchaseOrder) {
      alert("PO not loaded!");
      return;
    }

    if (!loggedInUser) {
      alert("User login not detected!");
      return;
    }

    const locationId = purchaseOrder.location_id || purchaseOrder.location;
    if (!locationId) {
      alert("Location missing on PO, cannot create GRN.");
      return;
    }

    const grnPayload = {
      po: purchaseOrder.id,
      location: locationId,

      received_by: loggedInUser.id, // ✅ USER FROM API
      received_at: new Date().toISOString(),
      supplier_invoice_no: "",
      supplier_invoice_date: null,
      note: "",
      status: "DRAFT",

      lines: itemsReceived.map((item) => ({
        po_line: item.po_line,
        product: item.product_id,
        batch_no: item.batch,
        category: item.category || "",
        mfg_date: item.mfg_date || null,
        expiry_date: item.expiry_date || null,

        qty_packs_received: Number(item.received_packs || 0),
        qty_base_received: Number(item.received_base || 0),
        qty_base_damaged: Number(item.damaged_base || 0),

        unit_cost: Number(item.unit_cost || 0),
        mrp: Number(item.mrp || 0),
        rack_no: item.rack_no || "",
      })),
    };

    try {
      const res = await authFetch(`${API_BASE_URL}/procurement/grns/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(grnPayload),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) return alert("GRN creation failed: " + JSON.stringify(data));

      if (data?.id) {
        const postRes = await authFetch(
          `${API_BASE_URL}/procurement/grns/${data.id}/post/`,
          { method: "POST" }
        );

        if (postRes.ok) {
          alert("Goods Receipt created & posted!");
          navigate(-1);
        } else {
          const p = await postRes.json().catch(() => null);
          alert("GRN created but posting failed: " + JSON.stringify(p));
        }
      }
    } catch (err) {
      console.error(err);
      alert("Error creating GRN.");
    }
  };

  // -----------------------------
  // LOADING UI
  // -----------------------------
  if (loading)
    return (
      <div className="receiveitems-container">
        <button className="back-btn" onClick={() => navigate(-1)}>
          <ArrowLeft size={18} />
          <span>Back</span>
        </button>
        <h1 className="page-title">Receive Items</h1>
        <p className="loading-text">Loading...</p>
      </div>
    );

  if (!purchaseOrder)
    return (
      <div className="receiveitems-container">
        <button className="back-btn" onClick={() => navigate(-1)}>
          <ArrowLeft size={18} />
          <span>Back</span>
        </button>
        <h1 className="page-title">Receive Items</h1>
        <p className="loading-text">Purchase Order not found.</p>
      </div>
    );

  // -----------------------------
  // RENDER UI
  // -----------------------------
  return (
    <div className="receiveitems-container">
      <button className="back-btn" onClick={() => navigate(-1)}>
        <ArrowLeft size={18} />
        <span>Back</span>
      </button>
      <h1 className="page-title">Receive Items</h1>

      <div className="kpi-cards-grid">

        {/* PURCHASE ORDER */}
        <div className="kpi-card">
          <h3>Purchase Order Details</h3>
          <div className="kpi-item"><strong>PO Number:</strong> {purchaseOrder.po_number}</div>
          <div className="kpi-item"><strong>Supplier:</strong> {purchaseOrder.supplier}</div>
          <div className="kpi-item"><strong>Order Date:</strong> {formatDateDDMMYYYY(purchaseOrder.order_date)}</div>
          <div className="kpi-item"><strong>Expected Date:</strong> {formatDateDDMMYYYY(purchaseOrder.expected_date)}</div>
        </div>

        {/* RECEIVING DETAILS */}
        <div className="kpi-card">
          <h3>Receiving Details</h3>
          {loggedInUser && (
            <div className="kpi-item">
              <strong>Received By:</strong> {loggedInUser.full_name || loggedInUser.username}
            </div>
          )}

          {receivingDetails ? (
            <>
              <div className="kpi-item">
                <strong>Received Date:</strong> {formatDateDDMMYYYY(receivingDetails.received_date)}
              </div>
              <div className="kpi-item">
                <strong>Invoice Number:</strong> {receivingDetails.invoice_number}
              </div>
            </>
          ) : (
            <div className="kpi-item" style={{ color: "#d97706" }}>Not yet received</div>
          )}
        </div>

        {/* SUMMARY */}
        <div className="kpi-card summary-card">
          <h3>Receiving Summary</h3>
          <div className="summary-row"><CheckCircle size={16} /> Total Ordered: {summary.total_ordered}</div>
          <div className="summary-row"><Package size={16} /> Total Received: {summary.total_received}</div>
          <div className="summary-row"><ClipboardList size={16} /> Completion: {summary.completion}</div>

          <button className="complete-btn" onClick={handleCompleteReceiving}>
            Complete Receiving
          </button>
        </div>

        {/* ITEMS TABLE */}
        <div className="kpi-card items-table-card">
          <h3>Items Received</h3>
          <table className="items-received-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Ordered</th>
                <th>Packs Received</th>
                <th>Base Received</th>
                <th>Base Damaged</th>
                <th>Batch</th>
                <th>Category</th>
                <th>Rack No</th>
                <th>Unit Cost</th>
                <th>MRP</th>
                <th>MFG Date</th>
                <th>Expiry Date</th>
              </tr>
            </thead>

            <tbody>
              {itemsReceived.map((item, idx) => (
                <tr key={item.id}>
                  <td>{item.product_name}</td>
                  <td>{item.ordered}</td>

                  <td>
                    <input
                      type="number"
                      min={0}
                      value={item.received_packs}
                      onChange={(e) => handleItemEdit(idx, "received_packs", e.target.value)}
                    />
                  </td>

                  <td>
                    <input
                      type="number"
                      min={0}
                      value={item.received_base}
                      onChange={(e) => handleItemEdit(idx, "received_base", e.target.value)}
                    />
                  </td>

                  <td>
                    <input
                      type="number"
                      min={0}
                      value={item.damaged_base}
                      onChange={(e) => handleItemEdit(idx, "damaged_base", e.target.value)}
                    />
                  </td>

                  <td>
                    <input
                      type="text"
                      value={item.batch}
                      onChange={(e) => handleItemEdit(idx, "batch", e.target.value)}
                    />
                  </td>

                  <td>
                    <select
                      value={item.category || ""}
                      onChange={(e) => handleItemEdit(idx, "category", e.target.value)}
                    >
                      <option value="">Select category</option>
                      {category.map((c) => (
                        <option key={c.id} value={c.name}>{c.name}</option>
                      ))}
                    </select>
                  </td>

                  <td>
                    <select
                      value={item.rack_no || ""}
                      onChange={(e) => handleItemEdit(idx, "rack_no", e.target.value)}
                    >
                      <option value="">Select Rack</option>
                      {rackLocations.map((rack) => (
                        <option key={rack.id} value={rack.name}>{rack.name}</option>
                      ))}
                    </select>
                  </td>

                  <td>
                    <input
                      type="number"
                      step="0.01"
                      value={item.unit_cost}
                      onChange={(e) => handleItemEdit(idx, "unit_cost", e.target.value)}
                    />
                  </td>

                  <td>
                    <input
                      type="number"
                      step="0.01"
                      value={item.mrp}
                      onChange={(e) => handleItemEdit(idx, "mrp", e.target.value)}
                    />
                  </td>

                  <td>
                    <input
                      type="date"
                      value={item.mfg_date}
                      onChange={(e) => handleItemEdit(idx, "mfg_date", e.target.value)}
                    />
                  </td>

                  <td>
                    <input
                      type="date"
                      value={item.expiry_date}
                      onChange={(e) => handleItemEdit(idx, "expiry_date", e.target.value)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

        </div>
      </div>
    </div>
  );
};

export default ReceiveItems;
