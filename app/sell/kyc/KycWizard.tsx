"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { submitKyc } from "@/app/actions/seller";

type BusinessType = "individual" | "company";
type Plan = "Free" | "Boost" | "Featured";

type Step = 1 | 2 | 3;

const STEPS: Array<{ id: Step; label: string }> = [
  { id: 1, label: "ประเภทธุรกิจ" },
  { id: 2, label: "เอกสาร" },
  { id: 3, label: "ตรวจสอบ" },
];

const BANKS = [
  "ธนาคารกสิกรไทย (KBANK)",
  "ธนาคารไทยพาณิชย์ (SCB)",
  "ธนาคารกรุงเทพ (BBL)",
  "ธนาคารกรุงไทย (KTB)",
  "ธนาคารกรุงศรีอยุธยา (BAY)",
  "ธนาคารทหารไทยธนชาต (TTB)",
  "ธนาคารออมสิน (GSB)",
  "ธนาคาร UOB",
  "ธนาคาร CIMB Thai",
];

type Props = { boutiqueId: string };

export default function KycWizard({ boutiqueId }: Props) {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState<{ field: string; pct: number } | null>(null);

  // form state
  const [businessType, setBusinessType] = useState<BusinessType>("individual");
  const [plan, setPlan] = useState<Plan>("Free");
  const [legalName, setLegalName] = useState("");
  const [taxId, setTaxId] = useState("");
  const [dbdRegNo, setDbdRegNo] = useState("");
  // bank account fields are optional / commented out for now
  // const [bankName, setBankName] = useState(BANKS[0]);
  // const [bankAccNo, setBankAccNo] = useState("");
  // const [bankAccName, setBankAccName] = useState("");
  const [idCardUrl, setIdCardUrl] = useState("");
  const [dbdDocUrl, setDbdDocUrl] = useState("");
  const [bookBankUrl, setBookBankUrl] = useState("");

  async function uploadFile(field: "id_card" | "dbd_doc" | "book_bank", file: File) {
    setError(null);
    setUploading({ field, pct: 1 });
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      if (!res.ok) {
        setError("อัปโหลดไม่สำเร็จ — กรุณาลองใหม่อีกครั้ง");
        setUploading(null);
        return;
      }
      const json = await res.json();
      const url = json.urls?.large ?? json.url ?? "";
      if (field === "id_card") setIdCardUrl(url);
      if (field === "dbd_doc") setDbdDocUrl(url);
      if (field === "book_bank") setBookBankUrl(url);
      setUploading(null);
    } catch (err) {
      setError((err as Error).message);
      setUploading(null);
    }
  }

  function validateStep(s: Step): string | null {
    if (s === 1) return null;
    if (s === 2) {
      if (!legalName.trim()) return "กรุณาใส่ชื่อตามเอกสาร";
      if (!taxId.trim()) return "กรุณาใส่เลขบัตรประชาชน/เลขผู้เสียภาษี";
      if (!idCardUrl) return "กรุณาอัปโหลดบัตรประชาชน";
      if (businessType === "company" && !dbdDocUrl) return "กรุณาอัปโหลดหนังสือรับรองบริษัท";
      return null;
    }
    if (s === 3) {
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
    setStep((s) => (s < 3 ? ((s + 1) as Step) : s));
  }

  function prevStep() {
    setError(null);
    setStep((s) => (s > 1 ? ((s - 1) as Step) : s));
  }

  async function onSubmit() {
    setError(null);
    setSubmitting(true);
    const fd = new FormData();
    fd.set("boutique_id", boutiqueId);
    fd.set("business_type", businessType);
    fd.set("legal_name", legalName);
    fd.set("tax_id", taxId);
    if (dbdRegNo) fd.set("dbd_reg_no", dbdRegNo);
    // Bank account data is optional / removed from submission
    // fd.set("bank_name", bankName);
    // fd.set("bank_acc_no", bankAccNo);
    // fd.set("bank_acc_name", bankAccName);
    fd.set("id_card_url", idCardUrl);
    if (dbdDocUrl) fd.set("dbd_doc_url", dbdDocUrl);
    // fd.set("book_bank_url", bookBankUrl);
    fd.set("plan", plan);
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
        <Step1 businessType={businessType} setBusinessType={setBusinessType} plan={plan} setPlan={setPlan} />
      ) : null}
      {step === 2 ? (
        <Step2
          businessType={businessType}
          legalName={legalName}
          setLegalName={setLegalName}
          taxId={taxId}
          setTaxId={setTaxId}
          dbdRegNo={dbdRegNo}
          setDbdRegNo={setDbdRegNo}
          idCardUrl={idCardUrl}
          dbdDocUrl={dbdDocUrl}
          uploading={uploading}
          uploadFile={uploadFile}
        />
      ) : null}
      {step === 3 ? (
        <Step4
          businessType={businessType}
          plan={plan}
          legalName={legalName}
          taxId={taxId}
          dbdRegNo={dbdRegNo}
          idCardUrl={idCardUrl}
          dbdDocUrl={dbdDocUrl}
          bookBankUrl={bookBankUrl}
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
        {step < 3 ? (
          <button type="button" className="btn btn-dark" onClick={nextStep}>
            ถัดไป →
          </button>
        ) : (
          <button type="button" className="btn btn-dark" onClick={onSubmit} disabled={submitting}>
            {submitting ? "กำลังส่ง…" : "ส่งข้อมูล KYC"}
          </button>
        )}
      </div>
    </div>
  );
}

/* === Step components === */

function Step1({
  businessType,
  setBusinessType,
  plan,
  setPlan,
}: {
  businessType: BusinessType;
  setBusinessType: (b: BusinessType) => void;
  plan: Plan;
  setPlan: (p: Plan) => void;
}) {
  return (
    <div>
      <h2 style={sectionTitle}>ประเภทธุรกิจ</h2>
      <div style={{ display: "grid", gap: 10, gridTemplateColumns: "1fr 1fr", marginBottom: 28 }}>
        {(["individual", "company"] as BusinessType[]).map((bt) => (
          <button
            key={bt}
            type="button"
            onClick={() => setBusinessType(bt)}
            style={{
              padding: "16px",
              textAlign: "left",
              border: `${businessType === bt ? 2 : 1}px solid ${businessType === bt ? "var(--ink)" : "var(--line)"}`,
              background: businessType === bt ? "var(--bg)" : "var(--surface)",
              borderRadius: 8,
              cursor: "pointer",
            }}
          >
            <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 4 }}>
              {bt === "individual" ? "บุคคลธรรมดา" : "นิติบุคคล"}
            </div>
            <div style={{ fontSize: 13, color: "var(--ink-3)", lineHeight: 1.5 }}>
              {bt === "individual"
                ? "เปิดร้านในชื่อตัวเอง ใช้บัตรประชาชน"
                : "ในนามบริษัท/ห้าง ใช้หนังสือรับรองบริษัท"}
            </div>
          </button>
        ))}
      </div>

      <h2 style={sectionTitle}>แพ็กเกจ</h2>
      <p style={{ fontSize: 13, color: "var(--ink-3)", marginBottom: 14 }}>
        เริ่มฟรีก่อนได้ อัปเกรดผ่าน LINE ของ DopRent ภายหลัง
      </p>
      <div style={{ display: "grid", gap: 10 }}>
        {(["Free", "Boost", "Featured"] as Plan[]).map((p) => (
          <label
            key={p}
            style={{
              display: "flex",
              gap: 12,
              padding: "12px 14px",
              border: `${plan === p ? 2 : 1}px solid ${plan === p ? "var(--ink)" : "var(--line)"}`,
              borderRadius: 8,
              cursor: "pointer",
              background: plan === p ? "var(--bg)" : "var(--surface)",
            }}
          >
            <input
              type="radio"
              name="plan"
              value={p}
              checked={plan === p}
              onChange={() => setPlan(p)}
              style={{ marginTop: 2 }}
            />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600 }}>{p}</div>
              <div style={{ fontSize: 13, color: "var(--ink-2)", marginTop: 2 }}>
                {p === "Free" ? "ฟรี ตลอดชีพ" : p === "Boost" ? "฿990/เดือน" : "฿2,900/เดือน"}
              </div>
            </div>
          </label>
        ))}
      </div>
    </div>
  );
}

function Step2(props: {
  businessType: BusinessType;
  legalName: string;
  setLegalName: (s: string) => void;
  taxId: string;
  setTaxId: (s: string) => void;
  dbdRegNo: string;
  setDbdRegNo: (s: string) => void;
  idCardUrl: string;
  dbdDocUrl: string;
  uploading: { field: string; pct: number } | null;
  uploadFile: (f: "id_card" | "dbd_doc" | "book_bank", file: File) => Promise<void>;
}) {
  const isCompany = props.businessType === "company";
  return (
    <div>
      <h2 style={sectionTitle}>ข้อมูลผู้ดูแลร้าน</h2>
      <div style={{ display: "flex", flexDirection: "column", gap: 18, marginBottom: 24 }}>
        <Labeled label={isCompany ? "ชื่อบริษัท (ตามหนังสือรับรอง) *" : "ชื่อ-นามสกุล (ตามบัตรประชาชน) *"}>
          <input
            type="text"
            value={props.legalName}
            onChange={(e) => props.setLegalName(e.target.value)}
            required
            style={inputStyle}
          />
        </Labeled>
        <Labeled label={isCompany ? "เลขประจำตัวผู้เสียภาษี (13 หลัก) *" : "เลขบัตรประชาชน (13 หลัก) *"}>
          <input
            type="text"
            value={props.taxId}
            onChange={(e) => props.setTaxId(e.target.value.replace(/\D/g, "").slice(0, 13))}
            inputMode="numeric"
            maxLength={13}
            style={inputStyle}
          />
        </Labeled>
        {isCompany ? (
          <Labeled label="เลขทะเบียนนิติบุคคล (DBD)">
            <input
              type="text"
              value={props.dbdRegNo}
              onChange={(e) => props.setDbdRegNo(e.target.value)}
              style={inputStyle}
            />
          </Labeled>
        ) : null}
      </div>

      <h2 style={sectionTitle}>เอกสารยืนยันตัวตน</h2>
      <FileSlot
        label={isCompany ? "หน้าบัตรประชาชนกรรมการ *" : "หน้าบัตรประชาชน *"}
        hint="JPG / PNG / PDF · ใช้สำหรับยืนยันตัวตนเท่านั้น เก็บเป็นความลับ"
        url={props.idCardUrl}
        field="id_card"
        uploading={props.uploading}
        uploadFile={props.uploadFile}
      />
      {isCompany ? (
        <FileSlot
          label="หนังสือรับรองบริษัท (DBD) *"
          hint="อายุไม่เกิน 3 เดือน"
          url={props.dbdDocUrl}
          field="dbd_doc"
          uploading={props.uploading}
          uploadFile={props.uploadFile}
        />
      ) : null}
    </div>
  );
}

function Step3(props: {
  bankName: string;
  setBankName: (s: string) => void;
  bankAccNo: string;
  setBankAccNo: (s: string) => void;
  bankAccName: string;
  setBankAccName: (s: string) => void;
  bookBankUrl: string;
  uploading: { field: string; pct: number } | null;
  uploadFile: (f: "id_card" | "dbd_doc" | "book_bank", file: File) => Promise<void>;
}) {
  return (
    <div>
      <h2 style={sectionTitle}>บัญชีรับเงิน</h2>
      <p style={{ fontSize: 13, color: "var(--ink-3)", marginBottom: 18 }}>
        ลูกค้าจะโอนเงินตรงให้บัญชีนี้ (DopRent ไม่หักเงิน) หากยังไม่พร้อมสามารถเว้นไว้ก่อนแล้วส่งได้
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 18, marginBottom: 24 }}>
        <Labeled label="ธนาคาร">
          <select
            value={props.bankName}
            onChange={(e) => props.setBankName(e.target.value)}
            style={inputStyle}
          >
            {BANKS.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        </Labeled>
        <Labeled label="เลขที่บัญชี">
          <input
            type="text"
            value={props.bankAccNo}
            onChange={(e) => props.setBankAccNo(e.target.value.replace(/\D/g, ""))}
            inputMode="numeric"
            style={inputStyle}
          />
        </Labeled>
        <Labeled label="ชื่อบัญชี">
          <input
            type="text"
            value={props.bankAccName}
            onChange={(e) => props.setBankAccName(e.target.value)}
            style={inputStyle}
          />
        </Labeled>
      </div>

      <FileSlot
        label="หน้าสมุดบัญชีธนาคาร"
        hint="หากมี ให้แนบหน้าที่มีชื่อบัญชีและเลขบัญชี"
        url={props.bookBankUrl}
        field="book_bank"
        uploading={props.uploading}
        uploadFile={props.uploadFile}
      />
    </div>
  );
}

function Step4(props: {
  businessType: BusinessType;
  plan: Plan;
  legalName: string;
  taxId: string;
  dbdRegNo: string;
  idCardUrl: string;
  dbdDocUrl: string;
  bookBankUrl: string;
}) {
  return (
    <div>
      <h2 style={sectionTitle}>ตรวจสอบข้อมูล</h2>
      <p style={{ fontSize: 13, color: "var(--ink-3)", marginBottom: 18 }}>
        เช็คข้อมูลก่อนกดส่ง ส่งแล้วแก้ไม่ได้ ถ้าตรวจไม่ผ่านทีม DopRent จะแจ้งให้ส่งใหม่
      </p>
      <ReviewRow label="ประเภทธุรกิจ" value={props.businessType === "company" ? "นิติบุคคล" : "บุคคลธรรมดา"} />
      <ReviewRow label="แพ็กเกจ" value={props.plan} />
      <ReviewRow label="ชื่อตามเอกสาร" value={props.legalName} />
      <ReviewRow label="เลขประจำตัว" value={props.taxId.replace(/.(?=.{4})/g, "•")} />
      {props.dbdRegNo ? <ReviewRow label="เลข DBD" value={props.dbdRegNo} /> : null}
      <ReviewRow label="บัตรประชาชน" value={props.idCardUrl ? "✓ อัปโหลดแล้ว" : "✗ ยังไม่ได้อัปโหลด"} />
      {props.businessType === "company" ? (
        <ReviewRow label="หนังสือรับรอง" value={props.dbdDocUrl ? "✓ อัปโหลดแล้ว" : "—"} />
      ) : null}
      {/* Bank account section hidden as requested */}
      {/* <ReviewRow label="สมุดบัญชี" value={props.bookBankUrl ? "✓ อัปโหลดแล้ว" : "✗"} /> */}
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
  url,
  field,
  uploading,
  uploadFile,
}: {
  label: string;
  hint?: string;
  url: string;
  field: "id_card" | "dbd_doc" | "book_bank";
  uploading: { field: string; pct: number } | null;
  uploadFile: (f: "id_card" | "dbd_doc" | "book_bank", file: File) => Promise<void>;
}) {
  const isUploading = uploading?.field === field;
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 4 }}>{label}</div>
      {hint ? <div style={{ fontSize: 12, color: "var(--ink-3)", marginBottom: 8 }}>{hint}</div> : null}
      <div
        style={{
          border: `1px dashed ${url ? "var(--ink)" : "var(--line)"}`,
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
                if (f) uploadFile(field, f);
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

function Labeled({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: "block", fontSize: 14, fontWeight: 500, marginBottom: 6 }}>{label}</label>
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
