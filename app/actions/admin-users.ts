"use server";

import { revalidatePath } from "next/cache";
import { Prisma, type Role } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth";
import { base, db } from "@/lib/db";
import { withActor } from "@/lib/db-context";

const VALID_ROLES: Role[] = ["customer", "seller", "admin"];

async function requireAdmin(): Promise<{ ok: true; userId: string } | { ok: false; error: string }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "ยังไม่ได้เข้าสู่ระบบ" };
  if (user.role !== "admin") return { ok: false, error: "ต้องเป็น admin" };
  return { ok: true, userId: user.id };
}

async function logAdminAction(
  adminId: string,
  action: string,
  targetId: string,
  reason: string | null,
  payload?: Record<string, unknown>,
) {
  try {
    await base.auditLog.create({
      data: {
        action: "UPDATE",
        entityType: "user",
        entityId: targetId,
        actorId: adminId,
        before: Prisma.JsonNull,
        after: { admin_action: action, reason: reason ?? null, ...payload },
      },
    });
  } catch (e) {
    console.error("[admin-users audit] write failed", action, e);
  }
}

/** Change a user's role. Admins cannot change their own role (anti self-lockout). */
export async function changeUserRole(
  userId: string,
  role: Role,
): Promise<{ ok: boolean; error?: string }> {
  const auth = await requireAdmin();
  if (!auth.ok) return auth;

  if (!VALID_ROLES.includes(role)) return { ok: false, error: "role ไม่ถูกต้อง" };
  if (userId === auth.userId) return { ok: false, error: "เปลี่ยน role ของตัวเองไม่ได้" };

  const target = await db.user.findUnique({ where: { id: userId }, select: { role: true } });
  if (!target) return { ok: false, error: "ไม่พบผู้ใช้" };
  if (target.role === role) return { ok: true };

  return withActor(auth.userId, async () => {
    await db.user.update({ where: { id: userId }, data: { role } });
    await logAdminAction(auth.userId, "change_role", userId, null, { from: target.role, to: role });
    revalidatePath("/admin/users");
    return { ok: true };
  });
}

/**
 * Suspend or un-suspend a user account. Suspended users are treated as
 * logged-out everywhere (see getCurrentUser). Admins cannot suspend themselves.
 */
export async function setUserSuspension(
  userId: string,
  suspend: boolean,
  reason?: string,
): Promise<{ ok: boolean; error?: string }> {
  const auth = await requireAdmin();
  if (!auth.ok) return auth;

  if (userId === auth.userId) return { ok: false, error: "ระงับบัญชีตัวเองไม่ได้" };

  const target = await db.user.findUnique({ where: { id: userId }, select: { suspendedAt: true } });
  if (!target) return { ok: false, error: "ไม่พบผู้ใช้" };

  return withActor(auth.userId, async () => {
    await db.user.update({
      where: { id: userId },
      data: {
        suspendedAt: suspend ? new Date() : null,
        suspendedReason: suspend ? (reason?.trim() || null) : null,
      },
    });
    await logAdminAction(auth.userId, suspend ? "suspend_user" : "unsuspend_user", userId, reason ?? null);
    revalidatePath("/admin/users");
    return { ok: true };
  });
}
