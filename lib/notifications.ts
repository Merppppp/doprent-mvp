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

/** Simple serial queue to avoid Resend's 2 req/s rate limit.
 *  Each email waits for the previous one + a 600ms gap. */
let emailQueue: Promise<void> = Promise.resolve();

/** Fire-and-forget send: never throws, logs failures.
 *  Queued serially with 600ms gap to respect Resend's 2 req/s rate limit. */
function fireEmail(
  to: string | null | undefined,
  subject: string,
  html: string,
  category = "notification",
  cc?: string | string[],
) {
  if (!to) return;
  emailQueue = emailQueue.then(async () => {
    try {
      await sendEmail({ to, subject, html, category, ...(cc ? { cc } : {}) });
    } catch (e) {
      console.error("[doprent] notification email error", e);
    }
    await new Promise((r) => setTimeout(r, 600));
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

/* --------------------------- return reminders --------------------------- */

type ReturnNotifyOpts = {
  renterEmail: string | null | undefined;
  sellerEmail: string | null | undefined;
  dressName: string;
  endDate: Date | string;
  bookingId: string;
};

/** Rental period ends today: nudge BOTH parties that it's time to return/collect. */
export function notifyReturnDue(opts: ReturnNotifyOpts) {
  const when = formatThaiDate(opts.endDate);
  fireEmail(
    opts.renterEmail,
    "ถึงกำหนดคืนชุดแล้ว — DopRent",
    emailShell({
      title: "ถึงกำหนดคืนชุดแล้ว",
      bodyHtml: `
        <p>ครบกำหนดการเช่าชุด <strong>${opts.dressName}</strong> วันที่ ${when}</p>
        <p>กรุณาส่งชุดคืนให้ร้านตามวิธีที่ตกลงกันไว้</p>
      `,
      ctaLabel: "ดูการจองของฉัน",
      ctaUrl: `${baseUrl()}/account/bookings/${opts.bookingId}`,
    }),
    "return_reminder",
  );
  fireEmail(
    opts.sellerEmail,
    "ลูกค้าครบกำหนดคืนชุดวันนี้ — DopRent",
    emailShell({
      title: "ครบกำหนดคืนชุดวันนี้",
      bodyHtml: `
        <p>การเช่าชุด <strong>${opts.dressName}</strong> ครบกำหนดวันที่ ${when}</p>
        <p>เมื่อได้รับชุดคืนแล้ว กรุณากด "รับคืนแล้ว" ในระบบ</p>
      `,
      ctaLabel: "ดูการจอง",
      ctaUrl: `${baseUrl()}/sell/bookings/${opts.bookingId}`,
    }),
    "return_reminder",
  );
}

/** Past the return grace window and still not returned: stronger nudge to both. */
export function notifyReturnOverdue(opts: ReturnNotifyOpts) {
  const when = formatThaiDate(opts.endDate);
  fireEmail(
    opts.renterEmail,
    "เลยกำหนดคืนชุดแล้ว กรุณาส่งคืนด่วน — DopRent",
    emailShell({
      title: "เลยกำหนดคืนชุดแล้ว",
      bodyHtml: `
        <p>ชุด <strong>${opts.dressName}</strong> เลยกำหนดคืน (${when}) แล้ว</p>
        <p>กรุณาส่งคืนโดยด่วนเพื่อหลีกเลี่ยงค่าปรับล่าช้า</p>
      `,
      ctaLabel: "ดูการจองของฉัน",
      ctaUrl: `${baseUrl()}/account/bookings/${opts.bookingId}`,
    }),
    "return_reminder",
  );
  fireEmail(
    opts.sellerEmail,
    "ลูกค้าเลยกำหนดคืนชุด — DopRent",
    emailShell({
      title: "ลูกค้าเลยกำหนดคืนชุด",
      bodyHtml: `
        <p>การเช่าชุด <strong>${opts.dressName}</strong> เลยกำหนดคืน (${when}) แล้ว และยังไม่ได้บันทึกการรับคืน</p>
        <p>กรุณาติดตามลูกค้า และกด "รับคืนแล้ว" เมื่อได้รับชุด</p>
      `,
      ctaLabel: "ดูการจอง",
      ctaUrl: `${baseUrl()}/sell/bookings/${opts.bookingId}`,
    }),
    "return_reminder",
  );
}

/* --------------------------- admin notifications --------------------------- */

/* --------------------------- cancel + refund notifications ------------------- */

/** Notify admins that a renter or seller has requested a cancel and approval is needed.
 *  Sends a single email to the first admin, CC the rest. */
export function notifyCancelRequested(opts: {
  adminEmails: string[];
  dressName: string;
  bookingId: string;
  requestedBy: "renter" | "shop";
  reason?: string | null;
}) {
  const emails = opts.adminEmails.filter(Boolean);
  if (emails.length === 0) return;
  const [primary, ...cc] = emails;
  const byLabel = opts.requestedBy === "renter" ? "ผู้เช่า" : "ร้านค้า";
  fireEmail(
    primary,
    `${byLabel}ขอยกเลิกการจอง รอแอดมินอนุมัติ — DopRent`,
    emailShell({
      title: `${byLabel}ขอยกเลิกการจอง`,
      bodyHtml: `
        <p>${byLabel}ส่งคำขอยกเลิกการจองชุด <strong>${opts.dressName}</strong></p>
        ${opts.reason ? `<p style="padding:8px 12px;background:#f5f5f5;border-radius:6px;color:#555">"${opts.reason}"</p>` : ""}
        <p>กรุณาเข้าไปตรวจสอบและอนุมัติหรือปฏิเสธคำขอ</p>
      `,
      ctaLabel: "ดูรายการจอง",
      ctaUrl: `${baseUrl()}/admin/bookings/${opts.bookingId}`,
    }),
    "notification",
    cc.length > 0 ? cc : undefined,
  );
}

/** Notify renter that admin approved the cancel (booking is now cancelled). */
export function notifyBookingCancelled(opts: {
  renterEmail: string | null | undefined;
  dressName: string;
  bookingId: string;
  refundRequired: boolean;
  refundAmount?: number | null;
}) {
  const refundLine = opts.refundRequired
    ? `<p>ทีมงานจะดำเนินการคืนเงิน${opts.refundAmount ? ` ฿${opts.refundAmount.toLocaleString()}` : ""} ให้ท่านต่อไป</p>`
    : "";
  fireEmail(
    opts.renterEmail,
    "การจองของคุณถูกยกเลิก — DopRent",
    emailShell({
      title: "การจองถูกยกเลิก",
      bodyHtml: `
        <p>การจองชุด <strong>${opts.dressName}</strong> ถูกยกเลิกโดยแอดมินแล้ว</p>
        ${refundLine}
        <p>หากมีข้อสงสัย กรุณาติดต่อทีมงาน DopRent</p>
      `,
      ctaLabel: "ดูรายละเอียดการจอง",
      ctaUrl: `${baseUrl()}/account/bookings/${opts.bookingId}`,
    }),
  );
}

/** Notify renter that admin has uploaded the refund slip — transfer done. */
export function notifyRefundIssued(opts: {
  renterEmail: string | null | undefined;
  dressName: string;
  bookingId: string;
  refundAmount?: number | null;
}) {
  fireEmail(
    opts.renterEmail,
    "คืนเงินการจองแล้ว — DopRent",
    emailShell({
      title: "ดำเนินการคืนเงินแล้ว",
      bodyHtml: `
        <p>ทีมงาน DopRent ได้โอนคืนเงิน${opts.refundAmount ? ` ฿${opts.refundAmount.toLocaleString()}` : ""} สำหรับการจองชุด <strong>${opts.dressName}</strong> แล้ว</p>
        <p>กรุณาตรวจสอบสลิปการโอนในรายละเอียดการจอง</p>
      `,
      ctaLabel: "ดูรายละเอียดการจอง",
      ctaUrl: `${baseUrl()}/account/bookings/${opts.bookingId}`,
    }),
  );
}

/** Notify admins of a dispute escalation.
 *  Sends a single email to the first admin, CC the rest. */
export function notifyAdminDisputeEscalated(opts: {
  adminEmails: string[];
  dressName: string;
  bookingId: string;
  renterNote: string;
}) {
  const emails = opts.adminEmails.filter(Boolean);
  if (emails.length === 0) return;
  const [primary, ...cc] = emails;
  fireEmail(
    primary,
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
    "notification",
    cc.length > 0 ? cc : undefined,
  );
}
