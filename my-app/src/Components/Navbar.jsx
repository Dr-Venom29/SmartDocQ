import React, { useState, useEffect, useRef, useCallback, lazy, Suspense, Component } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import "./navbar.css";
import logo from "./logo.png";
import { useToast } from "./ToastContext";
import { apiFetch } from "../config";

const Login = lazy(() => import("./Login"));
const Contact = lazy(() => import("./Contact"));
const Account = lazy(() => import("./Account"));

class PopupErrorBoundary extends Component {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="popup-error">
          <p>Failed to load. Please try again.</p>
          <button type="button" onClick={this.handleRetry}>
            Retry
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

const safeParseUser = (jsonString) => {
  try {
    const parsed = JSON.parse(jsonString);
    if (parsed && typeof parsed === "object" && typeof parsed.name === "string" && typeof parsed.email === "string") {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
};

const DEFAULT_AVATAR = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%236366f1'%3E%3Cpath d='M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z'/%3E%3C/svg%3E";

const ProfileIcon = () => (
  <svg className="dpi" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
  </svg>
);

const LogoutIcon = () => (
  <svg className="dpi" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z"/>
  </svg>
);

function Navbar() {
  const [popup, setPopup] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();
  const profileRef = useRef();
  const { showToast } = useToast();

  useEffect(() => {
    const verifySession = async () => {
      const savedUser = localStorage.getItem("user");
      if (!savedUser) {
        setLoading(false);
        return;
      }

      const parsed = safeParseUser(savedUser);
      if (!parsed) {
        localStorage.removeItem("user");
        setLoading(false);
        return;
      }

      try {
        const response = await apiFetch("/api/auth/verify", { method: "GET" });
        if (response.ok) {
          setUser(parsed);
        } else {
          localStorage.removeItem("user");
        }
      } catch {
        setUser(parsed); // Offline fallback
      }
      setLoading(false);
    };
    verifySession();
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setShowProfileMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const shouldLock = !!popup || isMobileMenuOpen;

    const onKeyDown = (e) => {
      if (e.key === "Escape") {
        if (popup) setPopup(null);
        else if (isMobileMenuOpen) setIsMobileMenuOpen(false);
        else if (showProfileMenu) setShowProfileMenu(false);
      }
    };

    document.body.style.overflow = shouldLock ? "hidden" : "";

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [popup, isMobileMenuOpen, showProfileMenu]);

  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === "user") setUser(e.newValue ? safeParseUser(e.newValue) : null);
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  useEffect(() => {
    setIsMobileMenuOpen(false);

    let timeoutId;
    const onResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        if (window.innerWidth > 768) setIsMobileMenuOpen(false);
      }, 100);
    };

    window.addEventListener("resize", onResize);
    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener("resize", onResize);
    };
  }, [location.pathname]);

  const scrollToFeatures = useCallback(() => {
    setIsMobileMenuOpen(false);
    if (location.pathname !== "/") {
      navigate("/");
      setTimeout(() => {
        document.getElementById("feat")?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    } else {
      document.getElementById("feat")?.scrollIntoView({ behavior: "smooth" });
    }
  }, [location.pathname, navigate]);

  const handleLogout = useCallback(async () => {
    try {
      await apiFetch("/api/auth/logout", { method: "POST" });
    } catch {
      // Continue with local logout
    }
    setUser(null);
    setShowProfileMenu(false);
    localStorage.removeItem("user");
    showToast("Logout successful", { type: "success" });
    navigate("/");
  }, [navigate, showToast]);

  const handleAuthSuccess = useCallback((userData) => {
    setUser(userData);
    localStorage.setItem("user", JSON.stringify(userData));
    setPopup(null);
  }, []);

  const handleContactClick = useCallback(() => {
    if (!user) {
      showToast("Please log in to use Contact Us", { type: "error" });
      return;
    }
    setPopup("contact");
    setIsMobileMenuOpen(false);
  }, [user, showToast]);

  const toggleProfileMenu = useCallback(() => {
    setShowProfileMenu((prev) => !prev);
  }, []);

  const toggleMobileMenu = useCallback(() => {
    setIsMobileMenuOpen((v) => !v);
  }, []);

  const closePopup = useCallback(() => setPopup(null), []);

  const openLogin = useCallback(() => {
    setPopup("login");
    setIsMobileMenuOpen(false);
  }, []);

  const openProfile = useCallback(() => {
    setPopup("account");
    setShowProfileMenu(false);
  }, []);

  const handleAvatarError = useCallback((e) => {
    e.target.src = DEFAULT_AVATAR;
  }, []);

  const isUploadPage = location.pathname === "/upload";

  return (
    <>
      <a href="#main-content" className="skip-link">Skip to main content</a>

      <nav
        className={`navbar ${isUploadPage ? "upload-navbar" : ""} ${isMobileMenuOpen ? "mobile-open" : ""}`}
        role="navigation"
        aria-label="Main navigation"
      >
        <div className="a">
          <Link to="/">
            <img className="logo" src={logo} alt="SmartDocQ Home" />
          </Link>
        </div>

        <button
          type="button"
          className={`menu-toggle ${isMobileMenuOpen ? "open" : ""}`}
          aria-label="Toggle navigation menu"
          aria-controls="nav-links"
          aria-expanded={isMobileMenuOpen}
          onClick={toggleMobileMenu}
        >
          <span></span>
          <span></span>
          <span></span>
        </button>

        <div id="nav-links" className="mid" role="menubar">
          <Link to="/" role="menuitem" onClick={() => setIsMobileMenuOpen(false)}>
            Home
          </Link>
          <button
            type="button"
            className="nav-link-btn"
            role="menuitem"
            onClick={scrollToFeatures}
          >
            Features
          </button>
          <button
            type="button"
            className="nav-link-btn"
            role="menuitem"
            onClick={handleContactClick}
          >
            Contact Us
          </button>
        </div>

        <div className="login">
          {!loading && (
            user ? (
              <div className="profile-section" ref={profileRef}>
                <button
                  type="button"
                  className="avatar-btn"
                  onClick={toggleProfileMenu}
                  aria-haspopup="true"
                  aria-expanded={showProfileMenu}
                  aria-label="User menu"
                >
                  <img
                    src={user.avatar || DEFAULT_AVATAR}
                    alt="Profile"
                    className="avatar"
                    onError={handleAvatarError}
                  />
                </button>
                {showProfileMenu && (
                  <div className="profile-dropdown" role="menu" aria-label="User menu">
                    <button
                      type="button"
                      className="dd"
                      role="menuitem"
                      onClick={openProfile}
                    >
                      <ProfileIcon />
                      Profile
                    </button>
                    <button
                      type="button"
                      className="dd"
                      role="menuitem"
                      onClick={handleLogout}
                    >
                      <LogoutIcon />
                      Logout
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button type="button" onClick={openLogin}>Login</button>
            )
          )}
        </div>
      </nav>

      {popup === "login" && (
        <div className="overlay" onClick={closePopup} role="dialog" aria-modal="true" aria-label="Login">
          <div className="popup" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="close-btn" onClick={closePopup} aria-label="Close">✕</button>
            <PopupErrorBoundary>
              <Suspense fallback={<div className="popup-loading">Loading...</div>}>
                <Login onAuthSuccess={handleAuthSuccess} />
              </Suspense>
            </PopupErrorBoundary>
          </div>
        </div>
      )}

      {popup === "contact" && (
        <div className="overlay" onClick={closePopup} role="dialog" aria-modal="true" aria-label="Contact">
          <div className="popup contact-popup" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="close-btn" onClick={closePopup} aria-label="Close">✕</button>
            <PopupErrorBoundary>
              <Suspense fallback={<div className="popup-loading">Loading...</div>}>
                <Contact
                  onSuccess={closePopup}
                  defaultName={user?.name}
                  defaultEmail={user?.email}
                />
              </Suspense>
            </PopupErrorBoundary>
          </div>
        </div>
      )}

      {popup === "account" && (
        <PopupErrorBoundary>
          <Suspense fallback={<div className="popup-loading">Loading...</div>}>
            <Account
              user={user}
              onClose={closePopup}
              onUpdated={setUser}
            />
          </Suspense>
        </PopupErrorBoundary>
      )}
    </>
  );
}

export default Navbar;
