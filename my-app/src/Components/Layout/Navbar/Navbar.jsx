import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "./Navbar.css";
import logo from "./assets/logo.png";
import icon from "./assets/icon1.png";
import { useToast } from "../../ToastContext";
import ClickSpark from "../../Effects/ClickSpark";
import { useAuth } from "./useAuth";
import ProfileMenu from "./ProfileMenu";
import NavDialogs from "./NavDialogs";

const getActiveTab = (pathname) => {
  if (pathname === "/") return "Home";
  return null;
};

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();

  const [popup, setPopup] = useState(null);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(() => getActiveTab(location.pathname));
  const [sliderStyle, setSliderStyle] = useState({ left: 0, width: 0, opacity: 0 });

  const navContainerRef = useRef(null);
  const itemsRef = useRef({});
  const pendingScrollRef = useRef(false);
  const profileRef = useRef();

  const { showToast } = useToast();
  const { user, loading, persistUser, logout } = useAuth();

  const closePopup = useCallback(() => setPopup(null), []);
  const isUploadPage = location.pathname === "/upload";

  // Sync activeTab with URL — only set if route maps to a known tab
  useEffect(() => {
    const tab = getActiveTab(location.pathname);
    if (tab) setActiveTab(tab);
  }, [location.pathname]);

  // Slider logic
  const updateSlider = useCallback(() => {
    const activeEl = itemsRef.current[activeTab];
    const containerEl = navContainerRef.current;
    if (activeEl && containerEl) {
      const navRect = containerEl.getBoundingClientRect();
      const elRect = activeEl.getBoundingClientRect();
      setSliderStyle({ left: elRect.left - navRect.left, width: elRect.width, opacity: 1 });
    }
  }, [activeTab]);

  useEffect(() => {
    const raf = requestAnimationFrame(updateSlider);
    window.addEventListener("resize", updateSlider);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", updateSlider);
    };
  }, [updateSlider]);

  // ESC key + scroll lock
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === "Escape") {
        setPopup(null);
        setIsMobileMenuOpen(false);
        setShowProfileMenu(false);
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
  }, [popup, isMobileMenuOpen]);

  // Close mobile menu on route change or resize
  useEffect(() => { setIsMobileMenuOpen(false); }, [location.pathname]);
  useEffect(() => {
    const onResize = () => { if (window.innerWidth > 768) setIsMobileMenuOpen(false); };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Custom smooth scroll
  const smoothScroll = (target, duration = 800) => {
    if (!target) return;
    const targetPosition = target.getBoundingClientRect().top + window.pageYOffset;
    const startPosition = window.pageYOffset;
    const distance = targetPosition - startPosition;
    let startTime = null;
    const animation = (currentTime) => {
      if (!startTime) startTime = currentTime;
      const timeElapsed = currentTime - startTime;
      const progress = Math.min(timeElapsed / duration, 1);
      const ease = progress < 0.5
        ? 4 * progress * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 3) / 2;
      window.scrollTo(0, startPosition + distance * ease);
      if (timeElapsed < duration) requestAnimationFrame(animation);
    };
    requestAnimationFrame(animation);
  };

  const scrollToFeatures = useCallback(() => {
    const el = document.getElementById("feat");
    if (el) {
      smoothScroll(el, 800);
    } else {
      pendingScrollRef.current = true;
      navigate("/");
    }
  }, [navigate]);

  useEffect(() => {
    if (pendingScrollRef.current && location.pathname === "/") {
      pendingScrollRef.current = false;
      const el = document.getElementById("feat");
      if (el) setTimeout(() => smoothScroll(el), 100);
    }
  }, [location.pathname]);

  return (
    <>
      <ClickSpark sparkColor="#fff" sparkSize={10} sparkRadius={15} sparkCount={8} duration={400}>
        <nav
          className={`navbar ${isUploadPage ? "upload-navbar" : ""} ${isMobileMenuOpen ? "mobile-open" : ""}`}
          role="navigation"
          aria-label="Main navigation"
          id="navbar">
          <div className="a">
            <a href="/" onClick={(e) => { e.preventDefault(); navigate("/"); }} aria-label="SmartDocQ Home">
              <img className="logo" src={logo} alt="SmartDocQ Logo" />
            </a>
          </div>

          <button
            className={`menu-toggle ${isMobileMenuOpen ? "open" : ""}`}
            aria-label={isMobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
            aria-controls="nav-links"
            aria-expanded={isMobileMenuOpen}
            onClick={() => setIsMobileMenuOpen((v) => !v)}
            type="button">
            <span aria-hidden="true" /><span aria-hidden="true" /><span aria-hidden="true" />
          </button>

          <div
            id="nav-links"
            className="nav-links-container"
            role="menubar"
            aria-label="Main menu"
            ref={navContainerRef}>
            <div
              className="nav-slider"
              style={{ left: sliderStyle.left, width: sliderStyle.width, opacity: sliderStyle.opacity }}
            />

            <div
              className={`nav-item ${activeTab === "Home" ? "active" : ""}`}
              onClick={() => { navigate("/"); setActiveTab("Home"); setIsMobileMenuOpen(false); }}
              role="menuitem"
              ref={(el) => (itemsRef.current["Home"] = el)}>
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M2 6.5L8 2l6 4.5V13a1 1 0 01-1 1H3a1 1 0 01-1-1V6.5z"/>
              </svg>
              Home
            </div>

            <div className="nav-divider" />

            <div
              className={`nav-item ${activeTab === "Features" ? "active" : ""}`}
              onClick={() => {
                setActiveTab("Features");
                setIsMobileMenuOpen(false);
                setTimeout(() => scrollToFeatures(), 300);
              }}
              role="menuitem"
              ref={(el) => (itemsRef.current["Features"] = el)}>
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="2" y="2" width="5" height="5" rx="1"/>
                <rect x="9" y="2" width="5" height="5" rx="1"/>
                <rect x="2" y="9" width="5" height="5" rx="1"/>
                <rect x="9" y="9" width="5" height="5" rx="1"/>
              </svg>
              Features
            </div>

            <div className="nav-divider" />

            <div
              className={`nav-item ${activeTab === "Contact" ? "active" : ""}`}
              onClick={() => {
                setActiveTab("Contact");
                setIsMobileMenuOpen(false);
                setTimeout(() => {
                  if (!user) { showToast("Please log in to use Contact Us", { type: "error" }); return; }
                  setPopup("contact");
                }, 300);
              }}
              role="menuitem"
              ref={(el) => (itemsRef.current["Contact"] = el)}>
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M2 4h12M2 8h8M2 12h5"/>
                <circle cx="13" cy="11" r="2.5"/>
                <path d="M15 13.5l1.5 1.5"/>
              </svg>
              Contact Us
            </div>
          </div>

          <div className="login">
            {!loading && (
              user ? (
                <div className="profile-section" ref={profileRef}>
                  <img
                    src={user.avatar || icon}
                    alt="Profile"
                    className="avatar"
                    style={{ cursor: "pointer", userSelect: "none" }}
                    onClick={() => setShowProfileMenu(true)}
                  />
                </div>
              ) : (
                <button
                  type="button"
                  className="login-cta"
                  aria-label="Open login form"
                  onClick={() => { setPopup("login"); setIsMobileMenuOpen(false); }}>
                  Login
                </button>
              )
            )}
          </div>
        </nav>
      </ClickSpark>

      {showProfileMenu && (
        <ProfileMenu
          triggerRef={profileRef}
          onProfile={() => { setPopup("account"); setShowProfileMenu(false); }}
          onLogout={() => { setShowProfileMenu(false); logout(); }}
          onClose={() => setShowProfileMenu(false)}
        />
      )}

      <NavDialogs
        popup={popup}
        user={user}
        onClose={closePopup}
        onAuthSuccess={(userData) => { persistUser(userData); setPopup(null); }}
        onUserUpdate={persistUser}
      />
    </>
  );
}