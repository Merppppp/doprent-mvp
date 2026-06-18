import { redirect } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
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
    <div className="container" style={{ padding: "28px 0 80px" }}>
      <div style={{ marginBottom: 20 }}>
        <Link
          href="/account"
          style={{ fontSize: 13, color: "var(--ink-3)", textDecoration: "none" }}
        >
          ← บัญชีของฉัน
        </Link>
      </div>

      <div
        style={{
          maxWidth: 560,
          background: "var(--surface)",
          border: "1px solid var(--line)",
          borderRadius: 8,
          padding: "24px 28px",
        }}
      >
        <h1
          style={{
            fontSize: 20,
            fontWeight: 700,
            letterSpacing: "-0.01em",
            marginBottom: 4,
          }}
        >
          ข้อมูลสำหรับออกใบกำกับภาษี (ไม่บังคับ)
        </h1>
        <p
          style={{
            fontSize: 13,
            color: "var(--ink-3)",
            marginBottom: 24,
            lineHeight: 1.5,
          }}
        >
          กรอกข้อมูลด้านล่างหากต้องการใบกำกับภาษีในนามบริษัท / นิติบุคคล
          — เว้นว่างไว้ได้ทั้งหมด
        </p>

        <BillingForm initial={initial} />
      </div>
    </div>
  );
}
