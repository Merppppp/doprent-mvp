"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { createBoutique } from "@/app/actions/seller";
import { BANGKOK_DISTRICTS, findDistrict, PROVINCE_TH } from "@/lib/bangkok-districts";

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

// Props type kept for API compatibility but areas dropdown is replaced by the
// district / subdistrict cascading select from `bangkok-districts.ts`.
type Props = {
  areas: Array<{ key: string; th: string }>;
};

export default function SignupForm(_props: Props) {
  void _props;
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Address state
  const [district, setDistrict] = useState("");
  const [subdistrict, setSubdistrict] = useState("");
  const [postal, setPostal] = useState("");

  const subdistricts = useMemo(() => {
    const d = findDistrict(district);
    return d?.subdistricts ?? [];
  }, [district]);

  function onDistrictChange(v: string) {
    setDistrict(v);
    setSubdistrict("");
    setPostal("");
  }

  function onSubdistrictChange(v: string) {
    setSubdistrict(v);
    const d = findDistrict(district);
    const sub = d?.subdistricts.find((s) => s.th === v);
    if (sub) setPostal(sub.postal);
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (!district) {
      setError("กรุณาเลือกเขต");
      return;
    }
    if (!subdistrict) {
      setError("กรุณาเลือกแขวง/ตำบล");
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData(e.currentTarget);
      // Override / set address fields explicitly
      formData.set("district", district);
      formData.set("subdistrict", subdistrict);
      formData.set("province", PROVINCE_TH);
      formData.set("postal_code", postal);
      // Derive area_key + area_label from district for backward-compat filters
      const d = findDistrict(district);
      if (d) {
        formData.set("area_key", d.en);
        formData.set("area_label", `เขต${d.th} · กรุงเทพ`);
      }

      const res = await createBoutique(formData);
      if (!res.ok) {
        setError(res.error ?? "เกิดข้อผิดพลาด");
        setSubmitting(false);
        return;
      }
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

      {/* ==== ADDRESS SECTION ==== */}
      <div
        style={{
          padding: 16,
          background: "var(--bg)",
          border: "1px solid var(--line)",
          borderRadius: 8,
        }}
      >
        <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>ที่อยู่ร้าน</div>
        <div style={{ fontSize: 12, color: "var(--ink-3)", marginBottom: 14 }}>
          สำหรับให้ลูกค้าหาทาง + ระบบหาพิกัดอัตโนมัติในอนาคต
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <Field label="บ้านเลขที่ / อาคาร / ชั้น *">
            <input
              type="text"
              name="house_no"
              required
              maxLength={80}
              placeholder="เช่น 88/8 ชั้น 2"
              style={inputStyle}
            />
          </Field>

          <Field label="ถนน / ซอย (ไม่บังคับ)">
            <input
              type="text"
              name="street"
              maxLength={80}
              placeholder="เช่น ซ.ทองหล่อ 9, ถ.สุขุมวิท 55"
              style={inputStyle}
            />
          </Field>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="เขต *">
              <select
                value={district}
                onChange={(e) => onDistrictChange(e.target.value)}
                required
                style={inputStyle}
              >
                <option value="">— เลือกเขต —</option>
                {BANGKOK_DISTRICTS.map((d) => (
                  <option key={d.th} value={d.th}>
                    {d.th}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="แขวง / ตำบล *">
              <select
                value={subdistrict}
                onChange={(e) => onSubdistrictChange(e.target.value)}
                required
                disabled={!district}
                style={{ ...inputStyle, opacity: !district ? 0.5 : 1 }}
              >
                <option value="">
                  {district ? "— เลือกแขวง —" : "เลือกเขตก่อน"}
                </option>
                {subdistricts.map((s) => (
                  <option key={s.th} value={s.th}>
                    {s.th}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="จังหวัด">
              <input
                type="text"
                value={PROVINCE_TH}
                disabled
                style={{ ...inputStyle, background: "var(--bg)", color: "var(--ink-3)" }}
              />
            </Field>
            <Field label="รหัสไปรษณีย์">
              <input
                type="text"
                value={postal}
                onChange={(e) => setPostal(e.target.value.replace(/\D/g, "").slice(0, 5))}
                maxLength={5}
                placeholder="—"
                inputMode="numeric"
                style={inputStyle}
              />
            </Field>
          </div>
        </div>
      </div>

      <Field
        label="LINE สำหรับลูกค้าทักร้าน *"
        hint={
          "ใส่ได้หลายแบบ:\n" +
          "• LINE Official: @yourshop หรือชื่อโดยไม่มี @\n" +
          "• LINE ส่วนตัว: ต้องใช้ลิงก์เต็ม (LINE → โปรไฟล์ → กดที่ ID → คัดลอกลิงก์)\n" +
          "• หรือลิงก์เชิญ https://lin.ee/..."
        }
      >
        <input
          type="text"
          name="line_url"
          required
          placeholder="@yourshop, https://line.me/..., หรือ https://lin.ee/..."
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

      <Field
        label="Tagline (ไม่บังคับ)"
        hint='ประโยคสั้นๆ ใต้ชื่อร้าน ไม่เกิน 80 ตัว เช่น "เดรสงานหมั้น handcrafted lace"'
      >
        <input type="text" name="tag" maxLength={80} style={inputStyle} />
      </Field>

      <Field label="เกี่ยวกับร้าน (ไม่บังคับ)" hint="แนะนำตัวร้าน 2-3 ประโยค ใช้ได้ทั้งไทย/อังกฤษ">
        <textarea
          name="story"
          maxLength={500}
          rows={3}
          style={{ ...inputStyle, resize: "vertical" }}
        />
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

      {/* Hidden inputs that createBoutique reads */}
      <input type="hidden" name="area_key" />
      <input type="hidden" name="area_label" />

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
        <div style={{ fontSize: 12, color: "var(--ink-3)", marginBottom: 6, whiteSpace: "pre-line", lineHeight: 1.5 }}>{hint}</div>
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
