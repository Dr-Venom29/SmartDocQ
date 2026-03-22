import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";

export function useMobileMenu() {
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const open  = () => setIsMobileMenuOpen(true);
  const close = () => setIsMobileMenuOpen(false);
  const toggle = () => setIsMobileMenuOpen((v) => !v);

  // Close on route change
  useEffect(() => { close(); }, [location.pathname]);

  // Close on desktop resize
  useEffect(() => {
    const onResize = () => { if (window.innerWidth > 768) close(); };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // ESC key
  useEffect(() => {
    const onKeyDown = (e) => { if (e.key === "Escape") close(); };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  // Scroll lock
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
