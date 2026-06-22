import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import BillingForm, { type BillingValues } from "./BillingForm";

export const metadata: Metadata = {
  title: "ข้อมูลใบกำกับภาษี",
  robots: { index: false },
};

export const dynamic = "force-dynamic";

export default async function BillingPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect(`/login?next=${encodeURIComponent("/account/billing")}`);
  }

  const dbUser = await db.user.findUnique({
    where: { id: user.id },
    select: {
      billingCompanyName: true,
      billingTaxId: true,
      billingAddress: true,
      billingBranch: true,
    },
  });

  const initial: BillingValues = {
    billingCompanyName: dbUser?.billingCompanyName ?? null,
    billingTaxId: dbUser?.billingTaxId ?? null,
    billingAddress: dbUser?.billingAddress ?? null,
    billingBranch: dbUser?.billingBranch ?? null,
  };

  return (
    <div className="max-w-[560px]">
      <div className="mb-6 max-[900px]:pr-12">
        <p className="mb-1 text-xs font-medium uppercase tracking-[0.12em] text-accent">บัญชีของฉัน</p>
        <h1 className="text-[22px] font-semibold tracking-[-0.01em]">ข้อมูลใบกำกับภาษี</h1>
        <p className="mt-2 text-sm leading-6 text-ink-3">
          ใช้สำหรับออกใบกำกับภาษีในนามบริษัทหรือนิติบุคคล
          ข้อมูลทุกช่องสามารถเว้นว่างไว้ได้
        </p>
      </div>

      <section className="overflow-hidden rounded-xl border border-line bg-surface">
        <div className="flex items-start gap-3 border-b border-line px-5 py-4">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent">
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
              <path d="M5 3h10l4 4v14H5z" />
              <path d="M15 3v5h5M8 13h8M8 17h6" />
            </svg>
          </div>
          <div>
            <h2 className="text-sm font-semibold text-ink">รายละเอียดผู้เสียภาษี</h2>
            <p className="mt-0.5 text-xs leading-5 text-ink-3">ข้อมูลนี้จะถูกใช้กับใบกำกับภาษีรายการถัดไป</p>
          </div>
        </div>
        <BillingForm initial={initial} />
      </section>

      <div className="mt-4 flex gap-2.5 rounded-lg border border-line bg-bg px-4 py-3 text-xs leading-5 text-ink-2">
        <svg className="mt-0.5 shrink-0 text-ink-3" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          <path d="M9 12l2 2 4-4" />
        </svg>
        <p>ข้อมูลจะถูกเก็บไว้ในบัญชีของคุณและใช้เฉพาะสำหรับการออกใบกำกับภาษี</p>
      </div>
    </div>
  );
}
