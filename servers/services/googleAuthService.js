const { OAuth2Client } = require("google-auth-library");
const User = require("../models/User");

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

/**
 * Verifies a Google ID token credential, links or creates the user in the database,
 * and returns the user object.
 */
async function verifyGoogleLogin(credential) {
  if (!process.env.GOOGLE_CLIENT_ID) {
    throw new Error("Google Client ID is not configured on the server.");
  }

  // Verify the Google token
  const ticket = await googleClient.verifyIdToken({
    idToken: credential,
    audience: process.env.GOOGLE_CLIENT_ID,
  });

  const payload = ticket.getPayload();
  const { sub: googleId, email, name, picture } = payload;

  if (!email) {
    throw new Error("Email not provided by Google");
  }

  // Check if user exists
  let user = await User.findOne({ $or: [{ googleId }, { email }] });

  if (user) {
    // Existing user - link Google account if not already linked
    if (!user.googleId) {
      user.googleId = googleId;
      user.authProvider = "google";
      if (picture && !user.avatar) user.avatar = picture;
      await user.save();
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();
  } else {
    // Create new user with Google auth
    user = new User({
      name: name || email.split("@")[0],
      email,
      googleId,
      authProvider: "google",
      avatar: picture || null,
      lastLogin: new Date(),
      isActive: true,
    });
    await user.save();
  }

  return user;
}

module.exports = {
  verifyGoogleLogin,
};
