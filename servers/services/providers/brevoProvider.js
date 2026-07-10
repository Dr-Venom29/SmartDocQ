const nodemailer = require("nodemailer");
const logger = require("../../lib/logger");

let _transporter = null;

function getTransporter() {
  if (_transporter) return _transporter;

  if (!process.env.BREVO_MAIL_USER || !process.env.BREVO_MAIL_PASS) {
    throw new Error("Brevo SMTP credentials (BREVO_MAIL_USER/BREVO_MAIL_PASS) are not configured");
  }

  _transporter = nodemailer.createTransport({
    host: "smtp-relay.brevo.com",
    port: 587,
    secure: false,
    auth: {
      user: process.env.BREVO_MAIL_USER,
      pass: process.env.BREVO_MAIL_PASS,
    },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 10000,
  });

  _transporter.verify()
    .then(() => logger.info("Brevo SMTP verified"))
    .catch((err) => logger.error({ err }, "Brevo SMTP verify failed"));

  return _transporter;
}

async function send(mailOptions) {
  const transporter = getTransporter();

  try {
    const info = await transporter.sendMail({
      from: `"SmartDocQ" <${process.env.BREVO_MAIL_USER}>`,
      to: mailOptions.to,
      subject: mailOptions.subject,
      html: mailOptions.html,
    });
    logger.info({ messageId: info.messageId }, "Email sent successfully via Brevo SMTP");
    return info;
  } catch (err) {
    logger.error({ err }, "Brevo sendMail failed");
    throw err;
  }
}

module.exports = { send };
