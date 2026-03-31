import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import "./billgeneration.css";
import { authFetch } from "../../api/http";

const API_BASE = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000/api/v1";

export default function Invoice() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [invoice, setInvoice] = useState(null);
  const [error, setError] = useState("");
  const [autoPrintDone, setAutoPrintDone] = useState(false);
  const printRef = useRef(null);

  useEffect(() => {
    async function load() {
      try {
        setError("");
        const res = await authFetch(`${API_BASE}/sales/invoices/${id}/`);
        if (!res.ok) {
          const txt = await res.text();
          setError(
            `Failed to load invoice (${res.status})${
              txt ? `: ${txt}` : ""
            }`
          );
          setInvoice(null);
          return;
        }
        const data = await res.json();
        setInvoice(data);
      } catch (e) {
        console.error(e);
        setError("Network error while loading invoice");
        setInvoice(null);
      }
    }
    load();
  }, [id]);

  const subtotal = Number(invoice?.gross_total || 0);
  const gstAmount = Number(invoice?.tax_total || 0);
  const total = Number(invoice?.net_total || 0);

  const handlePrint = () => {
    if (!printRef.current) return;
    window.print();
  };

  const handleDownloadPDF = async () => {
    if (!printRef.current) return;
    const element = printRef.current;
    const canvas = await html2canvas(element, { scale: 3, useCORS: true });
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF("p", "mm", "a4");

    const pageWidth = pdf.internal.pageSize.getWidth();
    const imgWidth = pageWidth;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    pdf.addImage(imgData, "PNG", 0, 0, imgWidth, imgHeight);
    pdf.save(`${invoice?.invoice_no || "invoice"}.pdf`);
  };

  const customer =
    invoice && typeof invoice.customer === "object" && invoice.customer !== null
      ? invoice.customer
      : {};

  const search = new URLSearchParams(location.search);
  const shouldAutoPrint = search.get("print") === "1";

  useEffect(() => {
    if (shouldAutoPrint && invoice && !autoPrintDone && printRef.current) {
      handlePrint();
      setAutoPrintDone(true);
    }
  }, [shouldAutoPrint, invoice, autoPrintDone]);

  if (!invoice && !error) {
    return (
      <div
        className="billgeneration-page"
        style={{ maxWidth: "800px", margin: "auto", padding: "1rem" }}
      >
        <p>Loading invoice...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="billgeneration-page"
        style={{ maxWidth: "800px", margin: "auto", padding: "1rem" }}
      >
        <p style={{ color: "#dc2626" }}>{error}</p>
        <button
          onClick={() => navigate(-1)}
          style={{
            marginTop: "1rem",
            backgroundColor: "#e5e7eb",
            borderRadius: "6px",
            border: "none",
            padding: "0.5rem 1rem",
            cursor: "pointer",
          }}
        >
          ← Back
        </button>
      </div>
    );
  }

  return (
    <div
      className="billgeneration-page"
      style={{ maxWidth: "800px", margin: "auto", padding: "1rem" }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: "1rem",
        }}
      >
        <button
          onClick={() => navigate(-1)}
          style={{
            backgroundColor: "#e5e7eb",
            borderRadius: "6px",
            border: "none",
            padding: "0.5rem 1rem",
            cursor: "pointer",
          }}
        >
          ← Back
        </button>

        <div>
          <button
            onClick={handleDownloadPDF}
            style={{
              backgroundColor: "#3b82f6",
              color: "white",
              border: "none",
              borderRadius: "6px",
              padding: "0.5rem 1rem",
              marginRight: "0.5rem",
              cursor: "pointer",
            }}
          >
            Download
          </button>
          <button
            onClick={handlePrint}
            style={{
              backgroundColor: "#14b8a6",
              color: "white",
              border: "none",
              borderRadius: "6px",
              padding: "0.5rem 1rem",
              cursor: "pointer",
            }}
          >
            Print
          </button>
        </div>
      </div>

      <div
        ref={printRef}
        style={{
          border: "1px solid #ddd",
          padding: "20px",
          borderRadius: "6px",
          background: "white",
        }}
      >
        {/* Header */}
        <div
          className="header"
          style={{ textAlign: "center", marginBottom: "1rem" }}
        >
          <h2 style={{ color: "#14b8a6", marginBottom: "0.25rem" }}>
            Keshav Medical Centre
          </h2>
          <p style={{ margin: "0" }}>
            123 Medical Plaza, MG Road, Mumbai, Maharashtra - 400001
          </p>
          <p style={{ margin: "0" }}>
            Phone: +91 98765 43210 | GSTIN: 27AABCU9603R1Z5
          </p>
        </div>

        {/* Customer + Invoice Info */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            borderBottom: "2px solid #e5e7eb",
            paddingBottom: "0.5rem",
            marginBottom: "1rem",
          }}
        >
          <div>
            <h4 style={{ marginBottom: "0.3rem", color: "#111827" }}>
              Bill To
            </h4>
            <p style={{ margin: "0.2rem 0" }}>
              <strong>Name:</strong> {customer.name || "-"}
            </p>
            <p style={{ margin: "0.2rem 0" }}>
              <strong>Phone:</strong> {customer.phone || "-"}
            </p>
            {customer.email && (
              <p style={{ margin: "0.2rem 0" }}>
                <strong>Email:</strong> {customer.email}
              </p>
            )}
            {customer.city && (
              <p style={{ margin: "0.2rem 0" }}>
                <strong>City:</strong> {customer.city}
              </p>
            )}
          </div>
          <div style={{ textAlign: "right" }}>
            <h4 style={{ marginBottom: "0.3rem", color: "#111827" }}>
              Invoice Info
            </h4>
            <p style={{ margin: "0.2rem 0" }}>
              <strong>Invoice #:</strong> {invoice.invoice_no || invoice.id}
            </p>
            <p style={{ margin: "0.2rem 0" }}>
              <strong>Date:</strong>{" "}
              {invoice.invoice_date
                ? new Date(invoice.invoice_date).toLocaleString()
                : ""}
            </p>
          </div>
        </div>

        {/* Table */}
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead style={{ backgroundColor: "#f3f4f6" }}>
            <tr>
              <th style={{ textAlign: "left", padding: "0.5rem" }}>#</th>
              <th style={{ textAlign: "left", padding: "0.5rem" }}>
                Medicine Name
              </th>
              <th style={{ textAlign: "left", padding: "0.5rem" }}>Batch</th>
              <th style={{ textAlign: "right", padding: "0.5rem" }}>Qty</th>
              <th style={{ textAlign: "right", padding: "0.5rem" }}>Price</th>
              <th style={{ textAlign: "right", padding: "0.5rem" }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {(invoice.lines || []).map((item, index) => (
              <tr
                key={item.id || index}
                style={{ borderBottom: "1px solid #e5e7eb" }}
              >
                <td style={{ padding: "0.5rem" }}>{index + 1}</td>
                <td style={{ padding: "0.5rem" }}>
                  {item.product_name || ""}
                </td>
                <td style={{ padding: "0.5rem" }}>
                  {item.batch_no || item.batch_lot}
                </td>
                <td style={{ textAlign: "right", padding: "0.5rem" }}>
                  {item.qty_base}
                </td>
                <td style={{ textAlign: "right", padding: "0.5rem" }}>
                  ₹{Number(item.rate_per_base || 0).toFixed(2)}
                </td>
                <td style={{ textAlign: "right", padding: "0.5rem" }}>
                  ₹{Number(item.line_total || 0).toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Summary */}
        <div style={{ marginTop: "1.5rem", textAlign: "right" }}>
          <p>
            <strong>Subtotal:</strong> ₹{subtotal.toFixed(2)}
          </p>
          <p>
            <strong>GST:</strong> ₹{gstAmount.toFixed(2)}
          </p>
          <h3
            style={{
              borderTop: "1px solid #ddd",
              marginTop: "0.5rem",
              paddingTop: "0.5rem",
            }}
          >
            Total: ₹{total.toFixed(2)}
          </h3>
        </div>

        {/* Payment Info */}
        <div
          style={{
            marginTop: "1rem",
            borderTop: "1px solid #e5e7eb",
            paddingTop: "0.5rem",
            color: "#374151",
          }}
        >
          <p>
            <strong>Payment Method:</strong> Cash
          </p>
          <p>
            <strong>Payment Status:</strong> {invoice.payment_status}
          </p>
        </div>

        {/* Footer */}
        <div
          className="footer"
          style={{
            marginTop: "2rem",
            textAlign: "center",
            borderTop: "1px solid #e5e7eb",
            paddingTop: "1rem",
            color: "#6b7280",
          }}
        >
          <p style={{ marginBottom: "0.25rem" }}>
            Thank you for choosing Keshav Medical Centre!
          </p>
          <p style={{ margin: 0 }}>This is a computer-generated invoice.</p>
        </div>
      </div>
    </div>
  );
}

