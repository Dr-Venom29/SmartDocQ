import React, { useEffect, useState } from "react";
import { GoogleLogin } from "@react-oauth/google";
import { useToast } from "../Toast/ToastContext";
import PasswordStrength from "./PasswordStrength";
import { useNavigate } from "react-router-dom";

export default function SignupForm({
  signupData,
  errors,
  loading,
  showPassword,
  passwordStrength,
  getRef,
  handleChange,
  handleSubmit,
  togglePasswordVisibility,
  handleGoogleSuccess,
  onClose,
}) {
  const { showToast } = useToast();

  const navigate = useNavigate();

  const [isMobile, setIsMobile] = useState(false);
  const [showEmailForm, setShowEmailForm] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const checkIsMobile = () => setIsMobile(window.innerWidth <= 768);
    checkIsMobile();
    window.addEventListener("resize", checkIsMobile);
    return () => window.removeEventListener("resize", checkIsMobile);
  }, []);

  const handleSignupChange = (e) => handleChange(e, "signup");
  const handleSignupSubmit = (e) => handleSubmit(e, "signup");
  const toggleSignup = () => togglePasswordVisibility("signup");
  const toggleConfirm = () => togglePasswordVisibility("confirm");

  return (
    <div className="form-content">
      <h2 className="form-title">Create account</h2>
      <p className="form-subtitle">join smartdocq today →</p>

      <form onSubmit={handleSignupSubmit}>
        {isMobile && !showEmailForm && (
          <>
            <div
              className={`google-btn-wrapper ${loading ? "google-disabled" : ""}`}
              aria-disabled={loading}
            >
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={() => showToast("Google Sign-In Failed", { type: "error" })}
                theme="filled_black" size="large"
                text="continue_with" shape="rectangular" width="100%"
              />
            </div>

            <div className="divider"><span>or</span></div>

            <button
              type="button"
              className="email-toggle-btn"
              onClick={() => setShowEmailForm(true)}
            >
              Log in with Email
            </button>
          </>
        )}

        {(!isMobile || showEmailForm) && (
          <>
            <div className="input-group" style={{ marginTop: !isMobile ? "12px" : "16px" }}>
              <label htmlFor="signup-email">Email</label>
              <input
                id="signup-email"
                ref={getRef("email")}
                type="email" name="email" placeholder="you@example.com"
                value={signupData.email}
                onChange={handleSignupChange}
                disabled={loading}
                className={errors.email ? "input-error" : ""}
                autoComplete="email"
              />
              {errors.email && <span className="error-message">{errors.email}</span>}
            </div>

            <div className="password-row" style={{ marginTop: "12px" }}>
              <div className="input-group">
                <label htmlFor="signup-password">Password</label>
                <div className="password-input-wrapper">
                  <input
                    id="signup-password"
                    ref={getRef("password")}
                    type={showPassword.signup ? "text" : "password"}
                    name="password" placeholder="••••••••"
                    value={signupData.password}
                    onChange={handleSignupChange}
                    disabled={loading}
                    className={errors.password ? "input-error" : ""}
                    autoComplete="new-password"
                  />
                  <button type="button" className="password-toggle-btn"
                    onClick={toggleSignup}
                    disabled={loading}
                    aria-label="Toggle password visibility">
                    {showPassword.signup ? "🙈" : "👁️"}
                  </button>
                </div>
                {errors.password && <span className="error-message">{errors.password}</span>}
              </div>

              <div className="input-group">
                <label htmlFor="signup-confirm">Confirm</label>
                <div className="password-input-wrapper">
                  <input
                    id="signup-confirm"
                    ref={getRef("confirmPassword")}
                    type={showPassword.confirm ? "text" : "password"}
                    name="confirmPassword" placeholder="••••••••"
                    value={signupData.confirmPassword}
                    onChange={handleSignupChange}
                    disabled={loading}
                    className={errors.confirmPassword ? "input-error" : ""}
                    autoComplete="new-password"
                  />
                  <button type="button" className="password-toggle-btn"
                    onClick={toggleConfirm}
                    disabled={loading}
                    aria-label="Toggle password visibility">
                    {showPassword.confirm ? "🙈" : "👁️"}
                  </button>
                </div>
                {errors.confirmPassword && <span className="error-message">{errors.confirmPassword}</span>}
              </div>
            </div>

            <PasswordStrength password={signupData.password} strength={passwordStrength} />

            <div className="auth-submit-wrapper">
              <button type="submit" className="submit-btn" disabled={loading}>
                {loading ? "Creating account..." : "Create Account"}
              </button>
            </div>
          </>
        )}

        {!isMobile && (
          <>
            <div className="divider"><span>or continue with</span></div>

            <div
              className={`google-btn-wrapper ${loading ? "google-disabled" : ""}`}
              aria-disabled={loading}
            >
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={() => showToast("Google Sign-In Failed", { type: "error" })}
                theme="filled_black" size="large"
                text="continue_with" shape="rectangular" width="100%"
              />
            </div>
          </>
        )}

        <p className="auth-legal-text">
          By creating an account, you agree to our
          {" "}
          <button
            type="button"
            className="auth-legal-link"
            onClick={() => {
              if (onClose) onClose();
              navigate("/terms");
            }}
          >
            Terms of Service
          </button>
          {" "}
          and
          {" "}
          <button
            type="button"
            className="auth-legal-link"
            onClick={() => {
              if (onClose) onClose();
              navigate("/privacy");
            }}
          >
            Privacy Policy
          </button>
          .
        </p>
      </form>
    </div>
  );
}