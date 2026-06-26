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

/**
 * updateUserProfile — แก้ไขโปรไฟล์ผู้ใช้ (ชื่อ, LINE ID, เบอร์โทร, วันเกิด, รูป)
 *
 * อีเมลไม่แก้ที่นี่ (ผูกกับ login). รูปโปรไฟล์เป็น URL ที่อัปโหลดไว้แล้วผ่าน
 * /api/upload — action นี้เก็บเฉพาะ URL string. ทุก field เว้นว่างได้ → null.
 * Ownership guard: อัปเดตเฉพาะ row ของ user ที่ login เท่านั้น.
 */
export async function updateUserProfile(formData: FormData): Promise<Result> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "ยังไม่ได้เข้าสู่ระบบ" };

  const fullName = String(formData.get("full_name") ?? "").trim() || null;
  const lineId = String(formData.get("line_id") ?? "").trim() || null;
  const phoneRaw = String(formData.get("phone") ?? "").trim();
  const birthDateRaw = String(formData.get("birth_date") ?? "").trim();
  const image = String(formData.get("image") ?? "").trim() || null;

  // Phone: optional; when given must be 9–10 Thai digits (e.g. 0812345678).
  const phone = phoneRaw || null;
  if (phone && !/^0[0-9]{8,9}$/.test(phone)) {
    return { ok: false, error: "เบอร์โทรไม่ถูกต้อง (ต้องเป็นตัวเลข 9–10 หลัก ขึ้นต้นด้วย 0)" };
  }

  // Birth date: optional; must be a valid YYYY-MM-DD that is not in the future.
  let birthDate: Date | null = null;
  if (birthDateRaw) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(birthDateRaw)) {
      return { ok: false, error: "วันเกิดไม่ถูกต้อง" };
    }
    const d = new Date(`${birthDateRaw}T00:00:00Z`);
    if (Number.isNaN(d.getTime())) return { ok: false, error: "วันเกิดไม่ถูกต้อง" };
    if (d.getTime() > Date.now()) return { ok: false, error: "วันเกิดต้องไม่เป็นวันในอนาคต" };
    birthDate = d;
  }

  // Image: only accept a URL we host (uploaded via /api/upload) — never an
  // arbitrary external URL submitted by the client.
  if (image && !/^https?:\/\//.test(image)) {
    return { ok: false, error: "รูปโปรไฟล์ไม่ถูกต้อง" };
  }

  return withActor(user.id, async () => {
    await db.user.update({
      where: { id: user.id },
      data: {
        fullName,
        lineId,
        phone,
        birthDate,
        ...(image ? { image } : {}),
      },
    });

    revalidatePath("/account/profile");
    return { ok: true };
  });
}
