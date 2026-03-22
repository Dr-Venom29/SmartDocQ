import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../../../config";
import { useToast } from "../../ToastContext";

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

export function useAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { showToast } = useToast();

  // Initialize from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("user");
      const parsed = safeParseUser(saved);
      if (saved && !parsed) {
        console.warn("Invalid user data removed from storage");
        localStorage.removeItem("user");
      }
      setUser(parsed);
    } catch (err) {
      console.error("Auth init failed:", err);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // Cross-tab sync
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === "user") setUser(safeParseUser(e.newValue));
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const persistUser = useCallback((userData) => {
    const validated = safeParseUser(
      typeof userData === "string" ? userData : JSON.stringify(userData)
    );
    if (!validated) return;
    try {
      localStorage.setItem("user", JSON.stringify(validated));
    } catch {}
    setUser(validated);
  }, []);

  const logout = useCallback(async () => {
    setUser(null);
    try { localStorage.removeItem("user"); } catch {}
    showToast("Logout successful", { type: "success" });
    navigate("/");
    apiFetch("/api/auth/logout", { method: "POST" })
      .catch((err) => {
        console.error("Logout API failed:", err);
      });
  }, [navigate, showToast]);

  return { user, loading, persistUser, logout };
}

export { safeParseUser };