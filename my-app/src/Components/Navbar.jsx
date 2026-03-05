import React, { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { useNavigate, useLocation } from "react-router-dom";
import "./navbar.css";
import logo from "./logo.png";
import Login from "./Login";
import Contact from "./Contact";
import icon from "./icon1.png";
import lg from "./lg.png";
import lg1 from "./lg1.png";
import Account from "./Account";
import { useToast } from "./ToastContext";
import { apiFetch } from "../config";
import ClickSpark from "./Effects/ClickSpark";

/* ============================================================================
 * USER DATA VALIDATION UTILITIES
 * Provides secure parsing and validation of user data from localStorage.
 * Prevents XSS attacks and handles corrupted/malformed data gracefully.
 * ============================================================================ */

/**
 * Safely parses and validates user data from a JSON string.
 * Implements strict type checking and field validation to prevent
 * security vulnerabilities from malformed or malicious data.
 * 
 * @param {string|null} jsonStr - Raw JSON string from localStorage
 * @returns {Object|null} Sanitized user object or null if invalid
 */
const safeParseUser = (jsonStr) => {
  if (!jsonStr || typeof jsonStr !== "string") return null;
  
  try {
    const parsed = JSON.parse(jsonStr);
    
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return null;
    }
    
    const { _id, id, email, name } = parsed;
    const userId = _id || id;
    
    if (!userId || typeof userId !== "string") return null;
    if (!email || typeof email !== "string" || !email.includes("@")) return null;
    if (!name || typeof name !== "string" || name.trim().length === 0) return null;
    
    return {
      _id: userId,
      id: userId,
      email: email.trim().toLowerCase(),
      name: name.trim(),
      avatar: typeof parsed.avatar === "string" ? parsed.avatar : null,
      role: typeof parsed.role === "string" ? parsed.role : "user",
    };
  } catch {
    return null;
  }
};

/**
 * Removes invalid user data from localStorage.
 * Called when corrupted data is detected during initialization.
 */
const clearInvalidUserData = () => {
  try {
    localStorage.removeItem("user");
  } catch {
    // Storage API unavailable (private browsing, etc.)
  }
};

/* ============================================================================
 * NAVBAR COMPONENT
 * Main navigation bar with authentication, mobile responsiveness,
 * and accessible dialog management for login, contact, and account modals.
 * ============================================================================ */

function Navbar() {
  // Authentication and UI state
  const [popup, setPopup] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Routing hooks
  const navigate = useNavigate();
  const location = useLocation();
  
  // DOM references
  const profileRef = useRef();
  
  // Toast notifications
  const { showToast } = useToast();

  /* --------------------------------------------------------------------------
   * INITIALIZATION: Load and validate user from localStorage
   * -------------------------------------------------------------------------- */
  useEffect(() => {
    try {
      const savedUser = localStorage.getItem("user");
      const parsed = safeParseUser(savedUser);
      
      if (savedUser && !parsed) {
        clearInvalidUserData();
      }
      setUser(parsed);
    } catch {
      setUser(null);
    }
    setLoading(false);
  }, []);

  /* --------------------------------------------------------------------------
   * CLICK OUTSIDE HANDLER: Close profile dropdown when clicking elsewhere
   * -------------------------------------------------------------------------- */
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setShowProfileMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  /* --------------------------------------------------------------------------
   * SCROLL LOCK & KEYBOARD: Lock body scroll when modals open, ESC to close
   * -------------------------------------------------------------------------- */
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === "Escape") {
        if (popup) setPopup(null);
        if (isMobileMenuOpen) setIsMobileMenuOpen(false);
        if (showProfileMenu) setShowProfileMenu(false);
      }
    };

    const shouldLock = !!popup || isMobileMenuOpen;
    document.documentElement.style.overflow = shouldLock ? "hidden" : "";
    document.body.style.overflow = shouldLock ? "hidden" : "";
    document.body.style.overscrollBehavior = shouldLock ? "contain" : "";

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.documentElement.style.overflow = "";
      document.body.style.overflow = "";
      document.body.style.overscrollBehavior = "";
    };
  }, [popup, isMobileMenuOpen, showProfileMenu]);

  /* --------------------------------------------------------------------------
   * CROSS-TAB SYNC: Synchronize auth state across browser tabs
   * -------------------------------------------------------------------------- */
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === "user") {
        const parsed = safeParseUser(e.newValue);
        setUser(parsed);
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  /* --------------------------------------------------------------------------
   * RESPONSIVE BEHAVIOR: Auto-close mobile menu on route change or resize
   * -------------------------------------------------------------------------- */
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth > 768) setIsMobileMenuOpen(false);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  /* --------------------------------------------------------------------------
   * EVENT HANDLERS
   * -------------------------------------------------------------------------- */

  /** Scroll to features section with cross-page navigation support */
  const scrollToFeatures = () => {
    if (location.pathname !== "/") {
      navigate("/");
      setTimeout(() => {
        const el = document.getElementById("feat");
        if (el) el.scrollIntoView({ behavior: "smooth" });
      }, 100);
    } else {
      const el = document.getElementById("feat");
      if (el) el.scrollIntoView({ behavior: "smooth" });
    }
  };

  /** Handle user logout with server-side session invalidation */
  const handleLogout = async () => {
    try {
      await apiFetch("/api/auth/logout", { method: "POST" });
    } catch {
      // Proceed with local logout even if server call fails
    }
    setUser(null);
    setShowProfileMenu(false);
    localStorage.removeItem("user");
    showToast("Logout successful", { type: "success" }); 
    navigate("/"); 
  };

  /** Memoized popup close handler for dialog accessibility */
  const closePopup = useCallback(() => setPopup(null), []);

  /** Validates and updates user state with sanitized data */
  const handleAuthSuccess = useCallback((userData) => {
    const validated = safeParseUser(JSON.stringify(userData));
    if (validated) {
      setUser(validated);
      localStorage.setItem("user", JSON.stringify(validated));
    }
    setPopup(null);
  }, []);

  /** Validates and persists user profile updates */
  const handleUserUpdate = useCallback((userData) => {
    const validated = safeParseUser(JSON.stringify(userData));
    if (validated) {
      setUser(validated);
      localStorage.setItem("user", JSON.stringify(validated));
    }
  }, []);

  const isUploadPage = location.pathname === "/upload";

  const renderPortal = useCallback((node) => {
    if (typeof document === "undefined") return node;
    return createPortal(node, document.body);
  }, []);

  /* --------------------------------------------------------------------------
   * RENDER
   * -------------------------------------------------------------------------- */
  return (
    <>
      <ClickSpark
        sparkColor="#fff"
        sparkSize={10}
        sparkRadius={15}
        sparkCount={8}
        duration={400}
      >
        {/* Primary Navigation */}
        <nav
          className={`navbar ${isUploadPage ? "upload-navbar" : ""} ${isMobileMenuOpen ? "mobile-open" : ""}`}
          role="navigation"
          aria-label="Main navigation"
        >
          <div className="a">
            <a href="/" onClick={(e) => { e.preventDefault(); navigate("/"); }} aria-label="SmartDoc Home">
              <img className="logo" src={logo} alt="SmartDoc Logo" />
            </a>
          </div>

          <button
            className={`menu-toggle ${isMobileMenuOpen ? "open" : ""}`}
            aria-label={isMobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
            aria-controls="nav-links"
            aria-expanded={isMobileMenuOpen}
            onClick={() => setIsMobileMenuOpen((v) => !v)}
            type="button"
          >
            <span aria-hidden="true"></span>
            <span aria-hidden="true"></span>
            <span aria-hidden="true"></span>
          </button>

          <div id="nav-links" className="mid" role="menubar" aria-label="Main menu">
            <a href="/" role="menuitem" onClick={(e) => { e.preventDefault(); navigate("/"); }}>Home</a>
            <a href="#feat" role="menuitem" onClick={(e) => { e.preventDefault(); scrollToFeatures(); setIsMobileMenuOpen(false); }}>Features</a>
            <a
              href="/contact"
              role="menuitem"
              onClick={(e) => {
                e.preventDefault();
                if (!user) {
                  showToast("Please log in to use Contact Us", { type: "error" });
                  return;
                }
                setPopup("contact");
                setIsMobileMenuOpen(false);
              }}
            >
              Contact Us
            </a>
          </div>

          <div className="login">
            {!loading && (
              user ? (
                <div className="profile-section" ref={profileRef}>
                  <img
                    src={user?.avatar ? user.avatar : icon}
                    alt="Profile"
                    className="avatar"
                    style={{ cursor: "pointer", userSelect: "none" }}
                    onClick={() => setShowProfileMenu((prev) => !prev)}
                  />
                  {showProfileMenu && (
                    <div
                      id="profile-menu"
                      className="profile-dropdown"
                      role="menu"
                      aria-label="User menu"
                    >
                      <a className="dd" href="/profile" role="menuitem" onClick={(e) => { e.preventDefault(); setPopup("account"); setShowProfileMenu(false); }}>
                        <img src={lg1} alt="" className="dpi" aria-hidden="true" />Profile
                      </a>
                      <a className="dd" href="/logout" role="menuitem" onClick={(e) => { e.preventDefault(); handleLogout(); }}>
                        <img src={lg} alt="" className="dpi" aria-hidden="true" />Logout
                      </a>
                    </div>
                  )}
                </div>
              ) : (
                <button type="button" aria-label="Open login form" onClick={() => { setPopup("login"); setIsMobileMenuOpen(false); }}>Login</button>
              )
            )}
          </div>
        </nav>
      </ClickSpark>

      {/* Authentication Dialog */}
      {popup === "login" && renderPortal(
        <div
          className="overlay"
          onClick={closePopup}
          role="presentation"
        >
          <div
            className="popup"
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="close-btn"
              onClick={closePopup}
              aria-label="Close login dialog"
              type="button"
            >
              ✕
            </button>
            <Login onAuthSuccess={handleAuthSuccess} />
          </div>
        </div>
      )}

      {/* Contact Form Dialog */}
      {popup === "contact" && renderPortal(
        <div
          className="overlay"
          onClick={closePopup}
          role="presentation"
        >
          <div
            className="popup contact-popup"
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="close-btn"
              onClick={closePopup}
              aria-label="Close contact dialog"
              type="button"
            >
              ✕
            </button>
            <Contact
              onSuccess={closePopup}
              defaultName={user?.name}
              defaultEmail={user?.email}
            />
          </div>
        </div>
      )}

      {/* Account Settings Dialog */}
      {popup === "account" && renderPortal(
        <Account
          user={user}
          onClose={closePopup}
          onUpdated={handleUserUpdate}
        />
      )}
    </>
  );
}

export default Navbar;