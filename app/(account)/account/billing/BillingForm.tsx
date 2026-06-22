"use client";

import { useState, useTransition } from "react";
import { updateBillingProfile } from "@/app/actions/account";

export type BillingValues = {
  billingCompanyName: string | null;
  billingTaxId: string | null;
  billingAddress: string | null;
  billingBranch: string | null;
};

export default function BillingForm({ initial }: { initial: BillingValues }) {
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

  const inputClassName = "w-full rounded-lg border border-line bg-bg px-3 py-2.5 text-[15px] text-ink outline-none transition placeholder:text-ink-3 focus:border-accent focus:ring-2 focus:ring-accent-soft";

  return (
    <form onSubmit={handleSubmit} noValidate className="px-5 py-5">
      {message && (
        <div
          role="status"
          className={`mb-5 rounded-lg border px-3.5 py-2.5 text-sm ${message.ok ? "border-success/25 bg-success-soft text-success" : "border-danger/25 bg-danger-soft text-danger"}`}
        >
          {message.text}
        </div>
      )}

      <div className="space-y-5">
        <div>
          <label htmlFor="billing_company_name" className="mb-1.5 block text-[13px] font-medium text-ink-2">
            ชื่อบริษัท / นิติบุคคล
          </label>
          <input
            id="billing_company_name"
            name="billing_company_name"
            type="text"
            defaultValue={initial.billingCompanyName ?? ""}
            placeholder="เช่น บริษัท ดอปเรนท์ จำกัด"
            className={inputClassName}
            autoComplete="organization"
          />
        </div>

        <div className="grid gap-5 sm:grid-cols-[minmax(0,1fr)_minmax(0,0.8fr)]">
          <div>
            <label htmlFor="billing_tax_id" className="mb-1.5 block text-[13px] font-medium text-ink-2">
              เลขประจำตัวผู้เสียภาษี <span className="font-normal text-ink-3">(13 หลัก)</span>
            </label>
            <input
              id="billing_tax_id"
              name="billing_tax_id"
              type="text"
              defaultValue={initial.billingTaxId ?? ""}
              placeholder="เช่น 0105565123456"
              inputMode="numeric"
              maxLength={13}
              className={inputClassName}
              autoComplete="off"
            />
          </div>

          <div>
            <label htmlFor="billing_branch" className="mb-1.5 block text-[13px] font-medium text-ink-2">
              สาขา <span className="font-normal text-ink-3">(ไม่บังคับ)</span>
            </label>
            <input
              id="billing_branch"
              name="billing_branch"
              type="text"
              defaultValue={initial.billingBranch ?? ""}
              placeholder="สำนักงานใหญ่"
              className={inputClassName}
              autoComplete="off"
            />
          </div>
        </div>

        <div>
          <label htmlFor="billing_address" className="mb-1.5 block text-[13px] font-medium text-ink-2">
            ที่อยู่สำหรับออกใบกำกับภาษี
          </label>
          <textarea
            id="billing_address"
            name="billing_address"
            defaultValue={initial.billingAddress ?? ""}
            placeholder="เช่น 123/4 ถ.สุขุมวิท แขวงคลองเตย เขตคลองเตย กรุงเทพฯ 10110"
            rows={3}
            className={`${inputClassName} resize-y leading-6`}
            autoComplete="street-address"
          />
        </div>
      </div>

      <div className="mt-6 flex items-center justify-between gap-3 border-t border-line pt-4">
        <p className="text-xs text-ink-3">คุณสามารถแก้ไขข้อมูลนี้ได้ทุกเมื่อ</p>
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex min-w-[120px] items-center justify-center rounded-lg bg-ink px-4 py-2.5 text-sm font-medium text-on-dark transition hover:-translate-y-px hover:bg-[oklch(0.32_0.014_85)] hover:shadow-[var(--shadow-2)] disabled:cursor-wait disabled:opacity-60"
        >
          {isPending ? "กำลังบันทึก…" : "บันทึกข้อมูล"}
        </button>
      </div>
    </form>
  );
}
