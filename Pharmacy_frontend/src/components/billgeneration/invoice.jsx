import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import "./invoice.css";
import { authFetch } from "../../api/http";
import { apiUrl } from "../../api/base";

const INVOICE_URL = apiUrl("sales/invoices/");

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
        const res = await authFetch(`${INVOICE_URL}${id}/`);
        if (!res.ok) {
          const txt = await res.text();
          setError(`Failed to load invoice (${res.status})${txt ? `: ${txt}` : ""}`);
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

  if (!invoice && !error) return <p>Loading invoice...</p>;
  if (error)
    return (
      <div className="invoice-container">
        <p className="error">{error}</p>
        <button onClick={() => navigate(-1)}>← Back</button>
      </div>
    );

  const customer = invoice?.customer_detail || {};
  const payments = invoice?.payments || [];
  let paidAmount = payments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
  let paymentMode = payments.length > 0 ? payments.map((p) => p.mode).join(", ") : "N/A";

  if (paidAmount === 0 && invoice?.paid_amount > 0) {
    paidAmount = Number(invoice.paid_amount);
    paymentMode = "CASH";
  }

  const subtotal = Number(invoice?.gross_total || 0);
  const gstAmount = Number(invoice?.tax_total || 0);
  const total = Number(invoice?.net_total || 0);
  const balanceAmount = Math.max(total - paidAmount, 0);

  let paymentStatus = "UNPAID";
  if (paidAmount >= total && total > 0) paymentStatus = "PAID";
  else if (paidAmount > 0) paymentStatus = "CREDIT";

  const handlePrint = () => window.print();

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

  const search = new URLSearchParams(location.search);
  const shouldAutoPrint = search.get("print") === "1";

  useEffect(() => {
    if (shouldAutoPrint && invoice && !autoPrintDone && printRef.current) {
      handlePrint();
      setAutoPrintDone(true);
    }
  }, [shouldAutoPrint, invoice, autoPrintDone]);

  return (
    <div className="invoice-container">
      <div className="invoice-action-bar">
        <button onClick={() => navigate(-1)}>← Back</button>
        <div>
          <button onClick={handleDownloadPDF} className="btn">Download</button>
          <button onClick={handlePrint} className="btn">Print</button>
        </div>
      </div>

      <div ref={printRef} className="invoice-box">
        {/* HEADER */}
        <div className="invoice-header">
          <img
            src="https://image2url.com/images/1762228868711-92532987-d9ed-48dc-902b-ffb845d41cdc.jpeg"
            alt="logo"
            className="mobile-logo"
          />
          <h2>The Wellness Medicines</h2>
          <p>(a unit of wellness pharma)</p>
          <p>
            Shop No 2, Stilt Floor, Tower 9, Prestige Royale Garden Apartment,
            Avalahalli, DB Pura Main Road, Bengaluru-560064
          </p>
          <p>GST NO: 29BHOPS2215K1ZU | DL No: 20-KA-B52-257125</p>
          <p>Mob: 9740050075</p>
        </div>

        {/* CUSTOMER & INVOICE INFO */}
        <div className="invoice-info-block">
          <div>
            <h4>Patient Info</h4>
            <p><strong>Name:</strong> {customer.name || invoice?.patient_name || "-"}</p>
            <p><strong>Address:</strong> {customer.address || invoice?.patient_address || "-"}</p>
            <p><strong>Doctor:</strong> {invoice?.doctor_name || "-"}</p>
          </div>
          <div className="invoice-right">
            <h4>Invoice Info</h4>
            <p><strong>Invoice #:</strong> {invoice.invoice_no || invoice.id}</p>
            <p><strong>Date:</strong>{" "}
              {invoice.invoice_date ? new Date(invoice.invoice_date).toLocaleString() : ""}
            </p>
            <p><strong>Time:</strong>{" "}
              {invoice.invoice_date ? new Date(invoice.invoice_date).toLocaleTimeString() : ""}
            </p>
          </div>
        </div>

        {/* ITEMS TABLE */}
        <table className="invoice-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Item Name</th>
              <th>Batch No</th>
              <th>Exp Dt</th>
              <th className="right">Qty</th>
              <th className="right">MRP</th>
              <th className="right">Rate</th>
              <th className="right">GST</th>
              <th className="right">Amount</th>
              <th>HSN Code</th>
            </tr>
          </thead>
          <tbody>
            {invoice.lines?.map((item, index) => (
              <tr key={index}>
                <td>{index + 1}</td>
                <td>{item.product_name}</td>
                <td>{item.batch_no || item.batch_lot}</td>
                <td>{item.expiry_date || "-"}</td>
                <td className="right">{item.qty_base}</td>
                <td className="right">₹{Number(item.mrp || item.rate_per_base).toFixed(2)}</td>
                <td className="right">₹{Number(item.rate_per_base).toFixed(2)}</td>
                <td className="right">{Number(item.gst_percent || 0)}%</td>
                <td className="right">₹{Number(item.line_total).toFixed(2)}</td>
                <td>{item.hsn_code || "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* TAX & SUMMARY */}
        <div className="invoice-summary">
          <p><strong>Sub Total:</strong> ₹{subtotal.toFixed(2)}</p>
          <p><strong>Discount:</strong> ₹{invoice?.discount || 0}</p>
          <p><strong>GST Amt:</strong> ₹{gstAmount.toFixed(2)}</p>
          <h3>Inv Total: ₹{total.toFixed(2)}</h3>
        </div>

        {/* PAYMENT INFO */}
        <div className="invoice-payment">
          <h4>Payment Details</h4>
          <p><strong>Payment Method:</strong> {paymentMode}</p>
          <p><strong>Status:</strong> {paymentStatus}</p>
          <p><strong>Paid Amount:</strong> ₹{paidAmount.toFixed(2)}</p>
          <p><strong>Balance Amount:</strong> ₹{balanceAmount.toFixed(2)}</p>
        </div>

        {/* FOOTER */}
        <div className="invoice-footer">
          <p>Goods Sold Cannot Be Taken Back.</p>
          <p>Cold storage insulins will not be taken back strictly once sold.</p>
          <p>Pharmacy Timings: 8:00am to 10:00pm</p>
          <p>This is a computer-generated invoice.</p>
        </div>
      </div>
    </div>
  );
}
