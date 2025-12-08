import React from "react";
import { useAuth } from "../../context/AuthContext";

const SUPPORT_EMAIL = "support@ckpsoftware.com";

const formatDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

const LicenseBanner = () => {
  const { licenseDaysLeft, licenseValidTo } = useAuth();
  console.log("[LicenseBanner] licenseDaysLeft:", licenseDaysLeft, "licenseValidTo:", licenseValidTo);

  if (licenseDaysLeft === null || licenseDaysLeft === undefined) {
    return null;
  }

  const numericDays = Number(licenseDaysLeft);
  if (Number.isNaN(numericDays) || numericDays > 7) {
    return null;
  }

  const expired = numericDays <= 0;
  const formattedDate = formatDate(licenseValidTo);

  const message = expired
    ? `Your license is inactive${formattedDate ? ` as of ${formattedDate}` : ""
      }. Please contact ${SUPPORT_EMAIL} to renew.`
    : `Your license will expire on ${
        formattedDate || "the upcoming renewal date"
      }. Please contact ${SUPPORT_EMAIL} to renew.`;

  const baseClasses = "w-full px-4 py-2 text-sm font-medium text-center";
  const palette = expired
    ? "bg-red-600 text-white"
    : "bg-amber-100 text-amber-900 border border-amber-200";

  return (
    <div className={`${baseClasses} ${palette}`} role="status" aria-live="polite">
      {message}
    </div>
  );
};

export default LicenseBanner;
