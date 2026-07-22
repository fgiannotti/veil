import nodemailer from "nodemailer";
import { getEnv } from "@/server/env";

let cached: nodemailer.Transporter | null = null;

function smtpTransportOptions() {
  const env = getEnv();
  const host = env.smtpHost;
  const port = env.smtpPort;
  const explicitSecure = env.smtpSecure;

  const secure =
    explicitSecure === "true"
      ? true
      : explicitSecure === "false"
        ? false
        : port === 465 || port === 2465;

  const useTls =
    host !== "localhost" && host !== "127.0.0.1" && (port === 587 || port === 2587 || port === 25);

  return {
    host,
    port,
    secure,
    ...(useTls ? { requireTLS: true } : {}),
    auth: env.smtpUser && env.smtpPass ? { user: env.smtpUser, pass: env.smtpPass } : undefined,
  };
}

function transporter() {
  if (cached) return cached;
  cached = nodemailer.createTransport(smtpTransportOptions());
  return cached;
}

export async function sendVerificationCode(to: string, code: string): Promise<void> {
  const from = getEnv().smtpFrom;
  await transporter().sendMail({
    from,
    to,
    subject: "Tu código de verificación de Veil",
    text: `Tu código de verificación de Veil es ${code}. Expira en 10 minutos.

Si no pediste este código, podés ignorar este email.

— Veil`,
    html: `<p>Tu código de verificación de Veil es <strong style="font-size:20px;letter-spacing:2px">${code}</strong>.</p>
<p>Expira en 10 minutos.</p>
<p style="color:#666;font-size:12px">Si no pediste este código, podés ignorar este email.</p>`,
  });
}
