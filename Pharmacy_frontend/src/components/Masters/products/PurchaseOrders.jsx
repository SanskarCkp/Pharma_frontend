import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Eye, Trash2, ArrowLeft } from "lucide-react";
import "./purchaseorders.css";
import "../../inventory/inventory.css";
import { formatDateDDMMYYYY } from "../../../utils/dateFormat";
import { authFetch } from "../../../api/http";
import { useAlert } from "../../ui/alert-provider";

const API_BASE_URL = import.meta.env.VITE_API_URL;

const PurchaseOrders = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const Supplier = location.state?.Supplier || null;
  const { showAlert } = useAlert();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!Supplier?.id) {
      setLoading(false);
      return;
    }

    const fetchOrders = async () => {
      try {
        // Fetch orders filtered by Supplier from backend
        const res = await authFetch(
          `${API_BASE_URL}/api/v1/procurement/purchase-orders/?Supplier=${Supplier.id}`
        );

        const data = await res.json();
        const ordersList = data.results || data || [];

        // Extra safety: filter in React also
        const filteredOrders = ordersList.filter(
          (order) => Number(order.Supplier) === Number(Supplier.id)
        );

        // Fetch PO lines and calculate total items for each order
        const enrichedOrders = await Promise.all(
          filteredOrders.map(async (order) => {
            try {
              const linesRes = await authFetch(
                `${API_BASE_URL}/api/v1/procurement/purchase-orders/${order.id}/lines/`
              );
              const linesData = await linesRes.json();

              const linesArray = Array.isArray(linesData.lines)
                ? linesData.lines
                : Array.isArray(linesData)
                ? linesData
                : [];

              const totalItems = linesArray.reduce(
                (sum, line) => sum + Number(line.qty_packs_ordered || 0),
                0
              );

              return { ...order, total_items: totalItems };
            } catch (err) {
              console.error(`Error fetching lines for PO ${order.id}:`, err);
              return { ...order, total_items: 0 };
            }
          })
        );

        setOrders(enrichedOrders);
      } catch (err) {
        console.error("Error fetching purchase orders:", err);
        setOrders([]);
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, [Supplier]);

  const handleReceiveItems = (id) =>
    navigate(`/masters/products/receive-items/${id}`, {
      state: { Supplier },
    });

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this order?")) return;

    try {
      const res = await authFetch(
        `${API_BASE_URL}/api/v1/procurement/purchase-orders/${id}/`,
        { method: "DELETE" }
      );

      if (res.ok) {
        setOrders((prev) => prev.filter((order) => order.id !== id));
        showAlert("Purchase order deleted successfully!", "Success");
      } else {
        const errData = await res.json();
        console.error("Delete failed:", errData);
        showAlert("Failed to delete purchase order.", "Error");
      }
    } catch (err) {
      console.error("Delete error:", err);
      showAlert("Error deleting purchase order.", "Error");
    }
  };

  return (
    <div className="purchaseorders-container">
      {/* Header Section - Back button */}
      <div className="purchaseorders-header-section">
        <button className="back-btn" onClick={() => navigate(-1)}>
          <ArrowLeft size={18} />
          Back
        </button>
      </div>

      {/* Header Card */}
      <div className="purchaseorders-header-card">
        <h1 className="page-title">Purchase Orders</h1>
        {Supplier ? (
          <p className="Supplier-name">Supplier: {Supplier.name}</p>
        ) : (
          <p className="Supplier-name" style={{ color: "#ef4444" }}>
            Supplier not selected. Please select a Supplier to view orders.
          </p>
        )}
      </div>

      <div className="orders-table-card">
        <div className="inv-table-wrap">
        <table className="inv-table">
          <thead>
            <tr>
              <th>PO Number</th>
              <th>Order Date</th>
              <th>Expected Date</th>
              <th>Total Items</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="6" className="no-orders">Loading orders...</td>
              </tr>
            ) : orders.length === 0 ? (
              <tr>
                <td colSpan="6" className="no-orders">
                  No purchase orders found.
                </td>
              </tr>
            ) : (
              orders.map((order) => (
                <tr key={order.id}>
                  <td>{order.po_number}</td>
                  <td>{formatDateDDMMYYYY(order.order_date)}</td>
                  <td>{formatDateDDMMYYYY(order.expected_date)}</td>
                  <td>{order.total_items}</td>
                  <td>
                    <span className={`badge ${order.status === 'DRAFT' ? 'yellow' : order.status === 'RECEIVED' ? 'green' : 'blue'}`}>
                      {order.status}
                    </span>
                  </td>
                  <td className="inv-actions-cell">
                    <button
                      className="receive-btn"
                      onClick={() => handleReceiveItems(order.id)}
                    >
                      Receive Items
                    </button>
                    <button
                      className="inv-icon danger"
                      title="Delete"
                      onClick={() => handleDelete(order.id)}
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
};

export default PurchaseOrders;
