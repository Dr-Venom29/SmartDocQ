import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { gsap } from "gsap";
import { ScrollToPlugin } from "gsap/ScrollToPlugin";

gsap.registerPlugin(ScrollToPlugin);

/**
 * Smooth scrolls to top of page only for specific routes
 */
export default function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    const scrollRoutes = ["/privacy", "/terms", "/help"];
    if (scrollRoutes.includes(pathname)) {
      // Small delay to ensure page has rendered
      setTimeout(() => {
        gsap.to(window, {
          duration: 1.2,
          scrollTo: { y: 0, autoKill: true },
          ease: "power2.out",
        });
      }, 50);
    }
  }, [pathname]);

  return null;
}
