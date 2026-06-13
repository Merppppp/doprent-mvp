"use client";

import { useRef, useState, useTransition } from "react";
import { updateBillingProfile } from "@/app/actions/account";

export type BillingValues = {
  billingCompanyName: string | null;
  billingTaxId: string | null;
  billingAddress: string | null;
  billingBranch: string | null;
};

export default function BillingForm({ initial }: { initial: BillingValues }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);

    // Client-side tax-id validation (mirrors server-side rule)
    const taxId = String(fd.get("billing_tax_id") ?? "").trim();
    if (taxId && !/^[0-9]{13}$/.test(taxId)) {
      setMessage({ ok: false, text: "เลขประจำตัวผู้เสียภาษีต้องเป็นตัวเลข 13 หลัก" });
      return;
    }

    setMessage(null);
    startTransition(async () => {
      const res = await updateBillingProfile(fd);
      if (res.ok) {
        setMessage({ ok: true, text: "บันทึกข้อมูลเรียบร้อยแล้ว" });
      } else {
        setMessage({ ok: false, text: res.error ?? "เกิดข้อผิดพลาด ลองใหม่อีกครั้ง" });
      }
    });
  }

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "9px 12px",
    border: "1px solid var(--line)",
    borderRadius: 6,
    fontSize: 14,
    background: "var(--bg)",
    color: "var(--ink)",
    boxSizing: "border-box",
  };

  const labelStyle: React.CSSProperties = {
    display: "block",
    fontSize: 13,
    fontWeight: 500,
    color: "var(--ink-2)",
    marginBottom: 5,
  };

  const fieldStyle: React.CSSProperties = { marginBottom: 18 };

  return (
    <form ref={formRef} onSubmit={handleSubmit} noValidate>
      {message && (
        <div
          style={{
            padding: "10px 14px",
            borderRadius: 6,
            fontSize: 14,
            marginBottom: 18,
            background: message.ok ? "#f0fdf4" : "#fef2f2",
            color: message.ok ? "#15803d" : "#dc2626",
            border: `1px solid ${message.ok ? "#bbf7d0" : "#fecaca"}`,
          }}
        >
          {message.text}
        </div>
      )}

      <div style={fieldStyle}>
        <label htmlFor="billing_company_name" style={labelStyle}>
          ชื่อบริษัท / นิติบุคคล
        </label>
        <input
          id="billing_company_name"
          name="billing_company_name"
          type="text"
          defaultValue={initial.billingCompanyName ?? ""}
          placeholder="เช่น บริษัท ดอปเรนท์ จำกัด"
          style={inputStyle}
          autoComplete="organization"
        />
      </div>

      <div style={fieldStyle}>
        <label htmlFor="billing_tax_id" style={labelStyle}>
          เลขประจำตัวผู้เสียภาษี{" "}
          <span style={{ fontWeight: 400, color: "var(--ink-3)", fontSize: 12 }}>
            (13 หลัก)
          </span>
        </label>
        <input
          id="billing_tax_id"
          name="billing_tax_id"
          type="text"
          defaultValue={initial.billingTaxId ?? ""}
          placeholder="เช่น 0105565123456"
          inputMode="numeric"
          maxLength={13}
          style={inputStyle}
          autoComplete="off"
        />
      </div>

      <div style={fieldStyle}>
        <label htmlFor="billing_address" style={labelStyle}>
          ที่อยู่สำหรับออกใบกำกับภาษี
        </label>
        <textarea
          id="billing_address"
          name="billing_address"
          defaultValue={initial.billingAddress ?? ""}
          placeholder="เช่น 123/4 ถ.สุขุมวิท แขวงคลองเตย เขตคลองเตย กรุงเทพฯ 10110"
          rows={3}
          style={{ ...inputStyle, resize: "vertical" }}
          autoComplete="street-address"
        />
      </div>

      <div style={fieldStyle}>
        <label htmlFor="billing_branch" style={labelStyle}>
          สาขา{" "}
          <span style={{ fontWeight: 400, color: "var(--ink-3)", fontSize: 12 }}>
            (ไม่บังคับ)
          </span>
        </label>
        <input
          id="billing_branch"
          name="billing_branch"
          type="text"
          defaultValue={initial.billingBranch ?? ""}
          placeholder="เช่น สำนักงานใหญ่ หรือ สาขา 00001"
          style={inputStyle}
          autoComplete="off"
        />
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="btn btn-dark"
        style={{ minWidth: 120 }}
      >
        {isPending ? "กำลังบันทึก…" : "บันทึก"}
      </button>
    </form>
  );
}
