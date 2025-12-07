import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Eye, Trash2, ArrowLeft } from "lucide-react";
import "./purchaseorders.css";
import { formatDateDDMMYYYY } from "../../../utils/dateFormat";
import { authFetch } from "../../../api/http";
import { useAlert } from "../../ui/alert-provider";

const API_BASE_URL = import.meta.env.VITE_API_URL;

const PurchaseOrders = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const vendor = location.state?.vendor || null;
  const { showAlert } = useAlert();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!vendor?.id) {
      setLoading(false);
      return;
    }

    const fetchOrders = async () => {
      try {
        // Fetch orders filtered by vendor from backend
        const res = await authFetch(
          `${API_BASE_URL}/api/v1/procurement/purchase-orders/?vendor=${vendor.id}`
        );

        const data = await res.json();
        const ordersList = data.results || data || [];

        // Extra safety: filter in React also
        const filteredOrders = ordersList.filter(
          (order) => Number(order.vendor) === Number(vendor.id)
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
  }, [vendor]);

  const handleReceiveItems = (id) =>
    navigate(`/masters/products/receive-items/${id}`, {
      state: { vendor },
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
      <div className="purchaseorders-header">
        <button className="back-btn" onClick={() => navigate(-1)}>
          <ArrowLeft size={18} />
          <span>Back</span>
        </button>
        <h1 className="page-title">Purchase Orders</h1>
      </div>

      {vendor ? (
        <p className="vendor-name">Vendor: {vendor.name}</p>
      ) : (
        <p className="vendor-name" style={{ color: "red" }}>
          Vendor not selected. Please select a vendor to view orders.
        </p>
      )}

      <div className="orders-table-card">
        <table className="orders-table">
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
                  <td>{order.status}</td>
                  <td className="actions-cell">
                    <button
                      className="receive-btn"
                      onClick={() => handleReceiveItems(order.id)}
                    >
                      Receive Items
                    </button>

                    <Trash2
                      className="action-icon delete-icon"
                      onClick={() => handleDelete(order.id)}
                    />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PurchaseOrders;
