"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { withActor } from "@/lib/db-context";

type Result<T = void> = { ok: true; data?: T } | { ok: false; error: string };

/** Get the current session's shop owner context. Returns null if not authorized. */
async function getOwnerContext(): Promise<{ userId: string; shopId: string } | null> {
  const session = await auth();
  if (!session?.user?.id || session.user.role === "staff") return null;
  const userId = session.user.id;
  const shop = await db.shop.findFirst({ where: { ownerId: userId }, select: { id: true } });
  if (!shop) return null;
  return { userId, shopId: shop.id };
}

/** List all staff for the owner's shop. */
export async function listShopStaff(): Promise<Result<{
  id: string;
  username: string;
  displayName: string;
  canManageBookings: boolean;
  canManageProducts: boolean;
  isActive: boolean;
  lastLoginAt: Date | null;
}[]>> {
  const ctx = await getOwnerContext();
  if (!ctx) return { ok: false, error: "ไม่มีสิทธิ์" };

  const staff = await db.shopStaff.findMany({
    where: { shopId: ctx.shopId },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      username: true,
      displayName: true,
      canManageBookings: true,
      canManageProducts: true,
      isActive: true,
      lastLoginAt: true,
    },
  });

  return { ok: true, data: staff };
}

/** Create a new staff member. */
export async function createStaff(formData: FormData): Promise<Result<{ id: string }>> {
  const ctx = await getOwnerContext();
  if (!ctx) return { ok: false, error: "ไม่มีสิทธิ์" };

  const username = String(formData.get("username") ?? "").trim().toLowerCase();
  const displayName = String(formData.get("display_name") ?? "").trim();
  const pin = String(formData.get("pin") ?? "").trim();
  const canManageBookings = formData.get("can_manage_bookings") === "true";
  const canManageProducts = formData.get("can_manage_products") === "true";

  if (!username) return { ok: false, error: "กรุณาใส่ชื่อผู้ใช้" };
  if (!/^[a-z0-9._-]{3,32}$/.test(username)) {
    return { ok: false, error: "ชื่อผู้ใช้ต้องเป็นตัวอักษรภาษาอังกฤษ/ตัวเลข 3-32 ตัว" };
  }
  if (!displayName) return { ok: false, error: "กรุณาใส่ชื่อที่แสดง" };
  if (!/^\d{6,8}$/.test(pin)) return { ok: false, error: "PIN ต้องเป็นตัวเลข 6-8 หลัก" };

  // Check username uniqueness
  const existing = await db.shopStaff.findUnique({ where: { username }, select: { id: true } });
  if (existing) return { ok: false, error: `ชื่อผู้ใช้ "${username}" ถูกใช้แล้ว กรุณาเลือกชื่ออื่น` };

  const pinHash = await bcrypt.hash(pin, 12);

  return withActor(ctx.userId, async () => {
    const created = await db.shopStaff.create({
      data: {
        shopId: ctx.shopId,
        username,
        displayName,
        pinHash,
        canManageBookings,
        canManageProducts,
        isActive: true,
      },
      select: { id: true },
    });

    revalidatePath("/sell/staff");
    return { ok: true, data: { id: created.id } };
  });
}

/** Reset a staff member's PIN (owner-only). */
export async function resetStaffPin(staffId: string, formData: FormData): Promise<Result> {
  const ctx = await getOwnerContext();
  if (!ctx) return { ok: false, error: "ไม่มีสิทธิ์" };

  const pin = String(formData.get("pin") ?? "").trim();
  if (!/^\d{6,8}$/.test(pin)) return { ok: false, error: "PIN ต้องเป็นตัวเลข 6-8 หลัก" };

  const staff = await db.shopStaff.findUnique({ where: { id: staffId }, select: { shopId: true } });
  if (!staff || staff.shopId !== ctx.shopId) return { ok: false, error: "ไม่พบพนักงาน" };

  const pinHash = await bcrypt.hash(pin, 12);

  return withActor(ctx.userId, async () => {
    await db.shopStaff.update({
      where: { id: staffId },
      data: { pinHash, failedAttempts: 0, lockedUntil: null },
    });
    revalidatePath("/sell/staff");
    return { ok: true };
  });
}

/** Toggle staff active status (soft enable/disable). */
export async function toggleStaffActive(staffId: string): Promise<Result> {
  const ctx = await getOwnerContext();
  if (!ctx) return { ok: false, error: "ไม่มีสิทธิ์" };

  const staff = await db.shopStaff.findUnique({
    where: { id: staffId },
    select: { shopId: true, isActive: true },
  });
  if (!staff || staff.shopId !== ctx.shopId) return { ok: false, error: "ไม่พบพนักงาน" };

  return withActor(ctx.userId, async () => {
    await db.shopStaff.update({
      where: { id: staffId },
      data: { isActive: !staff.isActive },
    });
    revalidatePath("/sell/staff");
    return { ok: true };
  });
}

/** Update staff permission flags. */
export async function updateStaffPermissions(staffId: string, formData: FormData): Promise<Result> {
  const ctx = await getOwnerContext();
  if (!ctx) return { ok: false, error: "ไม่มีสิทธิ์" };

  const staff = await db.shopStaff.findUnique({ where: { id: staffId }, select: { shopId: true } });
  if (!staff || staff.shopId !== ctx.shopId) return { ok: false, error: "ไม่พบพนักงาน" };

  const canManageBookings = formData.get("can_manage_bookings") === "true";
  const canManageProducts = formData.get("can_manage_products") === "true";

  return withActor(ctx.userId, async () => {
    await db.shopStaff.update({
      where: { id: staffId },
      data: { canManageBookings, canManageProducts },
    });
    revalidatePath("/sell/staff");
    return { ok: true };
  });
}

/** Soft-remove a staff member (set isActive = false, conceptually "removed"). */
export async function removeStaff(staffId: string): Promise<Result> {
  const ctx = await getOwnerContext();
  if (!ctx) return { ok: false, error: "ไม่มีสิทธิ์" };

  const staff = await db.shopStaff.findUnique({ where: { id: staffId }, select: { shopId: true } });
  if (!staff || staff.shopId !== ctx.shopId) return { ok: false, error: "ไม่พบพนักงาน" };

  return withActor(ctx.userId, async () => {
    await db.shopStaff.update({
      where: { id: staffId },
      data: { isActive: false },
    });
    revalidatePath("/sell/staff");
    return { ok: true };
  });
}
