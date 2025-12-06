import React, { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import AddMedicine from "./AddMedicine.jsx";
import { apiUrl } from "../../api/base";
import { authFetch } from "../../api/http";
import { getDefaultLocationId } from "../../config/location";

const API_MEDICINE_DETAIL = (id) => apiUrl(`inventory/medicines/${id}/`);

export default function ManageMedicinePage() {
  const { batchId } = useParams();
  const navigate = useNavigate();
  const mode = batchId ? "edit" : "add";

  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(mode === "edit");
  const [error, setError] = useState("");

  const loadDetail = useCallback(async () => {
    if (mode !== "edit" || !batchId) return;
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
      if (!res.ok) throw new Error(`Failed (${res.status})`);
      const data = await res.json();
      setDetail(data);
    } catch (err) {
      setError(err.message || "Unable to load medicine");
    } finally {
      setLoading(false);
    }
  }, [batchId, mode]);

  useEffect(() => {
    if (mode === "edit") {
      loadDetail();
    }
  }, [mode, loadDetail]);

  if (mode === "edit" && loading) {
    return (
      <div className="inv-form-wrap">
        <div className="inv-form-card">Loading medicine...</div>
      </div>
    );
  }

  if (mode === "edit" && error) {
    return (
      <div className="inv-form-wrap">
        <div className="inv-form-card">
          <p style={{ color: "crimson" }}>{error}</p>
          <button className="btn-primary" onClick={() => navigate(-1)}>
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <AddMedicine
      mode={mode}
      initialData={detail}
      onSaved={() => {
        if (mode === "edit") {
          navigate(-1);
        } else {
          navigate("/inventory/medicines");
        }
      }}
    />
  );
}
