import React from "react";

function DeleteAccountModal({
  isOpen,
  isDeleting,
  onConfirm,
  onCancel,
}) {
  if (!isOpen) return null;

  return (
    <div
      className="modal-overlay"
      onClick={onCancel}
      role="presentation"
      tabIndex={-1}
    >
      <div
        className="modal-container"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-modal-title"
        aria-describedby="delete-modal-desc"
      >
        <h3 id="delete-modal-title">
          Confirm Account Deletion
        </h3>

        <p id="delete-modal-desc">
          Are you sure you want to permanently delete your
          account?
          <br />
          This action <strong>cannot</strong> be undone.
        </p>

        <div className="modal-actions">
          <button
            type="button"
            className="modal-btn danger"
            onClick={onConfirm}
            disabled={isDeleting}
          >
            {isDeleting ? "Deleting..." : "Yes, Delete"}
          </button>

          <button
            type="button"
            className="modal-btn secondary"
            onClick={onCancel}
            disabled={isDeleting}
            autoFocus
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

export default DeleteAccountModal;
