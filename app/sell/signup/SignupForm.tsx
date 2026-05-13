"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createBoutique } from "@/app/actions/seller";

const COLORS = [
  { key: "rose", label: "กุหลาบ" },
  { key: "ivory", label: "งาช้าง" },
  { key: "green", label: "เขียว" },
  { key: "black", label: "ดำ" },
  { key: "navy", label: "กรมท่า" },
  { key: "red", label: "แดง" },
  { key: "blue", label: "ฟ้า" },
  { key: "purple", label: "ม่วง" },
] as const;

type Props = {
  areas: Array<{ key: string; th: string }>;
};

export default function SignupForm({ areas }: Props) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const formData = new FormData(e.currentTarget);
      // If user picked an area_key, derive area_label from option text
      const areaKey = String(formData.get("area_key") ?? "");
      const matched = areas.find((a) => a.key === areaKey);
      if (matched) formData.set("area_label", `${matched.key} · ${matched.th}`);

      const res = await createBoutique(formData);
      if (!res.ok) {
        setError(res.error ?? "เกิดข้อผิดพลาด");
        setSubmitting(false);
        return;
      }
      // Push to KYC wizard
      router.push(`/sell/kyc?slug=${encodeURIComponent(res.slug ?? "")}`);
    } catch (err) {
      setError((err as Error).message);
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: 22 }}>
      <Field label="ชื่อร้าน *" hint="แสดงบนหน้าเว็บ ใช้ได้ทั้งไทย/อังกฤษ">
        <input type="text" name="name" required maxLength={60} style={inputStyle} />
      </Field>

      <Field label="ผู้ดูแล (ไม่บังคับ)" hint='เช่น "คุณนิด" — จะแสดงใต้ชื่อร้านในหน้าโปรไฟล์'>
        <input type="text" name="owner_name" maxLength={50} style={inputStyle} />
      </Field>

      <Field label="ย่าน *" hint="ที่ลูกค้าจะมารับชุด/นัดเจอ">
        <select name="area_key" required style={inputStyle}>
          <option value="">— เลือกย่าน —</option>
          {areas.map((a) => (
            <option key={a.key} value={a.key}>
              {a.th} ({a.key})
            </option>
          ))}
        </select>
        <input type="hidden" name="area_label" />
      </Field>

      <Field label="ลิงก์ LINE Official *" hint='เช่น https://line.me/R/ti/p/@yourshop หรือ @yourshop'>
        <input
          type="text"
          name="line_url"
          required
          placeholder="https://line.me/R/ti/p/@..."
          style={inputStyle}
        />
      </Field>

      <Field label="Instagram (ไม่บังคับ)" hint="เช่น @yourshop">
        <input type="text" name="instagram" maxLength={40} style={inputStyle} placeholder="@..." />
      </Field>

      <Field label="ปีที่เปิดบริการ (ไม่บังคับ)">
        <input
          type="number"
          name="since_year"
          min={1980}
          max={new Date().getFullYear()}
          placeholder="2018"
          style={{ ...inputStyle, width: 140 }}
        />
      </Field>

      <Field label="Tagline (ไม่บังคับ)" hint='ประโยคสั้นๆ ใต้ชื่อร้าน ไม่เกิน 80 ตัว เช่น "เดรสงานหมั้น handcrafted lace"'>
        <input type="text" name="tag" maxLength={80} style={inputStyle} />
      </Field>

      <Field label="เกี่ยวกับร้าน (ไม่บังคับ)" hint="แนะนำตัวร้าน 2-3 ประโยค ใช้ได้ทั้งไทย/อังกฤษ">
        <textarea name="story" maxLength={500} rows={3} style={{ ...inputStyle, resize: "vertical" }} />
      </Field>

      <Field label="สีหลักของร้าน" hint="ใช้กับ cover ตอนยังไม่มีรูป">
        <select name="cover_color" style={inputStyle} defaultValue="rose">
          {COLORS.map((c) => (
            <option key={c.key} value={c.key}>
              {c.label}
            </option>
          ))}
        </select>
      </Field>

      {error ? (
        <div
          style={{
            padding: 12,
            background: "rgba(220,38,38,0.08)",
            border: "1px solid rgba(220,38,38,0.3)",
            borderRadius: 6,
            color: "var(--danger)",
            fontSize: 14,
          }}
        >
          {error}
        </div>
      ) : null}

      <button
        type="submit"
        className="btn btn-dark"
        disabled={submitting}
        style={{ alignSelf: "flex-start", padding: "12px 22px" }}
      >
        {submitting ? "กำลังบันทึก…" : "สร้างร้านและไปขั้นถัดไป →"}
      </button>

      <p style={{ fontSize: 12, color: "var(--ink-3)", lineHeight: 1.5 }}>
        เมื่อกดสร้างร้าน ร้านจะ &ldquo;รออนุมัติ&rdquo; จนกว่าจะส่ง KYC และ admin ตรวจ ระยะนี้ลูกค้ายังไม่เห็นร้าน
      </p>
    </form>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label style={{ display: "block", fontSize: 14, fontWeight: 500, marginBottom: 4 }}>
        {label}
      </label>
      {hint ? (
        <div style={{ fontSize: 12, color: "var(--ink-3)", marginBottom: 6 }}>{hint}</div>
      ) : null}
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
