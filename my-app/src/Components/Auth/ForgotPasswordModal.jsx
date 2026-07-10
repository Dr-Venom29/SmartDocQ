import React, { useState } from "react";
import { forgotPassword } from "../../Services/AuthService";
import { useToast } from "../Toast/ToastContext";

export default function ForgotPasswordModal({ onClose }) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();

    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      showToast("Please enter your email", { type: "error" });
      return;
    }

    if (!/\S+@\S+\.\S+/.test(trimmedEmail)) {
      showToast("Please enter a valid email address", { type: "error" });
      return;
    }

    setLoading(true);
    try {
      const { ok, data } = await forgotPassword(trimmedEmail);
      if (ok) {
        showToast(data.message || "If account exists, email sent", { type: "success" });
        if (onClose) onClose();
      } else {
        showToast(data.message || "Failed to send reset link", { type: "error" });
      }
    } catch (err) {
      showToast("Failed to send reset link", { type: "error" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="form-content">
      <h2 className="form-title">Forgot password</h2>
      <p className="form-subtitle">Enter your email to receive a reset link</p>

      <form onSubmit={handleSubmit}>
        <div className="input-group">
          <label htmlFor="forgot-email">Email</label>
          <input
            id="forgot-email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
            autoComplete="email"
            autoFocus
          />
        </div>

        <div className="auth-submit-wrapper" style={{ marginTop: "16px" }}>
          <button type="submit" className="submit-btn" disabled={loading}>
            {loading ? "Sending..." : "Send reset link"}
          </button>
        </div>

        <div className="auth-secondary-actions" style={{ marginTop: "12px" }}>
          <button
            type="button"
            className="auth-link-button"
            onClick={onClose}
            disabled={loading}
          >
            Back to sign in
          </button>
        </div>
      </form>
    </div>
  );
}
