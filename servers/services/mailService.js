const logger = require("../lib/logger");
const isProduction = process.env.NODE_ENV === "production";
const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL || "smartdocq@gmail.com";

logger.info(`Email provider: ${isProduction ? "Brevo SMTP" : "Gmail SMTP"}`);
const provider = isProduction
  ? require("./providers/brevoProvider")
  : require("./providers/gmailProvider");

/**
 * Send an email using the selected provider abstraction.
 * Returns a promise.
 */
function sendMail(mailOptions) {
  return provider.send(mailOptions);
}

/**
 * Sends a password reset link email.
 */
function sendPasswordResetEmail(email, resetLink) {
  return sendMail({
    to: email,
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

        <p>If you didn't request a password reset, you can safely ignore this email.</p>

        <hr style="margin: 24px 0; border: none; border-top: 1px solid #eee;" />

        <p style="font-size: 12px; color: #666;">
          SmartDocQ Team<br/>
          This is an automated email, so replies aren't monitored.
        </p>
      </div>
    `,
  });
}

/**
 * Sends a password changed confirmation email.
 */
function sendPasswordChangedEmail(email, changeTime) {
  return sendMail({
    to: email,
    subject: "Your SmartDocQ password was changed",
    html: `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e8e8e8; overflow: hidden;">
        <div style="background: #111111; padding: 28px 32px;">
          <h2 style="margin: 0; font-size: 20px; font-weight: 600; color: #ffffff; letter-spacing: -0.3px;">Password Changed</h2>
        </div>
        <div style="padding: 28px 32px;">
          <p style="margin: 0 0 16px; font-size: 15px; line-height: 1.6; color: #333333;">
            Your SmartDocQ password was successfully changed.
          </p>
          <div style="background: #f7f7f8; border-radius: 8px; padding: 14px 18px; margin: 0 0 20px;">
            <p style="margin: 0; font-size: 13px; color: #666666;">
              <strong style="color: #333;">Time:</strong> ${changeTime}
            </p>
          </div>
          <p style="margin: 0 0 8px; font-size: 14px; line-height: 1.6; color: #555555;">
            If you made this change, no further action is required.
          </p>
          <p style="margin: 0 0 0; font-size: 14px; line-height: 1.6; color: #555555;">
            If you did not change your password, please secure your account immediately and
            <a href="mailto:${SUPPORT_EMAIL}" style="color: #111; font-weight: 600; text-decoration: underline;">contact support</a>.
          </p>
        </div>
        <div style="border-top: 1px solid #eeeeee; padding: 18px 32px;">
          <p style="margin: 0; font-size: 11.5px; color: #999999; line-height: 1.5;">
            This is an important security notification from SmartDocQ.<br/>
            This is an automated email &mdash; replies are not monitored.
          </p>
        </div>
      </div>
    `,
  });
}

module.exports = {
  sendMail,
  sendPasswordResetEmail,
  sendPasswordChangedEmail
};
