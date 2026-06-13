import React from "react";
import "./AccountSettings.css";

function AccountSettingsTab({
  onClearHistory,
  onLogoutAll,
  onDeleteClick,
  isClearingHistory = false,
}) {
  return (
    <div className="settings-content">
      <div className="settings-options">
        <section className="settings-card warning">
          <h3 id="history-title">Clear Chat History</h3>
          <p id="history-desc">
            Delete all your saved conversations across all documents. This action cannot be undone.
          </p>
          <button
            type="button"
            className="settings-btn danger"
            onClick={onClearHistory}
            disabled={isClearingHistory}
            aria-describedby="history-desc"
          >
            {isClearingHistory ? "Clearing..." : "Clear History"}
          </button>
        </section>

        <section className="settings-card">
          <h3 id="logout-title">Logout from All Devices</h3>
          <p id="logout-desc">Secure your account by signing out everywhere you’re logged in.</p>
          <button
            type="button"
            className="settings-btn"
            onClick={onLogoutAll}
            aria-describedby="logout-desc"
          >
            Logout All
          </button>
        </section>

        <section className="settings-card danger-zone">
          <h3 id="delete-title">Delete Account</h3>
          <p id="delete-desc">Once you delete your account, all your data will be permanently removed.</p>
          <button
            type="button"
            className="settings-btn danger"
            onClick={onDeleteClick}
            aria-describedby="delete-desc"
          >
            Delete Account
          </button>
        </section>
      </div>
    </div>
  );
}

export default AccountSettingsTab;