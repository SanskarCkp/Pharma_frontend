import React, { useEffect, useState, useRef } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { CheckCircle, Package, ClipboardList, ArrowLeft } from "lucide-react";
import "./receiveitems.css";
import "../../inventory/inventory.css";
import { formatDateDDMMYYYY } from "../../../utils/dateFormat";
import { authFetch } from "../../../api/http";
import { useAlert } from "../../ui/alert-provider";

// Predefined categories with packaging structure (same as AddMedicine)
const MEDICINE_CATEGORIES = [
  {
    id: "tablet",
    name: "Tablet",
    unit: "Tablets",
    packagingFields: [
      { key: "tablets_per_strip", label: "Tablets per Strip", placeholder: "e.g., 10, 15", alwaysShow: true },
      { key: "strips_per_box", label: "Strips per Box", placeholder: "e.g., 10, 20", showOnlyForBox: true },
    ],
  },
  {
    id: "capsule",
    name: "Capsule",
    unit: "Capsules",
    packagingFields: [
      { key: "capsules_per_strip", label: "Capsules per Strip", placeholder: "e.g., 10, 15", alwaysShow: true },
      { key: "strips_per_box", label: "Strips per Box", placeholder: "e.g., 10, 20", showOnlyForBox: true },
    ],
  },
  {
    id: "syrup",
    name: "Syrup/Suspension",
    unit: "ML",
    packagingFields: [
      { key: "ml_per_bottle", label: "ML per Bottle", placeholder: "e.g., 100, 200", alwaysShow: true },
      { key: "bottles_per_box", label: "Bottles per Box", placeholder: "e.g., 12, 24", showOnlyForBox: true },
    ],
  },
  {
    id: "injection",
    name: "Injection/Vial",
    unit: "Vials",
    packagingFields: [
      { key: "ml_per_vial", label: "ML per Vial", placeholder: "e.g., 2, 5, 10", alwaysShow: true },
      { key: "vials_per_box", label: "Vials per Box", placeholder: "e.g., 10, 20, 50", showOnlyForBox: true },
    ],
  },
  {
    id: "ointment",
    name: "Ointment/Cream",
    unit: "Grams",
    packagingFields: [
      { key: "grams_per_tube", label: "Grams per Tube", placeholder: "e.g., 15, 30, 50", alwaysShow: true },
      { key: "tubes_per_box", label: "Tubes per Box", placeholder: "e.g., 10, 20", showOnlyForBox: true },
    ],
  },
  {
    id: "drops",
    name: "Drops (Eye/Ear/Nasal)",
    unit: "ML",
    packagingFields: [
      { key: "ml_per_bottle", label: "ML per Bottle", placeholder: "e.g., 5, 10, 15", alwaysShow: true },
      { key: "bottles_per_box", label: "Bottles per Box", placeholder: "e.g., 1, 6, 12", showOnlyForBox: true },
    ],
  },
  {
    id: "inhaler",
    name: "Inhaler",
    unit: "Units",
    packagingFields: [
      { key: "doses_per_inhaler", label: "Doses per Inhaler", placeholder: "e.g., 100, 200", alwaysShow: true },
      { key: "inhalers_per_box", label: "Inhalers per Box", placeholder: "e.g., 1, 2", showOnlyForBox: true },
    ],
  },
  {
    id: "powder",
    name: "Powder/Sachet",
    unit: "Sachets",
    packagingFields: [
      { key: "grams_per_sachet", label: "Grams per Sachet", placeholder: "e.g., 5, 10, 15", alwaysShow: true },
      { key: "sachets_per_box", label: "Sachets per Box", placeholder: "e.g., 10, 20, 30", showOnlyForBox: true },
    ],
  },
  {
    id: "gel",
    name: "Gel",
    unit: "Grams",
    packagingFields: [
      { key: "grams_per_tube", label: "Grams per Tube", placeholder: "e.g., 20, 30, 50", alwaysShow: true },
      { key: "tubes_per_box", label: "Tubes per Box", placeholder: "e.g., 1, 10", showOnlyForBox: true },
    ],
  },
  {
    id: "spray",
    name: "Spray",
    unit: "ML",
    packagingFields: [
      { key: "ml_per_bottle", label: "ML per Bottle", placeholder: "e.g., 50, 100", alwaysShow: true },
      { key: "bottles_per_box", label: "Bottles per Box", placeholder: "e.g., 1, 6", showOnlyForBox: true },
    ],
  },
  {
    id: "lotion",
    name: "Lotion/Solution",
    unit: "ML",
    packagingFields: [
      { key: "ml_per_bottle", label: "ML per Bottle", placeholder: "e.g., 100, 200, 500", alwaysShow: true },
      { key: "bottles_per_box", label: "Bottles per Box", placeholder: "e.g., 1, 12", showOnlyForBox: true },
    ],
  },
  {
    id: "shampoo",
    name: "Shampoo",
    unit: "ML",
    packagingFields: [
      { key: "ml_per_bottle", label: "ML per Bottle", placeholder: "e.g., 100, 200, 500", alwaysShow: true },
      { key: "bottles_per_box", label: "Bottles per Box", placeholder: "e.g., 1, 12", showOnlyForBox: true },
    ],
  },
  {
    id: "soap",
    name: "Soap/Bar",
    unit: "Grams",
    packagingFields: [
      { key: "grams_per_bar", label: "Grams per Bar", placeholder: "e.g., 75, 100, 125", alwaysShow: true },
      { key: "bars_per_box", label: "Bars per Box", placeholder: "e.g., 1, 3, 6", showOnlyForBox: true },
    ],
  },
  {
    id: "bandage",
    name: "Bandage/Dressing",
    unit: "Pieces",
    packagingFields: [
      { key: "pieces_per_pack", label: "Pieces per Pack", placeholder: "e.g., 1, 5, 10", alwaysShow: true },
      { key: "packs_per_box", label: "Packs per Box", placeholder: "e.g., 10, 20", showOnlyForBox: true },
    ],
  },
  {
    id: "mask",
    name: "Mask (Surgical/N95)",
    unit: "Pieces",
    packagingFields: [
      { key: "pieces_per_pack", label: "Pieces per Pack", placeholder: "e.g., 1, 5, 10", alwaysShow: true },
      { key: "packs_per_box", label: "Packs per Box", placeholder: "e.g., 10, 20, 50", showOnlyForBox: true },
    ],
  },
  {
    id: "gloves",
    name: "Gloves",
    unit: "Pairs",
    packagingFields: [
      { key: "pairs_per_pack", label: "Pairs per Pack", placeholder: "e.g., 1, 50, 100", alwaysShow: true },
      { key: "packs_per_box", label: "Packs per Box", placeholder: "e.g., 1, 10", showOnlyForBox: true },
    ],
  },
  {
    id: "cotton",
    name: "Cotton/Gauze",
    unit: "Grams",
    packagingFields: [
      { key: "grams_per_pack", label: "Grams per Pack", placeholder: "e.g., 100, 200, 500", alwaysShow: true },
      { key: "packs_per_box", label: "Packs per Box", placeholder: "e.g., 10, 20", showOnlyForBox: true },
    ],
  },
  {
    id: "sanitizer",
    name: "Hand Sanitizer",
    unit: "ML",
    packagingFields: [
      { key: "ml_per_bottle", label: "ML per Bottle", placeholder: "e.g., 50, 100, 500", alwaysShow: true },
      { key: "bottles_per_box", label: "Bottles per Box", placeholder: "e.g., 1, 12, 24", showOnlyForBox: true },
    ],
  },
  {
    id: "thermometer",
    name: "Thermometer",
    unit: "Pieces",
    packagingFields: [
      { key: "pieces_per_pack", label: "Pieces per Pack", placeholder: "e.g., 1", alwaysShow: true },
      { key: "packs_per_box", label: "Packs per Box", placeholder: "e.g., 10, 20", showOnlyForBox: true },
    ],
  },
  {
    id: "supplement",
    name: "Supplement/Vitamin",
    unit: "Units",
    packagingFields: [
      { key: "tablets_per_strip", label: "Tablets per Strip", placeholder: "e.g., 10, 15, 30", alwaysShow: true },
      { key: "strips_per_box", label: "Strips per Box", placeholder: "e.g., 1, 3, 10", showOnlyForBox: true },
    ],
  },
  {
    id: "other",
    name: "Other/Miscellaneous",
    unit: "Units",
    packagingFields: [
      { key: "units_per_pack", label: "Units per Pack", placeholder: "e.g., 1, 10", alwaysShow: true },
      { key: "packs_per_box", label: "Packs per Box", placeholder: "e.g., 1, 10", showOnlyForBox: true },
    ],
  },
];

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

  // Extract Supplier ID to prevent infinite loops from object reference changes
  const supplierId = Supplier?.id || null;
  const supplierName = Supplier?.name || null;

  useEffect(() => {
    let isCancelled = false;
    
    const fetchDetails = async () => {
      if (isCancelled) return;
      
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
              item.product?.name || 
              productIdToName[item.product] || 
              productIdToName[productId] || 
              item.requested_name || 
              "",
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
            gst_percentage: last?.gst_percentage || prodMaster.gst_percentage || "",
            // use our structured categories; store ID when possible
            category: last?.category || item.category || "",
            mfg_date: last?.mfg_date || "",
            expiry_date: last?.expiry_date || "",
            unit_cost: last?.unit_cost || item.expected_unit_cost || "",
            mrp: last?.mrp || item.mrp || prodMaster.mrp || "",
            rack_no: last?.rack_no || "",
            // stock / packaging info (optional, per AddMedicine)
            stock_unit: last?.stock_unit || "",
            tablets_per_strip: last?.tablets_per_strip || "",
            strips_per_box: last?.strips_per_box || "",
            ml_per_bottle: last?.ml_per_bottle || "",
            bottles_per_box: last?.bottles_per_box || "",
            ml_per_vial: last?.ml_per_vial || "",
            vials_per_box: last?.vials_per_box || "",
            capsules_per_strip: last?.capsules_per_strip || "",
            grams_per_tube: last?.grams_per_tube || "",
            tubes_per_box: last?.tubes_per_box || "",
            doses_per_inhaler: last?.doses_per_inhaler || "",
            inhalers_per_box: last?.inhalers_per_box || "",
            grams_per_sachet: last?.grams_per_sachet || "",
            sachets_per_box: last?.sachets_per_box || "",
            grams_per_bar: last?.grams_per_bar || "",
            bars_per_box: last?.bars_per_box || "",
            pieces_per_pack: last?.pieces_per_pack || "",
            packs_per_box: last?.packs_per_box || "",
            pairs_per_pack: last?.pairs_per_pack || "",
            grams_per_pack: last?.grams_per_pack || "",
            units_per_pack_cfg: last?.units_per_pack_cfg || "",
            loose_units: last?.loose_units || "",
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
        
        if (isCancelled) return;
        
        setPurchaseOrder({
          id: poData.id,
          po_number: poData.po_number,
          supplier: supplierName || poData.vendor_name || "",
          vendor_id: supplierId || poData.Supplier?.id,
          location_id: resolvedLocationId,
          location: resolvedLocationId,
          order_date: poData.order_date,
          expected_date: poData.expected_date,
        });
      } catch (err) {
        console.error("Error fetching receive items details:", err);
        if (!isCancelled) {
          setPurchaseOrder(null);
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    };

    fetchDetails();
    
    // Cleanup function to prevent state updates after unmount
    return () => {
      isCancelled = true;
    };
  }, [id, supplierId, supplierName]);

  // Calculate remaining quantity that can be received for a PO line
  const getRemainingQuantity = (poLine, batch) => {
    const key = `${poLine}_${batch || ""}`;
    const item = itemsReceived.find((item) => item.po_line === poLine && item.batch === batch);
    const totalOrdered = item?.ordered || 0;
    const totalReceivedPrev = grnReceivedMap[key] || 0;
    const sessionReceived = Number(item?.received_packs || 0);
    const remaining = totalOrdered - totalReceivedPrev - sessionReceived;
    return Math.max(0, remaining);
  };

  // Handler with batch autofill and validation
  const handleItemEdit = (idx, field, value) => {
    setItemsReceived((prev) =>
      prev.map((row, i) => {
        if (i !== idx) return row;
        let updated = { ...row, [field]: value };
        
        // Validate received quantity doesn't exceed ordered
        if (field === "received_packs") {
          const receivedQty = Number(value) || 0;
          const rowKey = `${row.po_line}_${row.batch || ""}`;
          const prevReceived = grnReceivedMap[rowKey] || 0;
          const totalOrdered = row.ordered || 0;
          const maxAllowed = totalOrdered - prevReceived;
          
          if (receivedQty > maxAllowed) {
            showAlert(
              `Received quantity (${receivedQty}) cannot exceed remaining ordered quantity (${maxAllowed})`,
              "Error"
            );
            return row; // Don't update if validation fails
          }
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

    // Validate all received quantities before submitting
    const validationErrors = [];
    itemsReceived.forEach((item) => {
      const receivedQty = Number(item.received_packs) || 0;
      if (receivedQty > 0) {
        const rowKey = `${item.po_line}_${item.batch || ""}`;
        const prevReceived = grnReceivedMap[rowKey] || 0;
        const totalOrdered = item.ordered || 0;
        const maxAllowed = totalOrdered - prevReceived;
        
        if (receivedQty > maxAllowed) {
          validationErrors.push(
            `${item.product_name}: Received (${receivedQty}) exceeds remaining ordered (${maxAllowed})`
          );
        }
      }
    });

    if (validationErrors.length > 0) {
      showAlert(validationErrors.join("\n"), "Error");
      return;
    }

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
      // This ensures the product master gets medicine_form, base_uom, selling_uom, gst, mrp updates
      await Promise.all(
        grnLines.map(async (line) => {
          try {
            if (!line.product) return;
            const productPatch = {
              // only include fields if present (avoid overwriting with empty)
              ...(line.medicine_form ? { medicine_form: line.medicine_form } : {}),
              ...(line.strength ? { strength: line.strength } : {}),
              ...(line.quantity ? { quantity: line.quantity } : {}),
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
      // Navigate back instead of reloading to prevent continuous loading
      navigate(-1);
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
                    <th>Received</th>
                    <th>Damaged</th>
                    <th>Batch</th>
                    <th>Category</th>
                    <th>Medicine Form</th>
                    <th>Stock Unit</th>
                    <th>Packaging</th>
                    <th>Total Qty</th>
                    <th>Loose Units</th>
                    <th>Strength</th>
                    <th>GST %</th>
                    <th>Rack No</th>
                    <th>Cost Price</th>
                    <th>MRP</th>
                    <th>MFG Date</th>
                    <th>Expiry Date</th>
                  </tr>
                </thead>

                <tbody>
                  {itemsReceived.map((item, idx) => {
                    const rowKey = `${item.po_line}_${item.batch || ""}`;
                    const prevReceived = grnReceivedMap[rowKey] || 0;
                    const selectedCategory = MEDICINE_CATEGORIES.find((c) => c.id === item.category);
                    const packagingFields = selectedCategory
                      ? selectedCategory.packagingFields.filter(
                          (field) => field.alwaysShow || (field.showOnlyForBox && item.stock_unit === "box")
                        )
                      : [];

                    const totalLabel =
                      item.stock_unit === "box"
                        ? "Total Boxes *"
                        : `Total ${
                            selectedCategory?.id === "tablet"
                              ? "Strips"
                              : selectedCategory?.id === "syrup"
                              ? "Bottles"
                              : selectedCategory?.id === "injection"
                              ? "Vials"
                              : selectedCategory?.id === "capsule"
                              ? "Strips"
                              : selectedCategory?.id === "ointment"
                              ? "Tubes"
                              : "Units"
                          } *`;

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
                            max={item.ordered - (grnReceivedMap[`${item.po_line}_${item.batch || ""}`] || 0)}
                            onChange={(e) => handleItemEdit(idx, "received_packs", e.target.value)}
                            style={{
                              borderColor: (() => {
                                const receivedQty = Number(item.received_packs) || 0;
                                const rowKey = `${item.po_line}_${item.batch || ""}`;
                                const prevReceived = grnReceivedMap[rowKey] || 0;
                                const totalOrdered = item.ordered || 0;
                                const maxAllowed = totalOrdered - prevReceived;
                                return receivedQty > maxAllowed ? "#ef4444" : undefined;
                              })(),
                            }}
                          />
                          <div style={{ fontSize: 10, color: "#6b7280", marginTop: 2 }}>
                            Remaining: {getRemainingQuantity(item.po_line, item.batch)}
                          </div>
                        </td>

                        {/* Damaged (base units) */}
                        <td>
                          <input
                            type="number"
                            value={item.damaged_base}
                            min="0"
                            onChange={(e) => handleItemEdit(idx, "damaged_base", e.target.value)}
                          />
                        </td>

                        {/* Batch */}
                        <td>
                          <input
                            type="text"
                            value={item.batch}
                            onChange={(e) => handleItemEdit(idx, "batch", e.target.value)}
                          />
                        </td>

                        {/* Category (same as AddMedicine) */}
                        <td>
                          <select
                            value={item.category || ""}
                            onChange={(e) => handleItemEdit(idx, "category", e.target.value)}
                          >
                            <option value="">Select category</option>
                            {MEDICINE_CATEGORIES.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.name}
                              </option>
                            ))}
                          </select>
                        </td>

                        {/* Medicine Form */}
                        <td>
                          <select
                            value={item.medicine_form || ""}
                            onChange={(e) => handleItemEdit(idx, "medicine_form", e.target.value)}
                          >
                            <option value="">Select</option>
                            {medicineForms.map((form) => (
                              <option key={form.id} value={form.id}>
                                {form.name}
                              </option>
                            ))}
                          </select>
                        </td>

                        {/* Stock Unit Type */}
                        <td>
                          <select
                            value={item.stock_unit || ""}
                            onChange={(e) => handleItemEdit(idx, "stock_unit", e.target.value)}
                          >
                            <option value="">Select</option>
                            <option value="box">Box (Packed)</option>
                            <option value="loose">Loose (Individual Units)</option>
                          </select>
                        </td>

                        {/* Packaging fields */}
                        <td>
                          {packagingFields.length === 0 && (
                            <span style={{ fontSize: 12, color: "#9ca3af" }}>—</span>
                          )}
                          {packagingFields.map((field) => (
                            <div key={field.key} style={{ marginBottom: 4 }}>
                              <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 2 }}>
                                {field.label}
                              </div>
                              <input
                                type="number"
                                min="0"
                                step="any"
                                value={item[field.key] || ""}
                                onChange={(e) => handleItemEdit(idx, field.key, e.target.value)}
                                placeholder={field.placeholder}
                              />
                            </div>
                          ))}
                        </td>

                        {/* Total quantity */}
                        <td>
                          <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 2 }}>{totalLabel}</div>
                          <input
                            type="number"
                            min="0"
                            value={item.quantity || ""}
                            onChange={(e) => handleItemEdit(idx, "quantity", e.target.value)}
                          />
                        </td>

                        {/* Loose units for tablet/capsule */}
                        <td>
                          {(item.category === "tablet" || item.category === "capsule") && (
                            <>
                              <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 2 }}>
                                Loose {item.category === "tablet" ? "Tablets" : "Capsules"} (optional)
                              </div>
                              <input
                                type="number"
                                min="0"
                                step="1"
                                value={item.loose_units || ""}
                                onChange={(e) => handleItemEdit(idx, "loose_units", e.target.value)}
                              />
                            </>
                          )}
                        </td>

                        {/* Strength */}
                        <td>
                          <input
                            type="text"
                            value={item.strength || ""}
                            onChange={(e) => handleItemEdit(idx, "strength", e.target.value)}
                          />
                        </td>

                        {/* GST % */}
                        <td>
                          <input
                            type="number"
                            step="0.01"
                            value={item.gst_percentage || ""}
                            onChange={(e) => handleItemEdit(idx, "gst_percentage", e.target.value)}
                          />
                        </td>

                        {/* Rack Location */}
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

                        {/* Cost Price */}
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
