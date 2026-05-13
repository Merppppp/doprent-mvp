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

/** Fallback list of Bangkok areas — used when DB areas table is empty. */
const FALLBACK_AREAS: Array<{ key: string; th: string }> = [
  { key: "Siam", th: "สยาม" },
  { key: "Chitlom", th: "ชิดลม" },
  { key: "Ploenchit", th: "เพลินจิต" },
  { key: "Wireless", th: "วิทยุ" },
  { key: "Asok", th: "อโศก" },
  { key: "Sukhumvit 11", th: "สุขุมวิท 11" },
  { key: "Phrom Phong", th: "พร้อมพงษ์" },
  { key: "Thonglor", th: "ทองหล่อ" },
  { key: "Ekkamai", th: "เอกมัย" },
  { key: "Phra Khanong", th: "พระโขนง" },
  { key: "Onnut", th: "อ่อนนุช" },
  { key: "Watthana", th: "วัฒนา" },
  { key: "Ari", th: "อารีย์" },
  { key: "Sathorn", th: "สาทร" },
  { key: "Silom", th: "สีลม" },
  { key: "Sala Daeng", th: "ศาลาแดง" },
  { key: "Surawong", th: "สุรวงศ์" },
  { key: "Bangrak", th: "บางรัก" },
  { key: "Charoenkrung", th: "เจริญกรุง" },
  { key: "Yaowarat", th: "เยาวราช" },
  { key: "Pratunam", th: "ประตูน้ำ" },
  { key: "Lumpini", th: "ลุมพินี" },
  { key: "Phaya Thai", th: "พญาไท" },
  { key: "Ratchadaphisek", th: "รัชดาภิเษก" },
  { key: "Bang Na", th: "บางนา" },
];

const CUSTOM_AREA_VALUE = "__custom__";

type Props = {
  areas: Array<{ key: string; th: string }>;
};

export default function SignupForm({ areas }: Props) {
  // Use DB areas if seeded; otherwise fall back to hardcoded list
  const areasToShow = areas.length > 0 ? areas : FALLBACK_AREAS;
  const [areaKey, setAreaKey] = useState("");
  const [customArea, setCustomArea] = useState("");
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const formData = new FormData(e.currentTarget);
      // Derive area_label from selection
      if (areaKey === CUSTOM_AREA_VALUE) {
        const c = customArea.trim();
        if (!c) {
          setError("กรุณาใส่ชื่อย่าน");
          setSubmitting(false);
          return;
        }
        formData.set("area_key", "");
        formData.set("area_label", c);
      } else if (areaKey) {
        const matched = areasToShow.find((a) => a.key === areaKey);
        if (matched) {
          formData.set("area_key", matched.key);
          formData.set("area_label", `${matched.key} · ${matched.th}`);
        }
      } else {
        setError("กรุณาเลือกย่าน");
        setSubmitting(false);
        return;
      }

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

      <Field label="ย่าน *" hint="ที่ลูกค้าจะมารับชุด/นัดเจอ — เลือก &ldquo;ย่านอื่น&rdquo; เพื่อพิมพ์เอง">
        <select
          name="area_key_select"
          value={areaKey}
          onChange={(e) => setAreaKey(e.target.value)}
          style={inputStyle}
        >
          <option value="">— เลือกย่าน —</option>
          {areasToShow.map((a) => (
            <option key={a.key} value={a.key}>
              {a.th} ({a.key})
            </option>
          ))}
          <option value={CUSTOM_AREA_VALUE}>+ ย่านอื่น (พิมพ์เอง)</option>
        </select>
        {areaKey === CUSTOM_AREA_VALUE ? (
          <input
            type="text"
            value={customArea}
            onChange={(e) => setCustomArea(e.target.value)}
            placeholder='เช่น "เพชรเกษม" หรือ "ลาดพร้าว"'
            maxLength={50}
            style={{ ...inputStyle, marginTop: 8 }}
          />
        ) : null}
        <input type="hidden" name="area_key" />
        <input type="hidden" name="area_label" />
      </Field>

      <Field
        label="ที่อยู่ร้าน (ไม่บังคับ)"
        hint="ที่อยู่จริงสำหรับลูกค้าที่ยอมรับนัดเจอ ปล่อยว่างได้ถ้ายังไม่อยากเปิดเผย"
      >
        <textarea
          name="address"
          rows={2}
          maxLength={200}
          placeholder="เช่น 88/8 ซ.ทองหล่อ 9, สุขุมวิท 55, วัฒนา กทม. 10110"
          style={{ ...inputStyle, resize: "vertical" }}
        />
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
