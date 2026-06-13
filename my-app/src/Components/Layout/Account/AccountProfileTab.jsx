import React from "react";

function AccountProfileTab({
  user,
  isEditing,
  isSaving,
  formData,
  handleChange,
  handleSave,
  onCancel,
  onEdit,
  onClose,
  joinedDate,
  lastLogin,
  passwordRef,
  confirmPasswordRef,
  showNewPassword,
  setShowNewPassword,
  showConfirmPassword,
  setShowConfirmPassword,
}) {
  const renderPasswordInput = (id, label, ref, showState, setShowState) => (
    <div className="edit-field">
      <label htmlFor={id}>{label}</label>
      <div className="password-field">
        <input
          id={id}
          type={showState ? "text" : "password"}
          ref={ref}
          className="edit-input"
          placeholder={label}
          autoComplete="new-password"
        />
        <button
          type="button"
          className="toggle-visibility"
          aria-label={showState ? "Hide password" : "Show password"}
          onClick={() => setShowState((v) => !v)}
          disabled={isSaving}
        >
          {showState ? (
            <span role="img" aria-hidden="true">🙈</span>
          ) : (
            <span role="img" aria-hidden="true">👁️</span>
          )}
        </button>
      </div>
    </div>
  );

  const isJoinedPlaceholder = !joinedDate || joinedDate === "—";
  const joinedDisplay = isJoinedPlaceholder ? "Not set yet" : joinedDate;

  const isLastLoginPlaceholder = !lastLogin || lastLogin === "Never";
  const lastLoginDisplay = isLastLoginPlaceholder ? "Never logged in" : lastLogin;

  const handleSubmit = (e) => {
    e.preventDefault();
    handleSave();
  };

  if (isEditing) {
    return (
      <form onSubmit={handleSubmit}>
        <div className="account-header">
          <div className="account-header-info">
            <div className="edit-fields-row">
              <div className="edit-field">
                <label htmlFor="acc-name">Name</label>
                <input
                  id="acc-name"
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className="edit-input"
                  placeholder="Username"
                  autoComplete="name"
                  maxLength={15}
                />
              </div>

              <div className="edit-field">
                <label htmlFor="acc-email">Email</label>
                <input
                  id="acc-email"
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="edit-input"
                  placeholder="Email"
                  autoComplete="email"
                />
              </div>
            </div>

            <div className="edit-fields-row">
              {renderPasswordInput(
                "acc-new-password",
                "New Password",
                passwordRef,
                showNewPassword,
                setShowNewPassword
              )}

              {renderPasswordInput(
                "acc-confirm-password",
                "Confirm Password",
                confirmPasswordRef,
                showConfirmPassword,
                setShowConfirmPassword
              )}
            </div>
          </div>
        </div>

        <div className="account-actions">
          <button
            type="submit"
            className="account-btn primary"
            disabled={isSaving}
          >
            {isSaving ? "Saving..." : "Save Changes"}
          </button>

          <button
            type="button"
            className="account-btn secondary"
            onClick={onCancel}
            disabled={isSaving}
          >
            {isSaving ? "Please wait" : "Cancel"}
          </button>
        </div>
      </form>
    );
  }

  return (
    <>
      <div className="account-header">
        <div className="account-header-info">
          <h2 className="account-name">{user.name}</h2>
          <p className="account-email">{user.email}</p>
        </div>
      </div>

      <div className="account-details">
        <div className="detail-row">
          <span className="detail-label">Joined:</span>
          <span
            className={`detail-value ${
              isJoinedPlaceholder ? "detail-placeholder" : ""
            }`}
          >
            {joinedDisplay}
          </span>
        </div>

        <div className="detail-row">
          <span className="detail-label">Last Login:</span>
          <span
            className={`detail-value ${
              isLastLoginPlaceholder ? "detail-placeholder" : ""
            }`}
          >
            {lastLoginDisplay}
          </span>
        </div>
      </div>

      <div className="account-actions">
        <button
          type="button"
          className="account-btn primary"
          onClick={onEdit}
        >
          Edit Profile
        </button>

        <button
          type="button"
          className="account-btn secondary"
          onClick={onClose}
        >
          Close
        </button>
      </div>
    </>
  );
}

export default AccountProfileTab;