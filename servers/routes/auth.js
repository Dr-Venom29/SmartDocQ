const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const nodemailer = require("nodemailer");
const User = require("../models/User");
const UserSession = require("../models/UserSession");
const multer = require("multer");
const path = require("path");
const streamifier = require("streamifier");
const cloudinary = require('cloudinary').v2;
const Chat = require("../models/Chat");
const Document = require("../models/Document");
const ContactReport = require("../models/ContactReport");
const { OAuth2Client } = require('google-auth-library');
const logger = require("../lib/logger");
const { validate } = require("../middlewares/validate");
const { sendError, sendSuccess } = require("../middlewares/apiResponse");
const { signupSchema, loginSchema, updateMeSchema, forgotPasswordSchema, resetPasswordSchema, googleSchema } = require("../validators/authSchemas");
const rateLimit = require("express-rate-limit");

// Rate limiter for sensitive authentication endpoints to prevent brute-force attacks and spamming
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // Limit each IP to 30 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many authentication requests, please try again after 15 minutes." },
});

// Cookie configuration for httpOnly auth
const isProduction = process.env.NODE_ENV === "production";
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: isProduction,
  sameSite: isProduction ? "none" : "lax",
  maxAge: 60 * 60 * 1000, // 1 hour
  path: "/"
};

// Helper to set auth cookie
const setAuthCookie = (res, token) => {
  res.cookie("auth_token", token, COOKIE_OPTIONS);
};

// Helper to clear auth cookie
const clearAuthCookie = (res) => {
  res.clearCookie("auth_token", { ...COOKIE_OPTIONS, maxAge: 0 });
};

// Helper to extract device name from user-agent
const getDeviceName = (req) => {
  const ua = req.headers["user-agent"] || "";
  let browser = "Browser";
  if (/chrome|crios/i.test(ua) && !/edge|edg/i.test(ua) && !/opr/i.test(ua)) browser = "Chrome";
  else if (/safari/i.test(ua) && !/chrome|crios/i.test(ua)) browser = "Safari";
  else if (/firefox|fxios/i.test(ua)) browser = "Firefox";
  else if (/edge|edg/i.test(ua)) browser = "Edge";
  else if (/opr/i.test(ua)) browser = "Opera";

  let os = "Unknown OS";
  if (/windows/i.test(ua)) os = "Windows";
  else if (/macintosh|mac os x/i.test(ua)) os = "macOS";
  else if (/iphone/i.test(ua)) os = "iPhone";
  else if (/ipad/i.test(ua)) os = "iPad";
  else if (/android/i.test(ua)) os = "Android";
  else if (/linux/i.test(ua)) os = "Linux";

  return `${browser} on ${os}`;
};

// Helper to extract IP address safely
const getIpAddress = (req) => {
  const forwarded = req.headers["x-forwarded-for"];
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  return req.ip || req.connection?.remoteAddress || "Unknown IP";
};

// Auth middleware: reads from cookie first, then Authorization header, and attaches user
async function verifyToken(req, res, next) {
  try {
    const token =
      req.cookies?.auth_token ||
      (req.headers.authorization?.startsWith("Bearer ")
        ? req.headers.authorization.slice(7)
        : null);

    if (!token) return sendError(res, 401, "Missing token");

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (!decoded.sessionId) {
      return sendError(res, 401, "Session verification required");
    }

    const session = await UserSession.findOne({
      _id: decoded.sessionId,
      userId: decoded.id,
      isActive: true
    });

    if (!session) {
      clearAuthCookie(res);
      return sendError(res, 401, "Session expired or logged out");
    }

    const user = await User.findById(decoded.id);
    if (!user) return sendError(res, 401, "User not found");

    // Throttle lastSeen updates to database to once every 15 minutes
    const now = Date.now();
    const lastSeenTime = session.lastSeen ? new Date(session.lastSeen).getTime() : 0;
    if (now - lastSeenTime > 15 * 60 * 1000) {
      UserSession.updateOne({ _id: session._id }, { $set: { lastSeen: new Date() } }).catch((err) => {
        logger.error({ err }, "Failed to update lastSeen in background");
      });
    }

    req.user = user;
    req.userId = user._id;
    req.sessionId = session._id;
    return next();
  } catch (err) {
    return sendError(res, 401, "Invalid or expired token");
  }
}

// Signup
router.post("/signup", authLimiter, validate(signupSchema), async (req, res) => {
  const { name, email, password, googleId } = req.validated.body;
  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) return sendError(res, 400, "User already exists");

    // Password is optional for Google OAuth users
    if (!password && !googleId) {
      return sendError(res, 400, "Password is required for local signup");
    }

    const hashedPassword = password ? await bcrypt.hash(password, 10) : undefined;
    const user = new User({ 
      name, 
      email, 
      password: hashedPassword,
      authProvider: "local"
    });
    await user.save();

    return sendSuccess(res, 201, {}, "User registered successfully");
  } catch (err) {
    sendError(res, 500, err.message || "Signup failed");
  }
});

// Login
router.post("/login", authLimiter, validate(loginSchema), async (req, res) => {
  const { email, password } = req.validated.body;
  try {
    const user = await User.findOne({ email });
    
    // Generic error message to prevent user enumeration
    if (!user) return sendError(res, 400, "Invalid email or password");

    // Block immediately if deactivated
    if (user.isActive === false) {
      return sendError(res, 403, "Account is deactivated. Contact support.");
    }

    // Google-only users won't have a local password set, prevent bcrypt compare crash
    if (!user.password) {
      return sendError(res, 400, "Invalid email or password");
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return sendError(res, 400, "Invalid email or password");

    // ✅ Update lastLogin
    user.lastLogin = new Date();
    await user.save();

    // Create session in database
    const session = new UserSession({
      userId: user._id,
      deviceName: getDeviceName(req),
      ipAddress: getIpAddress(req),
      isActive: true,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour session TTL (matches JWT)
    });
    await session.save();

    const token = jwt.sign(
      { id: user._id, sessionId: session._id },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    setAuthCookie(res, token);
    return sendSuccess(res, 200, {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        isAdmin: user.isAdmin || false,
        role: user.role || "user",
        createdAt: user.createdAt,
        lastLogin: user.lastLogin
      },
      isAdmin: user.isAdmin || false,
    });
  } catch (err) {
    sendError(res, 500, err.message || "Login failed");
  }
});

// Forgot password - request reset link
router.post("/forgot-password", authLimiter, validate(forgotPasswordSchema), async (req, res) => {
  try {
    const { email: normalizedEmail } = req.validated.body;
    const user = await User.findOne({ email: normalizedEmail });

    // Always respond the same to avoid leaking which emails exist
    if (!user) {
      return sendSuccess(res, 200, {}, "If an account exists, a reset link has been sent.");
    }

    // Google-only accounts don't have a local password to reset
    if (user.authProvider === "google" && !user.password) {
      return sendSuccess(
        res,
        200,
        { provider: "google" },
        "This account uses Google Sign-In. Please continue with Google."
      );
    }

    const rawToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto
      .createHash("sha256")
      .update(rawToken)
      .digest("hex");

    user.passwordResetToken = hashedToken;
    user.passwordResetExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
    await user.save();

    const frontendBase = process.env.FRONTEND_URL || "http://localhost:3000";
    const resetLink = `${frontendBase.replace(/\/$/, "")}/reset-password?token=${rawToken}`;

    if (!process.env.MAIL_USER || !process.env.MAIL_PASS) {
      logger.error({ mailUser: process.env.MAIL_USER, hasPass: !!process.env.MAIL_PASS }, "MAIL_USER/MAIL_PASS not configured for forgot-password");
      return sendError(res, 500, "Email service is not configured");
    }

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS,
      },
    });

    await transporter.sendMail({
      from: `"SmartDocQ" <${process.env.MAIL_USER}>`,
      to: user.email,
      subject: "Reset your SmartDocQ password",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 24px; border: 1px solid #eee; border-radius: 12px; color: #111;">
          <h2 style="margin-bottom: 16px;">Reset your password</h2>

          <p>Hello,</p>

          <p>We received a request to reset the password for your SmartDocQ account.</p>

          <p>This reset link will remain valid for <strong>15 minutes</strong>.</p>

          <p style="margin: 24px 0;">
            <a 
              href="${resetLink}" 
              style="display: inline-block; padding: 12px 20px; background: #111; color: #fff; text-decoration: none; border-radius: 8px; font-weight: 600;"
            >
              Reset your password
            </a>
          </p>

          <p>If you didn’t request a password reset, you can safely ignore this email.</p>

          <hr style="margin: 24px 0; border: none; border-top: 1px solid #eee;" />

          <p style="font-size: 12px; color: #666;">
            SmartDocQ Team<br/>
            This is an automated email, so replies aren’t monitored.
          </p>
        </div>
      `,
    });

    return sendSuccess(res, 200, {}, "If an account exists, a reset link has been sent.");
  } catch (err) {
    logger.error({ err }, "Forgot-password sendMail failed");
    return sendError(res, 500, err.message || "Failed to send reset link");
  }
});

// Reset password - consume token and set new password
router.post("/reset-password", authLimiter, validate(resetPasswordSchema), async (req, res) => {
  try {
    const { token, password } = req.validated.body;

    const hashedToken = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");

    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: new Date() },
    });

    if (!user) {
      return sendError(
        res,
        400,
        "This password reset link is no longer valid. Please request a new reset link."
      );
    }

    user.password = await bcrypt.hash(password, 10);
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    user.lastPasswordChange = new Date();
    user.passwordChangeCount = 0;
    user.passwordChangeWindowStart = new Date();

    await user.save();

    return sendSuccess(res, 200, {}, "Password reset successful");
  } catch (err) {
    return sendError(res, 500, err.message || "Failed to reset password");
  }
});

// Logout - clears httpOnly cookie and marks current session inactive
router.post("/logout", async (req, res) => {
  try {
    const token =
      req.cookies?.auth_token ||
      (req.headers.authorization?.startsWith("Bearer ")
        ? req.headers.authorization.slice(7)
        : null);

    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      if (decoded && decoded.sessionId) {
        await UserSession.updateOne(
          { _id: decoded.sessionId, userId: decoded.id },
          { $set: { isActive: false } }
        );
      }
    }
  } catch (err) {
    logger.info("Session deactivation skipped on logout: " + err.message);
  }

  clearAuthCookie(res);
  return sendSuccess(res, 200, {}, "Logged out successfully");
});

// Logout all - deactivates all sessions for the user
router.post("/logout-all", verifyToken, async (req, res) => {
  try {
    await UserSession.updateMany(
      { userId: req.userId },
      { $set: { isActive: false } }
    );
    clearAuthCookie(res);
    return sendSuccess(res, 200, {}, "Logged out from all devices successfully");
  } catch (err) {
    logger.error({ err }, "Error in logout-all");
    return sendError(res, 500, err.message || "Failed to log out from all devices");
  }
});

// Verify session - checks if cookie is valid
router.get("/verify", verifyToken, (req, res) => {
  return sendSuccess(res, 200, { valid: true, userId: req.userId });
});

// Utility: derive Cloudinary public_id from a secure URL
function extractCloudinaryPublicId(url) {
  try {
    if (!url || typeof url !== 'string') return null;
    const u = new URL(url);
    // Expect path like: /<cloud_name?>/image/upload/v<ver>/<folder>/<name>.<ext>
    const p = u.pathname; // e.g., /image/upload/v1721234567/smartdoc/avatars/USER-ts.jpg
    const idx = p.indexOf('/upload/');
    if (idx === -1) return null;
    let rest = p.substring(idx + '/upload/'.length); // v172.../smartdoc/avatars/USER-ts.jpg
    // Drop version prefix if present
    if (rest.startsWith('v') && rest.includes('/')) {
      rest = rest.substring(rest.indexOf('/') + 1);
    }
    // Remove leading slash if any
    if (rest.startsWith('/')) rest = rest.slice(1);
    // Remove extension (last .ext)
    const lastDot = rest.lastIndexOf('.');
    if (lastDot > -1) rest = rest.substring(0, lastDot);
    return rest || null; // e.g., smartdoc/avatars/USER-ts
  } catch (_) {
    return null;
  }
}

// Delete current user
router.delete("/me", verifyToken, async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.userId);
    if (!user) return sendError(res, 404, "User not found");

    // Best-effort: remove avatar from Cloudinary to free storage
    try {
      const pubId = extractCloudinaryPublicId(user.avatar);
      if (pubId) {
        await cloudinary.uploader.destroy(pubId, { invalidate: true, resource_type: 'image' });
      }
    } catch (_) { /* ignore */ }

    // Cascade delete user-related data (MongoDB Atlas)
    try {
      const [docsRes, chatsRes, contactsRes] = await Promise.allSettled([
        Document.deleteMany({ user: user._id }),
        Chat.deleteMany({ user: user._id }),
        ContactReport.deleteMany({ user: user._id })
      ]);
      const counts = {
        documents: docsRes.status === 'fulfilled' ? (docsRes.value?.deletedCount || 0) : 0,
        chats: chatsRes.status === 'fulfilled' ? (chatsRes.value?.deletedCount || 0) : 0,
        contactReports: contactsRes.status === 'fulfilled' ? (contactsRes.value?.deletedCount || 0) : 0,
      };
      return sendSuccess(res, 200, { deleted: counts }, "Account deleted successfully");
    } catch (_) {
      // Even if cascade fails, the account was removed; report generic success
      return sendSuccess(res, 200, {}, "Account deleted successfully");
    }
  } catch (err) {
    return sendError(res, 500, err.message || "Failed to delete account");
  }
});


// Update current user (name, email, password)
router.put("/me", verifyToken, validate(updateMeSchema), async (req, res) => {
  try {
    const { name, email, password } = req.validated.body || {};
    const user = await User.findById(req.userId);
    if (!user) return sendError(res, 404, "User not found");

    // Validate provided name isn't same as current
    if (typeof name === "string" && name.trim()) {
      if (name.trim() === user.name) {
        return sendError(res, 400, "New name must be different from current name");
      }
      user.name = name.trim();
    }

    // Update email with uniqueness and same-value checks
    if (typeof email === "string" && email.trim()) {
      const nextEmail = email.toLowerCase().trim();
      if (nextEmail === user.email) {
        return sendError(res, 400, "New email must be different from current email");
      }
      const existing = await User.findOne({ email: nextEmail });
      if (existing && existing._id.toString() !== user._id.toString()) {
        return sendError(res, 400, "Email already in use");
      }
      user.email = nextEmail;
    }

    // Update password with 3 changes allowed per 24h, then cooldown until window resets
    if (typeof password === "string" && password.length > 0) {
      // Prevent setting the same password again, safely handle Google OAuth users with null passwords
      const isSame = user.password ? await bcrypt.compare(password, user.password) : false;
      if (isSame) {
        return sendError(res, 400, "New password must be different from current password");
      }

      const now = Date.now();
      const twentyFourHours = 24 * 60 * 60 * 1000;

      // Initialize or reset window if expired
      const windowStart = user.passwordChangeWindowStart ? user.passwordChangeWindowStart.getTime() : null;
      if (!windowStart || now - windowStart >= twentyFourHours) {
        user.passwordChangeWindowStart = new Date(now);
        user.passwordChangeCount = 0;
      }

      // Enforce 3 changes per 24-hour window
      if (user.passwordChangeCount >= 3) {
        const remainingMs = twentyFourHours - (now - user.passwordChangeWindowStart.getTime());
        const remainingHours = Math.ceil(remainingMs / (60 * 60 * 1000));
        return sendError(res, 429, `Password change limit reached. Try again in ${remainingHours}h`);
      }

      user.password = await bcrypt.hash(password, 10);
      user.lastPasswordChange = new Date(now);
      user.passwordChangeCount += 1;
    }

    await user.save();

    // Optionally rotate token. Keeping existing token by default.
    const sanitized = {
      id: user._id,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      createdAt: user.createdAt,
      lastLogin: user.lastLogin,
    };

    return sendSuccess(res, 200, { user: sanitized });
  } catch (err) {
    return sendError(res, 500, err.message || "Failed to update profile");
  }
});


module.exports = router;
module.exports.verifyToken = verifyToken;

// Middleware to ensure current user is active
module.exports.ensureActive = async function ensureActive(req, res, next) {
  try {
    const user = req.user;
    if (!user) return sendError(res, 401, 'User not found');
    if (user.isActive === false) {
      return sendError(res, 403, 'Account is deactivated');
    }
    next();
  } catch (err) {
    return sendError(res, 500, err.message || 'Internal server error');
  }
};

// Middleware to ensure current user is admin
function isAdmin(req, res, next) {
  if (!req.user?.isAdmin) {
    return sendError(res, 403, "Admin access required");
  }
  next();
}

module.exports.isAdmin = isAdmin;

// Configure Multer memory storage for avatars (no local files)
const avatarUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
  fileFilter: (req, file, cb) => {
    const allowed = [".png", ".jpg", ".jpeg", ".webp"];
    const ext = path.extname(file.originalname || "").toLowerCase();
    if (!allowed.includes(ext)) return cb(new Error("Only PNG, JPG, JPEG, WEBP allowed"));
    cb(null, true);
  }
});

// Upload/update current user's avatar
router.post("/me/avatar", verifyToken, avatarUpload.single("avatar"), async (req, res) => {
  try {
    if (!req.file) return sendError(res, 400, "No file uploaded");
    const user = await User.findById(req.userId);
    if (!user) return sendError(res, 404, "User not found");
    const previousAvatarUrl = user.avatar; // keep for deletion after successful upload

    // Upload to Cloudinary using a stream
    const folder = process.env.CLOUDINARY_AVATAR_FOLDER || "smartdoc/avatars";
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder, public_id: `${req.userId}-${Date.now()}`, resource_type: "image", overwrite: true },
      async (error, result) => {
        try {
          if (error) return sendError(res, 500, error.message || "Upload failed");
          user.avatar = result.secure_url;
          await user.save();
          // After saving new avatar, delete previous one to avoid wasting storage
          try {
            const pubId = extractCloudinaryPublicId(previousAvatarUrl);
            if (pubId) {
              await cloudinary.uploader.destroy(pubId, { invalidate: true, resource_type: 'image' });
            }
          } catch (_) { /* ignore deletion errors */ }
          return sendSuccess(res, 200, { avatar: user.avatar });
        } catch (e) {
          return sendError(res, 500, e.message || "Failed to save avatar");
        }
      }
    );
    streamifier.createReadStream(req.file.buffer).pipe(uploadStream);
  } catch (err) {
    return sendError(res, 500, err.message || "Failed to upload avatar");
  }
});
// ===== GOOGLE OAUTH =====
// Initialize Google OAuth client
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Google Sign-In (verify token from frontend)
router.post('/google', authLimiter, validate(googleSchema), async (req, res) => {
  try {
    const { credential } = req.validated.body; // Google JWT token from @react-oauth/google
    
    // Verify the Google token
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const { sub: googleId, email, name, picture } = payload;

    if (!email) {
      return sendError(res, 400, 'Email not provided by Google');
    }

    // Check if user exists
    let user = await User.findOne({ $or: [{ googleId }, { email }] });

    if (user) {
      // Existing user - link Google account if not already linked
      if (!user.googleId) {
        user.googleId = googleId;
        user.authProvider = 'google';
        if (picture && !user.avatar) user.avatar = picture;
        await user.save();
      }
      
      // Update last login
      user.lastLogin = new Date();
      await user.save();
    } else {
      // Create new user with Google auth
      user = new User({
        name: name || email.split('@')[0],
        email,
        googleId,
        authProvider: 'google',
        avatar: picture || null,
        lastLogin: new Date(),
        isActive: true,
      });
      await user.save();
    }

    // Block if deactivated
    if (user.isActive === false) {
      return sendError(res, 403, 'Account is deactivated. Contact support.');
    }

    // Create session in database
    const session = new UserSession({
      userId: user._id,
      deviceName: getDeviceName(req),
      ipAddress: getIpAddress(req),
      isActive: true,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour session TTL (matches JWT)
    });
    await session.save();

    // Generate JWT
    const token = jwt.sign(
      { id: user._id, sessionId: session._id },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    setAuthCookie(res, token);
    return sendSuccess(res, 200, {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        isAdmin: user.isAdmin || false,
        role: user.role || 'user',
        createdAt: user.createdAt,
        lastLogin: user.lastLogin,
      },
      isAdmin: user.isAdmin || false,
    });
  } catch (err) {
    logger.error({ err }, "Google auth error");
    return sendError(res, 500, 'Google authentication failed', [{ message: err.message }]);
  }
});