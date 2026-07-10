const { Resend } = require("resend");
const logger = require("../../lib/logger");

let _resend = null;

function getResendClient() {
  if (_resend) return _resend;

  if (!process.env.RESEND_API_KEY) {
    logger.error("Resend API key missing (RESEND_API_KEY missing)");
    return null;
  }

  _resend = new Resend(process.env.RESEND_API_KEY);
  return _resend;
}

async function send(mailOptions) {
  const resend = getResendClient();
  if (!resend) {
    throw new Error("Resend provider is not configured");
  }

  logger.debug("Calling resend.emails.send");
  try {
    // Production From address: SmartDocQ <onboarding@resend.dev>
    // Can later be changed to noreply@smartdocq.com after domain verification in Resend dashboard
    const fromAddress = "SmartDocQ <onboarding@resend.dev>";

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
