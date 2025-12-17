import React from "react";
import "./ConfirmDialog.css";

const ConfirmDialog = ({ open, onOpenChange, title, description, onConfirm, confirmText = "Confirm", cancelText = "Cancel", variant = "default", cancelAction }) => {
  if (!open) return null;

  const handleConfirm = async () => {
    const result = onConfirm();
    // If it's a promise, wait for it
    if (result && typeof result.then === 'function') {
      await result;
    }
    onOpenChange(false);
  };

  const handleCancel = async () => {
    if (cancelAction) {
      // Call cancelAction first (it may be async), then close dialog
      const result = cancelAction();
      // If it's a promise, wait for it
      if (result && typeof result.then === 'function') {
        await result;
      }
    }
    // Always close the dialog
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

