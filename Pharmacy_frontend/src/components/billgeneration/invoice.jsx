import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import "./billgeneration.css";
import { authFetch } from "../../api/http";
import { apiUrl } from "../../api/base";
import { getDefaultLocationId } from "../../config/location";

const INVOICE_URL = apiUrl("sales/invoices/");
const MEDICINE_DETAIL_URL = (batchId) => apiUrl(`inventory/medicines/${batchId}/`);

const safeNumber = (value, digits = null) => {
  const num = Number(value);
  if (!Number.isFinite(num)) return 0;
  if (digits === null) return num;
  return Number(num.toFixed(digits));
};

export default function Invoice() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [invoice, setInvoice] = useState(null);
  const [error, setError] = useState("");
  const [autoPrintDone, setAutoPrintDone] = useState(false);
  const [lineExtras, setLineExtras] = useState({});
  const printRef = useRef(null);

  useEffect(() => {
    async function load() {
      try {
        setError("");
        const res = await authFetch(`${INVOICE_URL}${id}/`);
        if (!res.ok) {
          const txt = await res.text();
          setError(`Failed to load invoice (${res.status})${txt ? `: ${txt}` : ""}`);
          setInvoice(null);
          return;
        }
        const data = await res.json();
        setInvoice(data);
        setLineExtras({});
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

  // ================= FIXED PAYMENT INFO WITH CASH FALLBACK =================
  const payments = invoice?.payments || [];
  let paidAmount = payments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
  let paymentMode = payments.length > 0 ? payments.map((p) => p.mode).join(", ") : "N/A";

  // Fallback: if paid_amount exists in invoice but payments array is empty, assume cash
  if (paidAmount === 0 && invoice?.paid_amount > 0) {
    paidAmount = Number(invoice.paid_amount);
    paymentMode = "CASH";
  }

  const balanceAmount = Math.max(total - paidAmount, 0);

  let paymentStatus = "UNPAID";
  if (paidAmount >= total && total > 0) paymentStatus = "PAID";
  else if (paidAmount > 0) paymentStatus = "CREDIT";
  // ========================================================================

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

 const customer = invoice?.customer_detail || {};

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
      <div style={{ maxWidth: "800px", margin: "auto", padding: "1rem" }}>
        <p>Loading invoice...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ maxWidth: "800px", margin: "auto", padding: "1rem" }}>
        <p style={{ color: "#dc2626" }}>{error}</p>
        <button onClick={() => navigate(-1)}>← Back</button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: "800px", margin: "auto", padding: "1rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "1rem" }}>
        <button onClick={() => navigate(-1)}>← Back</button>

        <div>
          <button onClick={handleDownloadPDF} style={{ marginRight: "0.5rem" }}>
            Download
          </button>
          <button onClick={handlePrint}>Print</button>
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
        <div style={{ textAlign: "center", marginBottom: "1rem" }}>
          <h2 style={{ color: "#14b8a6" }}>Keshav Medical Centre</h2>
          <p>123 Medical Plaza, MG Road, Mumbai, Maharashtra - 400001</p>
          <p>Phone: +91 98765 43210 | GSTIN: 27AABCU9603R1Z5</p>
        </div>

        {/* CUSTOMER INFO */}
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "1rem" }}>
          <div>
            <h4>Bill To</h4>
            <p><strong>Name:</strong> {customer.name || "-"}</p>
            <p><strong>Phone:</strong> {customer.phone || "-"}</p>
            {customer.email && <p><strong>Email:</strong> {customer.email}</p>}
            {customer.city && <p><strong>City:</strong> {customer.city}</p>}
          </div>

          <div style={{ textAlign: "right" }}>
            <h4>Invoice Info</h4>
            <p><strong>Invoice #:</strong> {invoice.invoice_no || invoice.id}</p>
            <p>
              <strong>Date:</strong>{" "}
              {invoice.invoice_date ? new Date(invoice.invoice_date).toLocaleString() : ""}
            </p>
          </div>
        </div>

        {/* ITEMS */}
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead style={{ backgroundColor: "#f3f4f6" }}>
            <tr>
              <th>#</th>
              <th>Medicine</th>
              <th>Batch</th>
              <th style={{ textAlign: "right" }}>Qty</th>
              <th style={{ textAlign: "right" }}>Price</th>
              <th style={{ textAlign: "right" }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {invoice.lines.map((item, index) => (
              <tr key={index}>
                <td>{index + 1}</td>
                <td>{item.product_name}</td>
                <td>{item.batch_no || item.batch_lot}</td>
                {(() => {
                  const key = item.id ?? `${item.batch_lot}-${index}`;
                  const extras = lineExtras[key] || {};
                  const unitsPerPack = extras.unitsPerPack && extras.unitsPerPack > 0 ? extras.unitsPerPack : 1;
                  const baseQty = safeNumber(item.qty_base, 3);
                  const baseQtyDisplay = baseQty.toFixed(3);
                  const soldQty =
                    item.sold_uom === "PACK" ? baseQty / unitsPerPack : baseQty;
                  const soldQtyDisplay =
                    Math.abs(soldQty % 1) > 0 ? soldQty.toFixed(3) : String(soldQty);
                  const qtyLabel =
                    item.sold_uom === "PACK"
                      ? `${soldQtyDisplay} ${extras.sellingLabel || "Pack"} (${baseQtyDisplay} ${extras.baseLabel || "Units"})`
                      : `${soldQtyDisplay} ${extras.baseLabel || "Units"}`;
                  const soldRate =
                    item.sold_uom === "PACK"
                      ? safeNumber(item.rate_per_base) * unitsPerPack
                      : safeNumber(item.rate_per_base);
                  return (
                    <>
                      <td style={{ textAlign: "right" }}>{qtyLabel}</td>
                      <td style={{ textAlign: "right" }}>₹{soldRate.toFixed(2)}</td>
                      <td style={{ textAlign: "right" }}>₹{Number(item.line_total).toFixed(2)}</td>
                    </>
                  );
                })()}
              </tr>
            ))}
          </tbody>
        </table>

        {/* SUMMARY */}
        <div style={{ marginTop: "1.5rem", textAlign: "right" }}>
          <p><strong>Subtotal:</strong> ₹{subtotal.toFixed(2)}</p>
          <p><strong>GST:</strong> ₹{gstAmount.toFixed(2)}</p>

          <h3 style={{ borderTop: "1px solid #ccc", paddingTop: "0.5rem" }}>
            Total: ₹{total.toFixed(2)}
          </h3>
        </div>

        {/* PAYMENT INFO */}
        <div style={{ marginTop: "1rem", paddingTop: "1rem", borderTop: "1px solid #ddd" }}>
          <h4>Payment Details</h4>

          <p><strong>Payment Method:</strong> {paymentMode}</p>

          <p><strong>Status:</strong> 
            {paymentStatus === "PAID" && " Paid"}
            {paymentStatus === "CREDIT" && " Credit (Partial Payment)"}
            {paymentStatus === "UNPAID" && " Unpaid"}
          </p>

          <p><strong>Paid Amount:</strong> ₹{paidAmount.toFixed(2)}</p>
          <p><strong>Balance Amount:</strong> ₹{balanceAmount.toFixed(2)}</p>
        </div>

        <div style={{ marginTop: "2rem", textAlign: "center", color: "#666" }}>
          <p>Thank you for choosing Keshav Medical Centre!</p>
          <p>This is a computer-generated invoice.</p>
        </div>
      </div>
    </div>
  );
}

  useEffect(() => {
    let cancelled = false;
    async function loadLineExtras() {
      if (!invoice?.lines?.length) {
        setLineExtras({});
        return;
      }
      const next = {};
      await Promise.all(
        invoice.lines.map(async (line, idx) => {
          const key = line.id ?? `${line.batch_lot}-${idx}`;
          const defaults = {
            unitsPerPack: 1,
            baseLabel: "Units",
            sellingLabel: "Pack",
          };
          try {
            const params = new URLSearchParams();
            const loc = getDefaultLocationId();
            if (loc) params.set("location_id", String(loc));
            const url = params.toString()
              ? `${MEDICINE_DETAIL_URL(line.batch_lot)}?${params.toString()}`
              : MEDICINE_DETAIL_URL(line.batch_lot);
            const res = await authFetch(url);
            if (!res.ok) {
              next[key] = defaults;
              return;
            }
            const detail = await res.json();
            next[key] = {
              unitsPerPack: Math.max(1, safeNumber(detail.medicine?.units_per_pack)),
              baseLabel: detail.medicine?.base_uom?.name || defaults.baseLabel,
              sellingLabel: detail.medicine?.selling_uom?.name || defaults.sellingLabel,
            };
          } catch (err) {
            console.error(err);
            next[key] = defaults;
          }
        })
      );
      if (!cancelled) setLineExtras(next);
    }
    loadLineExtras();
    return () => {
      cancelled = true;
    };
  }, [invoice]);
