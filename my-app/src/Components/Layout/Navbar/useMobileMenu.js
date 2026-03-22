import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";

export function useMobileMenu() {
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const open  = () => setIsMobileMenuOpen(true);
  const close = () => setIsMobileMenuOpen(false);
  const toggle = () => setIsMobileMenuOpen((v) => !v);

  // Close the mobile menu when the route changes
  useEffect(() => { close(); }, [location.pathname]);

  // Close the mobile menu when switching to a desktop viewport
  useEffect(() => {
    const onResize = () => { if (window.innerWidth > 768) close(); };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Close the mobile menu when the Escape key is pressed
  useEffect(() => {
    const onKeyDown = (e) => { if (e.key === "Escape") close(); };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  // Lock page scroll while the mobile menu is open
  useEffect(() => {
    document.documentElement.style.overflow = isMobileMenuOpen ? "hidden" : "";
    document.body.style.overflow            = isMobileMenuOpen ? "hidden" : "";
    document.body.style.overscrollBehavior  = isMobileMenuOpen ? "contain" : "";
    return () => {
      document.documentElement.style.overflow = "";
      document.body.style.overflow            = "";
      document.body.style.overscrollBehavior  = "";
    };
  }, [isMobileMenuOpen]);

  return { isMobileMenuOpen, open, close, toggle };
}
