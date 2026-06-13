import React, { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import Login from "../../Auth/Login";
import Contact from "./Contact";
import Account from "../Account/Account";

const FOCUSABLE_SELECTOR = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

export default function NavDialogs({ popup, user, onClose, onAuthSuccess, onUserUpdate }) {
  const triggerRef = useRef(null);
  const dialogRef = useRef(null);
  const body = typeof document !== "undefined" ? document.body : null;

  // Handle focus trapping, auto-focus, and focus restoration for login and contact dialogs
  useEffect(() => {
    if (!popup || popup === "account") return;

    // Save the trigger element that opened the dialog
    triggerRef.current = document.activeElement;

    const getFocusable = () =>
      dialogRef.current ? Array.from(dialogRef.current.querySelectorAll(FOCUSABLE_SELECTOR)) : [];

    // Auto-focus the first element inside the dialog ref
    const focusable = getFocusable();
    if (focusable.length > 0) {
      focusable[0].focus();
    }

    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key === "Tab") {
        const list = getFocusable();
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
      // Restore focus to the trigger element safely
      if (triggerRef.current && document.body.contains(triggerRef.current)) {
        triggerRef.current.focus();
      }
    };
  }, [popup, onClose]);

  if (!popup || !body) return null;

  if (popup === "login" || popup === "signup") return createPortal(
    <div className="overlay" onClick={onClose} role="presentation">
      <div
        ref={dialogRef}
        className="popup login-popup"
        role="dialog"
        aria-modal="true"
        aria-label="Authentication"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="auth-popup-close"
          onClick={onClose}
          aria-label="Close authentication dialog"
          type="button"
        >
          ✕
        </button>
        <Login key={popup} onAuthSuccess={onAuthSuccess} initialMode={popup} onClose={onClose} />
      </div>
    </div>,
    body
  );

  if (popup === "contact") return createPortal(
    <div className="overlay" onClick={onClose} role="presentation">
      <div
        ref={dialogRef}
        className="popup contact-popup"
        role="dialog"
        aria-modal="true"
        aria-label="Contact Us"
        onClick={(e) => e.stopPropagation()}
      >
        <button className="close-btn" onClick={onClose} aria-label="Close contact dialog" type="button">✕</button>
        <Contact onSuccess={onClose} defaultName={user?.name} defaultEmail={user?.email} />
      </div>
    </div>,
    body
  );

  if (popup === "account") return createPortal(
    <Account user={user} onClose={onClose} onUpdated={onUserUpdate} />,
    body
  );

  return null;
}