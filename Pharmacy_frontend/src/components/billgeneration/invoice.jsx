import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import styles from "./invoice.module.css";
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

  // Second useEffect for auto-print - must be defined before any conditional returns
  useEffect(() => {
    const search = new URLSearchParams(location.search);
    const shouldAutoPrint = search.get("print") === "1";

    if (shouldAutoPrint && invoice && !autoPrintDone && printRef.current) {
      window.print();
      setAutoPrintDone(true);
    }
  }, [invoice, autoPrintDone, location.search]);

  // Early returns after all hooks
  if (!invoice && !error) return <p className={styles.loading}>Loading invoice...</p>;
  if (error)
    return (
      <div className={styles.invoiceContainer}>
        <p className={styles.error}>{error}</p>
        <button className={styles.backBtn} onClick={() => navigate(-1)}>
          <ArrowLeft size={18} />
          Back
        </button>
      </div>
    );

  const customer = invoice?.customer_detail || {};

  const subtotal = Number(invoice?.gross_total || 0);
  const gstAmount = Number(invoice?.tax_total || 0);
  const total = Number(invoice?.net_total || 0);
  const discount = Number(invoice?.discount || 0);

  const handlePrint = () => window.print();

  const handleDownloadPDF = async () => {
    try {
      if (!printRef.current) return;
      
      const element = printRef.current;
      const actionBar = document.querySelector(`.${styles.invoiceActionBar}`);
      
      // Hide action bar
      if (actionBar) {
        actionBar.style.display = 'none';
      }

      // Ensure element is in view
      element.scrollIntoView({ behavior: 'instant', block: 'start' });
      await new Promise(resolve => setTimeout(resolve, 300));

      // Capture with minimal options for reliability
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
        removeContainer: false,
      });

      // Restore action bar
      if (actionBar) {
        actionBar.style.display = '';
      }

      // Convert to PDF
      const imgData = canvas.toDataURL("image/png", 1.0);
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4"
      });
      
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 2;
      const imgWidth = pageWidth - (margin * 2);
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      // Handle multi-page
      let heightLeft = imgHeight;
      let position = margin;

      pdf.addImage(imgData, "PNG", margin, position, imgWidth, imgHeight);
      heightLeft -= (pageHeight - margin * 2);

      while (heightLeft > 0) {
        position = margin - (imgHeight - heightLeft);
        pdf.addPage();
        pdf.addImage(imgData, "PNG", margin, position, imgWidth, imgHeight);
        heightLeft -= (pageHeight - margin * 2);
      }

      pdf.save(`${invoice?.invoice_no || "invoice"}.pdf`);
    } catch (error) {
      console.error("Error generating PDF:", error);
      alert("Failed to generate PDF: " + error.message);
    }
  };

  const totalQty = invoice.lines?.reduce((sum, item) => sum + Number(item.qty_base || 0), 0) || 0;

  return (
    <div className={styles.invoiceContainer}>
      <div className={styles.invoiceActionBar}>
        <button className={styles.backBtn} onClick={() => navigate(-1)}>
          <ArrowLeft size={18} />
          Back
        </button>
        <div className={styles.actionButtons}>
          <button onClick={handleDownloadPDF} className={styles.btn}>Download PDF</button>
          <button onClick={handlePrint} className={styles.btn}>Print</button>
        </div>
      </div>

      <div ref={printRef} className={styles.invoiceBox}>
        {/* HEADER */}
        <div className={styles.invoiceHeader}>
          <div className={styles.leftSection}>
            <div className={styles.logoSection}>
              <img
                src="https://image2url.com/images/1762228868711-92532987-d9ed-48dc-902b-ffb845d41cdc.jpeg"
                alt="logo"
                className={styles.mobileLogo}
              />
            </div>
            <div className={styles.companyInfo}>
              <h2 className={styles.companyName}>Keshav Medicals</h2>
              <p className={styles.companySubtitle}>(a unit of wellness pharma)</p>
              <p className={styles.companyAddress}>
                Shop No 2, Stilt Floor, Tower 9, Prestige Royale Garden Apartment,<br />
                Avalahalli, DB Pura Main Road, Bengaluru-560064
              </p>
              <p className={styles.companyDetails}>
                GST NO: 29BHOPS2215K1ZU | DL No: 20-KA-B52-257125
              </p>
              <p className={styles.companyDetails}>Mob: 9740050075</p>
            </div>
          </div>

          <div className={styles.rightSection}>
            <div className={styles.patientInfo}>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Patient :</span>
                <span className={styles.infoValue}>{customer.name || invoice?.patient_name || "John Doe"}</span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Address :</span>
                <span className={styles.infoValue}>{customer.address || invoice?.patient_address || "#8164, PRG"}</span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Doctor :</span>
                <span className={styles.infoValue}>{invoice?.doctor_name || "DR SPANDANA PEDDAREDDY"}</span>
              </div>
            </div>
            <div className={styles.invoiceInfo}>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Invoice No :</span>
                <span className={styles.infoValue}>{invoice.invoice_no || `INV-0002`}</span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Date :</span>
                <span className={styles.infoValue}>
                  {invoice.invoice_date ? new Date(invoice.invoice_date).toLocaleDateString('en-GB') : "11/07/2025"}
                </span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Time :</span>
                <span className={styles.infoValue}>
                  {invoice.invoice_date ? new Date(invoice.invoice_date).toLocaleTimeString('en-GB', { hour12: false }) : "10:05:00"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ITEMS TABLE */}
        <table className={styles.itemsTable}>
          <thead>
            <tr>
              <th className={styles.srNo}>Sr.No</th>
              <th>Item Name</th>
              <th className={styles.textCenter}>Batch No.</th>
              <th className={styles.textCenter}>Exp Dt</th>
              <th className={styles.textRight}>Qty</th>
              <th className={styles.textRight}>MRP</th>
              <th className={styles.textRight}>Rate</th>
              <th className={styles.textRight}>GST</th>
              <th className={styles.textRight}>Amount</th>
              <th className={styles.textCenter}>HSN Code</th>
            </tr>
          </thead>
          <tbody>
            {invoice.lines?.map((item, index) => (
              <tr key={index}>
                <td className={styles.textCenter}>{index + 1}</td>
                <td>{item.product_name}</td>
                <td className={styles.textCenter}>{item.batch_no || item.batch_lot || "-"}</td>
                <td className={styles.textCenter}>{item.expiry_date || "-"}</td>
                <td className={styles.textRight}>{item.qty_base}</td>
                <td className={styles.textRight}>{Number(item.mrp || item.rate_per_base).toFixed(2)}</td>
                <td className={styles.textRight}>{Number(item.rate_per_base).toFixed(2)}</td>
                <td className={styles.textRight}>{Number(item.gst_percent || 0).toFixed(2)}</td>
                <td className={styles.textRight}>{Number(item.line_total).toFixed(2)}</td>
                <td className={styles.textCenter}>{item.hsn_code || "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* TOTALS SUMMARY */}
        <div className={styles.totalsSummarySection}>
          <div className={styles.totalItemsInfo}>
            Total Item : {invoice.lines?.length || 0} | Total Qty : {totalQty.toFixed(3)}
          </div>

          <div className={styles.amountSummary}>
            <div className={styles.summaryRow}>
              <span className={styles.summaryLabel}>Sub Total:</span>
              <span className={styles.summaryValue}>{subtotal.toFixed(2)}</span>
            </div>
            <div className={styles.summaryRow}>
              <span className={styles.summaryLabel}>Discount:</span>
              <span className={styles.summaryValue}>{discount.toFixed(2)}</span>
            </div>
            <div className={styles.summaryRow}>
              <span className={styles.summaryLabel}>CGST:</span>
              <span className={styles.summaryValue}>{(gstAmount / 2).toFixed(2)}</span>
            </div>
            <div className={styles.summaryRow}>
              <span className={styles.summaryLabel}>SGST:</span>
              <span className={styles.summaryValue}>{(gstAmount / 2).toFixed(2)}</span>
            </div>
            <div className={`${styles.summaryRow} ${styles.totalRow}`}>
              <span className={styles.summaryLabel}>Inv Total:</span>
              <span className={styles.summaryValue}>{total.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* TERMS AND CONDITIONS + FOOTER IN ONE ROW */}
        <div className={styles.termsFooterSection}>
          <div className={styles.termsSection}>
            <div className={styles.termsTitle}>Terms & Conditions:</div>
            <ol className={styles.termsList}>
              <li>Goods Sold Cannot Be Taken Back.</li>
              <li>Cold storage insulins will not be taken back strictly once sold.</li>
              <li>Pharmacy Timings: 8:00am to 10:00pm.</li>
            </ol>
          </div>

          <div className={styles.invoiceFooter}>
            <div className={styles.footerLeft}>
              <div className={styles.pageInfo}>Page 1 of 1</div>
            </div>
            <div className={styles.pharmacistSignature}>
              <div className={styles.signatureLabel}>For Wellness Pharma</div>
              <div className={styles.pharmacistLabel}>Pharmacist:</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
