const { Resend } = require("resend");
const logger = require("../../lib/logger");

let _resend = null;

function getResendClient() {
  if (_resend) return _resend;

  if (!process.env.RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY is not configured");
  }

  _resend = new Resend(process.env.RESEND_API_KEY);
  return _resend;
}

async function send(mailOptions) {
  const resend = getResendClient();

  logger.debug("Calling resend.emails.send");
  try {
    // Production From address: can be configured via RESEND_FROM env var
    // Default fallback to "SmartDocQ <onboarding@resend.dev>" (verification pending domain config)
    const fromAddress = process.env.RESEND_FROM || "SmartDocQ <onboarding@resend.dev>";

    const { data, error } = await resend.emails.send({
      from: fromAddress,
      to: mailOptions.to,
      subject: mailOptions.subject,
      html: mailOptions.html,
    });

    if (error) {
      logger.error({ err: error }, "Resend provider sendMail failed");
      throw error;
    }

    logger.info({ messageId: data.id }, "Email sent successfully via Resend");
    return { messageId: data.id };
  } catch (err) {
    logger.error({ err }, "Resend provider sendMail failed");
    throw err;
  }
}

module.exports = { send };
