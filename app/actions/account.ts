"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { withActor } from "@/lib/db-context";

type Result<T = unknown> =
  | ({ ok: true } & T)
  | { ok: false; error: string };

/**
 * updateBillingProfile — บันทึกข้อมูลสำหรับออกใบกำกับภาษีของผู้เช่า
 *
 * ทุก field เป็น optional (nullable) — ส่งเปล่าหรือไม่ส่งได้
 * Ownership guard: อัปเดตเฉพาะ row ของ user ที่ login อยู่เท่านั้น
 */
export async function updateBillingProfile(formData: FormData): Promise<Result> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "ยังไม่ได้เข้าสู่ระบบ" };

  const billingCompanyName =
    String(formData.get("billing_company_name") ?? "").trim() || null;
  const billingTaxIdRaw =
    String(formData.get("billing_tax_id") ?? "").trim();
  const billingAddress =
    String(formData.get("billing_address") ?? "").trim() || null;
  const billingBranch =
    String(formData.get("billing_branch") ?? "").trim() || null;

  // Validate tax id only when provided — must be exactly 13 digits
  const billingTaxId = billingTaxIdRaw || null;
  if (billingTaxId && !/^[0-9]{13}$/.test(billingTaxId)) {
    return {
      ok: false,
      error: "เลขประจำตัวผู้เสียภาษีต้องเป็นตัวเลข 13 หลัก",
    };
  }

  return withActor(user.id, async () => {
    await db.user.update({
      where: { id: user.id },
      data: {
        billingCompanyName,
        billingTaxId,
        billingAddress,
        billingBranch,
      },
    });

    revalidatePath("/account/billing");
    return { ok: true };
  });
}
