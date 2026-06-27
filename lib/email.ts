import nodemailer from "nodemailer";
import { base } from "@/lib/db";

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_SERVER_HOST,
  port: Number(process.env.EMAIL_SERVER_PORT ?? 465),
  secure: Number(process.env.EMAIL_SERVER_PORT ?? 465) === 465,
  auth: {
    user: process.env.EMAIL_SERVER_USER,
    pass: process.env.EMAIL_SERVER_PASSWORD,
  },
});

/** Generic mail sender — reuse for any transactional email (notifications, reset, ...). */
export async function sendEmail(opts: { to: string; cc?: string | string[]; subject: string; html: string; category?: string }) {
  let success = true;
  let error: string | undefined;
  try {
    await transporter.sendMail({
      from: process.env.EMAIL_FROM ?? "noreply@doprent.com",
      to: opts.to,
      ...(opts.cc ? { cc: opts.cc } : {}),
      subject: opts.subject,
      html: opts.html,
    });
  } catch (e: any) {
    success = false;
    error = e?.message ?? String(e);
    throw e;
  } finally {
    const recipients = [opts.to, ...(Array.isArray(opts.cc) ? opts.cc : opts.cc ? [opts.cc] : [])].join(", ");
    base.emailLog
      .create({ data: { to: recipients, subject: opts.subject, category: opts.category ?? "other", success, error } })
      .catch(() => {});
  }
}

export async function sendPasswordResetEmail(email: string, token: string) {
  const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  const url = `${baseUrl}/reset-password?token=${token}`;

  await sendEmail({
    to: email,
    subject: "ตั้งรหัสผ่านใหม่ — DopRent",
    category: "password-reset",
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 20px">
        <h2 style="font-size:22px;margin-bottom:8px">ตั้งรหัสผ่านใหม่</h2>
        <p style="color:#555;line-height:1.6;margin-bottom:24px">
          กดปุ่มด้านล่างเพื่อตั้งรหัสผ่านใหม่สำหรับบัญชี DopRent ของคุณ
          ลิงก์นี้จะหมดอายุใน 1 ชั่วโมง และใช้ได้เพียงครั้งเดียว
        </p>
        <a href="${url}"
           style="display:inline-block;background:#1a1a1a;color:#fff;padding:12px 28px;border-radius:6px;text-decoration:none;font-size:15px">
          ตั้งรหัสผ่านใหม่
        </a>
        <p style="color:#999;font-size:12px;margin-top:24px">
          หากคุณไม่ได้ขอตั้งรหัสผ่านใหม่ กรุณาเพิกเฉยต่ออีเมลนี้ — รหัสผ่านของคุณจะไม่ถูกเปลี่ยน
        </p>
      </div>
    `,
  });
}

export async function sendVerificationEmail(email: string, token: string) {
  const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  const url = `${baseUrl}/api/auth/verify-email?token=${token}`;

  await sendEmail({
    to: email,
    subject: "ยืนยันอีเมลของคุณ — DopRent",
    category: "verification",
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 20px">
        <h2 style="font-size:22px;margin-bottom:8px">ยืนยันอีเมลของคุณ</h2>
        <p style="color:#555;line-height:1.6;margin-bottom:24px">
          กดปุ่มด้านล่างเพื่อยืนยันอีเมลและเริ่มใช้งาน DopRent
          ลิงก์นี้จะหมดอายุใน 24 ชั่วโมง
        </p>
        <a href="${url}"
           style="display:inline-block;background:#1a1a1a;color:#fff;padding:12px 28px;border-radius:6px;text-decoration:none;font-size:15px">
          ยืนยันอีเมล
        </a>
        <p style="color:#999;font-size:12px;margin-top:24px">
          หากคุณไม่ได้สมัครสมาชิก DopRent กรุณาเพิกเฉยต่ออีเมลนี้
        </p>
      </div>
    `,
  });
}
