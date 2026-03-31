import React, { useState, useEffect } from "react";
import { CheckCircle, Package, Calendar, ClipboardList } from "lucide-react";
import "./receiveitems.css";
import { formatDateDDMMYYYY } from "../../../utils/dateFormat";

const ReceiveItems = () => {
  // Sample state data (replace with API calls)
  const [purchaseOrder, setPurchaseOrder] = useState({
    po_number: "PO-12345",
    supplier: "ABC Supplier",
    order_date: "2025-11-10",
    expected_date: "2025-11-15",
  });

  const [receivingDetails, setReceivingDetails] = useState({
    received_date: "2025-11-12",
    received_by: "John Doe",
    invoice_number: "INV-98765",
  });

  const [itemsReceived, setItemsReceived] = useState([
    { id: 1, product_name: "Product A", ordered: 10, received: 8, damaged: 1, batch: "B123", mfg_date: "2025-09-01" },
    { id: 2, product_name: "Product B", ordered: 5, received: 5, damaged: 0, batch: "B456", mfg_date: "2025-10-01" },
  ]);

  const [summary, setSummary] = useState({
    total_ordered: 15,
    total_received: 13,
    completion: "86.6%",
  });

  const handleCompleteReceiving = () => {
    console.log("Receiving completed!");
    // Call API to mark complete
  };

  return (
    <div className="receiveitems-container">
      <h1 className="page-title">Receive Items</h1>

      <div className="kpi-cards-grid">
        {/* KPI Card 1: Purchase Order Details */}
        <div className="kpi-card">
          <h3>Purchase Order Details</h3>
          <div className="kpi-item"><strong>PO Number:</strong> {purchaseOrder.po_number}</div>
          <div className="kpi-item"><strong>Supplier:</strong> {purchaseOrder.supplier}</div>
          <div className="kpi-item"><strong>Order Date:</strong> {formatDateDDMMYYYY(purchaseOrder.order_date)}</div>
          <div className="kpi-item"><strong>Expected Date:</strong> {formatDateDDMMYYYY(purchaseOrder.expected_date)}</div>
        </div>

        {/* KPI Card 2: Receiving Details */}
        <div className="kpi-card">
          <h3>Receiving Details</h3>
          <div className="kpi-item"><strong>Received Date:</strong> {formatDateDDMMYYYY(receivingDetails.received_date)}</div>
          <div className="kpi-item"><strong>Received By:</strong> {receivingDetails.received_by}</div>
          <div className="kpi-item"><strong>Invoice Number:</strong> {receivingDetails.invoice_number}</div>
        </div>

        {/* KPI Card 3: Items Received */}
        <div className="kpi-card">
          <h3>Items Received</h3>
          <div className="table-wrapper">
            <table className="items-received-table">
              <thead>
                <tr>
                  <th>Product Name</th>
                  <th>Ordered</th>
                  <th>Received</th>
                  <th>Damaged</th>
                  <th>Batch #</th>
                  <th>MFG Date</th>
                </tr>
              </thead>
              <tbody>
                {itemsReceived.map((item) => (
                  <tr key={item.id}>
                    <td>{item.product_name}</td>
                    <td>{item.ordered}</td>
                    <td>{item.received}</td>
                    <td>{item.damaged}</td>
                    <td>{item.batch}</td>
                    <td>{formatDateDDMMYYYY(item.mfg_date)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* KPI Card 4: Receiving Summary */}
        <div className="kpi-card summary-card">
          <h3>Receiving Summary</h3>
          <div className="summary-row">
            <CheckCircle size={18} className="summary-icon" />
            <span>Total Ordered: {summary.total_ordered}</span>
          </div>
          <div className="summary-row">
            <Package size={18} className="summary-icon" />
            <span>Total Received: {summary.total_received}</span>
          </div>
          <div className="summary-row">
            <ClipboardList size={18} className="summary-icon" />
            <span>Completion: {summary.completion}</span>
          </div>

          <button className="complete-btn" onClick={handleCompleteReceiving}>
            Complete Receiving
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReceiveItems;
