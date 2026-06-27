"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  acceptBooking,
  confirmSlip,
  disputeSlip,
  markRenting,
  markCompleted,
  markReturned,
  rejectBooking,
} from "@/app/actions/bookings";
import { startProgress, doneProgress } from "@/lib/progress";
import type { BookingStatus } from "@/lib/types";
import type { PaymentChannel } from "@/lib/payments";
import SlipConfirmCountdown from "@/components/SlipConfirmCountdown";
import { useConfirm } from "@/components/ConfirmProvider";

/** A channel the shop has configured, with a human-readable preview line. */
export type ChannelOption = {
  method: PaymentChannel;
  label: string;
  /** e.g. PromptPay number, or "ธนาคารกสิกร · 123-4-56789-0 · ชื่อบัญชี" */
  detail: string;
};

type Props = {
  bookingId: string;
  status: BookingStatus;
  /** Channels the shop has set up + the shop's default — used by the accept flow. */
  channels?: ChannelOption[];
  defaultMethod?: PaymentChannel | null;
  /** "standard" | "express" — drives the carrier prompt on the ship step. */
  deliveryMethod?: string | null;
  /** Whether the renter has submitted return tracking info. */
  returnShipped?: boolean;
  /** Return tracking info from the renter (display to seller). */
  returnTracking?: {
    carrier: string | null;
    trackingNumber: string | null;
    trackingUrl: string | null;
  } | null;
  /** First product slug — used for redirect after not_returned. */
  firstProductId?: string | null;
  /** Deposit amount — used to cap the deduction field. */
  depositAmount?: number;
  /** When the slip will be auto-confirmed (ISO string). Shown as countdown in payment_review. */
  slipConfirmDueAt?: string | null;
};

export default function SellerBookingActions({ bookingId, status, channels = [], defaultMethod = null, deliveryMethod = null, returnShipped = false, returnTracking = null, firstProductId = null, depositAmount = 0, slipConfirmDueAt = null }: Props) {
  const router = useRouter();
  const [fee, setFee] = useState("");
  const [carrier, setCarrier] = useState("");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [trackingUrl, setTrackingUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [showDisputeModal, setShowDisputeModal] = useState(false);
  // Only let the seller pick when BOTH channels are configured.
  const canChoose = channels.length >= 2;
  const [method, setMethod] = useState<PaymentChannel | null>(
    canChoose ? (defaultMethod ?? channels[0]?.method ?? null) : null,
  );

  async function run(fn: () => Promise<{ ok: boolean; error?: string }>, onSuccess?: () => void) {
    setError("");
    setBusy(true);
    startProgress();
    try {
      const res = await fn();
      if (!res.ok) {
        setError(res.error ?? "ทำรายการไม่สำเร็จ");
        return;
      }
      if (onSuccess) {
        onSuccess();
      } else {
        router.refresh();
      }
    } finally {
      setBusy(false);
      doneProgress();
    }
  }

  if (status === "booking_pending") {
    const feeNum = Number(fee);
    const feeValid = fee !== "" && Number.isFinite(feeNum) && feeNum >= 0;
    return (
      <div style={{ display: "grid", gap: 12 }}>
        <label style={{ fontSize: 14, fontWeight: 600 }}>
          ค่าจัดส่ง (฿)
          <input
            type="number"
            min={0}
            value={fee}
            onChange={(e) => setFee(e.target.value)}
            placeholder="เช่น 80"
            style={{
              width: "100%",
              marginTop: 6,
              padding: "10px 12px",
              border: "1px solid var(--line)",
              borderRadius: 8,
              fontSize: 15,
              fontFamily: "inherit",
              background: "var(--bg)",
              color: "var(--ink)",
              boxSizing: "border-box",
            }}
          />
        </label>

        {canChoose ? (
          <div style={{ display: "grid", gap: 8 }}>
            <span style={{ fontSize: 14, fontWeight: 600 }}>ช่องทางรับเงินสำหรับการจองนี้</span>
            <div style={{ display: "grid", gap: 8 }}>
              {channels.map((c) => {
                const active = method === c.method;
                return (
                  <label
                    key={c.method}
                    style={{
                      display: "flex",
                      gap: 10,
                      alignItems: "flex-start",
                      padding: "11px 13px",
                      border: `1.5px solid ${active ? "var(--primary, #2e9c65)" : "var(--line)"}`,
                      borderRadius: 10,
                      cursor: "pointer",
                      background: active ? "var(--success-soft, rgba(46,156,101,0.07))" : "var(--bg)",
                    }}
                  >
                    <input
                      type="radio"
                      name="payment-channel"
                      checked={active}
                      onChange={() => setMethod(c.method)}
                      style={{ marginTop: 2, accentColor: "var(--primary, #2e9c65)" }}
                    />
                    <span style={{ minWidth: 0 }}>
                      <span style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 600, fontSize: 14 }}>
                        {c.label}
                        {defaultMethod === c.method ? (
                          <span style={{ fontSize: 10.5, fontWeight: 600, color: "var(--ink-3)", background: "var(--surface)", border: "1px solid var(--line)", padding: "1px 6px", borderRadius: 999 }}>
                            ค่าเริ่มต้น
                          </span>
                        ) : null}
                      </span>
                      <span style={{ display: "block", fontSize: 12.5, color: "var(--ink-3)", marginTop: 2, wordBreak: "break-word" }}>
                        {c.detail}
                      </span>
                    </span>
                  </label>
                );
              })}
            </div>
          </div>
        ) : channels.length === 1 ? (
          <div style={{ fontSize: 12.5, color: "var(--ink-3)" }}>
            จะเก็บเงินผ่าน <b style={{ color: "var(--ink-2)" }}>{channels[0].label}</b> — {channels[0].detail}
          </div>
        ) : null}

        <button
          type="button"
          className="btn btn-primary btn-lg"
          disabled={busy || !feeValid}
          onClick={() => run(() => acceptBooking(bookingId, feeNum, canChoose ? method : undefined))}
          style={{ padding: "13px 18px" }}
        >
          รับจอง (ใส่ค่าส่งแล้ว)
        </button>
        <button
          type="button"
          className="btn btn-outline"
          disabled={busy}
          onClick={() => run(() => rejectBooking(bookingId))}
        >
          ปฏิเสธคำขอ
        </button>
        {error ? <Err msg={error} /> : null}
      </div>
    );
  }

  if (status === "payment_review") {
    return (
      <div style={{ display: "grid", gap: 12 }}>
        {slipConfirmDueAt && <SlipConfirmCountdown dueAt={slipConfirmDueAt} />}
        <button
          type="button"
          className="btn btn-primary btn-lg"
          disabled={busy}
          onClick={() => run(() => confirmSlip(bookingId))}
          style={{ padding: "13px 18px" }}
        >
          ยืนยันสลิป · จองสำเร็จ
        </button>
        <button
          type="button"
          className="btn btn-outline"
          disabled={busy}
          onClick={() => setShowDisputeModal(true)}
        >
          สลิปไม่ถูกต้อง
        </button>
        {error ? <Err msg={error} /> : null}
        {showDisputeModal && (
          <DisputeModal
            busy={busy}
            onClose={() => setShowDisputeModal(false)}
            onSubmit={(reason) => {
              setShowDisputeModal(false);
              run(() => disputeSlip(bookingId, reason));
            }}
          />
        )}
      </div>
    );
  }

  if (status === "confirmed") {
    const isExpress = deliveryMethod === "express";
    const isStandard = deliveryMethod === "standard";
    const isShipping = isStandard || isExpress;

    // Express: tracking URL required
    // Standard: carrier + tracking number required, URL optional
    const carrierOk = !isStandard || carrier.trim().length > 0;
    const trackingNumberOk = !isStandard || trackingNumber.trim().length > 0;
    const trackingUrlOk = !isExpress || (trackingUrl.trim().length > 0 && /^https?:\/\//i.test(trackingUrl.trim()));
    const optionalUrlOk = !isStandard || trackingUrl.trim().length === 0 || /^https?:\/\//i.test(trackingUrl.trim());
    const allValid = carrierOk && trackingNumberOk && trackingUrlOk && optionalUrlOk;

    const inputCls =
      "mt-1.5 w-full rounded-lg border border-[var(--line)] bg-[var(--bg)] px-3 py-2.5 text-[15px] text-[var(--ink)] outline-none focus:border-[var(--accent)]";
    return (
      <div className="grid gap-3">
        {isStandard ? (
          <>
            <label className="text-sm font-semibold">
              ผู้ให้บริการขนส่ง <span className="text-[var(--danger)]">*</span>
              <input
                type="text"
                value={carrier}
                onChange={(e) => setCarrier(e.target.value)}
                placeholder="เช่น Flash Express, Kerry, ไปรษณีย์ไทย"
                maxLength={80}
                className={inputCls}
              />
            </label>
            <label className="text-sm font-semibold">
              เลขพัสดุ <span className="text-[var(--danger)]">*</span>
              <input
                type="text"
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
                placeholder="เช่น TH1234567890"
                maxLength={120}
                className={inputCls}
              />
            </label>
            <label className="text-sm font-semibold">
              ลิงก์ติดตามการจัดส่ง <span className="text-xs font-normal text-[var(--ink-3)]">(ถ้ามี)</span>
              <input
                type="url"
                value={trackingUrl}
                onChange={(e) => setTrackingUrl(e.target.value)}
                placeholder="https://..."
                maxLength={500}
                className={inputCls}
              />
            </label>
          </>
        ) : null}
        {isExpress ? (
          <label className="text-sm font-semibold">
            ลิงก์ติดตามการจัดส่ง <span className="text-[var(--danger)]">*</span>
            <input
              type="url"
              value={trackingUrl}
              onChange={(e) => setTrackingUrl(e.target.value)}
              placeholder="https://..."
              maxLength={500}
              className={inputCls}
            />
            <p className="mt-1 text-xs font-normal text-[var(--ink-3)]">ส่งด่วน — แปะลิงก์ติดตามเพื่อให้ผู้เช่าติดตามสถานะได้</p>
          </label>
        ) : null}
        {/* Validation hints */}
        {isStandard && !carrierOk ? (
          <p className="text-xs text-[var(--danger)]">กรุณากรอกชื่อผู้ให้บริการขนส่ง</p>
        ) : isStandard && !trackingNumberOk ? (
          <p className="text-xs text-[var(--danger)]">กรุณากรอกเลขพัสดุ</p>
        ) : isStandard && !optionalUrlOk ? (
          <p className="text-xs text-[var(--danger)]">ลิงก์ติดตามต้องขึ้นต้นด้วย http:// หรือ https://</p>
        ) : isExpress && !trackingUrlOk ? (
          <p className="text-xs text-[var(--danger)]">กรุณาแปะลิงก์ติดตาม (เริ่มด้วย http:// หรือ https://)</p>
        ) : null}
        <button
          type="button"
          className="btn btn-primary btn-lg"
          disabled={busy || !allValid}
          onClick={() =>
            run(() =>
              markRenting(bookingId, {
                carrier: isStandard ? carrier.trim() : undefined,
                trackingNumber: isStandard && trackingNumber.trim() ? trackingNumber.trim() : undefined,
                trackingUrl: isShipping && trackingUrl.trim() ? trackingUrl.trim() : undefined,
              }),
            )
          }
        >
          ส่งชุดแล้ว · เริ่มเช่า
        </button>
        {error ? <Err msg={error} /> : null}
      </div>
    );
  }

  if (status === "renting" || status === "awaiting_return") {
    return (
      <div className="grid gap-3">
        {returnShipped && returnTracking ? (
          <div className="rounded-xl border border-[var(--success)] bg-[var(--success-soft)] px-4 py-3">
            <div className="mb-1 text-sm font-semibold text-[var(--success)]">ลูกค้าส่งคืนแล้ว</div>
            <div className="grid gap-1 text-sm text-[var(--ink-2)]">
              {returnTracking.carrier ? <div>ขนส่ง: <span className="font-medium text-[var(--ink)]">{returnTracking.carrier}</span></div> : null}
              {returnTracking.trackingNumber ? <div>เลขพัสดุ: <span className="font-medium text-[var(--ink)]">{returnTracking.trackingNumber}</span></div> : null}
              {returnTracking.trackingUrl ? (
                <div>
                  ลิงก์:{" "}
                  <a href={returnTracking.trackingUrl} target="_blank" rel="noopener noreferrer" className="font-medium text-[var(--accent)] underline break-all">
                    {returnTracking.trackingUrl}
                  </a>
                </div>
              ) : null}
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-[var(--line)] bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
            <div className="flex items-center gap-2 mb-1">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--warn)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              <span className="text-sm font-semibold text-[var(--ink)]">รอลูกค้าส่งคืนสินค้า</span>
            </div>
            <p className="text-[13px] text-[var(--ink-3)] ml-6">ลูกค้ายังไม่ได้กรอกข้อมูลการส่งคืน</p>
          </div>
        )}

        {returnShipped ? (
          <ReturnPanel
            busy={busy}
            error={error}
            depositAmount={depositAmount}
            onSubmit={(condition, note, deduction) => {
              const redirectToUnits = condition === "not_returned" && firstProductId
                ? () => router.push(`/sell/products/${firstProductId}/units`)
                : undefined;
              run(() => markReturned(bookingId, condition, note, deduction), redirectToUnits);
            }}
          />
        ) : (
          <NotReturnedPanel
            busy={busy}
            error={error}
            onSubmit={() => {
              const redirectToUnits = firstProductId
                ? () => router.push(`/sell/products/${firstProductId}/units`)
                : undefined;
              run(() => markReturned(bookingId, "not_returned"), redirectToUnits);
            }}
          />
        )}
      </div>
    );
  }

  if (status === "returned") {
    return (
      <div style={{ display: "grid", gap: 12 }}>
        <button
          type="button"
          className="btn btn-primary btn-lg"
          disabled={busy}
          onClick={() => run(() => markCompleted(bookingId))}
          style={{ padding: "13px 18px" }}
        >
          ปิดรายการ
        </button>
        {error ? <Err msg={error} /> : null}
      </div>
    );
  }

  return null;
}

function DisputeModal({
  busy,
  onClose,
  onSubmit,
}: {
  busy: boolean;
  onClose: () => void;
  onSubmit: (reason: string) => void;
}) {
  const [reason, setReason] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "rgba(0,0,0,0.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}
    >
      <div
        style={{
          background: "var(--bg, #fff)",
          borderRadius: 14,
          width: "100%",
          maxWidth: 420,
          padding: "22px 20px 18px",
          boxShadow: "0 8px 30px rgba(0,0,0,0.18)",
        }}
      >
        <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>
          สลิปไม่ถูกต้อง
        </h3>
        <p style={{ fontSize: 12.5, color: "var(--ink-3)", marginBottom: 14 }}>
          กรุณาระบุเหตุผล เพื่อส่งให้แอดมินตรวจสอบ
        </p>
        <textarea
          ref={inputRef}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="เช่น ยอดไม่ตรง, สลิปเบลอ, ชื่อไม่ตรง..."
          rows={3}
          style={{
            width: "100%",
            padding: "10px 12px",
            border: "1px solid var(--line)",
            borderRadius: 8,
            fontSize: 14,
            fontFamily: "inherit",
            resize: "vertical",
            background: "var(--surface)",
            color: "var(--ink)",
            boxSizing: "border-box",
          }}
        />
        <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
          <button
            type="button"
            className="btn btn-outline"
            onClick={onClose}
            style={{ flex: 1, padding: "10px 0" }}
          >
            ยกเลิก
          </button>
          <button
            type="button"
            className="btn btn-primary"
            disabled={busy || !reason.trim()}
            onClick={() => onSubmit(reason.trim())}
            style={{ flex: 1, padding: "10px 0", fontWeight: 600 }}
          >
            ยืนยันส่ง
          </button>
        </div>
      </div>
    </div>
  );
}

type ReturnChoice = "complete" | "damaged" | "not_returned";

function ReturnPanel({
  busy,
  error,
  depositAmount = 0,
  onSubmit,
}: {
  busy: boolean;
  error: string;
  depositAmount?: number;
  onSubmit: (condition: ReturnChoice, damageNote?: string, deductionAmount?: number) => void;
}) {
  const [choice, setChoice] = useState<ReturnChoice>("complete");
  const [note, setNote] = useState("");
  const [deduction, setDeduction] = useState("");

  const options: { value: ReturnChoice; label: string; hint: string }[] = [
    { value: "complete", label: "คืนของแบบสมบูรณ์", hint: "ได้รับชุดคืนครบถ้วน สภาพดี — จบรายการทันที" },
    { value: "damaged", label: "มีความเสียหาย", hint: "ได้รับชุดคืนแต่มีความเสียหาย — ระบุรายละเอียด" },
    { value: "not_returned", label: "ลูกค้าไม่ส่งคืนของ", hint: "ยังไม่ได้รับชุดคืน — หักมัดจำทั้งหมด" },
  ];

  const deductionNum = Number(deduction);
  const deductionValid = choice !== "damaged" || deduction === "" || (Number.isFinite(deductionNum) && deductionNum >= 0 && deductionNum <= depositAmount);
  const canSubmit = !busy && (choice !== "damaged" || (note.trim().length > 0 && deductionValid));

  const inputCls =
    "mt-1.5 w-full rounded-lg border border-[var(--line)] bg-[var(--bg)] px-3 py-2.5 text-[15px] text-[var(--ink)] outline-none focus:border-[var(--accent)]";

  return (
    <div className="grid gap-3">
      <div className="grid gap-2">
        {options.map((opt) => {
          const active = choice === opt.value;
          return (
            <label
              key={opt.value}
              className="flex cursor-pointer items-start gap-3 rounded-xl border px-3 py-3"
              style={{
                borderColor: active ? "var(--accent)" : "var(--line)",
                background: active ? "var(--accent-soft)" : "var(--bg)",
              }}
            >
              <input
                type="radio"
                name="return-condition"
                checked={active}
                onChange={() => setChoice(opt.value)}
                style={{ width: 16, height: 16, marginTop: 2, cursor: "pointer" }}
              />
              <span>
                <span className="block text-[14px] font-semibold text-[var(--ink)]">{opt.label}</span>
                <span className="block text-[12px] text-[var(--ink-2)]">{opt.hint}</span>
              </span>
            </label>
          );
        })}
      </div>

      {choice === "damaged" ? (
        <>
          <label className="text-sm font-semibold">
            ระบุความเสียหายที่พบ <span className="text-[var(--danger)]">*</span>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="เช่น มีรอยเปื้อน / ตะเข็บขาด / ซิปเสีย"
              rows={3}
              maxLength={1000}
              className={inputCls}
            />
          </label>
          <label className="text-sm font-semibold">
            จำนวนมัดจำที่จะหัก (฿) <span className="text-xs font-normal text-[var(--ink-3)]">มัดจำทั้งหมด {depositAmount.toLocaleString()} ฿</span>
            <input
              type="number"
              min={0}
              max={depositAmount}
              value={deduction}
              onChange={(e) => setDeduction(e.target.value)}
              placeholder="0"
              className={inputCls}
            />
            {deduction !== "" && !deductionValid ? (
              <p className="mt-1 text-xs text-[var(--danger)]">จำนวนต้องอยู่ระหว่าง 0 ถึง {depositAmount.toLocaleString()} ฿</p>
            ) : null}
          </label>
        </>
      ) : null}

      <button
        type="button"
        className="btn btn-primary btn-lg"
        disabled={!canSubmit}
        onClick={() => onSubmit(
          choice,
          choice === "damaged" ? note.trim() : undefined,
          choice === "damaged" && deduction !== "" ? deductionNum : undefined,
        )}
        style={{ padding: "13px 18px" }}
      >
        บันทึกการรับคืน
      </button>
      {error ? <Err msg={error} /> : null}
    </div>
  );
}

/** Minimal panel for marking "not returned" when the renter hasn't shipped yet. */
function NotReturnedPanel({
  busy,
  error,
  onSubmit,
}: {
  busy: boolean;
  error: string;
  onSubmit: () => void;
}) {
  const confirm = useConfirm();
  return (
    <div className="grid gap-3">
      <button
        type="button"
        className="btn text-sm font-semibold"
        style={{
          padding: "12px 18px",
          background: "var(--danger)",
          borderColor: "var(--danger)",
          color: "#fff",
          borderRadius: 10,
        }}
        disabled={busy}
        onClick={async () => {
          if (await confirm({ message: "ยืนยันว่าลูกค้าไม่ส่งคืนสินค้า? มัดจำจะถูกหักทั้งหมด", variant: "danger", confirmLabel: "ยืนยัน" })) {
            onSubmit();
          }
        }}
      >
        ลูกค้าไม่ส่งคืนของ · หักมัดจำทั้งหมด
      </button>
      {error ? <Err msg={error} /> : null}
    </div>
  );
}

function Err({ msg }: { msg: string }) {
  return (
    <div
      style={{
        padding: "10px 14px",
        background: "var(--danger-soft)",
        color: "var(--danger)",
        borderRadius: 8,
        fontSize: 13.5,
      }}
    >
      {msg}
    </div>
  );
}
