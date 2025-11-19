import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Eye, Trash2, ArrowLeft } from "lucide-react";
import "./purchaseorders.css";
import { formatDateDDMMYYYY } from "../../../utils/dateFormat";
import { authFetch } from "../../../api/http";

const API_BASE_URL = import.meta.env.VITE_API_URL;

const PurchaseOrders = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const vendor = location.state?.vendor || null;

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!vendor) {
      setLoading(false);
      return;
    }

    const fetchOrders = async () => {
      try {
        // Fetch all purchase orders for the vendor
        const res = await authFetch(
          `${API_BASE_URL}/procurement/purchase-orders/?vendor=${vendor.id}`
        );
        const data = await res.json();
        const ordersList = data.results || [];

        // For each order, fetch its lines and calculate total items
        const ordersWithItems = await Promise.all(
          ordersList.map(async (order) => {
            try {
              const linesRes = await authFetch(
                `${API_BASE_URL}/procurement/purchase-orders/${order.id}/lines/`
              );
              const linesData = await linesRes.json();

              // Handle both cases: nested `lines` or direct array
              const totalItemsArray = Array.isArray(linesData.lines)
                ? linesData.lines
                : Array.isArray(linesData)
                ? linesData
                : [];

              const totalItems = totalItemsArray.reduce(
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

        setOrders(ordersWithItems);
      } catch (err) {
        console.error("Error fetching purchase orders:", err);
        setOrders([]);
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, [vendor]);

  const handleView = (id) =>
    navigate(`/masters/products/receive-items/${id}`, {
      state: { vendor },
    });

  const handleDelete = async (id) => {
  if (!window.confirm("Are you sure you want to delete this order?")) return;

  try {
    const res = await authFetch(
      `${API_BASE_URL}/procurement/purchase-orders/${id}/`,
      { method: "DELETE" }
    );

    if (res.ok) {
      // Remove the deleted order from the state
      setOrders((prev) => prev.filter((order) => order.id !== id));
      alert("Purchase order deleted successfully!");
    } else {
      const errData = await res.json();
      console.error("Delete failed:", errData);
      alert("Failed to delete purchase order.");
    }
  } catch (err) {
    console.error("Delete error:", err);
    alert("Error deleting purchase order.");
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
                <td colSpan="6" className="no-orders">
                  Loading orders...
                </td>
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
                    <Eye
                      className="action-icon"
                      onClick={() => handleView(order.id)}
                    />
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
