import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "../Toast/ToastContext";
import { loginUser, signupUser, submitGoogleAuth } from "../../Services/AuthService";

// ---------------------------------------------------------------------------
// Pure helpers (no React)
// ---------------------------------------------------------------------------

const calculatePasswordStrength = (password) => {
  if (!password) return { score: 0, label: "", requirements: {} };

  const requirements = {
    length:    password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number:    /[0-9]/.test(password),
    special:   /[^A-Za-z0-9]/.test(password),
  };

  const score =
    (requirements.length    ? 25 : 0) +
    (requirements.uppercase ? 20 : 0) +
    (requirements.lowercase ? 15 : 0) +
    (requirements.number    ? 20 : 0) +
    (requirements.special   ? 20 : 0);

  const label = score < 40 ? "Weak" : score < 70 ? "Medium" : "Strong";
  return { score, label, requirements };
};

/**
 * Client-side pre-validation before hitting the server.
 * NOTE: The server enforces the real rules via Zod (8+ chars, special chars, etc).
 * This is only a lightweight UX gate — keep it loose so it never blocks
 * valid passwords that Zod would accept.
 */
const validateForm = (type, loginData, signupData) => {
  const errors = {};
  const data = type === "login" ? loginData : signupData;

  if (!data.email.trim()) {
    errors.email = "Email is required";
  } else if (!/\S+@\S+\.\S+/.test(data.email)) {
    errors.email = "Invalid email";
  }

  if (!data.password.trim()) {
    errors.password = "Password is required";
  }

  if (type === "signup") {
    if (!data.confirmPassword.trim()) {
      errors.confirmPassword = "Please confirm your password";
    } else if (data.password !== data.confirmPassword) {
      errors.confirmPassword = "Passwords do not match";
    }
  }

  return errors;
};

// ---------------------------------------------------------------------------
// Initial state constants
// ---------------------------------------------------------------------------

const INITIAL_LOGIN   = { email: "", password: "" };
const INITIAL_SIGNUP  = { email: "", username: "", password: "", confirmPassword: "" };
const INITIAL_STRENGTH = { score: 0, label: "", requirements: {} };
const INITIAL_VISIBILITY = { login: false, signup: false, confirm: false };

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useAuthForm({ onAuthSuccess, initialMode }) {
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [isLogin, setIsLogin]               = useState(initialMode !== "signup");
  const [loginData, setLoginData]           = useState(INITIAL_LOGIN);
  const [signupData, setSignupData]         = useState(INITIAL_SIGNUP);
  const [errors, setErrors]                 = useState({});
  const [loading, setLoading]               = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(INITIAL_STRENGTH);
  const [showPassword, setShowPassword]     = useState(INITIAL_VISIBILITY);

  const firstErrorRef = useRef(null);

  // Sync mode when parent changes initialMode
  useEffect(() => {
    setIsLogin(initialMode !== "signup");
  }, [initialMode]);

  // Focus the first error field after validation runs
  useEffect(() => {
    if (firstErrorRef.current) {
      firstErrorRef.current.focus();
      firstErrorRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [errors]);

  // ---------------------------------------------------------------------------
  // Auth success handler (shared by password and Google flows)
  // ---------------------------------------------------------------------------
  const handleAuthSuccess = useCallback((user, successMessage) => {
    if (user) {
      try {
        localStorage.setItem("user", JSON.stringify(user));
      } catch (err) {
        console.warn("Could not persist user to localStorage:", err);
      }
    }

    if (user?.isAdmin) {
      showToast("Welcome Admin! Redirecting to admin panel...", { type: "success" });
      setTimeout(() => navigate("/admin"), 1000);
    } else {
      showToast(successMessage, { type: "success" });
      onAuthSuccess(user || {});
    }
  }, [navigate, onAuthSuccess, showToast]);

  // ---------------------------------------------------------------------------
  // Field change handler
  // ---------------------------------------------------------------------------
  const handleChange = useCallback((e, type) => {
    const { name, value } = e.target;
    const setter = type === "login" ? setLoginData : setSignupData;

    setter(prev => ({ ...prev, [name]: value }));

    // Clear the error for this field as the user types
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: "" }));

    // Live password strength only on signup
    if (type === "signup" && name === "password") {
      setPasswordStrength(calculatePasswordStrength(value));
    }
  }, [errors]);

  const togglePasswordVisibility = useCallback((field) => {
    setShowPassword(prev => ({ ...prev, [field]: !prev[field] }));
  }, []);

  // Returns a ref for the first field that has an error (for focus management)
  const getRef = useCallback((field) => errors[field] ? firstErrorRef : null, [errors]);

  // ---------------------------------------------------------------------------
  // Email/password submit
  // ---------------------------------------------------------------------------
  const handleSubmit = useCallback(async (e, type) => {
    e.preventDefault();

    const formErrors = validateForm(type, loginData, signupData);
    if (Object.keys(formErrors).length > 0) {
      setErrors(formErrors);
      return;
    }

    const payload = type === "login"
      ? loginData
      : {
          name:     (signupData.username || "User").trim() || "User",
          email:    signupData.email,
          password: signupData.password,
        };

    setLoading(true);
    try {
      const { ok, status, data } = type === "login"
        ? await loginUser(payload)
        : await signupUser(payload);

      if (ok) {
        if (type === "login") {
          handleAuthSuccess(data.user, "Login successful");
          setLoginData(INITIAL_LOGIN);
        } else {
          showToast("Signup successful! Please login.", { type: "success" });
          setSignupData(INITIAL_SIGNUP);
          setIsLogin(true);
        }
      } else {
        // 403 = deactivated account; surface a specific message
        const message = status === 403
          ? "Your account is deactivated. Please contact support."
          : data.message || (type === "login" ? "Login failed" : "Signup failed");

        showToast(message, { type: "error" });
      }
    } catch (err) {
      console.error(`${type} error:`, err);
      showToast("Server error. Please try again.", { type: "error" });
    } finally {
      setLoading(false);
    }
  }, [handleAuthSuccess, loginData, showToast, signupData]);

  // ---------------------------------------------------------------------------
  // Google OAuth submit
  // ---------------------------------------------------------------------------
  const handleGoogleSuccess = useCallback(async (credentialResponse) => {
    setLoading(true);
    try {
      const { ok, data } = await submitGoogleAuth(credentialResponse.credential);

      if (ok) {
        handleAuthSuccess(data.user, "Signed in with Google successfully!");
      } else {
        showToast(data.message || "Google Sign-In failed", { type: "error" });
      }
    } catch (err) {
      console.error("Google Sign-In error:", err);
      showToast("Google Sign-In failed. Please try again.", { type: "error" });
    } finally {
      setLoading(false);
    }
  }, [handleAuthSuccess, showToast]);

  // ---------------------------------------------------------------------------
  // Utility: full reset (e.g. on modal close)
  // ---------------------------------------------------------------------------
  const resetForms = useCallback(() => {
    setLoginData(INITIAL_LOGIN);
    setSignupData(INITIAL_SIGNUP);
    setErrors({});
    setPasswordStrength(INITIAL_STRENGTH);
    setShowPassword(INITIAL_VISIBILITY);
  }, []);

  // ---------------------------------------------------------------------------
  // Utility: switch between login / signup tabs
  // ---------------------------------------------------------------------------
  const switchMode = useCallback((mode) => {
    setErrors({});
    if (mode === "login") {
      setIsLogin(true);
      setLoginData(INITIAL_LOGIN);
      setShowPassword(prev => ({ ...prev, login: false }));
    } else {
      setIsLogin(false);
      setSignupData(INITIAL_SIGNUP);
      setPasswordStrength(INITIAL_STRENGTH);
      setShowPassword(prev => ({ ...prev, signup: false, confirm: false }));
    }
  }, []);

  return {
    isLogin,
    setIsLogin,
    loginData,
    signupData,
    errors,
    loading,
    passwordStrength,
    showPassword,
    handleChange,
    handleSubmit,
    handleGoogleSuccess,
    togglePasswordVisibility,
    resetForms,
    switchMode,
    getRef,
  };
}