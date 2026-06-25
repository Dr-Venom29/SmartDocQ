import React from "react";
import { GoogleLogin } from "@react-oauth/google";
import { useToast } from "../ToastContext";

export default function LoginForm({
  loginData,
  errors,
  loading,
  showPassword,
  getRef,
  handleChange,
  handleSubmit,
  togglePasswordVisibility,
  handleGoogleSuccess,
  onForgotPassword,
}) {
  const { showToast } = useToast();

  const handleLoginChange = (e) => handleChange(e, "login");
  const handleLoginSubmit = (e) => handleSubmit(e, "login");
  const toggleLogin = () => togglePasswordVisibility("login");
  const handleGoogleError = () => showToast("Google Sign-In Failed", { type: "error" });

  return (
    <div className="form-content">
      <h2 className="form-title">Welcome back</h2>
      <p className="form-subtitle">sign in to continue →</p>

      <form onSubmit={handleLoginSubmit}>
        <div className="input-group">
          <label htmlFor="login-email">Email</label>
          <input
            id="login-email"
            ref={getRef("email")}
            type="email" name="email" placeholder="you@example.com"
            value={loginData.email}
            onChange={handleLoginChange}
            disabled={loading}
            className={errors.email ? "input-error" : ""}
            autoComplete="email"
          />
          {errors.email && <span className="error-message">{errors.email}</span>}
        </div>

        <div className="input-group" style={{ marginTop: "12px" }}>
          <label htmlFor="login-password">Password</label>
          <div className="password-input-wrapper">
            <input
              id="login-password"
              ref={getRef("password")}
              type={showPassword.login ? "text" : "password"}
              name="password" placeholder="••••••••"
              value={loginData.password}
              onChange={handleLoginChange}
              disabled={loading}
              className={errors.password ? "input-error" : ""}
              autoComplete="current-password"
            />
            <button type="button" className="password-toggle-btn"
              onClick={toggleLogin}
              disabled={loading}
              aria-label="Toggle password visibility">
              {showPassword.login ? "🙈" : "👁️"}
            </button>
          </div>
          {errors.password && <span className="error-message">{errors.password}</span>}
        </div>

        <div className="auth-secondary-actions">
          <button
            type="button"
            className="auth-link-button"
            onClick={onForgotPassword}
            disabled={loading}
          >
            Forgot password?
          </button>
        </div>

        <div className="auth-submit-wrapper">
          <button type="submit" className="submit-btn" disabled={loading}>
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </div>

        <div className="divider"><span>or continue with</span></div>

        <div
          className={`google-btn-wrapper ${loading ? "google-disabled" : ""}`}
          aria-disabled={loading}
        >
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={handleGoogleError}
            theme="filled_black" size="large"
            text="signin_with" shape="rectangular" width="100%"
          />
        </div>
      </form>
    </div>
  );
}