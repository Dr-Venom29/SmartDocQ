const SibApiV3Sdk = require("sib-api-v3-sdk");
const logger = require("../../lib/logger");

logger.info("Brevo HTTPS API provider selected");

if (!process.env.BREVO_API_KEY) {
  throw new Error("BREVO_API_KEY is not configured");
}

if (!process.env.BREVO_SENDER_EMAIL) {
  throw new Error("BREVO_SENDER_EMAIL is not configured");
}

const client = SibApiV3Sdk.ApiClient.instance;
client.authentications["api-key"].apiKey = process.env.BREVO_API_KEY;

const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();

async function send(mailOptions) {
  logger.info({ recipient: mailOptions.to, subject: mailOptions.subject }, "Entered Brevo send()");

  const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();
  sendSmtpEmail.subject = mailOptions.subject;
  sendSmtpEmail.htmlContent = mailOptions.html;
  sendSmtpEmail.sender = {
    name: process.env.BREVO_SENDER_NAME || "SmartDocQ",
    email: process.env.BREVO_SENDER_EMAIL
  };
  sendSmtpEmail.to = [{ email: mailOptions.to }];

  try {
    const data = await apiInstance.sendTransacEmail(sendSmtpEmail);
    logger.info({ messageId: data.messageId, recipient: mailOptions.to }, "Email sent successfully via Brevo HTTPS API");
    return data;
  } catch (err) {
    logger.error({ err, recipient: mailOptions.to }, "Brevo API sendTransacEmail failed");
    throw err;
  }
}

module.exports = { send };
