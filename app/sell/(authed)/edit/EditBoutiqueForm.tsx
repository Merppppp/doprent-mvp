"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { updateShop } from "@/app/actions/seller";
import type { Color } from "@/lib/types";
import RequiredMark from "@/components/RequiredMark";
import { prepareImageFileForUpload } from "@/lib/image";

type ClosedDateRow = { date: string; note: string };

const WEEKDAY_LABELS: Array<{ value: number; label: string }> = [
  { value: 0, label: "อาทิตย์" },
  { value: 1, label: "จันทร์" },
  { value: 2, label: "อังคาร" },
  { value: 3, label: "พุธ" },
  { value: 4, label: "พฤหัสฯ" },
  { value: 5, label: "ศุกร์" },
  { value: 6, label: "เสาร์" },
];

const COLORS: Array<{ key: Color; label: string }> = [
  { key: "rose", label: "กุหลาบ" },
  { key: "ivory", label: "งาช้าง" },
  { key: "green", label: "เขียว" },
  { key: "black", label: "ดำ" },
  { key: "navy", label: "กรมท่า" },
  { key: "red", label: "แดง" },
  { key: "blue", label: "ฟ้า" },
  { key: "purple", label: "ม่วง" },
];

type Props = {
  areas: Array<{ key: string; th: string }>;
  boutique: {
    id: string;
    name: string;
    area_key: string | null;
    area_label: string;
    line_url: string;
    instagram: string | null;
    facebook?: string | null;
    twitter?: string | null;
    tiktok?: string | null;
    promptpay_id?: string | null;
    bank_name?: string | null;
    bank_account_number?: string | null;
    bank_account_name?: string | null;
    bankbook_image_path?: string | null;
    delivery_info?: string | null;
    since_year: number | null;
    tag: string | null;
    story: string | null;
    owner_name: string | null;
    address: string | null;
    hours: string | null;
    cover_color: Color;
    // Booking policy (optional — absent = use DB defaults)
    lead_time_days?: number;
    min_rental_days?: number;
    max_rental_days?: number | null;
    return_window_days?: number;
    buffer_days_after?: number;
    closed_weekdays?: number[];
    closed_dates?: ClosedDateRow[];
  };
};

export default function EditBoutiqueForm({ areas, boutique }: Props) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  // Booking policy state
  const [closedWeekdays, setClosedWeekdays] = useState<number[]>(boutique.closed_weekdays ?? []);
  const [closedDates, setClosedDates] = useState<ClosedDateRow[]>(boutique.closed_dates ?? []);
  const [newDateInput, setNewDateInput] = useState("");
  const [newNoteInput, setNewNoteInput] = useState("");

  // Payment / bankbook state
  const [bankAccountNumber, setBankAccountNumber] = useState(boutique.bank_account_number ?? "");
  const [bankbookKey, setBankbookKey] = useState<string>(boutique.bankbook_image_path ?? "");
  const [bankbookUploading, setBankbookUploading] = useState(false);
  const [bankbookError, setBankbookError] = useState<string | null>(null);
  const [promptpayId, setPromptpayId] = useState(boutique.promptpay_id ?? "");
  const bankbookInputRef = useRef<HTMLInputElement>(null);

  function toggleWeekday(day: number) {
    setClosedWeekdays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort(),
    );
  }

  function addClosedDate() {
    if (!newDateInput) return;
    if (closedDates.some((cd) => cd.date === newDateInput)) return;
    setClosedDates((prev) =>
      [...prev, { date: newDateInput, note: newNoteInput }].sort((a, b) =>
        a.date.localeCompare(b.date),
      ),
    );
    setNewDateInput("");
    setNewNoteInput("");
  }

  function removeClosedDate(date: string) {
    setClosedDates((prev) => prev.filter((cd) => cd.date !== date));
  }

  async function handleBankbookFile(file: File) {
    setBankbookError(null);
    setBankbookUploading(true);
    try {
      const prepared = await prepareImageFileForUpload(file);
      const fd = new FormData();
      fd.append("file", prepared);
      const res = await fetch("/api/upload/bankbook", { method: "POST", body: fd });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error((j as { error?: string }).error ?? "อัปโหลดไม่สำเร็จ");
      }
      const j = (await res.json()) as { key: string };
      setBankbookKey(j.key);
    } catch (e) {
      setBankbookError((e as Error).message);
    } finally {
      setBankbookUploading(false);
    }
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    setSubmitting(true);
    try {
      const fd = new FormData(e.currentTarget);
      const areaKey = String(fd.get("area_key") ?? "");
      const matched = areas.find((a) => a.key === areaKey);
      if (matched) fd.set("area_label", `${matched.key} · ${matched.th}`);

      // Serialize policy state as JSON (not DOM form fields)
      fd.set("closed_weekdays", JSON.stringify(closedWeekdays));
      fd.set("closed_dates", JSON.stringify(closedDates));

      // Ensure latest bankbook key is in FormData
      fd.set("bankbook_image_path", bankbookKey);

      // HARD-BLOCK: bank account number filled but no bankbook attached
      const acctNum = String(fd.get("bank_account_number") ?? "").trim();
      if (acctNum && !bankbookKey) {
        setError("กรุณาแนบรูปหน้าสมุดบัญชีเพื่อยืนยันเลขบัญชี");
        setSubmitting(false);
        return;
      }

      const res = await updateShop(boutique.id, fd);
      if (!res.ok) {
        setError(res.error ?? "บันทึกไม่สำเร็จ");
        setSubmitting(false);
        return;
      }
      setSaved(true);
      setSubmitting(false);
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
      setSubmitting(false);
    }
  }

  // Soft warning: no payment channel at all
  const noPaymentChannel = !promptpayId.trim() && !bankAccountNumber.trim();

  return (
    <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <Labeled label="ชื่อร้าน" required>
        <input type="text" name="name" defaultValue={boutique.name} required aria-required={true} style={inputStyle} />
      </Labeled>
      <Labeled label="ผู้ดูแล">
        <input type="text" name="owner_name" defaultValue={boutique.owner_name ?? ""} style={inputStyle} />
      </Labeled>
      <Labeled label="ย่าน">
        <select name="area_key" defaultValue={boutique.area_key ?? ""} style={inputStyle}>
          <option value="">— เลือกย่าน —</option>
          {areas.map((a) => (
            <option key={a.key} value={a.key}>
              {a.th} ({a.key})
            </option>
          ))}
        </select>
        <input type="hidden" name="area_label" defaultValue={boutique.area_label} />
      </Labeled>
      <Labeled label="LINE" required>
        <input type="text" name="line_url" defaultValue={boutique.line_url} required aria-required={true} style={inputStyle} />
      </Labeled>
      <Labeled label="Instagram">
        <input type="text" name="instagram" defaultValue={boutique.instagram ?? ""} style={inputStyle} />
      </Labeled>
      <Labeled label="Facebook">
        <input type="text" name="facebook" defaultValue={boutique.facebook ?? ""} placeholder="facebook.com/..." style={inputStyle} />
      </Labeled>
      <Labeled label="X / Twitter">
        <input type="text" name="twitter" defaultValue={boutique.twitter ?? ""} placeholder="@..." style={inputStyle} />
      </Labeled>
      <Labeled label="TikTok">
        <input type="text" name="tiktok" defaultValue={boutique.tiktok ?? ""} placeholder="@..." style={inputStyle} />
      </Labeled>

      <Labeled label="ที่อยู่ร้าน">
        <input type="text" name="address" defaultValue={boutique.address ?? ""} style={inputStyle} />
      </Labeled>
      <Labeled label="เวลาทำการ">
        <input
          type="text"
          name="hours"
          defaultValue={boutique.hours ?? ""}
          placeholder="เช่น จ-ศ 10:00-19:00, ส-อา 10:00-20:00"
          style={inputStyle}
        />
      </Labeled>
      <Labeled label="ปีที่เปิดบริการ">
        <input
          type="number"
          name="since_year"
          defaultValue={boutique.since_year ?? ""}
          min={1980}
          max={new Date().getFullYear()}
          style={{ ...inputStyle, width: 140 }}
        />
      </Labeled>
      <Labeled label="Tagline">
        <input type="text" name="tag" defaultValue={boutique.tag ?? ""} maxLength={80} style={inputStyle} />
      </Labeled>
      <Labeled label="เกี่ยวกับร้าน">
        <textarea
          name="story"
          defaultValue={boutique.story ?? ""}
          rows={4}
          maxLength={500}
          style={{ ...inputStyle, resize: "vertical" }}
        />
      </Labeled>
      <Labeled label="สีหลักของร้าน">
        <select name="cover_color" defaultValue={boutique.cover_color} style={inputStyle}>
          {COLORS.map((c) => (
            <option key={c.key} value={c.key}>
              {c.label}
            </option>
          ))}
        </select>
      </Labeled>

      {/* ═══════════════════════════════════════════════ */}
      {/* ช่องทางรับชำระเงิน                              */}
      {/* ═══════════════════════════════════════════════ */}
      <div style={{ borderTop: "1px solid var(--line)", paddingTop: 20 }}>
        <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>ช่องทางรับชำระเงิน</div>
        <div style={{ fontSize: 12, color: "var(--ink-3)", marginBottom: 16, lineHeight: 1.5 }}>
          ต้องมีอย่างน้อยหนึ่งช่องทาง (PromptPay หรือบัญชีธนาคาร) ก่อนลงขายสินค้าได้
        </div>

        {/* Soft warning when no channel */}
        {noPaymentChannel && (
          <div
            style={{
              padding: "10px 14px",
              background: "#FFFBEB",
              border: "1px solid #F59E0B",
              borderRadius: 6,
              fontSize: 13,
              color: "#92400E",
              marginBottom: 14,
            }}
          >
            ⚠️ ยังไม่มีช่องทางรับชำระเงิน — ต้องเพิ่มก่อนจึงจะลงขายสินค้าได้
          </div>
        )}

        <Labeled label="PromptPay (เบอร์มือถือ / เลขบัตร ปชช.) — สำหรับรับเงินจองผ่าน QR">
          <input
            type="text"
            name="promptpay_id"
            value={promptpayId}
            onChange={(e) => setPromptpayId(e.target.value)}
            placeholder="เช่น 0812345678"
            style={inputStyle}
          />
        </Labeled>
        {/* Bold PromptPay remark */}
        <div
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: "var(--ink)",
            marginTop: 6,
            marginBottom: 14,
            lineHeight: 1.5,
          }}
        >
          ชื่อบัญชี PromptPay ต้องตรงกับชื่อในบัตรประชาชน/เอกสารนิติบุคคลที่ใช้ยืนยันร้าน (KYC)
        </div>

        <Labeled label="ธนาคาร (ไม่บังคับ)">
          <select name="bank_name" defaultValue={boutique.bank_name ?? ""} style={inputStyle}>
            <option value="">— ไม่ระบุ —</option>
            <option value="ธ.กสิกรไทย">ธ.กสิกรไทย</option>
            <option value="ธ.ไทยพาณิชย์">ธ.ไทยพาณิชย์</option>
            <option value="ธ.กรุงเทพ">ธ.กรุงเทพ</option>
            <option value="ธ.กรุงไทย">ธ.กรุงไทย</option>
            <option value="ธ.กรุงศรีอยุธยา">ธ.กรุงศรีอยุธยา</option>
            <option value="ธ.ทหารไทยธนชาต">ธ.ทหารไทยธนชาต</option>
            <option value="ธ.ออมสิน">ธ.ออมสิน</option>
            <option value="อื่นๆ">อื่นๆ</option>
          </select>
        </Labeled>
        <div style={{ marginTop: 14 }}>
          <Labeled label="เลขบัญชี (ไม่บังคับ)">
            <input
              type="text"
              name="bank_account_number"
              value={bankAccountNumber}
              onChange={(e) => setBankAccountNumber(e.target.value)}
              inputMode="numeric"
              maxLength={20}
              placeholder="เช่น 123-4-56789-0"
              style={inputStyle}
            />
          </Labeled>
        </div>
        <div style={{ marginTop: 14 }}>
          <Labeled label="ชื่อบัญชี (ไม่บังคับ)">
            <input
              type="text"
              name="bank_account_name"
              defaultValue={boutique.bank_account_name ?? ""}
              maxLength={100}
              placeholder="เช่น นางสาว วรรณิษา ใจดี"
              style={inputStyle}
            />
          </Labeled>
        </div>

        {/* Bankbook upload (always shown; required when account number is present) */}
        <div style={{ marginTop: 14 }}>
          <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 6 }}>
            รูปหน้าสมุดบัญชี{bankAccountNumber.trim() ? <RequiredMark /> : " (ไม่บังคับ)"}
          </div>
          <div style={{ fontSize: 12, color: "var(--ink-3)", marginBottom: 8, lineHeight: 1.5 }}>
            จำเป็นต้องแนบเมื่อระบุเลขบัญชี — เก็บเป็นความลับ ผู้ดูแลระบบเท่านั้นที่เห็นได้
          </div>

          {/* Hidden input carries the key */}
          <input type="hidden" name="bankbook_image_path" value={bankbookKey} readOnly />

          {bankbookKey ? (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "8px 12px",
                background: "var(--success-soft, #F0FDF4)",
                border: "1px solid var(--success, #22C55E)",
                borderRadius: 6,
                fontSize: 13,
                marginBottom: 8,
              }}
            >
              <span style={{ color: "var(--success, #16A34A)", fontWeight: 600 }}>✓ แนบแล้ว</span>
              <button
                type="button"
                style={{
                  marginLeft: "auto",
                  border: 0,
                  background: "none",
                  color: "var(--ink-3)",
                  cursor: "pointer",
                  fontSize: 12,
                  padding: "2px 6px",
                  borderRadius: 4,
                  textDecoration: "underline",
                }}
                onClick={() => {
                  setBankbookKey("");
                  if (bankbookInputRef.current) bankbookInputRef.current.value = "";
                }}
              >
                เปลี่ยนรูป
              </button>
            </div>
          ) : null}

          <label
            style={{
              display: "inline-block",
              padding: "9px 14px",
              border: "1px solid var(--line)",
              borderRadius: 6,
              fontSize: 13,
              background: "var(--surface)",
              cursor: bankbookUploading ? "wait" : "pointer",
              color: "var(--ink)",
            }}
          >
            {bankbookUploading ? "กำลังอัปโหลด…" : bankbookKey ? "เปลี่ยนรูปสมุดบัญชี" : "เลือกรูปสมุดบัญชี"}
            <input
              ref={bankbookInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              style={{ display: "none" }}
              disabled={bankbookUploading}
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (f) await handleBankbookFile(f);
              }}
            />
          </label>

          {bankbookError ? (
            <div style={{ color: "var(--danger)", fontSize: 12, marginTop: 6 }}>{bankbookError}</div>
          ) : null}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════ */}
      {/* เงื่อนไขการจองเช่า                              */}
      {/* ═══════════════════════════════════════════════ */}
      <div style={{ borderTop: "1px solid var(--line)", paddingTop: 20 }}>
        <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>เงื่อนไขการจองเช่า</div>
        <div style={{ fontSize: 12, color: "var(--ink-3)", marginBottom: 16 }}>
          กำหนดข้อจำกัดที่ใช้กับสินค้าทุกชิ้นในร้านโดยค่าเริ่มต้น (แต่ละสินค้าสามารถ override ได้)
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 16 }}>
          <Labeled label="จองล่วงหน้าขั้นต่ำ (วัน)">
            <input
              type="number"
              name="lead_time_days"
              min={0}
              defaultValue={boutique.lead_time_days ?? 0}
              style={{ ...inputStyle, width: "100%" }}
            />
          </Labeled>
          <Labeled label="เช่าขั้นต่ำ (วัน)">
            <input
              type="number"
              name="min_rental_days"
              min={1}
              defaultValue={boutique.min_rental_days ?? 1}
              style={{ ...inputStyle, width: "100%" }}
            />
          </Labeled>
          <Labeled label="เช่าสูงสุด (วัน, ว่าง = ไม่จำกัด)">
            <input
              type="number"
              name="max_rental_days"
              min={1}
              defaultValue={boutique.max_rental_days ?? ""}
              placeholder="ไม่จำกัด"
              style={{ ...inputStyle, width: "100%" }}
            />
          </Labeled>
          <Labeled label="คืนสินค้าภายใน (วัน)">
            <input
              type="number"
              name="return_window_days"
              min={0}
              defaultValue={boutique.return_window_days ?? 2}
              style={{ ...inputStyle, width: "100%" }}
            />
          </Labeled>
          <Labeled label="บัฟเฟอร์หลังเช่า (วัน)">
            <input
              type="number"
              name="buffer_days_after"
              min={0}
              defaultValue={boutique.buffer_days_after ?? 2}
              style={{ ...inputStyle, width: "100%" }}
            />
          </Labeled>
        </div>

        {/* Closed weekdays */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 8 }}>วันปิดทำการประจำสัปดาห์</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {WEEKDAY_LABELS.map(({ value, label }) => {
              const active = closedWeekdays.includes(value);
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => toggleWeekday(value)}
                  style={{
                    padding: "6px 12px",
                    fontSize: 13,
                    border: `1px solid ${active ? "var(--danger)" : "var(--line)"}`,
                    background: active ? "rgba(220,38,38,0.08)" : "var(--surface)",
                    color: active ? "#DC2626" : "var(--ink)",
                    borderRadius: 6,
                    cursor: "pointer",
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>
          {closedWeekdays.length > 0 ? (
            <div style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 6 }}>
              ปิด: {closedWeekdays.map((d) => WEEKDAY_LABELS.find((w) => w.value === d)?.label).join(", ")}
            </div>
          ) : null}
        </div>

        {/* Closed specific dates */}
        <div>
          <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 8 }}>วันหยุดพิเศษ / วันปิดร้านแบบระบุวัน</div>
          {closedDates.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 10 }}>
              {closedDates.map((cd) => (
                <div
                  key={cd.date}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "6px 10px",
                    background: "var(--surface)",
                    border: "1px solid var(--line)",
                    borderRadius: 6,
                    fontSize: 13,
                  }}
                >
                  <span style={{ fontWeight: 500, minWidth: 100 }}>{cd.date}</span>
                  {cd.note ? <span style={{ color: "var(--ink-3)" }}>{cd.note}</span> : null}
                  <button
                    type="button"
                    onClick={() => removeClosedDate(cd.date)}
                    style={{ marginLeft: "auto", border: 0, background: "none", color: "var(--ink-3)", cursor: "pointer", fontSize: 16, lineHeight: 1 }}
                    aria-label="ลบวัน"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ fontSize: 13, color: "var(--ink-3)", marginBottom: 10 }}>ยังไม่มีวันหยุดพิเศษ</div>
          )}
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <input
              type="date"
              value={newDateInput}
              onChange={(e) => setNewDateInput(e.target.value)}
              style={{ ...inputStyle, width: 160 }}
            />
            <input
              type="text"
              value={newNoteInput}
              onChange={(e) => setNewNoteInput(e.target.value)}
              placeholder="หมายเหตุ เช่น วันสงกรานต์"
              style={{ ...inputStyle, flex: 1, minWidth: 160 }}
            />
            <button
              type="button"
              onClick={addClosedDate}
              className="btn btn-outline"
              style={{ padding: "10px 14px", fontSize: 13, whiteSpace: "nowrap" }}
            >
              + เพิ่มวัน
            </button>
          </div>
        </div>
      </div>

      {error ? (
        <div
          style={{
            padding: 12,
            background: "var(--danger-soft)",
            border: "1px solid var(--danger)",
            borderRadius: 6,
            color: "var(--danger)",
            fontSize: 14,
          }}
        >
          {error}
        </div>
      ) : null}
      {saved ? (
        <div
          style={{
            padding: 12,
            background: "var(--success-soft)",
            border: "1px solid var(--success)",
            borderRadius: 6,
            color: "var(--success)",
            fontSize: 14,
          }}
        >
          ✓ บันทึกเรียบร้อย
        </div>
      ) : null}

      <div style={{ display: "flex", gap: 8 }}>
        <button type="submit" className="btn btn-dark" disabled={submitting} style={{ padding: "12px 22px" }}>
          {submitting ? "กำลังบันทึก…" : "บันทึกการแก้ไข"}
        </button>
        <button
          type="button"
          className="btn btn-outline"
          onClick={() => router.push("/sell/dashboard")}
          style={{ padding: "12px 22px" }}
        >
          ยกเลิก
        </button>
      </div>
    </form>
  );
}

function Labeled({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: "block", fontSize: 14, fontWeight: 500, marginBottom: 6 }}>
        {label}{required ? <RequiredMark /> : null}
      </label>
      {children}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  border: "1px solid var(--line)",
  borderRadius: 6,
  background: "var(--surface)",
  fontSize: 14,
  fontFamily: "inherit",
};
