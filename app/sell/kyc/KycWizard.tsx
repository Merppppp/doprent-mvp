"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { submitKyc } from "@/app/actions/seller";
import RequiredMark from "@/components/RequiredMark";

// MVP: business type is always "individual"; plan is always "full".
// The former Step 1 (businessType + plan choice) has been removed.
type Step = 1 | 2;

const STEPS: Array<{ id: Step; label: string }> = [
  { id: 1, label: "เอกสาร" },
  { id: 2, label: "ตรวจสอบ" },
];

type Props = { boutiqueId: string };

export default function KycWizard({ boutiqueId }: Props) {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState<{ field: string; pct: number } | null>(null);
  const [kycConsent, setKycConsent] = useState(false);

  // form state
  const [legalName, setLegalName] = useState("");
  const [taxId, setTaxId] = useState("");
  const [idCardUrl, setIdCardUrl] = useState("");

  async function uploadFile(field: "id_card", file: File) {
    setError(null);
    setUploading({ field, pct: 1 });
    try {
      const fd = new FormData();
      fd.append("file", file);
      // KYC docs are sensitive → PRIVATE bucket. The route returns an object
      // KEY (e.g. `kyc/<uuid>.png`), not a public URL; admins resolve it via
      // a guarded signed-URL route.
      const res = await fetch("/api/upload/kyc", { method: "POST", body: fd });
      if (!res.ok) {
        setError("อัปโหลดไม่สำเร็จ — กรุณาลองใหม่อีกครั้ง");
        setUploading(null);
        return;
      }
      const json = await res.json();
      const key = json.key ?? json.urls?.large ?? json.url ?? "";
      if (field === "id_card") setIdCardUrl(key);
      setUploading(null);
    } catch (err) {
      setError((err as Error).message);
      setUploading(null);
    }
  }

  async function handleFileSelected(field: "id_card" | "dbd_doc" | "book_bank", file: File) {
    setError(null);
    const previewUrl = file.type.startsWith("image/") ? URL.createObjectURL(file) : "";
    if (filePreviewRefs.current[field]) {
      URL.revokeObjectURL(filePreviewRefs.current[field]);
    }
    if (previewUrl) {
      filePreviewRefs.current[field] = previewUrl;
    }
    setPendingFiles((prev) => ({
      ...prev,
      [field]: { previewUrl, fileName: file.name, type: file.type },
    }));

    let uploadFileData: File;
    try {
      uploadFileData = await prepareImageFileForUpload(file);
    } catch (err) {
      setError((err as Error).message);
      return;
    }
    uploadFile(field, uploadFileData);
  }

  useEffect(() => {
    return () => {
      Object.values(filePreviewRefs.current).forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  function validateStep(s: Step): string | null {
    if (s === 1) {
      if (!legalName.trim()) return "กรุณาใส่ชื่อตามเอกสาร";
      if (!taxId.trim()) return "กรุณาใส่เลขบัตรประชาชน";
      if (!idCardUrl) return "กรุณาอัปโหลดบัตรประชาชน";
      return null;
    }
    if (s === 2) {
      if (!kycConsent) return "กรุณายืนยันความยินยอมการเก็บข้อมูลส่วนบุคคล (PDPA) ก่อนส่ง";
      return null;
    }
    return null;
  }

  function nextStep() {
    const err = validateStep(step);
    if (err) {
      setError(err);
      return;
    }
    setError(null);
    setStep((s) => (s < 2 ? ((s + 1) as Step) : s));
  }

  function prevStep() {
    setError(null);
    setStep((s) => (s > 1 ? ((s - 1) as Step) : s));
  }

  async function onSubmit() {
    setError(null);
    if (!kycConsent) {
      setError("กรุณายืนยันความยินยอมการเก็บข้อมูลส่วนบุคคล (PDPA) ก่อนส่ง");
      return;
    }
    setSubmitting(true);
    const fd = new FormData();
    fd.set("boutique_id", boutiqueId);
    fd.set("business_type", "individual"); // MVP: always individual
    fd.set("legal_name", legalName);
    fd.set("tax_id", taxId);
    fd.set("id_card_url", idCardUrl);
    fd.set("plan", "full"); // MVP: all shops get full plan
    const res = await submitKyc(fd);
    if (!res.ok) {
      setError(res.error ?? "ส่งไม่สำเร็จ");
      setSubmitting(false);
      return;
    }
    router.push("/sell/dashboard?kyc=submitted");
  }

  return (
    <div>
      {/* Stepper */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 4,
          marginBottom: 28,
          flexWrap: "wrap",
        }}
      >
        {STEPS.map((s, idx) => (
          <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <span
              style={{
                width: 26,
                height: 26,
                borderRadius: 999,
                background: step >= s.id ? "var(--ink)" : "var(--bg)",
                color: step >= s.id ? "var(--on-dark)" : "var(--ink-3)",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 12,
                fontWeight: 600,
                border: "1px solid var(--line)",
              }}
            >
              {s.id}
            </span>
            <span
              style={{
                fontSize: 12,
                color: step >= s.id ? "var(--ink)" : "var(--ink-3)",
                fontWeight: step === s.id ? 600 : 400,
                marginRight: 8,
              }}
            >
              {s.label}
            </span>
            {idx < STEPS.length - 1 ? (
              <span
                style={{
                  width: 16,
                  height: 1,
                  background: "var(--line)",
                  marginRight: 4,
                }}
              />
            ) : null}
          </div>
        ))}
      </div>

      {/* Step content */}
      {step === 1 ? (
        <StepDocuments
          legalName={legalName}
          setLegalName={setLegalName}
          taxId={taxId}
          setTaxId={setTaxId}
          idCardUrl={idCardUrl}
          uploading={uploading}
          onFileSelected={handleFileSelected}
        />
      ) : null}
      {step === 2 ? (
        <StepReview
          legalName={legalName}
          taxId={taxId}
          idCardUrl={idCardUrl}
          kycConsent={kycConsent}
          setKycConsent={setKycConsent}
        />
      ) : null}

      {error ? (
        <div
          style={{
            marginTop: 18,
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

      {/* Nav buttons */}
      <div style={{ display: "flex", gap: 10, marginTop: 28, justifyContent: "space-between" }}>
        <button
          type="button"
          className="btn btn-outline"
          onClick={prevStep}
          disabled={step === 1}
          style={{ visibility: step === 1 ? "hidden" : "visible" }}
        >
          ← ย้อนกลับ
        </button>
        {step < 2 ? (
          <button type="button" className="btn btn-dark" onClick={nextStep}>
            ถัดไป →
          </button>
        ) : (
          <button
            type="button"
            className="btn btn-dark"
            onClick={onSubmit}
            disabled={submitting || !kycConsent}
            style={{ opacity: submitting || !kycConsent ? 0.6 : 1 }}
          >
            {submitting ? "กำลังส่ง…" : "ส่งข้อมูล KYC"}
          </button>
        )}
      </div>
    </div>
  );
}

/* === Step components === */

function StepDocuments(props: {
  legalName: string;
  setLegalName: (s: string) => void;
  taxId: string;
  setTaxId: (s: string) => void;
  idCardUrl: string;
  uploading: { field: string; pct: number } | null;
  uploadFile: (f: "id_card", file: File) => Promise<void>;
}) {
  return (
    <div>
      <h2 style={sectionTitle}>ข้อมูลผู้ดูแลร้าน</h2>
      <div style={{ display: "flex", flexDirection: "column", gap: 18, marginBottom: 24 }}>
        <Labeled label="ชื่อ-นามสกุล (ตามบัตรประชาชน)" required>
          <input
            type="text"
            value={props.legalName}
            onChange={(e) => props.setLegalName(e.target.value)}
            required
            aria-required={true}
            style={inputStyle}
          />
        </Labeled>
        <Labeled label="เลขบัตรประชาชน (13 หลัก)" required>
          <input
            type="text"
            value={props.taxId}
            onChange={(e) => props.setTaxId(e.target.value.replace(/\D/g, "").slice(0, 13))}
            inputMode="numeric"
            maxLength={13}
            aria-required={true}
            style={inputStyle}
          />
        </Labeled>
      </div>

      <h2 style={sectionTitle}>เอกสารยืนยันตัวตน</h2>
      {/* Privacy reassurance note */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: 8,
          padding: "10px 14px",
          background: "var(--surface)",
          border: "1px solid var(--line)",
          borderRadius: 8,
          marginBottom: 16,
          fontSize: 13,
          color: "var(--ink-2)",
          lineHeight: 1.55,
        }}
      >
        <span style={{ fontSize: 16, flexShrink: 0 }}>🔒</span>
        <span>
          <strong>เอกสารถูกเก็บเป็นความลับ</strong> เข้าถึงได้เฉพาะเจ้าหน้าที่ตรวจสอบของ DopRent เท่านั้น
          ไม่เปิดเผยต่อผู้ใช้รายอื่น ตาม{" "}
          <a href="/privacy" target="_blank" rel="noreferrer noopener" style={{ color: "var(--accent)" }}>
            นโยบายความเป็นส่วนตัว
          </a>
        </span>
      </div>
      <FileSlot
        label="หน้าบัตรประชาชน"
        hint="JPG / PNG / PDF · ใช้สำหรับยืนยันตัวตนเท่านั้น เก็บเป็นความลับ"
        required
        url={props.idCardUrl}
        field="id_card"
        pending={props.pendingIdCard}
        uploading={props.uploading}
        onFileSelected={props.onFileSelected}
      />
    </div>
  );
}

function StepReview(props: {
  legalName: string;
  taxId: string;
  idCardUrl: string;
  kycConsent: boolean;
  setKycConsent: (v: boolean) => void;
}) {
  return (
    <div>
      <h2 style={sectionTitle}>ตรวจสอบข้อมูล</h2>
      <p style={{ fontSize: 13, color: "var(--ink-3)", marginBottom: 18 }}>
        เช็คข้อมูลก่อนกดส่ง ส่งแล้วแก้ไม่ได้ ถ้าตรวจไม่ผ่านทีม DopRent จะแจ้งให้ส่งใหม่
      </p>
      <ReviewRow label="ชื่อตามเอกสาร" value={props.legalName} />
      <ReviewRow label="เลขประจำตัว" value={props.taxId.replace(/.(?=.{4})/g, "•")} />
      <ReviewRow label="บัตรประชาชน" value={props.idCardUrl ? "✓ อัปโหลดแล้ว" : "✗ ยังไม่ได้อัปโหลด"} />

      {/* PDPA KYC Consent */}
      <div
        style={{
          marginTop: 24,
          padding: "16px",
          background: "var(--surface)",
          border: "1px solid var(--line)",
          borderRadius: 8,
        }}
      >
        <label
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 10,
            cursor: "pointer",
          }}
        >
          <input
            type="checkbox"
            checked={props.kycConsent}
            onChange={(e) => props.setKycConsent(e.target.checked)}
            required
            style={{ marginTop: 3, flexShrink: 0, width: 16, height: 16, accentColor: "var(--ink)" }}
          />
          <span style={{ fontSize: 13, lineHeight: 1.7, color: "var(--ink)" }}>
            ฉันยินยอมให้ DopRent เก็บ ใช้ และประมวลผลข้อมูลส่วนบุคคลและเอกสารยืนยันตัวตน
            (บัตรประชาชน) เพื่อยืนยันตัวตนผู้ขายและป้องกันการทุจริต
            ตาม พ.ร.บ.คุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562{" "}
            (
            <a
              href="/privacy"
              target="_blank"
              rel="noreferrer noopener"
              style={{ color: "var(--accent)", textDecoration: "underline" }}
            >
              อ่านนโยบายความเป็นส่วนตัว
            </a>
            ){" "}
            <span style={{ color: "var(--danger)" }}>*</span>
          </span>
        </label>
      </div>
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        display: "flex",
        gap: 12,
        padding: "10px 0",
        borderBottom: "1px solid var(--line)",
        fontSize: 14,
      }}
    >
      <span style={{ width: 140, color: "var(--ink-3)", flexShrink: 0 }}>{label}</span>
      <span style={{ flex: 1, fontWeight: 500 }}>{value || "—"}</span>
    </div>
  );
}

function FileSlot({
  label,
  hint,
  required,
  url,
  field,
  uploading,
  pending,
  onFileSelected,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  url: string;
  field: "id_card";
  uploading: { field: string; pct: number } | null;
  uploadFile: (f: "id_card", file: File) => Promise<void>;
}) {
  const isUploading = uploading?.field === field;
  const hasPreview = Boolean(pending?.previewUrl || (url && /\.(jpe?g|png|gif|webp|avif|bmp)$/i.test(url)));
  const previewSrc = pending?.previewUrl || (url && /\.(jpe?g|png|gif|webp|avif|bmp)$/i.test(url) ? url : "");

  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 4 }}>
        {label}{required ? <RequiredMark /> : null}
      </div>
      {hint ? <div style={{ fontSize: 12, color: "var(--ink-3)", marginBottom: 8 }}>{hint}</div> : null}
      <div
        style={{
          border: `1px dashed ${url || pending?.previewUrl ? "var(--ink)" : "var(--line)"}`,
          borderRadius: 8,
          padding: 14,
          background: "var(--surface)",
        }}
      >
        {url ? (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ color: "var(--success)" }}>✓</span>
            <span style={{ fontSize: 13 }}>อัปโหลดแล้ว</span>
            <label style={{ marginLeft: "auto", fontSize: 12, color: "var(--ink-3)", cursor: "pointer" }}>
              เปลี่ยนไฟล์
              <input
                type="file"
                accept="image/*,.pdf"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) uploadFile(field, f);
                }}
                style={{ display: "none" }}
              />
            </label>
          </div>
        ) : (
          <label style={{ display: "block", cursor: "pointer", textAlign: "center", padding: 8 }}>
            <input
              type="file"
              accept="image/*,.pdf"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onFileSelected(field, f);
              }}
              style={{ display: "none" }}
            />
            {isUploading ? (
              <span style={{ color: "var(--ink-3)", fontSize: 13 }}>กำลังอัปโหลด…</span>
            ) : (
              <>
                <div style={{ fontSize: 13, color: "var(--ink)", fontWeight: 500 }}>คลิกเพื่อเลือกไฟล์</div>
                <div style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 4 }}>JPG / PNG / PDF</div>
              </>
            )}
          </label>
        )}
      </div>
    </div>
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

const sectionTitle: React.CSSProperties = {
  fontSize: 18,
  fontWeight: 600,
  marginBottom: 14,
  letterSpacing: "-0.01em",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  border: "1px solid var(--line)",
  borderRadius: 6,
  background: "var(--surface)",
  fontSize: 14,
  fontFamily: "inherit",
};
