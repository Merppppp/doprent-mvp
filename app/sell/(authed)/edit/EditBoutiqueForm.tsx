"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { updateShop } from "@/app/actions/seller";
import type { Color } from "@/lib/types";

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
    promptpay_id?: string | null;
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

  function toggleWeekday(day: number) {
    setClosedWeekdays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort(),
    );
  }

  function addClosedDate() {
    if (!newDateInput) return;
    if (closedDates.some((cd) => cd.date === newDateInput)) return; // already exists
    setClosedDates((prev) => [...prev, { date: newDateInput, note: newNoteInput }].sort((a, b) => a.date.localeCompare(b.date)));
    setNewDateInput("");
    setNewNoteInput("");
  }

  function removeClosedDate(date: string) {
    setClosedDates((prev) => prev.filter((cd) => cd.date !== date));
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

  return (
    <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <Labeled label="ชื่อร้าน">
        <input type="text" name="name" defaultValue={boutique.name} required style={inputStyle} />
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
      <Labeled label="LINE">
        <input type="text" name="line_url" defaultValue={boutique.line_url} required style={inputStyle} />
      </Labeled>
      <Labeled label="Instagram">
        <input type="text" name="instagram" defaultValue={boutique.instagram ?? ""} style={inputStyle} />
      </Labeled>
      <Labeled label="PromptPay (เบอร์มือถือ / เลขบัตร ปชช.) — สำหรับรับเงินจองผ่าน QR">
        <input
          type="text"
          name="promptpay_id"
          defaultValue={boutique.promptpay_id ?? ""}
          placeholder="เช่น 0812345678"
          style={inputStyle}
        />
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

function Labeled({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: "block", fontSize: 14, fontWeight: 500, marginBottom: 6 }}>
        {label}
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
