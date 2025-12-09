import React, { useEffect, useState, useRef } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { CheckCircle, Package, ClipboardList, ArrowLeft } from "lucide-react";
import "./receiveitems.css";
import "../../inventory/inventory.css";
import { formatDateDDMMYYYY } from "../../../utils/dateFormat";
import { authFetch } from "../../../api/http";
import { useAlert } from "../../ui/alert-provider";

const API_BASE_URL = import.meta.env.VITE_API_URL;

const ReceiveItems = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const location = useLocation();
  const Supplier = location.state?.Supplier || null;
  const { showAlert } = useAlert();

  const [purchaseOrder, setPurchaseOrder] = useState(null);
  const [receivingDetails, setReceivingDetails] = useState(null);
  const [itemsReceived, setItemsReceived] = useState([]);
  const [category, setCategory] = useState([]);
  const [rackLocations, setRackLocations] = useState([]);
  const [medicineForms, setMedicineForms] = useState([]);
  const [loggedInUser, setLoggedInUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Map for cumulative previous received (for po_line + batch)
  const [grnReceivedMap, setGrnReceivedMap] = useState({});
  // Map for autofilling details (category, rack, etc) by product+batch
  const [lastDetailsMap, setLastDetailsMap] = useState({});
  const lastDetailsMapRef = useRef({});
  useEffect(() => {
    lastDetailsMapRef.current = lastDetailsMap;
  }, [lastDetailsMap]);

  // For summary display, track which row is selected
  const [selectedSummaryIdx, setSelectedSummaryIdx] = useState(0);

  useEffect(() => {
    const fetchDetails = async () => {
      setLoading(true);
      try {
        // 1️⃣ User
        const userRes = await authFetch(`${API_BASE_URL}/api/v1/accounts/`);
        if (userRes.ok) setLoggedInUser(await userRes.json());

        // 2️⃣ PO
        const poRes = await authFetch(
          `${API_BASE_URL}/api/v1/procurement/purchase-orders/${id}/`
        );
        if (!poRes.ok) throw new Error("PO not found");
        const poData = await poRes.json();

        // 3️⃣ PO Lines
        const linesRes = await authFetch(
          `${API_BASE_URL}/api/v1/procurement/purchase-orders/${id}/lines/`
        );
        let linesData = [];
        if (linesRes.ok) {
          const linesJson = await linesRes.json();
          linesData = Array.isArray(linesJson) ? linesJson : linesJson?.lines || [];
        }

        // 4️⃣ Categories
        const categoryRes = await authFetch(
          `${API_BASE_URL}/api/v1/catalog/categories/`
        );
        const categoryData = categoryRes.ok ? await categoryRes.json() : [];
        setCategory(
          Array.isArray(categoryData) ? categoryData : categoryData.results || []
        );

        // 5️⃣ Rack Locations
        const rackRes = await authFetch(
          `${API_BASE_URL}/api/v1/inventory/rack-locations`
        );
        const rackData = rackRes.ok ? await rackRes.json() : [];
        setRackLocations(Array.isArray(rackData) ? rackData : rackData.results || []);

        // 5.5️⃣ Medicine Forms
        const mfRes = await authFetch(`${API_BASE_URL}/api/v1/catalog/forms/`);
        const mfData = mfRes.ok ? await mfRes.json() : [];
        setMedicineForms(Array.isArray(mfData) ? mfData : mfData.results || []);


        // 6️⃣ Product names & product details (we may need product master fields)
        const productIdSet = new Set();
        linesData.forEach((item) => {
          if (typeof item.product === "number") productIdSet.add(item.product);
          if (item.product?.id) productIdSet.add(item.product.id);
        });
        const productIdToName = {};
        const productDetailsMap = {}; // store product master fields if available
        await Promise.all(
          [...productIdSet].map(async (pid) => {
            const res = await authFetch(
              `${API_BASE_URL}/api/v1/catalog/products/${pid}/`
            );
            if (res.ok) {
              const p = await res.json();
              productIdToName[pid] = p.name;
              // optional fields from product master (if present)
              productDetailsMap[pid] = {
                medicine_form: p.medicine_form || "",
                strength: p.strength || "",
                quantity: p.quantity || "",
                units_per_pack: p.units_per_pack || "",
                base_uom: p.base_uom || "",
                selling_uom: p.selling_uom || "",
                hsn_code: p.hsn_code || "",
                gst_percentage: p.gst_percentage || "",
                mrp: p.mrp || "",
                ptr: p.ptr || "",
              };
            }
          })
        );

        // 7️⃣ All previous POSTED/COMPLETED GRNs for this PO
        const grnRes = await authFetch(
          `${API_BASE_URL}/api/v1/procurement/grns/?po=${id}`
        );
        const grnData = grnRes.ok ? await grnRes.json() : [];
        const allPrevGrnLines = [];
        if (grnData && grnData.results) {
          for (let grn of grnData.results) {
            if (
              (grn.status === "POSTED" || grn.status === "COMPLETED") &&
              grn.lines &&
              grn.lines.length
            ) {
              for (let line of grn.lines) {
                // Save received_at for finding most recent!
                allPrevGrnLines.push({ ...line, grn_received_at: grn.received_at });
              }
            }
          }
        }

        // 8️⃣ For each po_line+batch, keep cumulative received
        const grnReceived = {}; // key: po_line_batch
        for (const line of allPrevGrnLines) {
          const key = `${line.po_line}_${line.batch_no || ""}`;
          grnReceived[key] = (grnReceived[key] || 0) + Number(line.qty_packs_received || 0);
        }
        setGrnReceivedMap(grnReceived);

        // 9️⃣ For autofill: keep last batch details for product+batch
        const lastDetails = {};
        for (const line of allPrevGrnLines) {
          const key = `${line.product}_${line.batch_no || ""}`;
          if (
            !lastDetails[key] ||
            (line.grn_received_at && lastDetails[key].grn_received_at < line.grn_received_at)
          ) {
            lastDetails[key] = {
              category: line.category || "",
              rack_no: line.rack_no || "",
              mfg_date: line.mfg_date || "",
              expiry_date: line.expiry_date || "",
              unit_cost: line.unit_cost || "",
              mrp: line.mrp || "",
              batch: line.batch_no || "",
              medicine_form: line.medicine_form || "",
              strength: line.strength || "",
              hsn_code: line.hsn_code || "",
              gst_percentage: line.gst_percentage || "",
              grn_received_at: line.grn_received_at,
            };
          }
        }
        setLastDetailsMap(lastDetails);

        // 🔟 Initial items received for each PO line, prefill non-quantities from last batch or product master if any
        const itemsList = linesData.map((item, idx) => {
          let productId =
            item.product?.id || (typeof item.product === "number" ? item.product : null);
          // find most recent lastDetails key if exists
          const foundKeys = Object.keys(lastDetails).filter((k) =>
            k.startsWith(`${productId}_`)
          );
          let prefillKey = null;
          if (foundKeys.length > 0) {
            prefillKey = foundKeys.reduce((latestK, k) => {
              return !latestK ||
                lastDetails[k].grn_received_at > lastDetails[latestK].grn_received_at
                ? k
                : latestK;
            }, null);
          }
          const last = prefillKey ? lastDetails[prefillKey] : {};
          const prodMaster = productDetailsMap[productId] || {};
          const orderUom = item.uom || item.uom_code || "";
          return {
            id: item.id || idx,
            po_line: item.id,
            product_id: productId,
            product_name:
              item.product?.name || productIdToName[item.product] || productIdToName[productId] || "",
            ordered: item.qty_packs_ordered || 0,
            received_packs: "",
            received_base: "",
            damaged_base: "",
            batch: last?.batch || "",
            // prefer last batch details, else product master, else blank
            medicine_form: last?.medicine_form || prodMaster.medicine_form || "",
            strength: last?.strength || prodMaster.strength || "",
            quantity: last?.quantity || prodMaster.quantity || "",
            units_per_pack: last?.units_per_pack || prodMaster.units_per_pack || "",
            hsn_code: last?.hsn_code || prodMaster.hsn_code || "",
            gst_percentage: last?.gst_percentage || prodMaster.gst_percentage || "",
            category: last?.category || "",
            mfg_date: last?.mfg_date || "",
            expiry_date: last?.expiry_date || "",
            unit_cost: last?.unit_cost || item.expected_unit_cost || "",
            mrp: last?.mrp || item.mrp || prodMaster.mrp || "",
            rack_no: last?.rack_no || "",
          };
        });
        setItemsReceived(itemsList);

        // Receiving details for display (from last GRN)
        if (grnData.results && grnData.results[0]) {
          const lastGrn = grnData.results[0];
          setReceivingDetails({
            received_date: lastGrn.received_at,
            received_by_user: lastGrn.received_by_detail || lastGrn.received_by,
            invoice_number: lastGrn.supplier_invoice_no,
          });
        }

        // PO meta for display
        const resolvedLocationId =
          poData.location_id ||
          (typeof poData.location === "number" ? poData.location : poData.location?.id) ||
          null;
        setPurchaseOrder({
          id: poData.id,
          po_number: poData.po_number,
          supplier: Supplier ? Supplier.name : poData.vendor_name || "",
          vendor_id: Supplier?.id || poData.Supplier?.id,
          location_id: resolvedLocationId,
          location: resolvedLocationId,
          order_date: poData.order_date,
          expected_date: poData.expected_date,
        });
      } catch (err) {
        console.error(err);
        setPurchaseOrder(null);
      } finally {
        setLoading(false);
      }
    };

    fetchDetails();
  }, [id, Supplier]);

  // Handler with batch autofill
  const handleItemEdit = (idx, field, value) => {
    setItemsReceived((prev) =>
      prev.map((row, i) => {
        if (i !== idx) return row;
        let updated = { ...row, [field]: value };
        if (field === "received_packs") {
          updated.quantity = value;
        }
        if (field === "batch") {
          const batchKey = `${row.product_id}_${value || ""}`;
          const last = lastDetailsMapRef.current[batchKey];
          if (last) {
            updated = {
              ...updated,
              ...last,
              batch: value,
            };
          }
        }
        return updated;
      })
    );
    setSelectedSummaryIdx(idx); // update summary to active/focused row
  };

  // Get summary for selected row
  function getLineSummary(poLine, batch) {
    const key = `${poLine}_${batch || ""}`;
    const item = itemsReceived.find((item) => item.po_line === poLine && item.batch === batch);
    const totalOrdered = item?.ordered || 0;
    const totalReceivedPrev = grnReceivedMap[key] || 0;
    const sessionReceived = item?.received_packs || 0;
    const totalReceived = Number(totalReceivedPrev) + Number(sessionReceived);
    return {
      total_ordered: totalOrdered,
      total_received: totalReceived,
      completion:
        totalOrdered > 0 ? ((totalReceived / totalOrdered) * 100).toFixed(1) + "%" : "0%",
    };
  }

  // Only submit nonzero pack lines
  const handleCompleteReceiving = async () => {
    if (!purchaseOrder || !loggedInUser) {
      showAlert("Missing user or PO!", "Error");
      return;
    }
    const locationId = purchaseOrder.location_id || purchaseOrder.location;

    const grnLines = itemsReceived
      .filter((item) => Number(item.received_packs) > 0)
      .map((item) => ({
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
        units_per_pack: item.units_per_pack ? Number(item.units_per_pack) : null,
        // include the new fields so GRN entry contains them
        medicine_form: item.medicine_form || "",
        strength: item.strength || "",
        quantity: item.quantity || "",
        hsn_code: item.hsn_code || "",
        gst_percentage: item.gst_percentage || "",
      }));

    if (grnLines.length === 0) {
      showAlert("No items entered!", "Error");
      return;
    }

    let grnPayload = {
      po: purchaseOrder.id,
      location: locationId,
      received_by: loggedInUser.id,
      received_at: new Date().toISOString(),
      supplier_invoice_no: "",
      supplier_invoice_date: null,
      note: "",
      status: "DRAFT",
      lines: grnLines,
    };

    try {
      // create GRN
      const grnResponse = await authFetch(`${API_BASE_URL}/api/v1/procurement/grns/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(grnPayload),
      });
      const data = await grnResponse.json().catch(() => null);

      if (!grnResponse.ok) {
        showAlert("GRN error: " + JSON.stringify(data), "Error");
        return;
      }

      // posting GRN (if your backend requires an extra action)
      const postRes = await authFetch(`${API_BASE_URL}/api/v1/procurement/grns/${data.id}/post/`, {
        method: "POST",
      });
      if (!postRes.ok) {
        showAlert("Posting failed", "Error");
        return;
      }

      // Update catalog product master for each received line (PATCH product)
      // This ensures the product master gets medicine_form, base_uom, selling_uom, hsn, gst, mrp updates
      await Promise.all(
        grnLines.map(async (line) => {
          try {
            if (!line.product) return;
            const productPatch = {
              // only include fields if present (avoid overwriting with empty)
              ...(line.medicine_form ? { medicine_form: line.medicine_form } : {}),
              ...(line.strength ? { strength: line.strength } : {}),
              ...(line.quantity ? { quantity: line.quantity } : {}),
              ...(line.hsn_code ? { hsn_code: line.hsn_code } : {}),
              ...(line.gst_percentage ? { gst_percentage: line.gst_percentage } : {}),
              ...(line.mrp ? { mrp: line.mrp } : {}),
            };
            // if there's nothing to patch, skip
            if (Object.keys(productPatch).length === 0) return;
            await authFetch(`${API_BASE_URL}/api/v1/catalog/products/${line.product}/`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(productPatch),
            });
          } catch (e) {
            // don't break the whole flow if product update fails; just log
            console.error("Product patch failed for", line.product, e);
          }
        })
      );

      showAlert("GRN saved and products updated successfully!", "Success");
      window.location.reload();
    } catch (e) {
      console.error(e);
      showAlert("An error occurred.", "Error");
    }
  };

  if (loading)
    return (
      <div className="inv-wrap">
        <div className="inv-container">
          <div className="receiveitems-header-section">
            <button className="back-btn" onClick={() => navigate(-1)}>
              <ArrowLeft size={18} />
              Back
            </button>
          </div>
          <div className="inv-header">
            <div>
              <h2>Receive Items</h2>
              <p>Loading...</p>
            </div>
          </div>
        </div>
      </div>
    );

  if (!purchaseOrder)
    return (
      <div className="inv-wrap">
        <div className="inv-container">
          <div className="receiveitems-header-section">
            <button className="back-btn" onClick={() => navigate(-1)}>
              <ArrowLeft size={18} />
              Back
            </button>
          </div>
          <div className="inv-header">
            <div>
              <h2>Receive Items</h2>
              <p style={{ color: "#ef4444" }}>Purchase Order not found.</p>
            </div>
          </div>
        </div>
      </div>
    );

  // Get summary for currently selected row
  const selectedItem = itemsReceived[selectedSummaryIdx] || {};
  const selSummary = getLineSummary(selectedItem.po_line, selectedItem.batch);

  return (
    <div className="inv-wrap">
      <div className="inv-container">
        <div className="receiveitems-header-section">
          <button className="back-btn" onClick={() => navigate(-1)}>
            <ArrowLeft size={18} />
            Back
          </button>
        </div>

        <div className="inv-header">
          <div>
            <h2>Receive Items</h2>
            <p>Receive items for Purchase Order: {purchaseOrder.po_number}</p>
          </div>
        </div>

        <div className="inv-card">
          <div className="receiveitems-details-grid">
            {/* PURCHASE ORDER */}
            <div className="receiveitems-detail-card">
              <h3>Purchase Order Details</h3>
              <div className="receiveitems-detail-item">
                <span className="receiveitems-label">PO Number:</span>
                <span className="receiveitems-value">{purchaseOrder.po_number}</span>
              </div>
              <div className="receiveitems-detail-item">
                <span className="receiveitems-label">Supplier:</span>
                <span className="receiveitems-value">{purchaseOrder.supplier}</span>
              </div>
              <div className="receiveitems-detail-item">
                <span className="receiveitems-label">Order Date:</span>
                <span className="receiveitems-value">{formatDateDDMMYYYY(purchaseOrder.order_date)}</span>
              </div>
              <div className="receiveitems-detail-item">
                <span className="receiveitems-label">Expected Date:</span>
                <span className="receiveitems-value">{formatDateDDMMYYYY(purchaseOrder.expected_date) || "-"}</span>
              </div>
            </div>

            {/* RECEIVING DETAILS */}
            <div className="receiveitems-detail-card">
              <h3>Receiving Details</h3>
              {loggedInUser && (
                <div className="receiveitems-detail-item">
                  <span className="receiveitems-label">Received By:</span>
                  <span className="receiveitems-value">{loggedInUser.full_name || loggedInUser.username}</span>
                </div>
              )}
              {receivingDetails ? (
                <>
                  <div className="receiveitems-detail-item">
                    <span className="receiveitems-label">Received Date:</span>
                    <span className="receiveitems-value">{formatDateDDMMYYYY(receivingDetails.received_date)}</span>
                  </div>
                  <div className="receiveitems-detail-item">
                    <span className="receiveitems-label">Invoice Number:</span>
                    <span className="receiveitems-value">{receivingDetails.invoice_number || "-"}</span>
                  </div>
                </>
              ) : (
                <div className="receiveitems-detail-item">
                  <span className="receiveitems-value" style={{ color: "#d97706", fontWeight: 600 }}>
                    Not yet received
                  </span>
                </div>
              )}
            </div>

            {/* SUMMARY FOR SELECTED ROW */}
            <div className="receiveitems-detail-card receiveitems-summary-card">
              <h3>Receiving Summary</h3>
              <div className="receiveitems-summary-content">
                <div className="receiveitems-summary-row">
                  <CheckCircle size={18} style={{ color: "#059669" }} />
                  <span className="receiveitems-label">Total Ordered:</span>
                  <span className="receiveitems-value">{selSummary.total_ordered}</span>
                </div>
                <div className="receiveitems-summary-row">
                  <Package size={18} style={{ color: "#2563eb" }} />
                  <span className="receiveitems-label">Total Received:</span>
                  <span className="receiveitems-value">{selSummary.total_received}</span>
                </div>
                <div className="receiveitems-summary-row">
                  <ClipboardList size={18} style={{ color: "#7c3aed" }} />
                  <span className="receiveitems-label">Completion:</span>
                  <span className="receiveitems-value">{selSummary.completion}</span>
                </div>
              </div>
              <button className="inv-add complete-receiving-btn" onClick={handleCompleteReceiving}>
                Complete Receiving
              </button>
            </div>
          </div>

          {/* ITEMS TABLE */}
          <div className="receiveitems-table-section">
            <h3 style={{ marginBottom: "16px", fontSize: "18px", fontWeight: 600, color: "#111827" }}>Items Received</h3>
            <div className="inv-table-wrap">
              <table className="inv-table items-received-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Ordered</th>
                <th> Received</th>
                <th>Damaged</th>
                <th>Batch</th>

                <th>Medicine Form</th>
                <th>Strength</th>
                <th>Quantity</th>
                <th>Units / Pack</th>
                <th>HSN Code</th>
                <th>GST %</th>

                <th>Category</th>
                <th>Rack No</th>
                <th>Purchase Price</th>
                <th>MRP</th>

                <th>MFG Date</th>
                <th>Expiry Date</th>
              </tr>
            </thead>

            <tbody>
              {itemsReceived.map((item, idx) => {
                const rowKey = `${item.po_line}_${item.batch || ""}`;
                const prevReceived = grnReceivedMap[rowKey] || 0;

                return (
                  <tr
                    key={item.id}
                    onClick={() => setSelectedSummaryIdx(idx)}
                    style={{
                      cursor: "pointer",
                      background: idx === selectedSummaryIdx ? "#f3f4f6" : "inherit",
                    }}
                  >
                    <td>{item.product_name}</td>
                    <td>{item.ordered}</td>

                    {/* Packs received */}
                    <td>
                      <input
                        type="number"
                        value={item.received_packs}
                        min="0"
                        onChange={(e) => handleItemEdit(idx, "received_packs", e.target.value)}
                      />
                    </td>

                    {/* damaged */}
                    <td>
                      <input
                        type="number"
                        value={item.damaged_base}
                        min="0"
                        onChange={(e) => handleItemEdit(idx, "damaged_base", e.target.value)}
                      />
                    </td>

                    {/* batch */}
                    <td>
                      <input
                        type="text"
                        value={item.batch}
                        onChange={(e) => handleItemEdit(idx, "batch", e.target.value)}
                      />
                    </td>

                    {/* Medicine Form (dropdown) */}
                    <td>
                      <select
                        value={item.medicine_form || ""}
                        onChange={(e) => handleItemEdit(idx, "medicine_form", e.target.value)}
                      >
                        <option value="">Select</option>
                        {medicineForms.map((f) => (
                          <option key={f.id || f.name} value={f.name || f.id}>
                            {f.name || f.display || f.id}
                          </option>
                        ))}
                      </select>
                    </td>

                    {/* Strength */}
                    <td>
                      <input
                        type="text"
                        value={item.strength || ""}
                        onChange={(e) => handleItemEdit(idx, "strength", e.target.value)}
                      />
                    </td>

                    {/* Quantity (auto-filled from received packs, non-editable) */}
                    <td>
                      <input
                        type="number"
                        min="0"
                        value={item.quantity || ""}
                        readOnly
                        className="readonly-input"
                      />
                    </td>

                    {/* Units per Pack */}
                    <td>
                      <input
                        type="number"
                        min="0"
                        value={item.units_per_pack || ""}
                        onChange={(e) => handleItemEdit(idx, "units_per_pack", e.target.value)}
                      />
                    </td>

                    {/* HSN */}
                    <td>
                      <input
                        type="text"
                        value={item.hsn_code || ""}
                        onChange={(e) => handleItemEdit(idx, "hsn_code", e.target.value)}
                      />
                    </td>

                    {/* GST */}
                    <td>
                      <input
                        type="number"
                        step="0.01"
                        value={item.gst_percentage || ""}
                        onChange={(e) => handleItemEdit(idx, "gst_percentage", e.target.value)}
                      />
                    </td>

                    {/* Category */}
                    <td>
                      <select
                        value={item.category || ""}
                        onChange={(e) => handleItemEdit(idx, "category", e.target.value)}
                      >
                        <option value="">Select</option>
                        {category.map((c) => (
                          <option key={c.id} value={c.name}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </td>

                    {/* Rack */}
                    <td>
                      <select
                        value={item.rack_no || ""}
                        onChange={(e) => handleItemEdit(idx, "rack_no", e.target.value)}
                      >
                        <option value="">Select</option>
                        {rackLocations.map((rack) => (
                          <option key={rack.id} value={rack.name}>
                            {rack.name}
                          </option>
                        ))}
                      </select>
                    </td>

                    {/* Unit Cost */}
                    <td>
                      <input
                        type="number"
                        step="0.01"
                        value={item.unit_cost || ""}
                        onChange={(e) => handleItemEdit(idx, "unit_cost", e.target.value)}
                      />
                    </td>

                    {/* MRP */}
                    <td>
                      <input
                        type="number"
                        step="0.01"
                        value={item.mrp || ""}
                        onChange={(e) => handleItemEdit(idx, "mrp", e.target.value)}
                      />
                    </td>

                    {/* MFG Date */}
                    <td>
                      <input
                        type="date"
                        value={item.mfg_date || ""}
                        onChange={(e) => handleItemEdit(idx, "mfg_date", e.target.value)}
                      />
                    </td>

                    {/* Expiry Date */}
                    <td>
                      <input
                        type="date"
                        value={item.expiry_date || ""}
                        onChange={(e) => handleItemEdit(idx, "expiry_date", e.target.value)}
                      />
                    </td>
                  </tr>
                );
              })}
              </tbody>
            </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReceiveItems;
