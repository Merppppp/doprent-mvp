import { sendEmail } from "@/lib/email";

/**
 * Booking notification emails (Thai), fire-and-forget.
 *
 * Every helper here swallows mail-transport errors: a notification failure
 * must never block or fail the booking action that triggered it.
 */

function baseUrl() {
  return process.env.NEXTAUTH_URL ?? "http://localhost:3000";
}

function formatThaiDate(d: Date | string) {
  return new Date(d).toLocaleDateString("th-TH", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Bangkok",
  });
}

function emailShell(opts: {
  title: string;
  bodyHtml: string;
  ctaLabel: string;
  ctaUrl: string;
}) {
  return `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 20px">
      <h2 style="font-size:22px;margin-bottom:8px">${opts.title}</h2>
      <div style="color:#555;line-height:1.6;margin-bottom:24px">${opts.bodyHtml}</div>
      <a href="${opts.ctaUrl}"
         style="display:inline-block;background:#1a1a1a;color:#fff;padding:12px 28px;border-radius:6px;text-decoration:none;font-size:15px">
        ${opts.ctaLabel}
      </a>
      <p style="color:#999;font-size:12px;margin-top:24px">
        อีเมลนี้ส่งจากระบบ DopRent โดยอัตโนมัติ
      </p>
    </div>
  `;
}

/** Fire-and-forget send: never throws, logs failures. */
function fireEmail(to: string | null | undefined, subject: string, html: string, category = "notification") {
  if (!to) return;
  void sendEmail({ to, subject, html, category }).catch((e) => {
    console.error("[doprent] notification email error", e);
  });
}

/* --------------------------- seller notifications --------------------------- */

export function notifyNewBookingRequest(opts: {
  sellerEmail: string | null | undefined;
  dressName: string;
  startDate: Date | string;
  endDate: Date | string;
  bookingId: string;
}) {
  fireEmail(
    opts.sellerEmail,
    "มีคำขอจองใหม่ — DopRent",
    emailShell({
      title: "มีคำขอจองใหม่",
      bodyHtml: `
        <p>มีลูกค้าส่งคำขอจองชุด <strong>${opts.dressName}</strong></p>
        <p>วันที่เช่า: ${formatThaiDate(opts.startDate)} – ${formatThaiDate(opts.endDate)}</p>
        <p>กรุณาเข้าไปตอบรับหรือปฏิเสธคำขอโดยเร็ว</p>
      `,
      ctaLabel: "ดูคำขอจอง",
      ctaUrl: `${baseUrl()}/sell/bookings/${opts.bookingId}`,
    }),
  );
}

/* --------------------------- renter notifications --------------------------- */

type RenterNotifyOpts = {
  renterEmail: string | null | undefined;
  dressName: string;
  bookingId: string;
};

export function notifyBookingAccepted(opts: RenterNotifyOpts) {
  fireEmail(
    opts.renterEmail,
    "คำขอจองได้รับการยืนยัน รอชำระเงิน — DopRent",
    emailShell({
      title: "ร้านรับคำขอจองของคุณแล้ว",
      bodyHtml: `
        <p>คำขอจองชุด <strong>${opts.dressName}</strong> ได้รับการยืนยันจากร้านแล้ว</p>
        <p>กรุณาชำระเงินภายในเวลาที่กำหนดเพื่อยืนยันการจอง</p>
      `,
      ctaLabel: "ชำระเงิน",
      ctaUrl: `${baseUrl()}/account/bookings/${opts.bookingId}`,
    }),
  );
}

export function notifyBookingRejected(opts: RenterNotifyOpts) {
  fireEmail(
    opts.renterEmail,
    "คำขอจองถูกปฏิเสธ — DopRent",
    emailShell({
      title: "คำขอจองถูกปฏิเสธ",
      bodyHtml: `
        <p>ขออภัย คำขอจองชุด <strong>${opts.dressName}</strong> ถูกปฏิเสธโดยร้าน</p>
        <p>คุณสามารถเลือกชุดอื่นหรือช่วงวันอื่นได้เลย</p>
      `,
      ctaLabel: "ดูรายละเอียด",
      ctaUrl: `${baseUrl()}/account/bookings/${opts.bookingId}`,
    }),
  );
}

export function notifyBookingConfirmed(opts: RenterNotifyOpts) {
  fireEmail(
    opts.renterEmail,
    "การจองยืนยันแล้ว — DopRent",
    emailShell({
      title: "การจองของคุณยืนยันแล้ว",
      bodyHtml: `
        <p>ร้านตรวจสอบการชำระเงินเรียบร้อย การจองชุด <strong>${opts.dressName}</strong> ได้รับการยืนยันแล้ว</p>
        <p>ร้านจะติดต่อ/จัดส่งตามรายละเอียดการจองของคุณ</p>
      `,
      ctaLabel: "ดูการจองของฉัน",
      ctaUrl: `${baseUrl()}/account/bookings/${opts.bookingId}`,
    }),
  );
}

export function notifySlipDisputed(opts: RenterNotifyOpts) {
  fireEmail(
    opts.renterEmail,
    "สลิปการโอนมีปัญหา — DopRent",
    emailShell({
      title: "สลิปการโอนมีปัญหา",
      bodyHtml: `
        <p>ร้านแจ้งว่าสลิปการโอนของการจองชุด <strong>${opts.dressName}</strong> มีปัญหา</p>
        <p>คุณสามารถอัปโหลดสลิปใหม่ หรือโต้แย้งให้แอดมินตัดสินได้</p>
      `,
      ctaLabel: "ดูรายละเอียดและดำเนินการ",
      ctaUrl: `${baseUrl()}/account/bookings/${opts.bookingId}`,
    }),
  );
}

/* --------------------------- admin notifications --------------------------- */

export function notifyAdminDisputeEscalated(opts: {
  adminEmail: string | null | undefined;
  dressName: string;
  bookingId: string;
  renterNote: string;
}) {
  fireEmail(
    opts.adminEmail,
    "ผู้เช่าโต้แย้งสลิป รอตัดสิน — DopRent",
    emailShell({
      title: "ผู้เช่าโต้แย้งสลิป — รอแอดมินตัดสิน",
      bodyHtml: `
        <p>ผู้เช่าโต้แย้งกรณีสลิปมีปัญหาของการจองชุด <strong>${opts.dressName}</strong></p>
        <p style="padding:8px 12px;background:#f5f5f5;border-radius:6px;color:#555">
          "${opts.renterNote}"
        </p>
        <p>กรุณาเข้าไปตรวจสอบสลิปและตัดสินให้ทั้งสองฝ่าย</p>
      `,
      ctaLabel: "ดูรายการจอง",
      ctaUrl: `${baseUrl()}/admin/bookings/${opts.bookingId}`,
    }),
  );
}
