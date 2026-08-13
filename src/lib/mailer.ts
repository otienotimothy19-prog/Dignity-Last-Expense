import nodemailer, { type Transporter } from "nodemailer";

/**
 * SMTP transport — default host is smtppro.zoho.com:465 (SSL), confirmed
 * from this org's own Mail Settings > Configurations page (Zoho
 * Workplace/Pro orgs use smtppro.zoho.com, not the plain-Zoho-Mail
 * smtp.zoho.com). Override ZOHO_SMTP_HOST if that ever changes. Requires
 * ZOHO_SMTP_USER (the full mailbox address) and ZOHO_SMTP_PASSWORD — an
 * app-specific password generated at
 * https://accounts.zoho.com/home#security/app_password, not the account's
 * normal login password.
 */
export type SendEmailResult = { ok: true } | { ok: false; error: string };

let cachedTransporter: Transporter | null = null;

function getTransporter(): Transporter | null {
  const user = process.env.ZOHO_SMTP_USER;
  const pass = process.env.ZOHO_SMTP_PASSWORD;
  if (!user || !pass) return null;

  if (!cachedTransporter) {
    const host = process.env.ZOHO_SMTP_HOST || "smtppro.zoho.com";
    const port = Number(process.env.ZOHO_SMTP_PORT) || 465;
    cachedTransporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });
  }
  return cachedTransporter;
}

export async function sendEmail(params: {
  to: string;
  subject: string;
  html: string;
  attachment?: { filename: string; content: Buffer; contentType: string };
}): Promise<SendEmailResult> {
  const transporter = getTransporter();
  if (!transporter) {
    return {
      ok: false,
      error: "No email provider is configured in this environment. Set ZOHO_SMTP_USER and ZOHO_SMTP_PASSWORD to enable real delivery.",
    };
  }

  const from = process.env.MAIL_FROM || process.env.ZOHO_SMTP_USER!;

  try {
    await transporter.sendMail({
      from,
      to: params.to,
      subject: params.subject,
      html: params.html,
      attachments: params.attachment
        ? [{ filename: params.attachment.filename, content: params.attachment.content, contentType: params.attachment.contentType }]
        : undefined,
    });
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Unknown error sending email." };
  }
}
