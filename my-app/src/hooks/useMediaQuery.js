import { useState, useEffect } from "react";

/**
 * Returns true when the given media query matches.
 * Initialised synchronously from window.matchMedia to avoid a flash on first render.
 */
export function useMediaQuery(query) {
  const [matches, setMatches] = useState(() => {
    if (typeof window === "undefined" || !window.matchMedia) return false;
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const media = window.matchMedia(query);
    const update = () => setMatches(media.matches);
    media.addEventListener?.("change", update);
    return () => media.removeEventListener?.("change", update);
  }, [query]);

  return matches;
}
