import React, { useEffect, useMemo, useRef, useState } from "react";
import "./inventory.css";
import { authFetch } from "../../api/http";
import { getAccessToken, getRefreshToken, storeTokens } from "../../api/auth";
import { getDefaultLocationId } from "../../config/location";

const rawBase = import.meta.env.VITE_API_URL || "";
const normalizeBase = (u) => u.trim().replace(/\/+$/g, "").replace(/\/api\/v1$/i, "");
const API_BASE = normalizeBase(rawBase);

const ADD_MEDICINE_API = `${API_BASE}/api/v1/inventory/add-medicine/`;
const MEDICINE_SEARCH_API = `${API_BASE}/api/v1/inventory/medicines/global?q=`;
const GLOBAL_MEDICINES_API = `${API_BASE}/api/v1/inventory/medicines/global?q=`;
const BATCHES_API = `${API_BASE}/api/v1/inventory/batches/`;
const MEDICINE_DETAIL_API = (batchId) => `${API_BASE}/api/v1/inventory/medicines/${batchId}/`;

const DEFAULT_LOCATION_ID = getDefaultLocationId();

// Predefined categories matching AddMedicine.jsx
const MEDICINE_CATEGORIES = [
  { id: 'tablet', name: 'Tablet', looseLabel: 'Strips', boxLabel: 'Boxes', perBoxLabel: 'Strips per Box', perBoxDefault: 10, perBoxField: 'strips_per_box' },
  { id: 'capsule', name: 'Capsule', looseLabel: 'Strips', boxLabel: 'Boxes', perBoxLabel: 'Strips per Box', perBoxDefault: 10, perBoxField: 'strips_per_box' },
  { id: 'syrup', name: 'Syrup/Suspension', looseLabel: 'Bottles', boxLabel: 'Boxes', perBoxLabel: 'Bottles per Box', perBoxDefault: 12, perBoxField: 'bottles_per_box' },
  { id: 'injection', name: 'Injection/Vial', looseLabel: 'Vials', boxLabel: 'Boxes', perBoxLabel: 'Vials per Box', perBoxDefault: 10, perBoxField: 'vials_per_box' },
  { id: 'ointment', name: 'Ointment/Cream', looseLabel: 'Tubes', boxLabel: 'Boxes', perBoxLabel: 'Tubes per Box', perBoxDefault: 10, perBoxField: 'tubes_per_box' },
  { id: 'drops', name: 'Drops (Eye/Ear/Nasal)', looseLabel: 'Bottles', boxLabel: 'Boxes', perBoxLabel: 'Bottles per Box', perBoxDefault: 10, perBoxField: 'bottles_per_box' },
  { id: 'inhaler', name: 'Inhaler', looseLabel: 'Inhalers', boxLabel: 'Boxes', perBoxLabel: 'Inhalers per Box', perBoxDefault: 1, perBoxField: 'inhalers_per_box' },
  { id: 'powder', name: 'Powder/Sachet', looseLabel: 'Sachets', boxLabel: 'Boxes', perBoxLabel: 'Sachets per Box', perBoxDefault: 10, perBoxField: 'sachets_per_box' },
  { id: 'gel', name: 'Gel', looseLabel: 'Tubes', boxLabel: 'Boxes', perBoxLabel: 'Tubes per Box', perBoxDefault: 10, perBoxField: 'tubes_per_box' },
  { id: 'spray', name: 'Spray', looseLabel: 'Bottles', boxLabel: 'Boxes', perBoxLabel: 'Bottles per Box', perBoxDefault: 10, perBoxField: 'bottles_per_box' },
  { id: 'lotion', name: 'Lotion/Solution', looseLabel: 'Bottles', boxLabel: 'Boxes', perBoxLabel: 'Bottles per Box', perBoxDefault: 10, perBoxField: 'bottles_per_box' },
  { id: 'shampoo', name: 'Shampoo', looseLabel: 'Bottles', boxLabel: 'Boxes', perBoxLabel: 'Bottles per Box', perBoxDefault: 10, perBoxField: 'bottles_per_box' },
  { id: 'soap', name: 'Soap/Bar', looseLabel: 'Bars', boxLabel: 'Boxes', perBoxLabel: 'Bars per Box', perBoxDefault: 3, perBoxField: 'bars_per_box' },
  { id: 'bandage', name: 'Bandage/Dressing', looseLabel: 'Packs', boxLabel: 'Boxes', perBoxLabel: 'Packs per Box', perBoxDefault: 10, perBoxField: 'packs_per_box' },
  { id: 'mask', name: 'Mask (Surgical/N95)', looseLabel: 'Packs', boxLabel: 'Boxes', perBoxLabel: 'Packs per Box', perBoxDefault: 10, perBoxField: 'packs_per_box' },
  { id: 'gloves', name: 'Gloves', looseLabel: 'Packs', boxLabel: 'Boxes', perBoxLabel: 'Packs per Box', perBoxDefault: 10, perBoxField: 'packs_per_box' },
  { id: 'cotton', name: 'Cotton/Gauze', looseLabel: 'Packs', boxLabel: 'Boxes', perBoxLabel: 'Packs per Box', perBoxDefault: 10, perBoxField: 'packs_per_box' },
  { id: 'sanitizer', name: 'Hand Sanitizer', looseLabel: 'Bottles', boxLabel: 'Boxes', perBoxLabel: 'Bottles per Box', perBoxDefault: 12, perBoxField: 'bottles_per_box' },
  { id: 'thermometer', name: 'Thermometer', looseLabel: 'Packs', boxLabel: 'Boxes', perBoxLabel: 'Packs per Box', perBoxDefault: 10, perBoxField: 'packs_per_box' },
  { id: 'supplement', name: 'Supplement/Vitamin', looseLabel: 'Strips', boxLabel: 'Boxes', perBoxLabel: 'Strips per Box', perBoxDefault: 10, perBoxField: 'strips_per_box' },
  { id: 'other', name: 'Other/Miscellaneous', looseLabel: 'Packs', boxLabel: 'Boxes', perBoxLabel: 'Packs per Box', perBoxDefault: 10, perBoxField: 'packs_per_box' }
];

const PACKAGING_FIELD_LABELS = {
  tablets_per_strip: "Tablets per Strip",
  capsules_per_strip: "Capsules per Strip",
  strips_per_box: "Strips per Box",
  ml_per_bottle: "ML per Bottle",
  bottles_per_box: "Bottles per Box",
  ml_per_vial: "ML per Vial",
  vials_per_box: "Vials per Box",
  grams_per_tube: "Grams per Tube",
  tubes_per_box: "Tubes per Box",
  doses_per_inhaler: "Doses per Inhaler",
  inhalers_per_box: "Inhalers per Box",
  grams_per_sachet: "Grams per Sachet",
  sachets_per_box: "Sachets per Box",
  grams_per_bar: "Grams per Bar",
  bars_per_box: "Bars per Box",
  pieces_per_pack: "Pieces per Pack",
  packs_per_box: "Packs per Box",
  pairs_per_pack: "Pairs per Pack",
  grams_per_pack: "Grams per Pack",
  units_per_pack: "Units per Pack",
  loose_units: "Loose Units",
};

const normalizeCategoryId = (category) => {
  if (!category) return "";
  const raw =
    typeof category === "string"
      ? category
      : category.id || category.slug || category.code || category.value || category.name || "";
  const cleaned = String(raw || "").trim();
  const lowered = cleaned.toLowerCase();
  const direct = MEDICINE_CATEGORIES.find((c) => c.id === lowered);
  if (direct) return direct.id;
  const byName = MEDICINE_CATEGORIES.find((c) => c.name.toLowerCase() === lowered);
  if (byName) return byName.id;
  return lowered;
};

const deriveBoxCount = (medicineLike, categoryId) => {
  const med = medicineLike?.medicine || medicineLike || {};
  const toNumber = (value) => {
    const num = Number(value);
    return Number.isFinite(num) && num > 0 ? num : null;
  };

  const catId = categoryId || normalizeCategoryId(med.category);
  const categoryConfig = MEDICINE_CATEGORIES.find((c) => c.id === catId);
  const preferredField = categoryConfig?.perBoxField;

  const candidates = [
    preferredField,
    "strips_per_box",
    "bottles_per_box",
    "vials_per_box",
    "tubes_per_box",
    "inhalers_per_box",
    "sachets_per_box",
    "bars_per_box",
    "packs_per_box",
    "units_per_box",
    "quantity_per_box",
    "pack_size",
    "units_per_pack",
  ].filter(Boolean);

  for (const key of candidates) {
    const value = toNumber(med[key]);
    if (value) return value;
    if (med.medicine && med.medicine !== med) {
      const nested = toNumber(med.medicine[key]);
      if (nested) return nested;
    }
  }

  return null;
};

const dispatchInventoryRefresh = () => {
  try {
    window.dispatchEvent(new CustomEvent("inventory:refresh"));
  } catch {}
};

async function tryRefreshToken() {
  try {
    const refresh = getRefreshToken();
    if (!refresh) return false;
    const res = await fetch(`${API_BASE}/api/v1/auth/token/refresh/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh }),
    });
    if (!res.ok) return false;
    const data = await res.json().catch(() => null);
    if (!data) return false;
    storeTokens({ access: data.access, refresh: data.refresh || refresh });
    return Boolean(data.access || data.refresh);
  } catch {
    return false;
  }
}

async function fetchWithAuthRetry(url, options = {}) {
  try {
    const response = await authFetch(url, options);
    if (response.status !== 401) return response;
    const refreshed = await tryRefreshToken();
    if (!refreshed) return response;
    return await authFetch(url, options);
  } catch (err) {
    console.warn("authFetch failed, falling back to fetch", err);
    const headers = { ...(options.headers || {}) };
    const token = getAccessToken();
    if (token) headers.Authorization = `Bearer ${token}`;
    return fetch(url, { ...options, headers });
  }
}

export default function QuickAddMedicine({ open, onClose, onSaved }) {
  const [name, setName] = useState("");
  const [stockUnit, setStockUnit] = useState("");
  const [quantity, setQuantity] = useState("");
  const [category, setCategory] = useState("");
  const [boxCount, setBoxCount] = useState("");
  const [categoryTouched, setCategoryTouched] = useState(false);
  const [optionsVisible, setOptionsVisible] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [selectedMedicine, setSelectedMedicine] = useState(null);
  const [existingBatch, setExistingBatch] = useState(null);
  const [lookingUpName, setLookingUpName] = useState(false);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const inputWrapperRef = useRef(null);
  // Packaging fields state for new medicines
  const [packagingFields, setPackagingFields] = useState({});

  const selectedCategory = MEDICINE_CATEGORIES.find((c) => c.id === category);
  const quantityLabel =
    stockUnit === "box" ? selectedCategory?.boxLabel || "Boxes" : selectedCategory?.looseLabel || "Units";
  const defaultPerBox = selectedCategory?.perBoxDefault;
  const perBoxField = selectedCategory?.perBoxField;
  const itemsPerBoxLabel = selectedCategory?.perBoxLabel || "Items per Box";

  const detectedPerBox = useMemo(() => {
    if (stockUnit !== "box") return "";
    if (selectedMedicine) {
      const val = deriveBoxCount(selectedMedicine, category);
      if (val) return String(val);
    }
    if (boxCount) return boxCount;
    if (defaultPerBox) return String(defaultPerBox);
    return "";
  }, [selectedMedicine, category, stockUnit, boxCount, defaultPerBox]);

  const packagingDetails = useMemo(() => {
    if (!selectedMedicine) return [];
    const med = selectedMedicine;
    const entries = [];
    Object.entries(PACKAGING_FIELD_LABELS).forEach(([field, label]) => {
      const value = med[field];
      if (value !== null && value !== undefined && value !== "") {
        entries.push({ label, value });
      }
    });
    return entries;
  }, [selectedMedicine]);

  useEffect(() => {
    if (!open) return;
    if (selectedMedicine) return;
    if (stockUnit !== "box") {
      setBoxCount("");
      return;
    }
    if (!boxCount && defaultPerBox) {
      setBoxCount(String(defaultPerBox));
    }
  }, [open, stockUnit, selectedMedicine, defaultPerBox, boxCount]);

  // Initialize packaging fields with defaults when category changes
  useEffect(() => {
    if (!open || selectedMedicine || !category) return;
    const defaults = {};
    if (category === "tablet") {
      defaults.tablets_per_strip = "10";
      defaults.strips_per_box = "10";
    } else if (category === "capsule") {
      defaults.capsules_per_strip = "10";
      defaults.strips_per_box = "10";
    } else if (category === "syrup" || category === "drops") {
      defaults.ml_per_bottle = "100";
      defaults.bottles_per_box = "12";
    } else if (category === "injection") {
      defaults.ml_per_vial = "5";
      defaults.vials_per_box = "10";
    } else if (category === "ointment" || category === "gel") {
      defaults.grams_per_tube = "30";
      defaults.tubes_per_box = "10";
    } else if (category === "inhaler") {
      defaults.doses_per_inhaler = "100";
      defaults.inhalers_per_box = "1";
    } else if (category === "powder") {
      defaults.grams_per_sachet = "10";
      defaults.sachets_per_box = "10";
    } else if (category === "soap") {
      defaults.grams_per_bar = "100";
      defaults.bars_per_box = "3";
    } else {
      defaults.pieces_per_pack = "1";
      defaults.packs_per_box = "10";
    }
    setPackagingFields(prev => {
      // Only set defaults if field is not already set
      const updated = { ...prev };
      Object.entries(defaults).forEach(([key, value]) => {
        if (!updated[key]) {
          updated[key] = value;
        }
      });
      return updated;
    });
  }, [category, open, selectedMedicine]);

  useEffect(() => {
    if (!open) return;
    const query = name.trim();
    if (query.length < 2) {
      setSuggestions([]);
      setLookingUpName(false);
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLookingUpName(true);
      try {
        const res = await fetchWithAuthRetry(`${MEDICINE_SEARCH_API}${encodeURIComponent(query)}`, {
          signal: controller.signal,
        });
        if (!res.ok) throw new Error(`Lookup failed (${res.status})`);
        const data = await res.json().catch(() => null);
        const list = Array.isArray(data) ? data : data?.results || data?.items || [];
        // Deduplicate by product_id - same medicine can have multiple batches
        const seenProducts = new Set();
        const uniqueList = list.filter(item => {
          const productId = item.product_id || item.id;
          if (!productId || seenProducts.has(productId)) {
            return false;
          }
          seenProducts.add(productId);
          return true;
        });
        
        // Format suggestions to match expected structure
        // Global medicines API returns items with product_id, medicine_name, category, etc.
        const formatted = uniqueList.slice(0, 8).map(item => {
          // Extract product info from global inventory response
          const productId = item.product_id || item.id;
          const medicineName = item.medicine_name || item.name || '';
          const categoryName = item.category || '';
          
          // Map category name to frontend category ID
          const categoryMapping = {
            'Tablet': 'tablet',
            'Capsule': 'capsule',
            'Syrup/Suspension': 'syrup',
            'Injection/Vial': 'injection',
            'Ointment/Cream': 'ointment',
            'Drops (Eye/Ear/Nasal)': 'drops',
            'Inhaler': 'inhaler',
            'Powder/Sachet': 'powder',
            'Gel': 'gel',
            'Spray': 'spray',
            'Lotion/Solution': 'lotion',
            'Shampoo': 'shampoo',
            'Soap/Bar': 'soap',
            'Bandage/Dressing': 'bandage',
            'Mask (Surgical/N95)': 'mask',
            'Gloves': 'gloves',
            'Cotton/Gauze': 'cotton',
            'Hand Sanitizer': 'sanitizer',
            'Thermometer': 'thermometer',
            'Supplement/Vitamin': 'supplement',
            'Other/Miscellaneous': 'other',
          };
          
          const frontendCategoryId = categoryMapping[categoryName] || normalizeCategoryId(categoryName);
          
          return {
            medicine: {
              id: productId,
              name: medicineName,
              category: frontendCategoryId, // Store frontend category ID
              categoryName: categoryName, // Store original category name for display
              categoryId: item.category_id || null, // Store database category ID if available
              strength: '', // Will be fetched from product detail if needed
              rack_location: null, // Will be fetched from product detail if needed
              gst_percent: '0',
              mrp: item.mrp || '0',
              form: null,
              base_uom: null,
              selling_uom: null,
              // Packaging fields will be fetched from product detail when selected
              tablets_per_strip: null,
              capsules_per_strip: null,
              strips_per_box: null,
              ml_per_bottle: null,
              bottles_per_box: null,
              ml_per_vial: null,
              vials_per_box: null,
              grams_per_tube: null,
              tubes_per_box: null,
              doses_per_inhaler: null,
              inhalers_per_box: null,
              grams_per_sachet: null,
              sachets_per_box: null,
              grams_per_bar: null,
              bars_per_box: null,
              pieces_per_pack: null,
              packs_per_box: null,
              pairs_per_pack: null,
              grams_per_pack: null,
              units_per_pack: null,
            }
          };
        });
        setSuggestions(formatted);
        setOptionsVisible(true);
      } catch (err) {
        if (err.name === "AbortError") return;
        console.warn("Medicine lookup failed", err);
      } finally {
        setLookingUpName(false);
      }
    }, 350);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [name, open]);

  useEffect(() => {
    if (!open) return;
    const handler = (event) => {
      if (!inputWrapperRef.current) return;
      if (!inputWrapperRef.current.contains(event.target)) {
        setOptionsVisible(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const handleCategoryChange = (e) => {
    if (selectedMedicine) return;
    setCategory(e.target.value);
    setCategoryTouched(true);
  };

  const handleStockUnitChange = (e) => {
    setStockUnit(e.target.value);
    if (selectedMedicine) {
      setBoxCount("");
    }
  };

  const handleSuggestionSelect = async (item) => {
    const med = item?.medicine || item;
    if (!med) return;
    const medName = med.name || med.medicine_name || "";
    setName(medName);
    // Extract category - med.category is already the frontend category ID from the formatted response
    const detectedCategory = med.category || normalizeCategoryId(med.categoryName || med.categoryId);
    setCategory(detectedCategory);
    setSelectedMedicine(med);
    setCategoryTouched(false);
    setOptionsVisible(false);
    
    // Fetch product details to get packaging fields and other info
    if (med.id) {
      try {
        // Fetch product details from catalog API
        const productRes = await fetchWithAuthRetry(`${API_BASE}/api/v1/catalog/products/${med.id}/`);
        if (productRes.ok) {
          const productData = await productRes.json().catch(() => null);
          if (productData) {
            // Update selectedMedicine with full product details
            setSelectedMedicine({
              ...med,
              ...productData,
              category: med.category, // Keep frontend category ID
            });
          }
        }
        
        // Fetch existing batches for this medicine
        const batchesRes = await fetchWithAuthRetry(`${BATCHES_API}?product_id=${med.id}&status=ACTIVE`);
        if (batchesRes.ok) {
          const batchesData = await batchesRes.json().catch(() => []);
          const batches = Array.isArray(batchesData) ? batchesData : [];
          // Use the first active batch if available
          if (batches.length > 0) {
            setExistingBatch(batches[0]);
          } else {
            setExistingBatch(null);
          }
        }
      } catch (err) {
        console.warn("Failed to fetch product details or batches", err);
        setExistingBatch(null);
      }
    }
  };

  const handleClose = () => {
    setName("");
    setStockUnit("");
    setQuantity("");
    setCategory("");
    setBoxCount("");
    setCategoryTouched(false);
    setSuggestions([]);
    setSelectedMedicine(null);
    setExistingBatch(null);
    setPackagingFields({});
    setOptionsVisible(false);
    setLookingUpName(false);
    setErrors({});
    setServerError("");
    if (onClose) onClose();
  };

  const validate = () => {
    const localErrors = {};
    if (!name.trim()) localErrors.name = "Medicine name is required";
    if (!category) localErrors.category = "Category is required";
    if (!stockUnit) localErrors.stock_unit = "Stock unit type is required";
    if (quantity === "" || quantity === null || quantity === undefined) {
      localErrors.quantity = "Quantity is required";
    } else {
      const qtyNum = Number(quantity);
      if (!Number.isFinite(qtyNum)) {
        localErrors.quantity = "Quantity must be a valid number";
      }
    }
    // Don't require boxCount if medicine is selected (it will use existing packaging fields)
    if (stockUnit === "box" && !selectedMedicine && !boxCount && !detectedPerBox) {
      localErrors.box_count = "Items per box is required";
    }
    return localErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log("Quick Add: Submit handler called");
    setServerError("");
    setErrors({});

    const validationErrors = validate();
    console.log("Quick Add: Validation errors:", validationErrors);
    if (Object.keys(validationErrors).length) {
      setErrors(validationErrors);
      return;
    }

    const parsedBoxCount = Number(detectedPerBox || defaultPerBox || 0);
    const hasBoxCount = stockUnit === "box" && Number.isFinite(parsedBoxCount) && parsedBoxCount > 0;

    let medicinePayload;
    
    if (selectedMedicine) {
      // When medicine is selected, use existing medicine data
      const med = selectedMedicine;
      // med.category is already the frontend category ID (e.g., 'tablet', 'capsule')
      medicinePayload = {
        id: med.id,
        name: med.name || name.trim(),
        category: med.category || category, // Frontend category ID
        form: med.form?.id || med.form,
        strength: med.strength || med.dosage_strength || "",
        base_uom: med.base_uom?.id || med.base_uom,
        selling_uom: med.selling_uom?.id || med.selling_uom,
        rack_location: med.rack_location?.id || med.rack_location || 1,
        gst_percent: med.gst_percent || "0",
        mrp: med.mrp || "0",
        // Include all packaging fields from selected medicine - ensure they're numbers, not null
        tablets_per_strip: med.tablets_per_strip ? Number(med.tablets_per_strip) : undefined,
        capsules_per_strip: med.capsules_per_strip ? Number(med.capsules_per_strip) : undefined,
        strips_per_box: med.strips_per_box ? Number(med.strips_per_box) : undefined,
        ml_per_bottle: med.ml_per_bottle ? Number(med.ml_per_bottle) : undefined,
        bottles_per_box: med.bottles_per_box ? Number(med.bottles_per_box) : undefined,
        ml_per_vial: med.ml_per_vial ? Number(med.ml_per_vial) : undefined,
        vials_per_box: med.vials_per_box ? Number(med.vials_per_box) : undefined,
        grams_per_tube: med.grams_per_tube ? Number(med.grams_per_tube) : undefined,
        tubes_per_box: med.tubes_per_box ? Number(med.tubes_per_box) : undefined,
        doses_per_inhaler: med.doses_per_inhaler ? Number(med.doses_per_inhaler) : undefined,
        inhalers_per_box: med.inhalers_per_box ? Number(med.inhalers_per_box) : undefined,
        grams_per_sachet: med.grams_per_sachet ? Number(med.grams_per_sachet) : undefined,
        sachets_per_box: med.sachets_per_box ? Number(med.sachets_per_box) : undefined,
        grams_per_bar: med.grams_per_bar ? Number(med.grams_per_bar) : undefined,
        bars_per_box: med.bars_per_box ? Number(med.bars_per_box) : undefined,
        pieces_per_pack: med.pieces_per_pack ? Number(med.pieces_per_pack) : undefined,
        packs_per_box: med.packs_per_box ? Number(med.packs_per_box) : undefined,
        pairs_per_pack: med.pairs_per_pack ? Number(med.pairs_per_pack) : undefined,
        grams_per_pack: med.grams_per_pack ? Number(med.grams_per_pack) : undefined,
        units_per_pack: med.units_per_pack ? Number(med.units_per_pack) : undefined,
      };
    } else {
      // When medicine is new, create with defaults
      medicinePayload = {
        name: name.trim(),
        category: category,
        strength: "",
        rack_location: 1, // Default rack - adjust as needed
        gst_percent: "0",
        mrp: "0",
        form: 1, // Default form - adjust as needed
        base_uom: 5, // Default TAB UOM - adjust as needed
        selling_uom: 7, // Default STRIP UOM - adjust as needed
      };

      // Set packaging fields - use values from form state, fallback to defaults
      const getPackagingValue = (key, defaultValue) => {
        const formValue = packagingFields[key];
        if (formValue !== undefined && formValue !== null && formValue !== '') {
          const num = Number(formValue);
          return Number.isFinite(num) && num > 0 ? num : defaultValue;
        }
        return defaultValue;
      };
      
      // Ensure packaging fields are always numbers, never null/undefined
      if (category === "tablet") {
        medicinePayload.tablets_per_strip = getPackagingValue('tablets_per_strip', 10);
        medicinePayload.strips_per_box = getPackagingValue('strips_per_box', 10);
      } else if (category === "capsule") {
        medicinePayload.capsules_per_strip = getPackagingValue('capsules_per_strip', 10);
        medicinePayload.strips_per_box = getPackagingValue('strips_per_box', 10);
      } else if (category === "syrup" || category === "drops") {
        medicinePayload.ml_per_bottle = getPackagingValue('ml_per_bottle', 100);
        medicinePayload.bottles_per_box = getPackagingValue('bottles_per_box', 12);
      } else if (category === "injection") {
        medicinePayload.ml_per_vial = getPackagingValue('ml_per_vial', 5);
        medicinePayload.vials_per_box = getPackagingValue('vials_per_box', 10);
      } else if (category === "ointment" || category === "gel") {
        medicinePayload.grams_per_tube = getPackagingValue('grams_per_tube', 30);
        medicinePayload.tubes_per_box = getPackagingValue('tubes_per_box', 10);
      } else if (category === "inhaler") {
        medicinePayload.doses_per_inhaler = getPackagingValue('doses_per_inhaler', 100);
        medicinePayload.inhalers_per_box = getPackagingValue('inhalers_per_box', 1);
      } else if (category === "powder") {
        medicinePayload.grams_per_sachet = getPackagingValue('grams_per_sachet', 10);
        medicinePayload.sachets_per_box = getPackagingValue('sachets_per_box', 10);
      } else if (category === "soap") {
        medicinePayload.grams_per_bar = getPackagingValue('grams_per_bar', 100);
        medicinePayload.bars_per_box = getPackagingValue('bars_per_box', 3);
      } else {
        medicinePayload.pieces_per_pack = getPackagingValue('pieces_per_pack', 1);
        medicinePayload.packs_per_box = getPackagingValue('packs_per_box', 10);
      }
      
      // Log packaging fields for debugging
      console.log("Quick Add: Packaging fields for new medicine:", {
        category,
        stockUnit,
        quantity,
        tablets_per_strip: medicinePayload.tablets_per_strip,
        strips_per_box: medicinePayload.strips_per_box,
        capsules_per_strip: medicinePayload.capsules_per_strip,
        ml_per_bottle: medicinePayload.ml_per_bottle,
        bottles_per_box: medicinePayload.bottles_per_box,
      });

      if (hasBoxCount && perBoxField) {
        medicinePayload[perBoxField] = parsedBoxCount;
      }
    }

    // Clean up payload - remove undefined values
    const cleanPayload = (obj) => {
      const cleaned = {};
      for (const [key, value] of Object.entries(obj)) {
        if (value !== undefined && value !== null) {
          if (typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
            const cleanedObj = cleanPayload(value);
            if (Object.keys(cleanedObj).length > 0) {
              cleaned[key] = cleanedObj;
            }
          } else {
            cleaned[key] = value;
          }
        }
      }
      return cleaned;
    };

    // For existing medicine, use existing batch if available, otherwise create new batch
    const batchPayload = {
      batch_number: selectedMedicine ? `QUICK-${Date.now()}` : `QUICK-${Date.now()}`,
      quantity: Number(quantity), // This can be positive (add) or negative (reduce)
      stock_unit: stockUnit, // "box" or "loose"
      expiry_date: new Date(new Date().setFullYear(new Date().getFullYear() + 2)).toISOString().split('T')[0],
      purchase_price: "0",
    };
    
    // Note: The backend will calculate the base quantity (total tablets/units) from:
    // - quantity (e.g., 10 boxes or 50 strips)
    // - stock_unit ("box" or "loose")
    // - packaging fields (tablets_per_strip, strips_per_box, etc.)
    // For example: 10 boxes × 10 strips/box × 10 tablets/strip = 1000 tablets

    // Ensure packaging fields are always included (don't remove them in cleanPayload)
    // Create payload with medicine and batch
    const finalMedicinePayload = { ...medicinePayload };
    // Remove undefined but keep null and 0 values for packaging fields
    Object.keys(finalMedicinePayload).forEach(key => {
      if (finalMedicinePayload[key] === undefined) {
        delete finalMedicinePayload[key];
      }
    });
    
    const payload = {
      location_id: Number(DEFAULT_LOCATION_ID),
      medicine: finalMedicinePayload,
      batch: cleanPayload(batchPayload),
    };

    console.log("Quick Add Payload:", JSON.stringify(payload, null, 2));
    console.log("Quick Add: Selected Medicine:", selectedMedicine);
    console.log("Quick Add: Stock Unit:", stockUnit, "Quantity:", quantity);
    console.log("Quick Add: Medicine Payload Packaging Fields:", {
      tablets_per_strip: payload.medicine?.tablets_per_strip,
      strips_per_box: payload.medicine?.strips_per_box,
      capsules_per_strip: payload.medicine?.capsules_per_strip,
      ml_per_bottle: payload.medicine?.ml_per_bottle,
      bottles_per_box: payload.medicine?.bottles_per_box,
    });
    console.log("Quick Add: Will calculate stock as:", 
      stockUnit === "box" 
        ? `${quantity} boxes × packaging fields = total base units`
        : `${quantity} loose units × packaging fields = total base units`
    );

    setSubmitting(true);
    try {
      // If medicine is selected and has an existing batch, update stock instead of creating new batch
      if (selectedMedicine && existingBatch) {
        console.log("Quick Add: Updating existing batch", existingBatch.id);
        
        // Use add-medicine endpoint but with existing batch ID to update stock
        // The backend will handle the conversion and create movement for the difference
        // We need to calculate what the new total quantity should be
        // But actually, it's easier to use the adjust-stock endpoint which just adds/reduces
        
        // First, calculate base quantity change using the same logic backend uses
        // We'll use add-medicine to get the conversion, then use adjust-stock
        // Actually simpler: use PUT to update batch, backend will calculate difference
        
        // Fetch current batch details
        try {
          const batchDetailRes = await fetchWithAuthRetry(MEDICINE_DETAIL_API(existingBatch.id));
          if (!batchDetailRes.ok) {
            throw new Error("Failed to fetch batch details");
          }
          const batchDetail = await batchDetailRes.json().catch(() => null);
          
          if (batchDetail && batchDetail.batch) {
          // Calculate new quantity: add the entered quantity to CURRENT stock, not initial quantity
          // Get current stock on hand in base units
          const currentStockBase = parseFloat(batchDetail.inventory?.stock_on_hand_base || batchDetail.batch.current_stock_base || 0);
          const currentStockUnit = batchDetail.batch.stock_unit || "loose";
          const qtyChange = Number(quantity);
          
          // Calculate current quantity in UI units from current stock base
          // This ensures we're adding to actual stock, not initial quantity
          let currentQtyUI = 0;
          if (currentStockBase > 0 && stockUnit === currentStockUnit) {
            // Try to convert current stock base back to UI units
            // Get packaging info from selected medicine, form state, or batch detail
            const med = selectedMedicine || {};
            let factor = 1;
            
            if (stockUnit === "box") {
              // For box: base = quantity * tablets_per_strip * strips_per_box
              const tabletsPerStrip = med.tablets_per_strip || med.capsules_per_strip || packagingFields.tablets_per_strip || packagingFields.capsules_per_strip || 1;
              const stripsPerBox = med.strips_per_box || packagingFields.strips_per_box || 1;
              factor = Number(tabletsPerStrip) * Number(stripsPerBox);
            } else if (stockUnit === "loose") {
              // For loose: base = quantity * tablets_per_strip (or similar per-unit field)
              // Check category to determine the right field
              const cat = category || med.category;
              if (cat === "tablet" || cat === "capsule" || cat === "supplement") {
                factor = med.tablets_per_strip || med.capsules_per_strip || packagingFields.tablets_per_strip || packagingFields.capsules_per_strip || 1;
              } else if (cat === "syrup" || cat === "drops" || cat === "spray" || cat === "lotion" || cat === "shampoo" || cat === "sanitizer") {
                factor = med.ml_per_bottle || packagingFields.ml_per_bottle || 1;
              } else if (cat === "injection") {
                factor = med.ml_per_vial || packagingFields.ml_per_vial || 1;
              } else if (cat === "ointment" || cat === "gel") {
                factor = med.grams_per_tube || packagingFields.grams_per_tube || 1;
              } else if (cat === "powder") {
                factor = med.grams_per_sachet || packagingFields.grams_per_sachet || 1;
              } else if (cat === "soap") {
                factor = med.grams_per_bar || packagingFields.grams_per_bar || 1;
              } else if (cat === "inhaler") {
                factor = med.doses_per_inhaler || packagingFields.doses_per_inhaler || 1;
              } else {
                // Default fallback
                factor = med.pieces_per_pack || packagingFields.pieces_per_pack || 1;
              }
              factor = Number(factor) || 1;
            }
            
            if (factor > 0 && factor !== 1) {
              currentQtyUI = currentStockBase / factor;
            } else if (factor === 1) {
              // If factor is 1, current stock base is already in UI units
              currentQtyUI = currentStockBase;
            }
          }
          
          // If we couldn't calculate current quantity or got invalid result, 
          // we need to be careful - don't use initial quantity as it might be wrong
          // Instead, if conversion failed, we'll let backend handle it by sending just the change
          if (!Number.isFinite(currentQtyUI) || currentQtyUI < 0) {
            console.warn("Quick Add: Could not convert current stock base to UI units, will let backend handle calculation");
            // If conversion fails and stock units match, send just the change amount
            // Backend will add it to current stock
            if (stockUnit === currentStockUnit) {
              // We can't calculate properly, so send a special flag or let backend calculate
              // For now, try to use a reasonable estimate
              currentQtyUI = 0; // Will trigger fallback logic
            }
          }
          
          // Only use initial quantity as last resort if current stock is 0
          if ((currentQtyUI === 0 || !Number.isFinite(currentQtyUI)) && currentStockBase === 0) {
            currentQtyUI = parseFloat(batchDetail.batch.quantity) || 0;
          }
          
          // Always add the entered quantity to current quantity when stock units match
          // For loose stock, we need to ensure we're adding, not replacing
          let newQty;
          if (stockUnit === currentStockUnit) {
            // Same stock unit: add quantities directly
            // Use calculated currentQtyUI if available, otherwise use initial quantity as fallback
            if (currentQtyUI > 0 && Number.isFinite(currentQtyUI)) {
              newQty = currentQtyUI + qtyChange;
            } else {
              // Fallback: use initial quantity (might not be accurate if stock was sold)
              // But backend will use current_stock_base to calculate difference correctly
              const initialQty = parseFloat(batchDetail.batch.quantity) || 0;
              newQty = initialQty + qtyChange;
            }
            console.log("Quick Add: Current stock calculation", {
              currentStockBase,
              currentQtyUI,
              initialQty: parseFloat(batchDetail.batch.quantity) || 0,
              qtyChange,
              newQty,
              stockUnit,
              currentStockUnit
            });
          } else {
            // Different stock unit: treat entered quantity as addition
            // Backend will calculate from current stock on hand
            newQty = qtyChange;
          }
          
          const updatePayload = {
            location_id: Number(DEFAULT_LOCATION_ID),
            medicine: cleanPayload(medicinePayload),
            batch: {
              id: existingBatch.id,
              batch_number: batchDetail.batch.batch_number,
              quantity: newQty,
              stock_unit: stockUnit,
              mfg_date: batchDetail.batch.mfg_date,
              expiry_date: batchDetail.batch.expiry_date,
              purchase_price: batchDetail.batch.purchase_price || "0",
            },
          };
          
          console.log("Quick Add: Updating batch with payload:", JSON.stringify(updatePayload, null, 2));
          
          const updateResponse = await fetchWithAuthRetry(MEDICINE_DETAIL_API(existingBatch.id), {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(updatePayload),
          });
          
          const updateBody = await updateResponse.json().catch(() => null);
          if (!updateResponse.ok) {
            const errorMsg = updateBody?.detail || JSON.stringify(updateBody);
            setServerError(errorMsg);
            setSubmitting(false);
            return;
          }
          
            console.log("Quick Add: Success! Stock updated via PUT.");
            dispatchInventoryRefresh();
            if (onSaved) onSaved(updateBody);
            handleClose();
            setSubmitting(false);
            return;
          }
        } catch (err) {
          console.error("Quick Add: Error updating existing batch", err);
          setServerError(err.message || "Failed to update batch");
          setSubmitting(false);
          return;
        }
      }
      
      // Check if medicine already exists by searching for it first
      // This prevents creating duplicate medicines when user types name manually
      if (!selectedMedicine && name.trim()) {
        console.log("Quick Add: Checking if medicine already exists...");
        try {
          const searchRes = await fetchWithAuthRetry(`${GLOBAL_MEDICINES_API}${encodeURIComponent(name.trim())}`);
          if (searchRes.ok) {
            const searchData = await searchRes.json().catch(() => null);
            const list = Array.isArray(searchData) ? searchData : searchData?.results || searchData?.items || [];
            // Find exact match by name
            const existingMed = list.find(item => 
              item.medicine_name?.toLowerCase() === name.trim().toLowerCase()
            );
            
            if (existingMed) {
              console.log("Quick Add: Found existing medicine, will update stock instead");
              // Set selectedMedicine to trigger update flow
              // We'll use the existing medicine's ID and fetch full details
              const productId = existingMed.product_id;
              if (productId) {
                // Use catalog API to get product details
                const productRes = await fetchWithAuthRetry(`${API_BASE}/api/v1/catalog/products/${productId}/`);
                if (productRes.ok) {
                  const productData = await productRes.json().catch(() => null);
                  // Catalog API returns product directly, not wrapped in medicine
                  const med = productData || {};
                  if (med.id) {
                    // Fetch batches to find active one
                    const batchesRes = await fetchWithAuthRetry(`${BATCHES_API}?product_id=${productId}&status=ACTIVE`);
                    if (batchesRes.ok) {
                      const batchesData = await batchesRes.json().catch(() => null);
                      const batches = Array.isArray(batchesData) ? batchesData : batchesData?.results || batchesData?.items || [];
                      const firstBatch = batches.length > 0 ? batches[0] : null;
                      
                      if (firstBatch) {
                        // Update existing batch - map category from object to string ID
                        const categoryName = med.category?.name || med.category;
                        const categoryId = categoryName ? categoryName.toLowerCase() : category;
                        const updateMedPayload = {
                          id: med.id,
                          name: med.name,
                          category: categoryId,
                          form: med.medicine_form?.id || med.form?.id || med.form,
                          strength: med.dosage_strength || med.strength || "",
                          base_uom: med.base_uom?.id || med.base_uom,
                          selling_uom: med.selling_uom?.id || med.selling_uom,
                          rack_location: med.rack_location?.id || med.rack_location || 1,
                          gst_percent: med.gst_percent || "0",
                          mrp: med.mrp || "0",
                          tablets_per_strip: med.tablets_per_strip ? Number(med.tablets_per_strip) : undefined,
                          capsules_per_strip: med.capsules_per_strip ? Number(med.capsules_per_strip) : undefined,
                          strips_per_box: med.strips_per_box ? Number(med.strips_per_box) : undefined,
                          ml_per_bottle: med.ml_per_bottle ? Number(med.ml_per_bottle) : undefined,
                          bottles_per_box: med.bottles_per_box ? Number(med.bottles_per_box) : undefined,
                          ml_per_vial: med.ml_per_vial ? Number(med.ml_per_vial) : undefined,
                          vials_per_box: med.vials_per_box ? Number(med.vials_per_box) : undefined,
                          grams_per_tube: med.grams_per_tube ? Number(med.grams_per_tube) : undefined,
                          tubes_per_box: med.tubes_per_box ? Number(med.tubes_per_box) : undefined,
                          doses_per_inhaler: med.doses_per_inhaler ? Number(med.doses_per_inhaler) : undefined,
                          inhalers_per_box: med.inhalers_per_box ? Number(med.inhalers_per_box) : undefined,
                          grams_per_sachet: med.grams_per_sachet ? Number(med.grams_per_sachet) : undefined,
                          sachets_per_box: med.sachets_per_box ? Number(med.sachets_per_box) : undefined,
                          grams_per_bar: med.grams_per_bar ? Number(med.grams_per_bar) : undefined,
                          bars_per_box: med.bars_per_box ? Number(med.bars_per_box) : undefined,
                          pieces_per_pack: med.pieces_per_pack ? Number(med.pieces_per_pack) : undefined,
                          packs_per_box: med.packs_per_box ? Number(med.packs_per_box) : undefined,
                          pairs_per_pack: med.pairs_per_pack ? Number(med.pairs_per_pack) : undefined,
                          grams_per_pack: med.grams_per_pack ? Number(med.grams_per_pack) : undefined,
                          units_per_pack: med.units_per_pack ? Number(med.units_per_pack) : undefined,
                        };
                        
                        // Use same update logic as selectedMedicine flow
                        const tempPayload = {
                          location_id: Number(DEFAULT_LOCATION_ID),
                          medicine: cleanPayload(updateMedPayload),
                          batch: {
                            batch_number: `TEMP-CALC-${Date.now()}`,
                            quantity: Math.abs(Number(quantity)),
                            stock_unit: stockUnit,
                            expiry_date: new Date(new Date().setFullYear(new Date().getFullYear() + 2)).toISOString().split('T')[0],
                            purchase_price: "0",
                          },
                        };
                        
                        const tempResponse = await fetchWithAuthRetry(ADD_MEDICINE_API, {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify(tempPayload),
                        });
                        
                        let baseQtyChange = 0;
                        if (tempResponse.ok) {
                          const tempBody = await tempResponse.json().catch(() => null);
                          if (tempBody && tempBody.batch && tempBody.batch.base_quantity) {
                            baseQtyChange = parseFloat(tempBody.batch.base_quantity) || 0;
                            if (Number(quantity) < 0) {
                              baseQtyChange = -baseQtyChange;
                            }
                          }
                        }
                        
                        // Use PUT endpoint to update the batch
                        const currentQty = parseFloat(firstBatch.quantity) || 0;
                        const currentStockUnit = firstBatch.stock_unit || "loose";
                        const qtyChange = Number(quantity);
                        // Always add the entered quantity to current quantity when stock units match
                        let newQty;
                        if (stockUnit === currentStockUnit) {
                          // Same stock unit: add quantities
                          newQty = currentQty + qtyChange;
                        } else {
                          // Different stock unit: treat as new quantity (user is changing stock unit type)
                          newQty = qtyChange;
                        }
                        
                        const updatePayload = {
                          location_id: Number(DEFAULT_LOCATION_ID),
                          medicine: cleanPayload(updateMedPayload),
                          batch: {
                            id: firstBatch.id,
                            batch_number: firstBatch.batch_number,
                            quantity: newQty,
                            stock_unit: stockUnit,
                            mfg_date: firstBatch.mfg_date,
                            expiry_date: firstBatch.expiry_date,
                            purchase_price: firstBatch.purchase_price || "0",
                          },
                        };
                        
                        const updateResponse = await fetchWithAuthRetry(`${API_BASE}/api/v1/inventory/medicines/${firstBatch.id}/`, {
                          method: "PUT",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify(updatePayload),
                        });
                        
                        const updateBody = await updateResponse.json().catch(() => null);
                        if (updateResponse.ok) {
                          console.log("Quick Add: Success! Stock updated in existing medicine.");
                          dispatchInventoryRefresh();
                          if (onSaved) onSaved(updateBody);
                          handleClose();
                          setSubmitting(false);
                          return;
                        } else {
                          const errorMsg = updateBody?.detail || JSON.stringify(updateBody);
                          setServerError(errorMsg);
                          setSubmitting(false);
                          return;
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        } catch (err) {
          console.warn("Quick Add: Error checking for existing medicine, proceeding with new medicine", err);
        }
      }
      
      // If no existing medicine found, create new batch
      console.log("Quick Add: Creating new medicine and batch");
      const response = await fetchWithAuthRetry(ADD_MEDICINE_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await response.json().catch(() => null);
      
      console.log("Quick Add Response:", response.status, body);
      
      if (!response.ok) {
        if (body?.detail) {
          setServerError(body.detail);
        } else if (body && typeof body === "object") {
          const errorMessages = Object.entries(body)
            .flatMap(([key, value]) => {
              if (Array.isArray(value)) return value.map(v => `${key}: ${v}`);
              if (typeof value === "string") return [`${key}: ${value}`];
              if (typeof value === "object") {
                return Object.entries(value).flatMap(([k, v]) => {
                  if (Array.isArray(v)) return v.map(vv => `${key}.${k}: ${vv}`);
                  return [`${key}.${k}: ${v}`];
                });
              }
              return [];
            })
            .join("; ");
          setServerError(errorMessages || `Save failed (${response.status})`);
        } else {
          setServerError(`Save failed (${response.status})`);
        }
        setSubmitting(false);
        return;
      }

      console.log("Quick Add: Success! New batch created and stock added.");
      dispatchInventoryRefresh();
      if (onSaved) onSaved(body);
      handleClose();
      setSubmitting(false);
    } catch (err) {
      console.error("Quick add medicine failed", err);
      const errorMsg = err.message || "Please try again.";
      // Handle ReferenceError for existingBatch
      if (err instanceof ReferenceError && err.message.includes("existingBatch")) {
        setServerError("Error: Please refresh and try again.");
      } else if (errorMsg.includes("existingBatch")) {
        setServerError(`Error: ${errorMsg}. Please try again.`);
      } else {
        setServerError(`Network error: ${errorMsg}`);
      }
      setSubmitting(false);
    }
  };

  const renderFieldError = (field) => {
    const message = errors[field];
    if (!message) return null;
    return <div className="err" style={{ color: '#dc2626', fontSize: '12px', marginTop: '4px' }}>{message}</div>;
  };

  if (!open) return null;

  return (
    <div className="drawer-backdrop" onClick={handleClose}>
      <div className="quick-add-modal" onClick={(e) => e.stopPropagation()}>
        <div className="quick-add-header">
          <h3>Quick Add Medicine</h3>
          <button className="close-btn" onClick={handleClose}>&times;</button>
        </div>

        {serverError && <div className="inv-error-banner">{serverError}</div>}

        <form onSubmit={handleSubmit}>
          <div className="field" ref={inputWrapperRef} style={{ position: "relative" }}>
            <label>Medicine Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (selectedMedicine) {
                  setSelectedMedicine(null);
                  setCategory("");
                }
              }}
              placeholder="Type to search existing medicines"
              className={errors.name ? "error" : ""}
              autoFocus
              onFocus={() => {
                if (suggestions.length) setOptionsVisible(true);
              }}
            />
            {renderFieldError("name")}
            {optionsVisible && (lookingUpName || suggestions.length > 0) && (
              <div className="quick-add-suggestions">
                {lookingUpName && <div className="quick-add-suggestion muted">Searching…</div>}
                {!lookingUpName && suggestions.length === 0 && (
                  <div className="quick-add-suggestion muted">No matches</div>
                )}
                {!lookingUpName &&
                  suggestions.map((item) => {
                    const med = item?.medicine || item;
                    const medName = med?.name || med?.medicine_name || "Unnamed";
                    // Use categoryName for display (the original category name from API)
                    const medCategory = med?.categoryName || med?.category || "";
                    const medStrength = med?.strength || "";
                    return (
                      <button
                        type="button"
                        key={`${med?.id || medName}-${medCategory}`}
                        className="quick-add-suggestion"
                        onClick={() => handleSuggestionSelect(item)}
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'flex-start',
                          padding: '12px',
                          width: '100%',
                          textAlign: 'left',
                          border: 'none',
                          borderBottom: '1px solid #e5e7eb',
                          background: 'white',
                          cursor: 'pointer',
                          transition: 'background-color 0.2s'
                        }}
                        onMouseEnter={(e) => e.target.style.backgroundColor = '#f9fafb'}
                        onMouseLeave={(e) => e.target.style.backgroundColor = 'white'}
                      >
                        <div style={{ fontWeight: '600', color: '#111827', marginBottom: '4px' }}>
                          {medName}
                        </div>
                        <div style={{ display: 'flex', gap: '12px', fontSize: '13px', color: '#6b7280' }}>
                          {medCategory && <span>📦 {medCategory}</span>}
                          {medStrength && <span>💊 {medStrength}</span>}
                        </div>
                      </button>
                    );
                  })}
              </div>
            )}
          </div>

          <div className="field">
            <label>Category *</label>
            <select
              value={category}
              onChange={handleCategoryChange}
              disabled={selectedMedicine}
              className={errors.category ? "error" : ""}
              style={selectedMedicine ? { backgroundColor: '#f3f4f6', cursor: 'not-allowed' } : {}}
            >
              <option value="">Select category</option>
              {MEDICINE_CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            {renderFieldError("category")}
            {selectedMedicine && category && (
              <div className="hint" style={{ fontSize: '12px', color: '#059669', marginTop: '4px' }}>
                ✓ Auto-detected from selected medicine
              </div>
            )}
          </div>

          <div className="field">
            <label>Stock Unit Type *</label>
            <select
              value={stockUnit}
              onChange={handleStockUnitChange}
              className={errors.stock_unit ? "error" : ""}
            >
              <option value="">Select stock unit type</option>
              <option value="box">Box (Packed)</option>
              <option value="loose">Loose (Individual Units)</option>
            </select>
            {renderFieldError("stock_unit")}
            {stockUnit && (
              <div className="hint" style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
                {stockUnit === 'box'
                  ? 'Box: Complete packages (e.g., 10 strips/box)'
                  : 'Loose: Individual units (e.g., single strips, bottles)'}
              </div>
            )}
          </div>

          {category && stockUnit && (() => {
            // Use the same structure as AddMedicine - find category with packagingFields
            const categoryConfig = [
              { id: 'tablet', packagingFields: [
                { key: 'tablets_per_strip', label: 'Tablets per Strip', alwaysShow: true },
                { key: 'strips_per_box', label: 'Strips per Box', showOnlyForBox: true }
              ]},
              { id: 'capsule', packagingFields: [
                { key: 'capsules_per_strip', label: 'Capsules per Strip', alwaysShow: true },
                { key: 'strips_per_box', label: 'Strips per Box', showOnlyForBox: true }
              ]},
              { id: 'syrup', packagingFields: [
                { key: 'ml_per_bottle', label: 'ML per Bottle', alwaysShow: true },
                { key: 'bottles_per_box', label: 'Bottles per Box', showOnlyForBox: true }
              ]},
              { id: 'injection', packagingFields: [
                { key: 'ml_per_vial', label: 'ML per Vial', alwaysShow: true },
                { key: 'vials_per_box', label: 'Vials per Box', showOnlyForBox: true }
              ]},
              { id: 'ointment', packagingFields: [
                { key: 'grams_per_tube', label: 'Grams per Tube', alwaysShow: true },
                { key: 'tubes_per_box', label: 'Tubes per Box', showOnlyForBox: true }
              ]},
              { id: 'drops', packagingFields: [
                { key: 'ml_per_bottle', label: 'ML per Bottle', alwaysShow: true },
                { key: 'bottles_per_box', label: 'Bottles per Box', showOnlyForBox: true }
              ]},
              { id: 'inhaler', packagingFields: [
                { key: 'doses_per_inhaler', label: 'Doses per Inhaler', alwaysShow: true },
                { key: 'inhalers_per_box', label: 'Inhalers per Box', showOnlyForBox: true }
              ]},
              { id: 'powder', packagingFields: [
                { key: 'grams_per_sachet', label: 'Grams per Sachet', alwaysShow: true },
                { key: 'sachets_per_box', label: 'Sachets per Box', showOnlyForBox: true }
              ]},
              { id: 'gel', packagingFields: [
                { key: 'grams_per_tube', label: 'Grams per Tube', alwaysShow: true },
                { key: 'tubes_per_box', label: 'Tubes per Box', showOnlyForBox: true }
              ]},
              { id: 'spray', packagingFields: [
                { key: 'ml_per_bottle', label: 'ML per Bottle', alwaysShow: true },
                { key: 'bottles_per_box', label: 'Bottles per Box', showOnlyForBox: true }
              ]},
              { id: 'lotion', packagingFields: [
                { key: 'ml_per_bottle', label: 'ML per Bottle', alwaysShow: true },
                { key: 'bottles_per_box', label: 'Bottles per Box', showOnlyForBox: true }
              ]},
              { id: 'shampoo', packagingFields: [
                { key: 'ml_per_bottle', label: 'ML per Bottle', alwaysShow: true },
                { key: 'bottles_per_box', label: 'Bottles per Box', showOnlyForBox: true }
              ]},
              { id: 'soap', packagingFields: [
                { key: 'grams_per_bar', label: 'Grams per Bar', alwaysShow: true },
                { key: 'bars_per_box', label: 'Bars per Box', showOnlyForBox: true }
              ]},
              { id: 'bandage', packagingFields: [
                { key: 'pieces_per_pack', label: 'Pieces per Pack', alwaysShow: true },
                { key: 'packs_per_box', label: 'Packs per Box', showOnlyForBox: true }
              ]},
              { id: 'mask', packagingFields: [
                { key: 'pieces_per_pack', label: 'Pieces per Pack', alwaysShow: true },
                { key: 'packs_per_box', label: 'Packs per Box', showOnlyForBox: true }
              ]},
              { id: 'gloves', packagingFields: [
                { key: 'pairs_per_pack', label: 'Pairs per Pack', alwaysShow: true },
                { key: 'packs_per_box', label: 'Packs per Box', showOnlyForBox: true }
              ]},
              { id: 'cotton', packagingFields: [
                { key: 'grams_per_pack', label: 'Grams per Pack', alwaysShow: true },
                { key: 'packs_per_box', label: 'Packs per Box', showOnlyForBox: true }
              ]},
              { id: 'sanitizer', packagingFields: [
                { key: 'ml_per_bottle', label: 'ML per Bottle', alwaysShow: true },
                { key: 'bottles_per_box', label: 'Bottles per Box', showOnlyForBox: true }
              ]},
              { id: 'thermometer', packagingFields: [
                { key: 'pieces_per_pack', label: 'Pieces per Pack', alwaysShow: true },
                { key: 'packs_per_box', label: 'Packs per Box', showOnlyForBox: true }
              ]},
              { id: 'supplement', packagingFields: [
                { key: 'tablets_per_strip', label: 'Tablets per Strip', alwaysShow: true },
                { key: 'strips_per_box', label: 'Strips per Box', showOnlyForBox: true }
              ]},
              { id: 'other', packagingFields: [
                { key: 'units_per_pack', label: 'Units per Pack', alwaysShow: true },
                { key: 'packs_per_box', label: 'Packs per Box', showOnlyForBox: true }
              ]},
            ].find(c => c.id === category);
            
            if (!categoryConfig) return null;
            
            const relevantFields = categoryConfig.packagingFields.filter(f => 
              f.alwaysShow || (f.showOnlyForBox && stockUnit === 'box')
            );
            
            if (relevantFields.length === 0) return null;
            
            return relevantFields.map(field => {
              const value = selectedMedicine ? selectedMedicine[field.key] : (packagingFields[field.key] || '');
              const displayValue = value !== null && value !== undefined && value !== '' 
                ? String(value) 
                : '';
              
              return (
                <div className="field" key={field.key}>
                  <label>{field.label} {selectedMedicine ? '' : '*'}</label>
                  <input
                    type="number"
                    value={displayValue}
                    readOnly={selectedMedicine}
                    disabled={selectedMedicine}
                    onChange={(e) => {
                      if (!selectedMedicine) {
                        setPackagingFields(prev => ({
                          ...prev,
                          [field.key]: e.target.value
                        }));
                      }
                    }}
                    style={selectedMedicine ? {
                      backgroundColor: '#f3f4f6',
                      cursor: 'not-allowed',
                      color: '#374151',
                      fontWeight: '500'
                    } : {}}
                    placeholder={field.placeholder || ''}
                  />
                  {selectedMedicine && value && (
                    <div className="hint" style={{ fontSize: '12px', color: '#059669', marginTop: '4px' }}>
                      ✓ Auto-detected from selected medicine
                    </div>
                  )}
                </div>
              );
            });
          })()}

          <div className="field">
            <label>Quantity ({quantityLabel}) *</label>
            <input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder={stockUnit === 'box' ? 'e.g., 10, 20 (use negative to reduce stock)' : 'e.g., 100, 50 (use negative to reduce stock)'}
              className={errors.quantity ? "error" : ""}
            />
            {renderFieldError("quantity")}
            <div className="hint" style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
              {stockUnit === 'box' 
                ? 'Enter positive number to add stock, negative to reduce stock'
                : 'Enter positive number to add stock, negative to reduce stock'}
            </div>
          </div>

          <div className="quick-add-actions">
            <button type="button" className="btn-secondary" onClick={handleClose}>
              Cancel
            </button>
            <button 
              type="submit" 
              className="btn-primary" 
              disabled={submitting}
              onClick={(e) => {
                // Fallback: ensure form submission works
                if (!e.defaultPrevented) {
                  const form = e.target.closest('form');
                  if (form && !form.checkValidity()) {
                    form.reportValidity();
                  }
                }
              }}
            >
              {submitting ? "Adding..." : "Add Medicine"}
            </button>
          </div>
        </form>

        <div className="quick-add-note">
          <small>
            💡 Note: Default values will be used for other fields. You can edit them later for complete details.
          </small>
        </div>
      </div>
    </div>
  );
}
