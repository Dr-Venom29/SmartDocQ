// Centralized API configuration for frontend
// Configure these in Vercel as environment variables:
// - REACT_APP_API_URL (Node/Express backend base URL)


export const API_BASE = (process.env.REACT_APP_API_URL || "http://localhost:5000").replace(/\/$/, "");

const rawMb = Number(process.env.REACT_APP_MAX_UPLOAD_SIZE_MB);
export const MAX_UPLOAD_SIZE_MB = Number.isFinite(rawMb) && rawMb > 0 ? rawMb : 15;

export const apiUrl = (path) =>
  `${API_BASE}${path.startsWith("/") ? path : `/${path}`}`;


// Helper to get CSRF token from document cookies
const getCsrfToken = () => {
  if (typeof document === "undefined") return "";
  const match = document.cookie.match(/(?:^|; )csrf_token=([^;]*)/);
  return match ? match[1] : "";
};

// Prevent multiple triggers on 401
let isRedirecting = false;

// Fetch wrapper for authenticated requests using httpOnly cookies
export const apiFetch = async (
  path,
  { body, signal, headers: extraHeaders, ...rest } = {}
) => {
  const url = path.startsWith("http") ? path : apiUrl(path);
  const csrfToken = getCsrfToken();

  try {
    const res = await fetch(url, {
      ...rest,
      body,
      signal,
      credentials: "include",
      headers: {
        ...(body instanceof FormData
          ? {}
          : { "Content-Type": "application/json" }),
        ...(csrfToken ? { "X-CSRF-Token": csrfToken } : {}),
        ...(extraHeaders || {}),
      },
    });

    // Avoid redirect loop for auth endpoints (e.g., login failure)
    const isAuthRoute = url.includes("/api/auth/");

    if (res.status === 401 && !isRedirecting && !isAuthRoute) {
      isRedirecting = true;

      console.warn("Session expired. Triggering global unauthorized event...");

      try {
        localStorage.removeItem("user");
        window.dispatchEvent(new Event("userChanged"));
      } catch {}

      // Defer event so other in-flight 401 responses hit the isRedirecting guard
      // before navigation/modal handling finishes.
      setTimeout(() => {
        window.dispatchEvent(new Event("unauthorized"));
      }, 100);
    }

    return res;
  } catch (err) {
    console.error("API Fetch Error:", err);
    throw new Error("Network error");
  }
};