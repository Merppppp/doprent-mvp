"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { cancelBooking, uploadSlip, escalateDispute, requestCancelAfterPayment } from "@/app/actions/bookings";
import type { BookingStatus } from "@/lib/types";

type Props = {
  bookingId: string;
  status: BookingStatus;
  canPay: boolean;
  disputeReason?: string | null;
  disputeNote?: string | null;
};

export default function RenterBookingActions({ bookingId, status, canPay, disputeReason, disputeNote }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState(false);
  const pendingFile = useRef<File | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [showEscalate, setShowEscalate] = useState(false);
  const [showCancelRequest, setShowCancelRequest] = useState(false);

  function onFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");
    pendingFile.current = file;
    const url = URL.createObjectURL(file);
    setPreview(url);
  }

  function cancelPreview() {
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
    pendingFile.current = null;
    if (inputRef.current) inputRef.current.value = "";
  }

  async function confirmUpload() {
    const file = pendingFile.current;
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      const fd = new FormData();
      fd.append("slip", file);
      const res = await uploadSlip(bookingId, fd);
      if (!res.ok) {
        setError(res.error);
        setBusy(false);
        return;
      }
      if (preview) URL.revokeObjectURL(preview);
      setPreview(null);
      pendingFile.current = null;
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  async function onCancel() {
    if (!confirm("ยืนยันยกเลิกการจองนี้?")) return;
    setError("");
    setBusy(true);
    const res = await cancelBooking(bookingId);
    if (!res.ok) {
      setError(res.error);
      setBusy(false);
      return;
    }
    router.refresh();
  }

  const canCancel = status === "booking_pending" || status === "waiting_for_payment";
  const isDisputed = status === "slip_disputed";
  // Renter can REQUEST cancel (not instant) for these post-payment statuses.
  const canRequestCancel =
    status === "payment_review" || status === "confirmed" || status === "renting";
  const isCancelPending = status === "cancel_requested";

  const previewBlock = preview && (
    <div
      style={{
        border: "1px solid var(--line)",
        borderRadius: 10,
        padding: 12,
        background: "var(--surface)",
        marginBottom: 8,
      }}
    >
      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>
        {isDisputed ? "ตรวจสอบสลิปใหม่ก่อนส่ง" : "ตรวจสอบสลิปก่อนส่ง"}
      </div>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={preview}
        alt="slip preview"
        onClick={() => setLightbox(true)}
        style={{
          width: "100%",
          maxHeight: 320,
          objectFit: "contain",
          borderRadius: 8,
          background: "var(--bg)",
          marginBottom: 4,
          cursor: "zoom-in",
        }}
      />
      <div style={{ textAlign: "center", fontSize: 11.5, color: "var(--ink-3)", marginBottom: 8 }}>
        กดที่รูปเพื่อดูขนาดเต็ม
      </div>
      <div style={{ display: "flex", gap: 10 }}>
        <button
          type="button"
          className="btn btn-outline"
          onClick={cancelPreview}
          disabled={busy}
          style={{ flex: 1, padding: "10px 0" }}
        >
          เปลี่ยนรูป
        </button>
        <button
          type="button"
          className="btn btn-primary"
          onClick={confirmUpload}
          disabled={busy}
          style={{ flex: 1, padding: "10px 0", fontWeight: 600 }}
        >
          {busy ? "กำลังส่ง…" : isDisputed ? "ยืนยันส่งสลิปใหม่" : "ยืนยันส่งสลิป"}
        </button>
      </div>
    </div>
  );

  return (
    <div style={{ display: "grid", gap: 12 }}>
      {/* ── Slip disputed: show reason + renter options ── */}
      {isDisputed && (
        <div
          style={{
            padding: 16,
            border: "1px solid var(--warn)",
            borderRadius: 12,
            background: "var(--warn-soft)",
          }}
        >
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 6, color: "var(--warn)" }}>
            ร้านแจ้งว่าสลิปไม่ถูกต้อง
          </div>
          {disputeReason && (
            <div
              style={{
                fontSize: 13.5,
                color: "var(--ink-2)",
                padding: "8px 12px",
                background: "var(--bg)",
                borderRadius: 8,
                marginBottom: 12,
                lineHeight: 1.5,
              }}
            >
              เหตุผลจากร้าน: {disputeReason}
            </div>
          )}

          {disputeNote && (
            <div
              style={{
                fontSize: 13,
                color: "var(--ink-2)",
                padding: "8px 12px",
                background: "var(--info-soft)",
                border: "1px solid color-mix(in oklch, var(--info) 30%, transparent)",
                borderRadius: 8,
                marginBottom: 12,
                lineHeight: 1.5,
              }}
            >
              ข้อความโต้แย้งของคุณ: {disputeNote}
              <div style={{ fontSize: 11.5, color: "var(--ink-3)", marginTop: 4 }}>
                แอดมินจะตรวจสอบและตัดสินให้
              </div>
            </div>
          )}

          {!disputeNote && (
            <div style={{ fontSize: 13, color: "var(--ink-2)", marginBottom: 12, lineHeight: 1.5 }}>
              คุณสามารถอัปโหลดสลิปใหม่ หรือโต้แย้งให้แอดมินตัดสิน
            </div>
          )}

          {!preview && (
            <label
              className="btn btn-primary btn-lg"
              style={{
                textAlign: "center",
                cursor: "pointer",
                padding: "12px 18px",
                display: "block",
                marginBottom: 8,
              }}
            >
              อัปโหลดสลิปใหม่
              <input
                ref={inputRef}
                type="file"
                accept="image/*"
                onChange={onFileSelect}
                disabled={busy}
                style={{ display: "none" }}
              />
            </label>
          )}

          {previewBlock}

          {!disputeNote && !preview && (
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => setShowEscalate(true)}
              disabled={busy}
              style={{ width: "100%", padding: "11px 0" }}
            >
              โต้แย้ง · ให้แอดมินตัดสิน
            </button>
          )}
        </div>
      )}

      {/* ── Normal payment upload ── */}
      {canPay && !preview ? (
        <label
          className="btn btn-primary btn-lg"
          style={{ textAlign: "center", cursor: "pointer", padding: "13px 18px" }}
        >
          เลือกรูปสลิป
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            onChange={onFileSelect}
            disabled={busy}
            style={{ display: "none" }}
          />
        </label>
      ) : null}

      {canPay && previewBlock}

      {canCancel ? (
        <button type="button" className="btn btn-outline" onClick={onCancel} disabled={busy}>
          ยกเลิกการจอง
        </button>
      ) : null}

      {/* ── Cancel-after-payment request ── */}
      {canRequestCancel ? (
        <button
          type="button"
          className="btn btn-outline w-full py-3 text-sm text-[var(--danger)] border-[var(--danger)] hover:bg-[var(--danger)] hover:text-white transition-colors"
          onClick={() => setShowCancelRequest(true)}
          disabled={busy}
        >
          ขอยกเลิกการจอง
        </button>
      ) : null}

      {isCancelPending ? (
        <div className="rounded-xl border border-[var(--line)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--ink-2)]">
          <span className="font-semibold text-[var(--ink)]">ส่งคำขอยกเลิกแล้ว</span>
          <span> รอแอดมินอนุมัติ</span>
        </div>
      ) : null}

      {error ? (
        <div
          style={{
            padding: "10px 14px",
            background: "var(--danger-soft)",
            color: "var(--danger)",
            borderRadius: 8,
            fontSize: 13.5,
          }}
        >
          {error}
        </div>
      ) : null}

      {/* ── Lightbox (full-screen zoom) ── */}
      {lightbox && preview && (
        <Lightbox src={preview} onClose={() => setLightbox(false)} />
      )}

      {/* ── Escalate modal ── */}
      {showEscalate && (
        <EscalateModal
          busy={busy}
          onClose={() => setShowEscalate(false)}
          onSubmit={async (note) => {
            setShowEscalate(false);
            setBusy(true);
            setError("");
            const res = await escalateDispute(bookingId, note);
            if (!res.ok) {
              setError(res.error);
              setBusy(false);
              return;
            }
            router.refresh();
          }}
        />
      )}

      {/* ── Cancel-request modal ── */}
      {showCancelRequest && (
        <CancelRequestModal
          busy={busy}
          onClose={() => setShowCancelRequest(false)}
          onSubmit={async (reason) => {
            setShowCancelRequest(false);
            setBusy(true);
            setError("");
            const res = await requestCancelAfterPayment(bookingId, reason);
            if (!res.ok) {
              setError(res.error);
              setBusy(false);
              return;
            }
            router.refresh();
          }}
        />
      )}
    </div>
  );
}

function Lightbox({ src, onClose }: { src: string; onClose: () => void }) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 10000,
        background: "rgba(0,0,0,0.85)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "zoom-out",
        padding: 16,
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt="slip full view"
        style={{
          maxWidth: "95vw",
          maxHeight: "92vh",
          objectFit: "contain",
          borderRadius: 8,
        }}
      />
      <button
        type="button"
        onClick={onClose}
        style={{
          position: "absolute",
          top: 16,
          right: 16,
          width: 36,
          height: 36,
          borderRadius: 999,
          background: "rgba(255,255,255,0.15)",
          border: "none",
          color: "var(--on-dark)",
          fontSize: 20,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
        aria-label="ปิด"
      >
        ✕
      </button>
    </div>
  );
}

function CancelRequestModal({
  busy,
  onClose,
  onSubmit,
}: {
  busy: boolean;
  onClose: () => void;
  onSubmit: (reason: string) => void;
}) {
  const [reason, setReason] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    textareaRef.current?.focus();
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
          ขอยกเลิกการจอง
        </h3>
        <p style={{ fontSize: 12.5, color: "var(--ink-3)", marginBottom: 14, lineHeight: 1.5 }}>
          คำขอของคุณจะถูกส่งให้แอดมินพิจารณา ระบุเหตุผลให้ชัดเจนเพื่อให้การพิจารณาเร็วขึ้น
        </p>
        <textarea
          ref={textareaRef}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="เช่น เปลี่ยนใจ, มีเหตุฉุกเฉิน, วันงานเปลี่ยน..."
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
        <p className="mt-2 text-xs text-[var(--ink-3)]">
          หมายเหตุ: การยกเลิกหลังชำระเงินแล้วอาจมีเงื่อนไขการคืนเงินตามนโยบายร้าน
        </p>
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
            style={{
              flex: 1,
              padding: "10px 0",
              fontWeight: 600,
              background: "var(--danger)",
              borderColor: "var(--danger)",
            }}
          >
            ส่งคำขอยกเลิก
          </button>
        </div>
      </div>
    </div>
  );
}

function EscalateModal({
  busy,
  onClose,
  onSubmit,
}: {
  busy: boolean;
  onClose: () => void;
  onSubmit: (note: string) => void;
}) {
  const [note, setNote] = useState("");
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
          โต้แย้ง · ให้แอดมินตัดสิน
        </h3>
        <p style={{ fontSize: 12.5, color: "var(--ink-3)", marginBottom: 14, lineHeight: 1.5 }}>
          อธิบายเหตุผลของคุณ แอดมินจะตรวจสอบสลิปและตัดสินให้
        </p>
        <textarea
          ref={inputRef}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="เช่น ยอดตรง, โอนจากบัญชีอื่น, สลิปถูกต้องแล้ว..."
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
            disabled={busy || !note.trim()}
            onClick={() => onSubmit(note.trim())}
            style={{ flex: 1, padding: "10px 0", fontWeight: 600 }}
          >
            ส่งให้แอดมิน
          </button>
        </div>
      </div>
    </div>
  );
}
