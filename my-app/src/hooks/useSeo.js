import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const BASE_URL = "https://smartdocq.vercel.app";

/**
 * Custom hook to dynamically manage document title, self-referencing canonical URL, and Open Graph URL (og:url)
 * @param {string} [title] - Optional title for the page
 */
export function useSeo(title) {
  const location = useLocation();

  useEffect(() => {
    if (title) {
      document.title = title;
    }

    // Determine current canonical URL based on location pathname
    const pathname = location.pathname.endsWith("/") && location.pathname.length > 1
      ? location.pathname.slice(0, -1)
      : location.pathname;

    const canonicalUrl = `${BASE_URL}${pathname}`;

    let link = document.querySelector("link[rel='canonical']");
    if (!link) {
      link = document.createElement("link");
      link.setAttribute("rel", "canonical");
      document.head.appendChild(link);
    }
    link.setAttribute("href", canonicalUrl);

    let ogUrl = document.querySelector("meta[property='og:url']");
    if (!ogUrl) {
      ogUrl = document.createElement("meta");
      ogUrl.setAttribute("property", "og:url");
      document.head.appendChild(ogUrl);
    }
    ogUrl.setAttribute("content", canonicalUrl);
  }, [location.pathname, title]);
}

export default useSeo;
