import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/db";

export type ShopAccessResult = {
  shopId: string;
  isOwner: boolean;
  staffId?: string;
  canManageBookings?: boolean;
  canManageProducts?: boolean;
};

/**
 * Central shop-access guard for seller dashboard pages and server actions.
 *
 * - Owner (role === "seller" with shop.ownerId === user.id) → full access.
 * - Staff (role === "staff") → access scoped to their shopId only.
 *   - need:"owner"    → always denied for staff.
 *   - need:"bookings" → requires canManageBookings.
 *   - need:"products" → requires canManageProducts.
 *
 * On failure: redirects (from page context) or throws (from action context).
 * Pass `{ action: true }` to throw an Error instead of redirect.
 */
export async function requireShopAccess(opts?: {
  need?: "bookings" | "products" | "owner";
  action?: boolean;
}): Promise<ShopAccessResult> {
  const session = await auth();
  const role = session?.user?.role;
  const userId = session?.user?.id;

  function deny(msg: string): never {
    if (opts?.action) throw new Error(msg);
    redirect("/login");
  }

  // ---- Staff principal ----
  if (role === "staff") {
    if (opts?.need === "owner") deny("ไม่มีสิทธิ์");

    const shopId = session!.user.shopId;
    const staffId = session!.user.staffId;
    const canManageBookings = session!.user.canManageBookings ?? false;
    const canManageProducts = session!.user.canManageProducts ?? false;

    if (!shopId || !staffId) deny("session ไม่ถูกต้อง");

    if (opts?.need === "bookings" && !canManageBookings) deny("ไม่มีสิทธิ์จัดการการจอง");
    if (opts?.need === "products" && !canManageProducts) deny("ไม่มีสิทธิ์จัดการสินค้า");

    return { shopId, isOwner: false, staffId, canManageBookings, canManageProducts };
  }

  // ---- Owner principal (seller or admin) ----
  if (!userId) deny("ยังไม่ได้เข้าสู่ระบบ");

  const shop = await db.shop.findFirst({
    where: { ownerId: userId },
    select: { id: true },
  });
  if (!shop) {
    if (opts?.action) throw new Error("ไม่พบร้าน");
    redirect("/sell/signup");
  }

  return { shopId: shop.id, isOwner: true };
}
