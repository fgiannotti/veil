import nodemailer from "nodemailer";

const DEFAULT_FROM = "Veil <no-reply@veil.com.ar>";

let cached: nodemailer.Transporter | null = null;

function smtpTransportOptions() {
  const host = process.env.SMTP_HOST ?? "localhost";
  const port = Number(process.env.SMTP_PORT ?? 1025);
  const explicitSecure = process.env.SMTP_SECURE;

  const secure =
    explicitSecure === "true"
      ? true
      : explicitSecure === "false"
        ? false
        : port === 465 || port === 2465;

  const useTls =
    host !== "localhost" && (port === 587 || port === 2587 || port === 25);

  return {
    host,
    port,
    secure,
    ...(useTls ? { requireTLS: true } : {}),
    auth:
      process.env.SMTP_USER && process.env.SMTP_PASS
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        : undefined,
  };
}

function transporter() {
  if (cached) return cached;
  cached = nodemailer.createTransport(smtpTransportOptions());
  return cached;
}

export async function sendVerificationCode(to: string, code: string): Promise<void> {
  const from = process.env.SMTP_FROM ?? DEFAULT_FROM;
  await transporter().sendMail({
    from,
    to,
    subject: `Your Veil verification code: ${code}`,
    text: `Your Veil verification code is ${code}. It expires in 10 minutes.

If you didn't request this, you can safely ignore this email.

— Veil`,
    html: `<p>Your Veil verification code is <strong style="font-size:20px">${code}</strong>.</p>
<p>It expires in 10 minutes.</p>
<p style="color:#666;font-size:12px">If you didn't request this, you can ignore this email.</p>`,
  });
}
