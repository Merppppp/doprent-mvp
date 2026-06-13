"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { withActor } from "@/lib/db-context";
import { BANNER_ELIGIBLE_TIERS } from "@/lib/banner-tiers";

/** Auth helper: returns logged-in user's shop. Does NOT check tier. */
async function requireSellerShop(): Promise<
  | { ok: true; userId: string; shopId: string; adsTier: string }
  | { ok: false; error: string }
> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "ยังไม่ได้เข้าสู่ระบบ" };

  const shop = await db.shop.findFirst({
    where: { ownerId: user.id },
    select: { id: true, adsTier: true },
  });
  if (!shop) return { ok: false, error: "ไม่พบร้าน" };

  return { ok: true, userId: user.id, shopId: shop.id, adsTier: shop.adsTier };
}

function revalidateShopBannerPaths() {
  revalidatePath("/sell/banners");
  revalidatePath("/admin/banners");
  revalidatePath("/");
}

// ---------------------------------------------------------------------------
// createShopBanner — gated by adsTier; status always starts 'pending'
// ---------------------------------------------------------------------------
export async function createShopBanner(
  formData: FormData
): Promise<{ ok: boolean; error?: string }> {
  const auth = await requireSellerShop();
  if (!auth.ok) return auth;

  // Tier gate — 'free' cannot create banners
  if (!(BANNER_ELIGIBLE_TIERS as readonly string[]).includes(auth.adsTier)) {
    return {
      ok: false,
      error: "อัปเกรดแพ็กเกจโฆษณาเพื่อสร้างแบนเนอร์ร้าน",
    };
  }

  const title = formData.get("title")?.toString().trim();
  const imageUrl = formData.get("imageUrl")?.toString().trim();
  if (!title) return { ok: false, error: "กรุณาระบุชื่อแบนเนอร์" };
  if (!imageUrl) return { ok: false, error: "กรุณาระบุ URL รูปภาพ" };

  const linkUrl = formData.get("linkUrl")?.toString().trim() || null;
  const isActive = formData.get("isActive") === "true";
  const startsAtRaw = formData.get("startsAt")?.toString().trim() || null;
  const endsAtRaw = formData.get("endsAt")?.toString().trim() || null;

  try {
    await withActor(auth.userId, () =>
      db.banner.create({
        data: {
          title,
          imageUrl,
          linkUrl,
          sortOrder: 0,
          isActive,
          status: "pending", // seller banners always start pending
          shopId: auth.shopId,
          startsAt: startsAtRaw ? new Date(startsAtRaw) : null,
          endsAt: endsAtRaw ? new Date(endsAtRaw) : null,
        },
      })
    );
    revalidateShopBannerPaths();
    return { ok: true };
  } catch (e) {
    console.error("[seller-banners] createShopBanner", e);
    return { ok: false, error: "บันทึกไม่สำเร็จ กรุณาลองใหม่" };
  }
}

// ---------------------------------------------------------------------------
// updateShopBanner — ownership guard; status reset to 'pending' on edit
// ---------------------------------------------------------------------------
export async function updateShopBanner(
  id: string,
  formData: FormData
): Promise<{ ok: boolean; error?: string }> {
  const auth = await requireSellerShop();
  if (!auth.ok) return auth;

  // Ownership guard
  const banner = await db.banner.findUnique({
    where: { id },
    select: { shopId: true },
  });
  if (!banner || banner.shopId !== auth.shopId) {
    return { ok: false, error: "ไม่มีสิทธิ์แก้ไขแบนเนอร์นี้" };
  }

  const title = formData.get("title")?.toString().trim();
  const imageUrl = formData.get("imageUrl")?.toString().trim();
  if (!title) return { ok: false, error: "กรุณาระบุชื่อแบนเนอร์" };
  if (!imageUrl) return { ok: false, error: "กรุณาระบุ URL รูปภาพ" };

  const linkUrl = formData.get("linkUrl")?.toString().trim() || null;
  const isActive = formData.get("isActive") === "true";
  const startsAtRaw = formData.get("startsAt")?.toString().trim() || null;
  const endsAtRaw = formData.get("endsAt")?.toString().trim() || null;

  try {
    await withActor(auth.userId, () =>
      db.banner.update({
        where: { id },
        data: {
          title,
          imageUrl,
          linkUrl,
          isActive,
          status: "pending", // reset to pending on edit — admin re-reviews
          startsAt: startsAtRaw ? new Date(startsAtRaw) : null,
          endsAt: endsAtRaw ? new Date(endsAtRaw) : null,
        },
      })
    );
    revalidateShopBannerPaths();
    return { ok: true };
  } catch (e) {
    console.error("[seller-banners] updateShopBanner", e);
    return { ok: false, error: "บันทึกไม่สำเร็จ กรุณาลองใหม่" };
  }
}

// ---------------------------------------------------------------------------
// deleteShopBanner — ownership guard only (no tier check — allow downgraded sellers to clean up)
// ---------------------------------------------------------------------------
export async function deleteShopBanner(
  id: string
): Promise<{ ok: boolean; error?: string }> {
  const auth = await requireSellerShop();
  if (!auth.ok) return auth;

  const banner = await db.banner.findUnique({
    where: { id },
    select: { shopId: true },
  });
  if (!banner || banner.shopId !== auth.shopId) {
    return { ok: false, error: "ไม่มีสิทธิ์ลบแบนเนอร์นี้" };
  }

  try {
    await withActor(auth.userId, () =>
      db.banner.delete({ where: { id } })
    );
    revalidateShopBannerPaths();
    return { ok: true };
  } catch (e) {
    console.error("[seller-banners] deleteShopBanner", e);
    return { ok: false, error: "ลบไม่สำเร็จ กรุณาลองใหม่" };
  }
}
