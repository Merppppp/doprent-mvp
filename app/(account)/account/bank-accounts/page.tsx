import { redirect } from "next/navigation";
import type { Metadata } from "next";
import BankAccountManager from "@/components/BankAccountManager";
import { getCurrentUser } from "@/lib/auth";
import { getMyBankAccounts } from "@/lib/booking-queries";

export const metadata: Metadata = { title: "บัญชีธนาคาร", robots: { index: false } };

export const dynamic = "force-dynamic";

export default async function BankAccountsPage() {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent("/account/bank-accounts")}`);

  const bankAccounts = await getMyBankAccounts();

  return (
    <>
      <h1 className="text-[22px] font-semibold tracking-tight mb-1">
        บัญชีธนาคาร
      </h1>
      <p className="text-sm text-[var(--ink-3)] mb-4">
        จัดการบัญชีธนาคารสำหรับรับเงินคืนมัดจำ · บัญชีเริ่มต้นจะถูกเลือกให้อัตโนมัติ
      </p>
      <BankAccountManager bankAccounts={bankAccounts} />
    </>
  );
}
