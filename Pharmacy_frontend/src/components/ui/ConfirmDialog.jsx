import React from "react";
import "./ConfirmDialog.css";

const ConfirmDialog = ({ open, onOpenChange, title, description, onConfirm, confirmText = "Confirm", cancelText = "Cancel", variant = "default" }) => {
  if (!open) return null;

  const handleConfirm = () => {
    onConfirm();
    onOpenChange(false);
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  return (
    <div className="confirm-dialog-overlay" onClick={handleCancel}>
      <div className="confirm-dialog-content" onClick={(e) => e.stopPropagation()}>
        <div className="confirm-dialog-header">
          {title && <h3 className="confirm-dialog-title">{title}</h3>}
        </div>
        {description && (
          <div className="confirm-dialog-description">
            {description}
          </div>
        )}
        <div className="confirm-dialog-footer">
          <button
            className="confirm-dialog-btn cancel-btn"
            onClick={handleCancel}
          >
            {cancelText}
          </button>
          <button
            className={`confirm-dialog-btn confirm-btn ${variant}`}
            onClick={handleConfirm}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;

