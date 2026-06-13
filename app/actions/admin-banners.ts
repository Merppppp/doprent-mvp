"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { withActor } from "@/lib/db-context";

async function requireAdmin(): Promise<{ ok: true; userId: string } | { ok: false; error: string }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "ยังไม่ได้เข้าสู่ระบบ" };
  if (user.role !== "admin") return { ok: false, error: "ต้องเป็น admin" };
  return { ok: true, userId: user.id };
}

function revalidateBannerPaths() {
  revalidatePath("/admin/banners");
  revalidatePath("/");
}

export async function createBanner(formData: FormData): Promise<{ ok: boolean; error?: string }> {
  const auth = await requireAdmin();
  if (!auth.ok) return auth;

  const title = formData.get("title")?.toString().trim();
  const imageUrl = formData.get("imageUrl")?.toString().trim();
  if (!title) return { ok: false, error: "กรุณาระบุชื่อแบนเนอร์" };
  if (!imageUrl) return { ok: false, error: "กรุณาระบุ URL รูปภาพ" };

  const linkUrl = formData.get("linkUrl")?.toString().trim() || null;
  const sortOrder = parseInt(formData.get("sortOrder")?.toString() ?? "0") || 0;
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
          sortOrder,
          isActive,
          startsAt: startsAtRaw ? new Date(startsAtRaw) : null,
          endsAt: endsAtRaw ? new Date(endsAtRaw) : null,
        },
      })
    );
    revalidateBannerPaths();
    return { ok: true };
  } catch (e) {
    console.error("[admin-banners] createBanner", e);
    return { ok: false, error: "บันทึกไม่สำเร็จ กรุณาลองใหม่" };
  }
}

export async function updateBanner(id: string, formData: FormData): Promise<{ ok: boolean; error?: string }> {
  const auth = await requireAdmin();
  if (!auth.ok) return auth;

  const title = formData.get("title")?.toString().trim();
  const imageUrl = formData.get("imageUrl")?.toString().trim();
  if (!title) return { ok: false, error: "กรุณาระบุชื่อแบนเนอร์" };
  if (!imageUrl) return { ok: false, error: "กรุณาระบุ URL รูปภาพ" };

  const linkUrl = formData.get("linkUrl")?.toString().trim() || null;
  const sortOrder = parseInt(formData.get("sortOrder")?.toString() ?? "0") || 0;
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
          sortOrder,
          isActive,
          startsAt: startsAtRaw ? new Date(startsAtRaw) : null,
          endsAt: endsAtRaw ? new Date(endsAtRaw) : null,
        },
      })
    );
    revalidateBannerPaths();
    return { ok: true };
  } catch (e) {
    console.error("[admin-banners] updateBanner", e);
    return { ok: false, error: "บันทึกไม่สำเร็จ กรุณาลองใหม่" };
  }
}

export async function deleteBanner(id: string): Promise<{ ok: boolean; error?: string }> {
  const auth = await requireAdmin();
  if (!auth.ok) return auth;

  try {
    await withActor(auth.userId, () =>
      db.banner.delete({ where: { id } })
    );
    revalidateBannerPaths();
    return { ok: true };
  } catch (e) {
    console.error("[admin-banners] deleteBanner", e);
    return { ok: false, error: "ลบไม่สำเร็จ กรุณาลองใหม่" };
  }
}

export async function toggleBannerActive(id: string, isActive: boolean): Promise<{ ok: boolean; error?: string }> {
  const auth = await requireAdmin();
  if (!auth.ok) return auth;

  try {
    await withActor(auth.userId, () =>
      db.banner.update({ where: { id }, data: { isActive } })
    );
    revalidateBannerPaths();
    return { ok: true };
  } catch (e) {
    console.error("[admin-banners] toggleBannerActive", e);
    return { ok: false, error: "เปลี่ยนสถานะไม่สำเร็จ" };
  }
}
