import React, { useRef, useEffect } from "react";
import profileIcon from "./assets/profile.svg";
import logoutIcon from "./assets/logout.svg";

export default function ProfileMenu({ triggerRef, onProfile, onLogout, onClose }) {
  const menuRef = useRef(null);

  // Auto-focus first button on mount
  useEffect(() => {
    const buttons = menuRef.current?.querySelectorAll("button");
    if (buttons && buttons.length > 0) {
      buttons[0].focus();
    }
  }, []);

  // Handle Escape key to close the dropdown
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        onClose?.();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  // Close the menu when clicking/tapping outside of the trigger or menu
  useEffect(() => {
    const handlePointerDown = (e) => {
      const trigger = triggerRef.current;
      const menu = menuRef.current;
      const path = typeof e.composedPath === "function" ? e.composedPath() : null;
      const inTrigger = trigger && (path ? path.includes(trigger) : trigger.contains(e.target));
      const inMenu = menu && (path ? path.includes(menu) : menu.contains(e.target));
      if (!inTrigger && !inMenu && onClose) onClose();
    };
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [triggerRef, onClose]);

  // Close the menu when focus leaves the menu entirely (e.g. tabbing away)
  useEffect(() => {
    const handleFocusOut = (e) => {
      const trigger = triggerRef.current;
      const newFocus = e.relatedTarget;
      if (menuRef.current && (!newFocus || !menuRef.current.contains(newFocus)) && newFocus !== trigger) {
        onClose?.();
      }
    };

    const menu = menuRef.current;
    if (menu) {
      menu.addEventListener("focusout", handleFocusOut);
    }
    return () => {
      if (menu) {
        menu.removeEventListener("focusout", handleFocusOut);
      }
    };
  }, [onClose, triggerRef]);

  // Restore focus to the trigger button on close/unmount
  useEffect(() => {
    return () => {
      if (triggerRef.current && document.body.contains(triggerRef.current)) {
        triggerRef.current.focus();
      }
    };
  }, [triggerRef]);

  return (
    <div
      ref={menuRef}
      id="profile-menu"
      className="profile-dropdown"
    >
      <button className="dd" type="button" onClick={onProfile}>
        <img src={profileIcon} alt="" className="dpi" aria-hidden="true" />Profile
      </button>
      <button className="dd" type="button" onClick={onLogout}>
        <img src={logoutIcon} alt="" className="dpi" aria-hidden="true" />Logout
      </button>
    </div>
  );
}