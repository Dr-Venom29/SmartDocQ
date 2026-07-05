const crypto = require("crypto");
const logger = require("../lib/logger");

const timingSafeCompare = (a, b) => {
  if (typeof a !== "string" || typeof b !== "string") {
    return false;
  }
  const bufA = Buffer.from(a, "hex");
  const bufB = Buffer.from(b, "hex");
  if (bufA.length !== bufB.length || bufA.length === 0) {
    return false;
  }
  return crypto.timingSafeEqual(bufA, bufB);
};

const verifyCsrf = (req, res, next) => {
  const mutatingMethods = ["POST", "PUT", "PATCH", "DELETE"];
  if (!mutatingMethods.includes(req.method)) {
    return next();
  }

  // Bypass CSRF for internal server-to-server endpoints (Flask)
  const serviceToken = req.headers["x-service-token"];
  if (serviceToken) {
    return next();
  }

  const csrfCookie = req.cookies?.csrf_token;
  const csrfHeader = req.headers["x-csrf-token"];

  if (!csrfCookie || !csrfHeader) {
    return res.status(403).json({ message: "CSRF token missing" });
  }

  // 1. Double-Submit validation: Cookie must match Header
  if (!timingSafeCompare(csrfCookie, csrfHeader)) {
    return res.status(403).json({ message: "CSRF token mismatch" });
  }

  // 2. Session Binding validation: Cookie hash must match req.userSession.csrfHash
  if (!req.userSession) {
    return res.status(403).json({ message: "Session expired or invalid" });
  }

  if (!req.userSession.csrfHash) {
    return res.status(403).json({ message: "Session missing CSRF binding. Please log in again." });
  }

  const cookieHash = crypto.createHash("sha256").update(csrfCookie).digest("hex");
  if (!timingSafeCompare(cookieHash, req.userSession.csrfHash)) {
    return res.status(403).json({ message: "CSRF token does not match session" });
  }

  // 3. Origin/Referer Validation (Defense in Depth)
  const origin = req.headers.origin;
  const referer = req.headers.referer;
  const rawAllowed = process.env.FRONTEND_ORIGINS || "http://localhost:3000";
  const allowedOriginsSet = new Set(rawAllowed.split(",").map(o => o.trim()));

  const validateHost = (hostUrlString) => {
    try {
      const parsed = new URL(hostUrlString);
      const originMatch = allowedOriginsSet.has(parsed.origin);
      if (originMatch) return true;

      // Handle subdomain matchers like *.vercel.app if present
      for (const allowed of allowedOriginsSet) {
        if (allowed.startsWith("*.")) {
          const suffix = allowed.slice(2);
          if (parsed.hostname === suffix || parsed.hostname.endsWith("." + suffix)) {
            return true;
          }
        }
      }
      return false;
    } catch {
      return false;
    }
  };

  if (origin) {
    if (!validateHost(origin)) {
      return res.status(403).json({ message: "Untrusted request origin" });
    }
  } else if (referer) {
    if (!validateHost(referer)) {
      return res.status(403).json({ message: "Untrusted request referer" });
    }
  } else {
    logger.warn({ path: req.path }, "State-changing request missing both Origin and Referer headers");
    if (process.env.STRICT_ORIGIN_CHECK === "true") {
      return res.status(403).json({ message: "Request rejected: missing origin headers" });
    }
  }

  next();
};

module.exports = { verifyCsrf };
