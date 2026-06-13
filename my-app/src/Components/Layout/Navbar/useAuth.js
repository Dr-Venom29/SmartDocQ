import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "../../ToastContext";
import { logoutUser } from "../../../Services/AuthService";
import { apiUrl } from "../../../config";

const safeParseUser = (jsonStr) => {
  if (!jsonStr || typeof jsonStr !== "string") return null;
  try {
    const parsed = JSON.parse(jsonStr);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
    const { _id, id, email, name } = parsed;
    const userId = _id || id;
    if (!userId || typeof userId !== "string") return null;
    if (!email || typeof email !== "string" || !email.includes("@")) return null;
    if (!name || typeof name !== "string" || name.trim().length === 0) return null;
    return {
      _id: userId,
      id: userId,
      email: email.trim().toLowerCase(),
      name: name.trim(),
      avatar: typeof parsed.avatar === "string" ? parsed.avatar : null,
      role: typeof parsed.role === "string" ? parsed.role : "user",
    };
  } catch {
    return null;
  }
};

const getStoredUser = () => {
  const saved = localStorage.getItem("user");
  const parsed = safeParseUser(saved);

  if (saved && !parsed) {
    console.warn("Invalid user data removed from storage");
    localStorage.removeItem("user");
  }

  return parsed;
};

export function useAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { showToast } = useToast();
  const hasForcedLogout = useRef(false);

  // Logout function
  const logout = useCallback(() => {
    hasForcedLogout.current = false; // Reset ref on explicit logout/login
    setUser(null);
    try { localStorage.removeItem("user"); } catch {}
    try { window.dispatchEvent(new Event("userChanged")); } catch {}
    showToast("Logout successful", { type: "success" });
    navigate("/");
    logoutUser().catch((err) => {
      console.error("Logout API failed:", err);
    });
  }, [navigate, showToast]);

  // Force logout function (server-initiated)
  const forceLogout = useCallback((options = {}) => {
    if (hasForcedLogout.current) return;
    hasForcedLogout.current = true;

    setUser(null);
    try { localStorage.removeItem("user"); } catch {}
    try { window.dispatchEvent(new Event("userChanged")); } catch {}
    if (!options.silent) {
      showToast("Session expired. Please login again.", { type: "info" });
    }
    navigate("/");
  }, [navigate, showToast]);

  // Session check helper
  const checkSession = useCallback(async (options = {}) => {
    try {
      const res = await fetch(apiUrl("/api/auth/verify"), {
        credentials: "include",
      });
      if (!res.ok) {
        console.warn("Backend session invalid. Logging out...");
        forceLogout(options);
        return false;
      }
      return true;
    } catch (err) {
      console.warn("Session verification failed (network/CORS):", err);
      return false;
    }
  }, [forceLogout]);

  // Session verification helper
  const verifySession = useCallback(async () => {
    const stored = getStoredUser();
    if (!stored) return;

    await checkSession();
  }, [checkSession]);

  // Initialize user state from localStorage and verify with backend on startup
  useEffect(() => {
    const init = async () => {
      try {
        const stored = getStoredUser();
        if (stored) {
          setUser(stored);
          await checkSession({ silent: true });
        }
      } catch (err) {
        console.error("Auth init failed:", err);
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [checkSession]);

  // Verify session on focus and visibility change
  useEffect(() => {
    const handleFocus = () => {
      verifySession();
    };

    const handleVisibility = () => {
      if (!document.hidden) {
        verifySession();
      }
    };

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [verifySession]);

  // Keep auth state in sync across browser tabs and same-tab changes
  useEffect(() => {
    const syncUser = () => {
      try {
        setUser(getStoredUser());
      } catch {
        setUser(null);
      }
    };

    const onStorage = (e) => {
      if (e.key === "user") syncUser();
    };

    window.addEventListener("storage", onStorage);
    window.addEventListener("userChanged", syncUser);

    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("userChanged", syncUser);
    };
  }, []);

  const persistUser = useCallback((userData) => {
    const validated = safeParseUser(
      typeof userData === "string" ? userData : JSON.stringify(userData)
    );
    if (!validated) {
      console.warn("persistUser called with invalid user data");
      return;
    }
    try {
      localStorage.setItem("user", JSON.stringify(validated));
    } catch {}
    hasForcedLogout.current = false; // Reset ref on successful login/user persist
    setUser(validated);
    try {
      window.dispatchEvent(new Event("userChanged"));
    } catch {}
  }, []);

  return { user, loading, persistUser, logout };
}

export { safeParseUser };