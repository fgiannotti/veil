import nodemailer from "nodemailer";

let cached: nodemailer.Transporter | null = null;

function transporter() {
  if (cached) return cached;
  cached = nodemailer.createTransport({
    host: process.env.SMTP_HOST ?? "localhost",
    port: Number(process.env.SMTP_PORT ?? 1025),
    secure: false,
    auth:
      process.env.SMTP_USER && process.env.SMTP_PASS
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        : undefined,
  });
  return cached;
}

export async function sendVerificationCode(to: string, code: string): Promise<void> {
  const from = process.env.SMTP_FROM ?? "Veil <no-reply@veil.ar>";
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
