import React, { useEffect, useState, useRef } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { CheckCircle, Package, ClipboardList, ArrowLeft } from "lucide-react";
import "./receiveitems.css";
import "../../inventory/inventory.css";
import { formatDateDDMMYYYY } from "../../../utils/dateFormat";
import { authFetch } from "../../../api/http";
import { useAlert } from "../../ui/alert-provider";
import { MEDICINE_CATEGORIES_SIMPLE, MEDICINE_CATEGORIES as BASE_CATEGORIES } from "../../../constants/medicineCategories";

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
  // Modal state for receiving items
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedItemIdx, setSelectedItemIdx] = useState(null);

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

        // 4️⃣ Categories - Use shared constant instead of API
        setCategory(MEDICINE_CATEGORIES_SIMPLE);

        // 5️⃣ Rack Locations
        const rackRes = await authFetch(
          `${API_BASE_URL}/api/v1/inventory/rack-locations`
        );
        const rackData = rackRes.ok ? await rackRes.json() : [];
        setRackLocations(Array.isArray(rackData) ? rackData : rackData.results || []);

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
              // Handle category from product - could be object, string, or ID
              let productCategory = "";
              if (p.category) {
                if (typeof p.category === "object") {
                  productCategory = p.category.id || p.category.name || "";
                } else {
                  productCategory = p.category;
                }
              }
              productDetailsMap[pid] = {
                category: productCategory,
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
          
          // Extract category from PO line - handle different formats
          let poLineCategory = "";
          if (item.category) {
            if (typeof item.category === "object") {
              // Category is an object with id or name
              poLineCategory = item.category.id || item.category.name || "";
            } else if (typeof item.category === "string") {
              // Category is a string (could be ID or name)
              poLineCategory = item.category;
            }
          } else if (item.category_id) {
            poLineCategory = item.category_id;
          } else if (item.category_name) {
            // Find category ID from name
            const foundCat = MEDICINE_CATEGORIES.find(c => c.name === item.category_name);
            poLineCategory = foundCat ? foundCat.id : "";
          }
          
          // Normalize category to ID format
          if (poLineCategory) {
            // If it's a name, convert to ID
            const foundByName = MEDICINE_CATEGORIES.find(c => c.name === poLineCategory);
            if (foundByName) poLineCategory = foundByName.id;
          }
          
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
            batch: last?.batch || "",
            // prefer last batch details, else product master, else blank
            strength: last?.strength || prodMaster.strength || "",
            quantity: last?.quantity || prodMaster.quantity || "",
            units_per_pack: last?.units_per_pack || prodMaster.units_per_pack || "",
            gst_percentage: last?.gst_percentage || prodMaster.gst_percentage || "",
            // Priority: PO line category > Product master category > Last batch category
            category: poLineCategory || prodMaster.category || last?.category || "",
            hsn_code: last?.hsn_code || prodMaster.hsn || prodMaster.hsn_code || (() => {
              // Auto-fill HSN from category if available
              const catId = poLineCategory || prodMaster.category || last?.category || "";
              if (catId) {
                const cat = BASE_CATEGORIES.find(c => c.id === catId);
                return cat?.defaultHsnCode || "";
              }
              return "";
            })(),
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

  // Open modal for receiving item
  const openReceiveModal = (idx) => {
    setSelectedItemIdx(idx);
    setModalOpen(true);
  };

  // Close modal
  const closeReceiveModal = () => {
    setModalOpen(false);
    setSelectedItemIdx(null);
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

  // Helper function to calculate units_per_pack from packaging fields
  const calculateUnitsPerPack = (item) => {
    const category = item.category;
    const stockUnit = item.stock_unit;
    
    // If user provided units_per_pack directly, use it
    if (item.units_per_pack && Number(item.units_per_pack) > 0) {
      return Number(item.units_per_pack);
    }
    
    if (stockUnit === "box") {
      // For box: calculate total units in a box
      if (category === "tablet" || category === "capsule" || category === "supplement") {
        const perStrip = Number(item.tablets_per_strip || item.capsules_per_strip || 0);
        const stripsPerBox = Number(item.strips_per_box || 0);
        if (perStrip > 0 && stripsPerBox > 0) {
          return perStrip * stripsPerBox;
        }
      } else if (category === "syrup" || category === "drops" || category === "spray" || category === "lotion" || category === "shampoo" || category === "sanitizer") {
        const mlPerBottle = Number(item.ml_per_bottle || 0);
        const bottlesPerBox = Number(item.bottles_per_box || 0);
        if (mlPerBottle > 0 && bottlesPerBox > 0) {
          return mlPerBottle * bottlesPerBox;
        }
      } else if (category === "injection") {
        const mlPerVial = Number(item.ml_per_vial || 0);
        const vialsPerBox = Number(item.vials_per_box || 0);
        if (mlPerVial > 0 && vialsPerBox > 0) {
          return mlPerVial * vialsPerBox;
        }
      } else if (category === "ointment" || category === "gel") {
        const gramsPerTube = Number(item.grams_per_tube || 0);
        const tubesPerBox = Number(item.tubes_per_box || 0);
        if (gramsPerTube > 0 && tubesPerBox > 0) {
          return gramsPerTube * tubesPerBox;
        }
      } else if (category === "powder") {
        const gramsPerSachet = Number(item.grams_per_sachet || 0);
        const sachetsPerBox = Number(item.sachets_per_box || 0);
        if (gramsPerSachet > 0 && sachetsPerBox > 0) {
          return gramsPerSachet * sachetsPerBox;
        }
      } else if (category === "soap") {
        const gramsPerBar = Number(item.grams_per_bar || 0);
        const barsPerBox = Number(item.bars_per_box || 0);
        if (gramsPerBar > 0 && barsPerBox > 0) {
          return gramsPerBar * barsPerBox;
        }
      } else if (category === "bandage" || category === "mask" || category === "thermometer") {
        const piecesPerPack = Number(item.pieces_per_pack || 0);
        const packsPerBox = Number(item.packs_per_box || 0);
        if (piecesPerPack > 0 && packsPerBox > 0) {
          return piecesPerPack * packsPerBox;
        }
      } else if (category === "gloves") {
        const pairsPerPack = Number(item.pairs_per_pack || 0);
        const packsPerBox = Number(item.packs_per_box || 0);
        if (pairsPerPack > 0 && packsPerBox > 0) {
          return pairsPerPack * packsPerBox;
        }
      } else if (category === "cotton") {
        const gramsPerPack = Number(item.grams_per_pack || 0);
        const packsPerBox = Number(item.packs_per_box || 0);
        if (gramsPerPack > 0 && packsPerBox > 0) {
          return gramsPerPack * packsPerBox;
        }
      } else if (category === "inhaler") {
        const dosesPerInhaler = Number(item.doses_per_inhaler || 0);
        const inhalersPerBox = Number(item.inhalers_per_box || 0);
        if (dosesPerInhaler > 0 && inhalersPerBox > 0) {
          return dosesPerInhaler * inhalersPerBox;
        }
      } else {
        // Generic/other
        const unitsPerPack = Number(item.units_per_pack || 0);
        const packsPerBox = Number(item.packs_per_box || 0);
        if (unitsPerPack > 0 && packsPerBox > 0) {
          return unitsPerPack * packsPerBox;
        }
      }
    } else {
      // For loose: calculate units per strip/bottle/vial/etc
      if (category === "tablet" || category === "capsule" || category === "supplement") {
        const val = Number(item.tablets_per_strip || item.capsules_per_strip || 0);
        if (val > 0) return val;
      } else if (category === "syrup" || category === "drops" || category === "spray" || category === "lotion" || category === "shampoo" || category === "sanitizer") {
        const val = Number(item.ml_per_bottle || 0);
        if (val > 0) return val;
      } else if (category === "injection") {
        const val = Number(item.ml_per_vial || 0);
        if (val > 0) return val;
      } else if (category === "ointment" || category === "gel") {
        const val = Number(item.grams_per_tube || 0);
        if (val > 0) return val;
      } else if (category === "powder") {
        const val = Number(item.grams_per_sachet || 0);
        if (val > 0) return val;
      } else if (category === "soap") {
        const val = Number(item.grams_per_bar || 0);
        if (val > 0) return val;
      } else if (category === "inhaler") {
        const val = Number(item.doses_per_inhaler || 0);
        if (val > 0) return val;
      }
    }
    
    // Default fallback - return 1 if calculation fails
    return 1;
  };

  // Helper function to determine base_unit and pack_unit from category
  const getUnitNames = (category, stockUnit) => {
    // Base unit is the smallest unit (tablet, ml, gram, etc.)
    // Pack unit is the selling unit (strip, bottle, box, etc.)
    
    if (category === "tablet" || category === "capsule" || category === "supplement") {
      return { base_unit: "TABLET", pack_unit: stockUnit === "box" ? "BOX" : "STRIP" };
    } else if (category === "syrup" || category === "drops" || category === "spray" || category === "lotion" || category === "shampoo" || category === "sanitizer") {
      return { base_unit: "ML", pack_unit: stockUnit === "box" ? "BOX" : "BOTTLE" };
    } else if (category === "injection") {
      return { base_unit: "ML", pack_unit: stockUnit === "box" ? "BOX" : "VIAL" };
    } else if (category === "ointment" || category === "gel") {
      return { base_unit: "GRAM", pack_unit: stockUnit === "box" ? "BOX" : "TUBE" };
    } else if (category === "powder") {
      return { base_unit: "GRAM", pack_unit: stockUnit === "box" ? "BOX" : "SACHET" };
    } else if (category === "soap") {
      return { base_unit: "GRAM", pack_unit: stockUnit === "box" ? "BOX" : "BAR" };
    } else if (category === "inhaler") {
      return { base_unit: "DOSE", pack_unit: stockUnit === "box" ? "BOX" : "INHALER" };
    } else {
      return { base_unit: "UNIT", pack_unit: stockUnit === "box" ? "BOX" : "PACK" };
    }
  };

  // Helper function to build new_product payload
  const buildNewProductPayload = (item) => {
    const categoryIdOrName = item.category;
    const stockUnit = item.stock_unit;
    const units = getUnitNames(categoryIdOrName, stockUnit);
    const unitsPerPack = calculateUnitsPerPack(item);
    
    // Get medicine_form ID (could be object with id, or just ID)
    let medicineFormId = null;
    if (item.medicine_form) {
      if (typeof item.medicine_form === "object" && item.medicine_form.id) {
        medicineFormId = item.medicine_form.id;
      } else if (typeof item.medicine_form === "number" || (typeof item.medicine_form === "string" && !isNaN(item.medicine_form))) {
        medicineFormId = Number(item.medicine_form);
      } else if (typeof item.medicine_form === "string") {
        // Try to find by name in medicineForms list
        const foundForm = medicineForms.find(f => 
          f.name?.toLowerCase() === item.medicine_form.toLowerCase() ||
          f.id === item.medicine_form
        );
        medicineFormId = foundForm ? foundForm.id : null;
      }
    }

    // Ensure units_per_pack is calculated and valid
    const finalUnitsPerPack = unitsPerPack > 0 ? unitsPerPack : 1;
    
    // For category: Send the string ID (e.g., "tablet") and let backend map it to category name
    // The backend _create_or_update_product_from_payload will handle the mapping
    // Don't try to convert to numeric ID here - backend handles both string and numeric
    const categoryToSend = categoryIdOrName || undefined;

    const payload = {
      name: item.product_name || item.requested_name || "Unknown Product",
      base_unit: units.base_unit,
      pack_unit: units.pack_unit,
      units_per_pack: finalUnitsPerPack, // This is REQUIRED - ensure it's always a positive number
      mrp: Number(item.mrp || 0),
      medicine_form: medicineFormId || undefined, // Send ID if available, otherwise undefined
      category: categoryToSend, // Send string ID (e.g., "tablet") - backend will map it
      dosage_strength: item.strength || "",
      gst_percent: Number(item.gst_percentage || 0),
      hsn: item.hsn_code?.trim() || undefined, // HSN code - editable field
      // Include all packaging fields
      tablets_per_strip: item.tablets_per_strip ? Number(item.tablets_per_strip) : undefined,
      capsules_per_strip: item.capsules_per_strip ? Number(item.capsules_per_strip) : undefined,
      strips_per_box: item.strips_per_box ? Number(item.strips_per_box) : undefined,
      ml_per_bottle: item.ml_per_bottle ? Number(item.ml_per_bottle) : undefined,
      bottles_per_box: item.bottles_per_box ? Number(item.bottles_per_box) : undefined,
      ml_per_vial: item.ml_per_vial ? Number(item.ml_per_vial) : undefined,
      vials_per_box: item.vials_per_box ? Number(item.vials_per_box) : undefined,
      grams_per_tube: item.grams_per_tube ? Number(item.grams_per_tube) : undefined,
      tubes_per_box: item.tubes_per_box ? Number(item.tubes_per_box) : undefined,
      doses_per_inhaler: item.doses_per_inhaler ? Number(item.doses_per_inhaler) : undefined,
      inhalers_per_box: item.inhalers_per_box ? Number(item.inhalers_per_box) : undefined,
      grams_per_sachet: item.grams_per_sachet ? Number(item.grams_per_sachet) : undefined,
      sachets_per_box: item.sachets_per_box ? Number(item.sachets_per_box) : undefined,
      grams_per_bar: item.grams_per_bar ? Number(item.grams_per_bar) : undefined,
      bars_per_box: item.bars_per_box ? Number(item.bars_per_box) : undefined,
      pieces_per_pack: item.pieces_per_pack ? Number(item.pieces_per_pack) : undefined,
      packs_per_box: item.packs_per_box ? Number(item.packs_per_box) : undefined,
      pairs_per_pack: item.pairs_per_pack ? Number(item.pairs_per_pack) : undefined,
      grams_per_pack: item.grams_per_pack ? Number(item.grams_per_pack) : undefined,
    };

    // Remove undefined values (but keep units_per_pack even if it's 1)
    Object.keys(payload).forEach(key => {
      if (payload[key] === undefined && key !== "units_per_pack") {
        delete payload[key];
      }
    });

    // Final validation - ensure units_per_pack is present and valid
    if (!payload.units_per_pack || payload.units_per_pack <= 0) {
      payload.units_per_pack = 1; // Fallback to 1 if calculation failed
    }

    return payload;
  };

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
        // Validate required fields for new products
        if (!item.product_id) {
          if (!item.category) {
            validationErrors.push(`${item.product_name}: Category is required for new products`);
          }
          if (!item.stock_unit) {
            validationErrors.push(`${item.product_name}: Stock unit type is required for new products`);
          }
          if (!item.mrp || Number(item.mrp) <= 0) {
            validationErrors.push(`${item.product_name}: MRP is required for new products`);
          }
        }
        
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
      .map((item) => {
        // Calculate qty_base_received from received_packs and packaging
        let qtyBaseReceived = Number(item.received_base || 0);
        if (!qtyBaseReceived && item.received_packs) {
          const unitsPerPack = calculateUnitsPerPack(item);
          qtyBaseReceived = Number(item.received_packs) * unitsPerPack;
        }

        const line = {
          po_line: item.po_line,
          product: item.product_id || null,
          batch_no: item.batch,
          category: item.category || "",
          mfg_date: item.mfg_date || null,
          expiry_date: item.expiry_date || null,
          qty_packs_received: Number(item.received_packs || 0),
          qty_base_received: qtyBaseReceived,
          qty_base_damaged: Number(item.damaged_base || 0),
          unit_cost: Number(item.unit_cost || 0),
          mrp: Number(item.mrp || 0),
          rack_no: item.rack_no || "",
          units_per_pack: item.units_per_pack ? Number(item.units_per_pack) : null,
          strength: item.strength || "",
          quantity: item.quantity || "",
          gst_percentage: item.gst_percentage || "",
        };

        // If product doesn't exist, include new_product payload
        if (!item.product_id) {
          line.new_product = buildNewProductPayload(item);
        }

        return line;
      });

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
      // This ensures the product master gets base_uom, selling_uom, gst, mrp updates
      await Promise.all(
        grnLines.map(async (line) => {
          try {
            if (!line.product) return;
            const productPatch = {
              // only include fields if present (avoid overwriting with empty)
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

          {/* ITEMS TABLE - Simplified */}
          <div className="receiveitems-table-section">
            <h3 style={{ marginBottom: "16px", fontSize: "18px", fontWeight: 600, color: "#111827" }}>Items to Receive</h3>
            <div className="inv-table-wrap">
              <table className="inv-table items-received-table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Ordered Quantity</th>
                    <th>Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {itemsReceived.map((item, idx) => {
                    const rowKey = `${item.po_line}_${item.batch || ""}`;
                    const prevReceived = grnReceivedMap[rowKey] || 0;
                    const remaining = item.ordered - prevReceived;
                    const hasReceived = Number(item.received_packs) > 0;

                    return (
                      <tr
                        key={item.id}
                        style={{
                          background: idx === selectedSummaryIdx ? "#f3f4f6" : "inherit",
                        }}
                      >
                        <td style={{ fontWeight: 500 }}>{item.product_name}</td>
                        <td>
                          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                            <span style={{ fontSize: "14px", fontWeight: 600 }}>{item.ordered}</span>
                            {prevReceived > 0 && (
                              <span style={{ fontSize: "12px", color: "#6b7280" }}>
                                Previously received: {prevReceived}
                              </span>
                            )}
                            {hasReceived && (
                              <span style={{ fontSize: "12px", color: "#059669", fontWeight: 500 }}>
                                This session: {item.received_packs}
                              </span>
                            )}
                            <span style={{ fontSize: "12px", color: remaining > 0 ? "#d97706" : "#059669" }}>
                              Remaining: {remaining}
                            </span>
                          </div>
                        </td>
                        <td>
                          <button
                            className="inv-add"
                            onClick={() => openReceiveModal(idx)}
                            style={{ padding: "8px 16px", fontSize: "14px" }}
                          >
                            {hasReceived ? "Update Receipt" : "Receive Item"}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Receive Item Modal */}
          {modalOpen && selectedItemIdx !== null && (() => {
            const item = itemsReceived[selectedItemIdx];
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
              <div
                style={{
                  position: "fixed",
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundColor: "rgba(0, 0, 0, 0.5)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  zIndex: 1000,
                }}
                onClick={closeReceiveModal}
              >
                <div
                  style={{
                    backgroundColor: "white",
                    borderRadius: "12px",
                    padding: "24px",
                    maxWidth: "900px",
                    width: "90%",
                    maxHeight: "90vh",
                    overflowY: "auto",
                    boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)",
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                    <h2 style={{ margin: 0, fontSize: "20px", fontWeight: 600 }}>Receive Item: {item.product_name}</h2>
                    <button
                      onClick={closeReceiveModal}
                      style={{
                        background: "none",
                        border: "none",
                        fontSize: "24px",
                        cursor: "pointer",
                        color: "#6b7280",
                        padding: "0",
                        width: "32px",
                        height: "32px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      ×
                    </button>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "20px" }}>
                    <div>
                      <label style={{ display: "block", marginBottom: "4px", fontSize: "14px", fontWeight: 500 }}>Ordered Quantity</label>
                      <input
                        type="text"
                        value={item.ordered}
                        readOnly
                        style={{
                          width: "100%",
                          padding: "8px",
                          border: "1px solid #d1d5db",
                          borderRadius: "6px",
                          backgroundColor: "#f9fafb",
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ display: "block", marginBottom: "4px", fontSize: "14px", fontWeight: 500 }}>
                        Received Quantity *
                      </label>
                      <input
                        type="number"
                        value={item.received_packs}
                        min="0"
                        max={item.ordered - prevReceived}
                        onChange={(e) => handleItemEdit(selectedItemIdx, "received_packs", e.target.value)}
                        style={{
                          width: "100%",
                          padding: "8px",
                          border: "1px solid #d1d5db",
                          borderRadius: "6px",
                          borderColor: (() => {
                            const receivedQty = Number(item.received_packs) || 0;
                            const totalOrdered = item.ordered || 0;
                            const maxAllowed = totalOrdered - prevReceived;
                            return receivedQty > maxAllowed ? "#ef4444" : undefined;
                          })(),
                        }}
                      />
                      <div style={{ fontSize: "12px", color: "#6b7280", marginTop: "4px" }}>
                        Remaining: {getRemainingQuantity(item.po_line, item.batch)}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "20px" }}>
                    <div>
                      <label style={{ display: "block", marginBottom: "4px", fontSize: "14px", fontWeight: 500 }}>Batch</label>
                      <input
                        type="text"
                        value={item.batch}
                        onChange={(e) => handleItemEdit(selectedItemIdx, "batch", e.target.value)}
                        style={{
                          width: "100%",
                          padding: "8px",
                          border: "1px solid #d1d5db",
                          borderRadius: "6px",
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ display: "block", marginBottom: "4px", fontSize: "14px", fontWeight: 500 }}>Category *</label>
                      <input
                        type="text"
                        value={item.category ? (MEDICINE_CATEGORIES.find(c => c.id === item.category)?.name || item.category) : "Not specified"}
                        readOnly
                        disabled
                        style={{
                          width: "100%",
                          padding: "8px",
                          border: "1px solid #d1d5db",
                          borderRadius: "6px",
                          backgroundColor: "#f9fafb",
                          color: "#6b7280",
                          cursor: "not-allowed",
                        }}
                      />
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "20px" }}>
                    <div>
                      <label style={{ display: "block", marginBottom: "4px", fontSize: "14px", fontWeight: 500 }}>HSN Code</label>
                      <input
                        type="text"
                        value={item.hsn_code || ""}
                        onChange={(e) => handleItemEdit(selectedItemIdx, "hsn_code", e.target.value)}
                        placeholder="e.g., 30049099"
                        maxLength={8}
                        style={{
                          width: "100%",
                          padding: "8px",
                          border: "1px solid #d1d5db",
                          borderRadius: "6px",
                        }}
                      />
                      <div style={{ fontSize: "12px", color: "#6b7280", marginTop: "4px" }}>
                        {item.hsn_code ? "✓ Editable - You can modify the HSN code" : "Auto-filled from category, but you can edit"}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "20px" }}>
                    <div>
                      <label style={{ display: "block", marginBottom: "4px", fontSize: "14px", fontWeight: 500 }}>Stock Unit Type</label>
                      <select
                        value={item.stock_unit || ""}
                        onChange={(e) => handleItemEdit(selectedItemIdx, "stock_unit", e.target.value)}
                        style={{
                          width: "100%",
                          padding: "8px",
                          border: "1px solid #d1d5db",
                          borderRadius: "6px",
                        }}
                      >
                        <option value="">Select</option>
                        <option value="box">Box (Packed)</option>
                        <option value="loose">Loose (Individual Units)</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ display: "block", marginBottom: "4px", fontSize: "14px", fontWeight: 500 }}>Strength</label>
                      <input
                        type="text"
                        value={item.strength || ""}
                        onChange={(e) => handleItemEdit(selectedItemIdx, "strength", e.target.value)}
                        placeholder="e.g., 500mg"
                        style={{
                          width: "100%",
                          padding: "8px",
                          border: "1px solid #d1d5db",
                          borderRadius: "6px",
                        }}
                      />
                    </div>
                  </div>

                  {/* Packaging fields */}
                  {packagingFields.length > 0 && (
                    <div style={{ marginBottom: "20px" }}>
                      <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: 500 }}>Packaging Details</label>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                        {packagingFields.map((field) => (
                          <div key={field.key}>
                            <label style={{ display: "block", marginBottom: "4px", fontSize: "13px", color: "#6b7280" }}>
                              {field.label}
                            </label>
                            <input
                              type="number"
                              min="0"
                              step="any"
                              value={item[field.key] || ""}
                              onChange={(e) => handleItemEdit(selectedItemIdx, field.key, e.target.value)}
                              placeholder={field.placeholder}
                              style={{
                                width: "100%",
                                padding: "8px",
                                border: "1px solid #d1d5db",
                                borderRadius: "6px",
                              }}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "20px" }}>
                    <div>
                      <label style={{ display: "block", marginBottom: "4px", fontSize: "14px", fontWeight: 500 }}>{totalLabel}</label>
                      <input
                        type="number"
                        min="0"
                        value={item.quantity || ""}
                        onChange={(e) => handleItemEdit(selectedItemIdx, "quantity", e.target.value)}
                        style={{
                          width: "100%",
                          padding: "8px",
                          border: "1px solid #d1d5db",
                          borderRadius: "6px",
                        }}
                      />
                    </div>
                    {(item.category === "tablet" || item.category === "capsule") && (
                      <div>
                        <label style={{ display: "block", marginBottom: "4px", fontSize: "14px", fontWeight: 500 }}>
                          Loose {item.category === "tablet" ? "Tablets" : "Capsules"} (optional)
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={item.loose_units || ""}
                          onChange={(e) => handleItemEdit(selectedItemIdx, "loose_units", e.target.value)}
                          style={{
                            width: "100%",
                            padding: "8px",
                            border: "1px solid #d1d5db",
                            borderRadius: "6px",
                          }}
                        />
                      </div>
                    )}
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "20px" }}>
                    <div>
                      <label style={{ display: "block", marginBottom: "4px", fontSize: "14px", fontWeight: 500 }}>GST %</label>
                      <input
                        type="number"
                        step="0.01"
                        value={item.gst_percentage || ""}
                        onChange={(e) => handleItemEdit(selectedItemIdx, "gst_percentage", e.target.value)}
                        style={{
                          width: "100%",
                          padding: "8px",
                          border: "1px solid #d1d5db",
                          borderRadius: "6px",
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ display: "block", marginBottom: "4px", fontSize: "14px", fontWeight: 500 }}>Rack Location</label>
                      <select
                        value={item.rack_no || ""}
                        onChange={(e) => handleItemEdit(selectedItemIdx, "rack_no", e.target.value)}
                        style={{
                          width: "100%",
                          padding: "8px",
                          border: "1px solid #d1d5db",
                          borderRadius: "6px",
                        }}
                      >
                        <option value="">Select</option>
                        {rackLocations.map((rack) => (
                          <option key={rack.id} value={rack.name}>
                            {rack.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "20px" }}>
                    <div>
                      <label style={{ display: "block", marginBottom: "4px", fontSize: "14px", fontWeight: 500 }}>Cost Price</label>
                      <input
                        type="number"
                        step="0.01"
                        value={item.unit_cost || ""}
                        onChange={(e) => handleItemEdit(selectedItemIdx, "unit_cost", e.target.value)}
                        style={{
                          width: "100%",
                          padding: "8px",
                          border: "1px solid #d1d5db",
                          borderRadius: "6px",
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ display: "block", marginBottom: "4px", fontSize: "14px", fontWeight: 500 }}>MRP</label>
                      <input
                        type="number"
                        step="0.01"
                        value={item.mrp || ""}
                        onChange={(e) => handleItemEdit(selectedItemIdx, "mrp", e.target.value)}
                        style={{
                          width: "100%",
                          padding: "8px",
                          border: "1px solid #d1d5db",
                          borderRadius: "6px",
                        }}
                      />
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "20px" }}>
                    <div>
                      <label style={{ display: "block", marginBottom: "4px", fontSize: "14px", fontWeight: 500 }}>MFG Date</label>
                      <input
                        type="date"
                        value={item.mfg_date || ""}
                        onChange={(e) => handleItemEdit(selectedItemIdx, "mfg_date", e.target.value)}
                        style={{
                          width: "100%",
                          padding: "8px",
                          border: "1px solid #d1d5db",
                          borderRadius: "6px",
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ display: "block", marginBottom: "4px", fontSize: "14px", fontWeight: 500 }}>Expiry Date</label>
                      <input
                        type="date"
                        value={item.expiry_date || ""}
                        onChange={(e) => handleItemEdit(selectedItemIdx, "expiry_date", e.target.value)}
                        style={{
                          width: "100%",
                          padding: "8px",
                          border: "1px solid #d1d5db",
                          borderRadius: "6px",
                        }}
                      />
                    </div>
                  </div>

                  <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "24px" }}>
                    <button
                      onClick={closeReceiveModal}
                      style={{
                        padding: "10px 20px",
                        border: "1px solid #d1d5db",
                        borderRadius: "6px",
                        backgroundColor: "white",
                        cursor: "pointer",
                        fontSize: "14px",
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => {
                        closeReceiveModal();
                      }}
                      style={{
                        padding: "10px 20px",
                        border: "none",
                        borderRadius: "6px",
                        backgroundColor: "#059669",
                        color: "white",
                        cursor: "pointer",
                        fontSize: "14px",
                        fontWeight: 500,
                      }}
                    >
                      Save
                    </button>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
};

export default ReceiveItems;
