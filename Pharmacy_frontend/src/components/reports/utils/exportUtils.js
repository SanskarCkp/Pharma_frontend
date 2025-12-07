import { authFetch } from "../../../api/http";
import { apiUrl } from "../../../api/base";

const EXPORT_URL = apiUrl("reports/exports/");

/**
 * Parse months from "Last X Months" format
 * @param {string} label - e.g., "Last 6 Months"
 * @returns {number} - e.g., 6
 */
export function getMonthsFromLabel(label) {
  return parseInt(label.replace("Last ", "").replace(" Months", ""));
}

/**
 * Export report to XLSX file
 * @param {string} reportType - e.g., "SALES_REGISTER", "STOCK_LEDGER"
 * @param {object} params - Additional parameters to send
 * @param {function} onError - Optional callback for error handling (message, title)
 */
export async function exportReport(reportType, params = {}, onError = null) {
  try {
    const formData = new FormData();
    formData.append("report_type", reportType);
    formData.append("params", JSON.stringify(params));

    const res = await authFetch(EXPORT_URL, { method: "POST", body: formData });

    if (!res.ok) {
      throw new Error(`Export failed (${res.status})`);
    }

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${reportType.toLowerCase()}-${Date.now()}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  } catch (err) {
    const message = err.message || "Export failed";
    if (onError && typeof onError === 'function') {
      onError(message, "Export Error");
    } else {
      // Fallback to console.error if no callback provided
      console.error(message);
    }
    throw err;
  }
}
