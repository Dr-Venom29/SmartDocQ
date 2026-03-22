import React from "react";
import { createPortal } from "react-dom";
import Login from "../../Login";
import Contact from "../../Contact";
import Account from "../../Account";

export default function NavDialogs({ popup, user, onClose, onAuthSuccess, onUserUpdate }) {
  const body = typeof document !== "undefined" ? document.body : null;
  if (!popup || !body) return null;

  if (popup === "login" || popup === "signup") return createPortal(
    <div className="overlay" onClick={onClose} role="presentation">
      <div className="popup" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <button
          className="close-btn"
          onClick={onClose}
          aria-label={popup === "signup" ? "Close signup dialog" : "Close login dialog"}
          type="button"
          autoFocus>
          ✕
        </button>
        <Login key={popup} onAuthSuccess={onAuthSuccess} initialMode={popup} />
      </div>
    </div>,
    body
  );

  if (popup === "contact") return createPortal(
    <div className="overlay" onClick={onClose} role="presentation">
      <div className="popup contact-popup" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <button className="close-btn" onClick={onClose} aria-label="Close contact dialog" type="button" autoFocus>✕</button>
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