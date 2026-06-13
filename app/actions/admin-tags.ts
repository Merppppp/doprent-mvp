"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth";
import { base, db } from "@/lib/db";
import { withActor } from "@/lib/db-context";

async function requireAdmin(): Promise<{ ok: true; userId: string } | { ok: false; error: string }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "ยังไม่ได้เข้าสู่ระบบ" };
  if (user.role !== "admin") return { ok: false, error: "ต้องเป็น admin" };
  return { ok: true, userId: user.id };
}

/** Write a business audit row (mirrors logAdminAction in admin.ts). */
async function logAdminTagAction(
  adminId: string,
  action: string,
  targetId: string | null,
  reason: string | null,
  payload?: Record<string, unknown>,
) {
  try {
    await base.auditLog.create({
      data: {
        action: "UPDATE",
        entityType: "tag_request",
        entityId: targetId,
        actorId: adminId,
        before: Prisma.JsonNull,
        after: {
          admin_action: action,
          reason: reason ?? null,
          ...payload,
        },
      },
    });
  } catch (e) {
    console.error("[admin audit] tag_request write failed", action, e);
  }
}

/** Slugify a Thai / mixed string to a lowercase latin key. */
function toSlug(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48)
    || `tag-${Date.now().toString(36)}`;
}

function revalidateTagRequestPaths() {
  revalidatePath("/admin/tag-requests");
  revalidatePath("/sell/products");
}

/**
 * Approve a tag request: create the Tag globally, update the request.
 * key precedence: provided key → request's requestedKey → slug(requestedLabel).
 * Fails gracefully if key already exists (returns Thai error).
 */
export async function approveTagRequest(
  requestId: string,
  overrideKey?: string,
): Promise<{ ok: boolean; error?: string }> {
  const auth = await requireAdmin();
  if (!auth.ok) return auth;

  const req = await db.tagRequest.findUnique({
    where: { id: requestId },
    include: { tagGroup: { select: { id: true, label: true } } },
  });
  if (!req) return { ok: false, error: "ไม่พบคำขอ" };
  if (req.status !== "pending") return { ok: false, error: "คำขอนี้ถูกตรวจสอบแล้ว" };

  // Determine key: override > requestedKey > slug(label)
  const candidateKey =
    (overrideKey?.trim() || req.requestedKey?.trim() || toSlug(req.requestedLabel));

  // Check key uniqueness
  const existingTag = await db.tag.findUnique({ where: { key: candidateKey } });
  if (existingTag) {
    return {
      ok: false,
      error: `มีแท็ก key "${candidateKey}" ในระบบแล้ว — กรุณาระบุ key ใหม่`,
    };
  }

  return withActor(auth.userId, async () => {
    // Create the Tag
    const newTag = await db.tag.create({
      data: {
        tagGroupId: req.tagGroupId,
        key: candidateKey,
        label: req.requestedLabel,
        isActive: true,
      },
      select: { id: true },
    });

    // Update the request
    await db.tagRequest.update({
      where: { id: requestId },
      data: {
        status: "approved",
        reviewerId: auth.userId,
        reviewedAt: new Date(),
        createdTagId: newTag.id,
      },
    });

    await logAdminTagAction(auth.userId, "approve_tag_request", requestId, null, {
      tagId: newTag.id,
      key: candidateKey,
      label: req.requestedLabel,
      groupId: req.tagGroupId,
      groupLabel: req.tagGroup.label,
    });

    revalidateTagRequestPaths();
    return { ok: true };
  });
}

/**
 * Reject a tag request. Reason is required (shown to seller in their panel).
 */
export async function rejectTagRequest(
  requestId: string,
  reason: string,
): Promise<{ ok: boolean; error?: string }> {
  const auth = await requireAdmin();
  if (!auth.ok) return auth;
  if (!reason.trim()) return { ok: false, error: "กรุณาระบุเหตุผลที่ตีกลับ" };

  const req = await db.tagRequest.findUnique({ where: { id: requestId } });
  if (!req) return { ok: false, error: "ไม่พบคำขอ" };
  if (req.status !== "pending") return { ok: false, error: "คำขอนี้ถูกตรวจสอบแล้ว" };

  return withActor(auth.userId, async () => {
    await db.tagRequest.update({
      where: { id: requestId },
      data: {
        status: "rejected",
        reviewerId: auth.userId,
        reviewNotes: reason.trim(),
        reviewedAt: new Date(),
      },
    });

    await logAdminTagAction(auth.userId, "reject_tag_request", requestId, reason, {
      label: req.requestedLabel,
      groupId: req.tagGroupId,
    });

    revalidateTagRequestPaths();
    return { ok: true };
  });
}
