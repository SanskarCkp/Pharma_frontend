import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import "./inventory.css";
import { authFetch } from "../../api/http";
import { apiUrl } from "../../api/base";
import { getDefaultLocationId } from "../../config/location";

const API_MEDICINE_DETAIL = (id) => apiUrl(`inventory/medicines/${id}/`);

export default function MedicineDetailPage() {
  const { batchId } = useParams();
  const nav = useNavigate();
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function fetchDetail() {
      if (!batchId) return;
      setLoading(true);
      setError("");
      try {
        const params = new URLSearchParams();
        const loc = getDefaultLocationId();
        if (loc) params.set("location_id", String(loc));
        const url = params.toString()
          ? `${API_MEDICINE_DETAIL(batchId)}?${params.toString()}`
          : API_MEDICINE_DETAIL(batchId);
        const res = await authFetch(url);
        if (!res.ok) {
          const text = await res.text();
          throw new Error(text || `Failed (${res.status})`);
        }
        const data = await res.json();
        if (!cancelled) setDetail(data);
      } catch (err) {
        if (!cancelled) setError(err.message || "Failed to load medicine");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchDetail();
    return () => {
      cancelled = true;
    };
  }, [batchId]);

  const medicine = detail?.medicine;
  const batch = detail?.batch;
  const inventory = detail?.inventory;

  const renderInfoRow = (label, value) => (
    <div className="info-row">
      <span className="info-label">{label}</span>
      <span className="info-value">{value ?? "-"}</span>
    </div>
  );

  return (
    <div className="inv-detail-wrap">
      <div className="inv-detail-header">
        <button className="btn-secondary" onClick={() => nav("/inventory/medicines")}>
          ← Back
        </button>
        <div>
          <h2>{medicine?.name || "Medicine Details"}</h2>
          <p>Inventory details for batch {batch?.batch_number}</p>
        </div>
        <button
          className="btn-primary"
          onClick={() => {
            if (!batchId) return;
            nav(`/inventory/medicines/${batchId}/edit`);
          }}
          disabled={!detail}
        >
          Edit Medicine
        </button>
      </div>

      {loading && <div className="inv-card">Loading details...</div>}
      {error && <div className="inv-card" style={{ color: "crimson" }}>{error}</div>}

      {!loading && !error && detail && (
        <div className="inv-detail-grid">
          <div className="inv-card">
            <h3>Basic Information</h3>
            {renderInfoRow("Medicine Name", medicine?.name)}
            {renderInfoRow("Generic Name", medicine?.generic_name)}
            {renderInfoRow("Category", medicine?.category?.name)}
            {renderInfoRow("Form", medicine?.form?.name)}
            {renderInfoRow("Strength", medicine?.strength)}
            {renderInfoRow("Rack Location", medicine?.rack_location?.name)}
            {renderInfoRow("Description", medicine?.description)}
          </div>

          <div className="inv-card">
            <h3>Stock Status</h3>
            {renderInfoRow("Stock on hand", inventory?.stock_on_hand_base)}
            {renderInfoRow("Status", inventory?.stock_status)}
            {renderInfoRow("Location", inventory?.location_id)}
          </div>

          <div className="inv-card">
            <h3>Pricing</h3>
            {renderInfoRow("MRP", medicine?.mrp)}
            {renderInfoRow("GST %", medicine?.gst_percent)}
            {renderInfoRow("Purchase Price", batch?.purchase_price)}
          </div>

          <div className="inv-card">
            <h3>Batch Details</h3>
            {renderInfoRow("Batch Number", batch?.batch_number)}
            {renderInfoRow("MFG Date", batch?.mfg_date)}
            {renderInfoRow("Expiry Date", batch?.expiry_date)}
            {renderInfoRow("Quantity (packs)", batch?.quantity)}
            {renderInfoRow("Quantity UOM", batch?.quantity_uom?.name)}
            {renderInfoRow("Current Stock (base)", batch?.current_stock_base)}
          </div>
        </div>
      )}

    </div>
  );
}
