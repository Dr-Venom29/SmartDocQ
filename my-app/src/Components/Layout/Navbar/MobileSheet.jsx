import React, { useEffect, useRef } from "react";
import "./MobileSheet.css";

const NAV_ITEMS = [
  {
    id: "Home",
    label: "Home",
    sub: "Back to landing page",
    icon: (
      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
        <path d="M2 6.5L8 2l6 4.5V13a1 1 0 01-1 1H3a1 1 0 01-1-1V6.5z" />
      </svg>
    ),
  },
  {
    id: "Features",
    label: "Features",
    sub: "Explore what we offer",
    icon: (
      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
        <rect x="2" y="2" width="5" height="5" rx="1" />
        <rect x="9" y="2" width="5" height="5" rx="1" />
        <rect x="2" y="9" width="5" height="5" rx="1" />
        <rect x="9" y="9" width="5" height="5" rx="1" />
      </svg>
    ),
  },
  {
    id: "Contact",
    label: "Contact Us",
    sub: "Get in touch with us",
    icon: (
      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
        <path d="M2 4h12M2 8h8M2 12h5" />
        <circle cx="13" cy="11" r="2.5" />
        <path d="M15 13.5l1.5 1.5" />
      </svg>
    ),
  },
];

const ArrowIcon = () => (
  <svg
    className="sheet-item-arrow"
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    aria-hidden="true">
    <path d="M6 4l4 4-4 4" />
  </svg>
);

const DISMISS_THRESHOLD = 80; // Pixels to drag downward before dismissing the sheet

const FOCUSABLE_SELECTOR = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

export default function MobileSheet({
  isOpen,
  onClose,
  activeTab,
  onItemClick,
  user,
  onLogin,
  onSignUp,
  onAccount,
  onLogout,
}) {
  const panelRef = useRef(null);
  const drag     = useRef({ startY: 0, currentY: 0, active: false });
  const triggerRef = useRef(null); // Ref to store previously active element to restore focus

  // Handle focus trapping and focus restoration
  useEffect(() => {
    if (!isOpen) return;

    // Store trigger element
    triggerRef.current = document.activeElement;

    // Focus first focusable item
    const focusable = panelRef.current ? panelRef.current.querySelectorAll(FOCUSABLE_SELECTOR) : [];
    if (focusable.length > 0) {
      focusable[0].focus();
    }

    // Trap focus & escape keys
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }

      if (e.key === "Tab") {
        const list = panelRef.current ? Array.from(panelRef.current.querySelectorAll(FOCUSABLE_SELECTOR)) : [];
        if (list.length === 0) return;
        const first = list[0];
        const last = list[list.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === first) {
            last.focus();
            e.preventDefault();
          }
        } else {
          if (document.activeElement === last) {
            first.focus();
            e.preventDefault();
          }
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      // Restore focus safely if element is still in the document
      if (
        triggerRef.current &&
        document.body.contains(triggerRef.current) &&
        typeof triggerRef.current.focus === "function"
      ) {
        triggerRef.current.focus();
      }
    };
  }, [isOpen, onClose]);

  const onTouchStart = (e) => {
    drag.current = { startY: e.touches[0].clientY, currentY: e.touches[0].clientY, active: true };
    if (panelRef.current) panelRef.current.style.transition = "none";
  };

  const onTouchMove = (e) => {
    if (!drag.current.active) return;
    drag.current.currentY = e.touches[0].clientY;
    const delta = Math.max(0, drag.current.currentY - drag.current.startY); // downward only
    if (panelRef.current) panelRef.current.style.transform = `translateY(${delta}px)`;
  };

  const onTouchEnd = () => {
    if (!drag.current.active) return;
    drag.current.active = false;
    const delta = drag.current.currentY - drag.current.startY;
    if (panelRef.current) {
      panelRef.current.style.transition = ""; // restore CSS spring
      panelRef.current.style.transform  = "";
    }
    if (delta > DISMISS_THRESHOLD) onClose();
  };

  return (
    <div
      id="mobile-sheet"
      className={`mobile-sheet-overlay ${isOpen ? "open" : ""}`}
      aria-hidden={!isOpen}
      role="presentation"
      tabIndex={-1}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>

      <div
        className="mobile-sheet-panel"
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
        ref={panelRef}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}>

        <div className="sheet-pill" aria-hidden="true" />

        <nav className="sheet-items" aria-label="Mobile Navigation">
          {NAV_ITEMS.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                tabIndex={isOpen ? 0 : -1}
                className={`sheet-item ${isActive ? "active" : ""}`}
                aria-current={isActive ? "page" : undefined}
                onClick={() => onItemClick(item.id)}>

                <div className="sheet-item-icon">{item.icon}</div>

                <div className="sheet-item-text">
                  <span className="sheet-item-title">{item.label}</span>
                  <span className="sheet-item-sub">{item.sub}</span>
                </div>

                {isActive ? <div className="sheet-active-dot" aria-hidden="true" /> : <ArrowIcon />}
              </button>
            );
          })}
        </nav>

        <div className="sheet-divider" aria-hidden="true" />

        <div className="sheet-actions">
          {user ? (
            <>
              <button className="sheet-action-btn" onClick={onAccount} tabIndex={isOpen ? 0 : -1}>
                My Account
              </button>
              <button className="sheet-action-btn sheet-action-danger" onClick={onLogout} tabIndex={isOpen ? 0 : -1}>
                Logout
              </button>
            </>
          ) : (
            <>
              <button className="sheet-action-btn" onClick={onSignUp} tabIndex={isOpen ? 0 : -1}>
                Sign Up
              </button>
              <button className="sheet-action-btn sheet-action-primary" onClick={onLogin} tabIndex={isOpen ? 0 : -1}>
                Login →
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}