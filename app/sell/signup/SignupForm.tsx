"use client";

import { useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import { createShop } from "@/app/actions/seller";
import RequiredMark from "@/components/RequiredMark";
import { BANGKOK_DISTRICTS, findDistrict, PROVINCE_TH } from "@/lib/bangkok-districts";
import { prepareImageFileForUpload } from "@/lib/image";

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

  // Payment / bankbook state
  const [promptpayId, setPromptpayId] = useState("");
  const [bankAccountNumber, setBankAccountNumber] = useState("");
  const [bankbookKey, setBankbookKey] = useState("");
  const [bankbookUploading, setBankbookUploading] = useState(false);
  const [bankbookError, setBankbookError] = useState<string | null>(null);
  const bankbookInputRef = useRef<HTMLInputElement>(null);

  const subdistricts = useMemo(() => {
    const d = findDistrict(district);
    return d?.subdistricts ?? [];
  }, [district]);

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
    // HARD-BLOCK: bank account filled but no bankbook
    if (bankAccountNumber.trim() && !bankbookKey) {
      setError("กรุณาแนบรูปหน้าสมุดบัญชีเพื่อยืนยันเลขบัญชี");
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

      // Pass bankbook key (private R2 object key, never a public URL)
      formData.set("bankbook_image_path", bankbookKey);

      const res = await createShop(formData);
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
      <Field label="ชื่อร้าน" hint="แสดงบนหน้าเว็บ ใช้ได้ทั้งไทย/อังกฤษ" required>
        <input type="text" name="name" required aria-required={true} maxLength={60} className="input input-surface" />
      </Field>

      <Field label="ผู้ดูแล (ไม่บังคับ)" hint='เช่น "คุณนิด" — จะแสดงใต้ชื่อร้านในหน้าโปรไฟล์'>
        <input type="text" name="owner_name" maxLength={50} className="input input-surface" />
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
          <Field label="บ้านเลขที่ / อาคาร / ชั้น" required>
            <input
              type="text"
              name="house_no"
              required
              aria-required={true}
              maxLength={80}
              placeholder="เช่น 88/8 ชั้น 2"
              className="input input-surface"
            />
          </Field>

          <Field label="ถนน / ซอย (ไม่บังคับ)">
            <input
              type="text"
              name="street"
              maxLength={80}
              placeholder="เช่น ซ.ทองหล่อ 9, ถ.สุขุมวิท 55"
              className="input input-surface"
            />
          </Field>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="เขต" required>
              <select
                value={district}
                onChange={(e) => onDistrictChange(e.target.value)}
                required
                aria-required={true}
                className="input input-surface"
              >
                <option value="">— เลือกเขต —</option>
                {BANGKOK_DISTRICTS.map((d) => (
                  <option key={d.th} value={d.th}>
                    {d.th}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="แขวง / ตำบล" required>
              <select
                value={subdistrict}
                onChange={(e) => onSubdistrictChange(e.target.value)}
                required
                aria-required={true}
                disabled={!district}
                className="input input-surface" style={{ opacity: !district ? 0.5 : 1 }}
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
                className="input" style={{ background: "var(--bg)", color: "var(--ink-3)" }}
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
                className="input input-surface"
              />
            </Field>
          </div>
        </div>
      </div>

      <Field
        label="LINE สำหรับลูกค้าทักร้าน"
        hint={
          "ใส่ได้หลายแบบ:\n" +
          "• LINE Official: @yourshop หรือชื่อโดยไม่มี @\n" +
          "• LINE ส่วนตัว: ต้องใช้ลิงก์เต็ม (LINE → โปรไฟล์ → กดที่ ID → คัดลอกลิงก์)\n" +
          "• หรือลิงก์เชิญ https://lin.ee/..."
        }
        required
      >
        <input
          type="text"
          name="line_url"
          required
          aria-required={true}
          placeholder="@yourshop, https://line.me/..., หรือ https://lin.ee/..."
          className="input input-surface"
        />
      </Field>

      <Field label="Instagram (ไม่บังคับ)" hint="เช่น @yourshop">
        <input type="text" name="instagram" maxLength={40} className="input input-surface" placeholder="@..." />
      </Field>

      <Field label="Facebook (ไม่บังคับ)" hint="ลิงก์เพจ หรือชื่อเพจ เช่น facebook.com/yourshop">
        <input type="text" name="facebook" maxLength={120} className="input input-surface" placeholder="facebook.com/..." />
      </Field>

      <Field label="X / Twitter (ไม่บังคับ)" hint="เช่น @yourshop">
        <input type="text" name="twitter" maxLength={40} className="input input-surface" placeholder="@..." />
      </Field>

      <Field label="TikTok (ไม่บังคับ)" hint="เช่น @yourshop">
        <input type="text" name="tiktok" maxLength={40} className="input input-surface" placeholder="@..." />
      </Field>

      <Field label="ปีที่เปิดบริการ (ไม่บังคับ)">
        <input
          type="number"
          name="since_year"
          min={1980}
          max={new Date().getFullYear()}
          placeholder="2018"
          className="input input-surface" style={{ width: 140 }}
        />
      </Field>

      <Field
        label="Tagline (ไม่บังคับ)"
        hint='ประโยคสั้นๆ ใต้ชื่อร้าน ไม่เกิน 80 ตัว เช่น "เดรสงานหมั้น handcrafted lace"'
      >
        <input type="text" name="tag" maxLength={80} className="input input-surface" />
      </Field>

      <Field label="เกี่ยวกับร้าน (ไม่บังคับ)" hint="แนะนำตัวร้าน 2-3 ประโยค ใช้ได้ทั้งไทย/อังกฤษ">
        <textarea
          name="story"
          maxLength={500}
          rows={3}
          className="input input-surface" style={{ resize: "vertical" }}
        />
      </Field>

      <Field label="สีหลักของร้าน" hint="ใช้กับ cover ตอนยังไม่มีรูป">
        <select name="cover_color" className="input input-surface" defaultValue="rose">
          {COLORS.map((c) => (
            <option key={c.key} value={c.key}>
              {c.label}
            </option>
          ))}
        </select>
      </Field>

      {/* ==== PAYMENT SECTION ==== */}
      <div
        style={{
          padding: 16,
          background: "var(--bg)",
          border: "1px solid var(--line)",
          borderRadius: 8,
        }}
      >
        <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>ช่องทางรับชำระเงิน</div>
        <div style={{ fontSize: 12, color: "var(--ink-3)", marginBottom: 14, lineHeight: 1.5 }}>
          ต้องมีอย่างน้อยหนึ่งช่องทาง (PromptPay หรือบัญชีธนาคาร) ก่อนลงขายสินค้าได้
          — ลูกค้าจะโอนเงินให้ร้านโดยตรง DopRent ไม่เก็บเงินแทน
        </div>

        {/* Soft warning: no channel selected yet */}
        {!promptpayId.trim() && !bankAccountNumber.trim() && (
          <div
            style={{
              padding: "10px 14px",
              background: "var(--warn-soft)",
              border: "1px solid var(--warn)",
              borderRadius: 6,
              fontSize: 13,
              color: "var(--warn-ink)",
              marginBottom: 14,
            }}
          >
            ⚠️ ยังไม่มีช่องทางรับชำระเงิน — ต้องเพิ่มก่อนจึงจะลงขายสินค้าได้
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <Field
            label="PromptPay (ไม่บังคับ)"
            hint="เบอร์มือถือ / เลขบัตรประชาชน สำหรับรับเงินผ่าน PromptPay QR"
          >
            <input
              type="text"
              name="promptpay_id"
              maxLength={20}
              placeholder="เช่น 0812345678"
              value={promptpayId}
              onChange={(e) => setPromptpayId(e.target.value)}
              className="input input-surface"
            />
          </Field>
          {/* Bold PromptPay remark */}
          <div
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: "var(--ink)",
              marginTop: -8,
              lineHeight: 1.5,
            }}
          >
            ชื่อบัญชี PromptPay ต้องตรงกับชื่อในบัตรประชาชน/เอกสารนิติบุคคลที่ใช้ยืนยันร้าน (KYC)
          </div>

          <Field label="ธนาคาร (ไม่บังคับ)">
            <select name="bank_name" className="input input-surface" defaultValue="">
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
          </Field>

          <Field label="เลขบัญชี (ไม่บังคับ)" hint="เลขบัญชี">
            <input
              type="text"
              name="bank_account_number"
              inputMode="numeric"
              maxLength={20}
              placeholder="เช่น 123-4-56789-0"
              value={bankAccountNumber}
              onChange={(e) => setBankAccountNumber(e.target.value)}
              className="input input-surface"
            />
          </Field>

          <Field label="ชื่อบัญชี (ไม่บังคับ)" hint="ชื่อบัญชี">
            <input
              type="text"
              name="bank_account_name"
              maxLength={100}
              placeholder="เช่น นางสาว วรรณิษา ใจดี"
              className="input input-surface"
            />
          </Field>

          {/* Bankbook upload */}
          <div>
            <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 4 }}>
              รูปหน้าสมุดบัญชี{bankAccountNumber.trim() ? <RequiredMark /> : " (ไม่บังคับ)"}
            </div>
            <div style={{ fontSize: 12, color: "var(--ink-3)", marginBottom: 8, lineHeight: 1.5 }}>
              จำเป็นต้องแนบเมื่อระบุเลขบัญชี — เก็บเป็นความลับ ผู้ดูแลระบบเท่านั้นที่เห็นได้
            </div>

            {/* Hidden key — set programmatically */}
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
      </div>

      {/* Hidden inputs that createBoutique reads */}
      <input type="hidden" name="area_key" />
      <input type="hidden" name="area_label" />

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
  required,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label style={{ display: "block", fontSize: 14, fontWeight: 500, marginBottom: 4 }}>
        {label}{required ? <RequiredMark /> : null}
      </label>
      {hint ? (
        <div style={{ fontSize: 12, color: "var(--ink-3)", marginBottom: 6, whiteSpace: "pre-line", lineHeight: 1.5 }}>{hint}</div>
      ) : null}
      {children}
    </div>
  );
}

