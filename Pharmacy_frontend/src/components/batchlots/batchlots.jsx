import React, { useMemo, useState } from "react";
import "./batchlots.css";

const sampleLots = [
  {
    batchNo: "LOT-2025-01",
    product: "Amoxicillin 500mg",
    location: "Central Store",
    expiryDate: "2025-06-30",
    quantity: 240,
    status: "active",
  },
  {
    batchNo: "LOT-2025-02",
    product: "Paracetamol 650mg",
    location: "Outlet - East",
    expiryDate: "2025-03-18",
    quantity: 180,
    status: "expiring",
  },
  {
    batchNo: "LOT-2024-11",
    product: "Vitamin C 1000mg",
    location: "Central Store",
    expiryDate: "2024-12-15",
    quantity: 60,
    status: "expired",
  },
  {
    batchNo: "LOT-2025-07",
    product: "Ibuprofen 400mg",
    location: "Outlet - West",
    expiryDate: "2025-10-05",
    quantity: 320,
    status: "active",
  },
];

const statusCopy = {
  active: "Active",
  expiring: "Expiring soon",
  expired: "Expired",
};

const Batchlots = () => {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");

  const visibleLots = useMemo(() => {
    const q = query.toLowerCase();
    return sampleLots.filter((lot) => {
      const matchesQuery =
        lot.batchNo.toLowerCase().includes(q) ||
        lot.product.toLowerCase().includes(q) ||
        lot.location.toLowerCase().includes(q);
      const matchesStatus = status === "all" || lot.status === status;
      return matchesQuery && matchesStatus;
    });
  }, [query, status]);

  return (
    <div className="batchlots">
      <header className="batchlots__header">
        <div>
          <p className="batchlots__eyebrow">Inventory quality</p>
          <h1 className="batchlots__title">Batch lots</h1>
          <p className="batchlots__subtitle">
            Track expiry-sensitive stock across locations. Use the filters to
            focus on batches that need action.
          </p>
        </div>
        <div className="batchlots__filters">
          <label className="batchlots__field">
            <span>Search</span>
            <input
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Batch, product, or location"
            />
          </label>
          <label className="batchlots__field">
            <span>Status</span>
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value)}
            >
              <option value="all">All</option>
              <option value="active">Active</option>
              <option value="expiring">Expiring soon</option>
              <option value="expired">Expired</option>
            </select>
          </label>
        </div>
      </header>

      <div className="batchlots__card" role="table" aria-label="Batch lots">
        <div className="batchlots__row batchlots__row--head" role="row">
          <div>Batch / Product</div>
          <div>Location</div>
          <div>Expiry</div>
          <div>Status</div>
          <div className="batchlots__numeric">Qty</div>
        </div>

        {visibleLots.map((lot) => (
          <div className="batchlots__row" role="row" key={lot.batchNo}>
            <div>
              <div className="batchlots__batch">{lot.batchNo}</div>
              <div className="batchlots__muted">{lot.product}</div>
            </div>
            <div className="batchlots__muted">{lot.location}</div>
            <div>{lot.expiryDate}</div>
            <div>
              <span className={`batchlots__pill batchlots__pill--${lot.status}`}>
                {statusCopy[lot.status]}
              </span>
            </div>
            <div className="batchlots__numeric">{lot.quantity}</div>
          </div>
        ))}

        {visibleLots.length === 0 && (
          <div className="batchlots__empty" role="row">
            <p>No batches match your filters.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Batchlots;
