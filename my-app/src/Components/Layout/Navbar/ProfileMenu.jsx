import React, { useRef, useEffect, useCallback, useState } from "react";
import { createPortal } from "react-dom";
import lg from "./assets/lg.png";
import lg1 from "./assets/lg1.png";

export default function ProfileMenu({ triggerRef, onProfile, onLogout, onClose }) {
  const menuRef = useRef(null);
  const [pos, setPos] = useState(null);

  const updatePos = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    setPos({
      top: rect.bottom + 10,
      right: Math.max(8, window.innerWidth - rect.right),
    });
  }, [triggerRef]);

  // Position on mount + keep in sync on scroll/resize
  useEffect(() => {
    updatePos();
    window.addEventListener("scroll", updatePos, true);
    window.addEventListener("resize", updatePos);
    return () => {
      window.removeEventListener("scroll", updatePos, true);
      window.removeEventListener("resize", updatePos);
    };
  }, [updatePos]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e) => {
      const trigger = triggerRef.current;
      const menu = menuRef.current;
      const path = typeof e.composedPath === "function" ? e.composedPath() : null;
      const inTrigger = trigger && (path ? path.includes(trigger) : trigger.contains(e.target));
      const inMenu = menu && (path ? path.includes(menu) : menu.contains(e.target));
      if (!inTrigger && !inMenu && onClose) onClose();
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [triggerRef, onClose]);

  const body = typeof document !== "undefined" ? document.body : null;
  if (!body) return null;

  return createPortal(
    <div
      ref={menuRef}
      id="profile-menu"
      className="profile-dropdown profile-dropdown--portal"
      role="menu"
      aria-label="User menu"
      style={{
        top: pos?.top ?? -9999,
        right: pos?.right ?? -9999,
        visibility: pos ? "visible" : "hidden",
      }}
    >
      <button className="dd" type="button" role="menuitem" onClick={onProfile}>
        <img src={lg1} alt="" className="dpi" aria-hidden="true" />Profile
      </button>
      <button className="dd" type="button" role="menuitem" onClick={onLogout}>
        <img src={lg} alt="" className="dpi" aria-hidden="true" />Logout
      </button>
    </div>,
    body
  );
}