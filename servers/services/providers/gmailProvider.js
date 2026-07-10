const nodemailer = require("nodemailer");
const logger = require("../../lib/logger");

let _transporter = null;

function getTransporter() {
  if (_transporter) return _transporter;

  if (!process.env.MAIL_USER || !process.env.MAIL_PASS) {
    throw new Error("Gmail SMTP credentials (MAIL_USER/MAIL_PASS) are not configured");
  }

  _transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: {
      user: process.env.MAIL_USER,
      pass: process.env.MAIL_PASS,
    },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 10000,
  });

  _transporter.verify()
    .then(() => logger.info("SMTP connection verified"))
    .catch((err) => logger.error({ err }, "SMTP verify failed"));

  return _transporter;
}

async function send(mailOptions) {
  const transporter = getTransporter();

  logger.debug("Calling transporter.sendMail");
  try {
    const info = await transporter.sendMail({
      from: `"SmartDocQ" <${process.env.MAIL_USER}>`,
      to: mailOptions.to,
      subject: mailOptions.subject,
      html: mailOptions.html,
    });
    logger.info({ messageId: info.messageId }, "Email sent successfully via Gmail SMTP");
    return info;
  } catch (err) {
    logger.error({ err }, "SMTP transporter sendMail failed");
    throw err;
  }
}

module.exports = { send };
