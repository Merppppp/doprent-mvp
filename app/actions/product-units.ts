"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { requireShopAccess } from "@/lib/shop-access";
import { db } from "@/lib/db";
import { withActor } from "@/lib/db-context";

type Result = { ok: true } | { ok: false; error: string };

/** Statuses a shop may set by hand. `rented` is system-managed (booking flow). */
const SETTABLE = new Set(["available", "repair", "retired"]);

/**
 * Flip a physical unit's status (available ⇄ repair ⇄ retired). Covers the
 * "mark this dress/size as under repair / not ready to rent" requirement.
 * Refuses to touch a unit that is currently `rented` (out with a customer) so
 * the seller can't desync a live rental.
 */
export async function setUnitStatus(
  unitId: string,
  status: "available" | "repair" | "retired",
  note?: string,
): Promise<Result> {
  if (!SETTABLE.has(status)) return { ok: false, error: "สถานะไม่ถูกต้อง" };
  const access = await requireShopAccess({ need: "products", action: true }).catch(() => null);
  if (!access) return { ok: false, error: "ไม่มีสิทธิ์จัดการสินค้า" };
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "ยังไม่ได้เข้าสู่ระบบ" };

  const unit = await db.productUnit.findUnique({
    where: { id: unitId },
    select: {
      id: true,
      status: true,
      variant: { select: { product: { select: { id: true, shopId: true } } } },
    },
  });
  if (!unit) return { ok: false, error: "ไม่พบหน่วยสินค้า" };
  if (unit.variant.product.shopId !== access.shopId)
    return { ok: false, error: "หน่วยสินค้านี้ไม่ใช่ของร้านคุณ" };
  if (unit.status === "rented")
    return { ok: false, error: "หน่วยนี้กำลังถูกเช่าอยู่ เปลี่ยนสถานะไม่ได้" };

  const trimmedNote = note?.trim() || null;
  await withActor(user.id, () =>
    db.productUnit.update({
      where: { id: unitId },
      data: { status, note: trimmedNote },
    }),
  );

  revalidatePath(`/sell/products/${unit.variant.product.id}/units`);
  return { ok: true };
}
