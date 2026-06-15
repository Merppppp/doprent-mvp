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

async function logAdminTagGroupAction(
  adminId: string,
  action: string,
  targetId: string | null,
  payload?: Record<string, unknown>,
) {
  try {
    await base.auditLog.create({
      data: {
        action: "UPDATE",
        entityType: "product_type_tag_group",
        entityId: targetId,
        actorId: adminId,
        before: Prisma.JsonNull,
        after: {
          admin_action: action,
          ...payload,
        },
      },
    });
  } catch (e) {
    console.error("[admin audit] product_type_tag_group write failed", action, e);
  }
}

/** Bind a TagGroup to a ProductType. */
export async function bindTagGroup(params: {
  productTypeId: string;
  tagGroupId: string;
  sortOrder?: number;
  isRequired?: boolean;
  selectionMode?: "single" | "multi";
}): Promise<{ ok: boolean; error?: string }> {
  const auth = await requireAdmin();
  if (!auth.ok) return auth;

  const { productTypeId, tagGroupId, sortOrder = 0, isRequired = false, selectionMode = "multi" } = params;

  // Validate product type exists
  const pt = await db.productType.findUnique({ where: { id: productTypeId }, select: { id: true, label: true } });
  if (!pt) return { ok: false, error: "ไม่พบประเภทสินค้า" };

  // Validate tag group exists and is active
  const tg = await db.tagGroup.findUnique({ where: { id: tagGroupId }, select: { id: true, label: true, isActive: true } });
  if (!tg) return { ok: false, error: "ไม่พบกลุ่มแท็ก" };
  if (!tg.isActive) return { ok: false, error: "กลุ่มแท็กนี้ถูกปิดใช้งานอยู่" };

  return withActor(auth.userId, async () => {
    try {
      const binding = await db.productTypeTagGroup.create({
        data: {
          productTypeId,
          tagGroupId,
          sortOrder,
          isRequired,
          selectionMode,
          isActive: true,
        },
        select: { id: true },
      });

      await logAdminTagGroupAction(auth.userId, "bind_tag_group", binding.id, {
        productTypeId,
        productTypeLabel: pt.label,
        tagGroupId,
        tagGroupLabel: tg.label,
        sortOrder,
        isRequired,
        selectionMode,
      });

      revalidatePath("/admin/tag-groups");
      return { ok: true };
    } catch (e: unknown) {
      // Unique constraint violation (productTypeId + tagGroupId already exists)
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === "P2002"
      ) {
        return { ok: false, error: "ผูกกลุ่มนี้ไว้แล้ว" };
      }
      console.error("[bindTagGroup]", e);
      return { ok: false, error: "เกิดข้อผิดพลาด กรุณาลองใหม่" };
    }
  });
}

/** Update an existing binding's sortOrder, isRequired, selectionMode, or isActive. */
export async function updateBinding(
  id: string,
  patch: {
    sortOrder?: number;
    isRequired?: boolean;
    selectionMode?: "single" | "multi";
    isActive?: boolean;
  },
): Promise<{ ok: boolean; error?: string }> {
  const auth = await requireAdmin();
  if (!auth.ok) return auth;

  const binding = await db.productTypeTagGroup.findUnique({
    where: { id },
    include: {
      tagGroup: { select: { id: true, label: true, tags: { where: { isActive: true }, select: { id: true } } } },
      productType: { select: { label: true } },
    },
  });
  if (!binding) return { ok: false, error: "ไม่พบการผูก" };

  // Guard: if setting isRequired=true, ensure the group has at least 1 active tag
  if (patch.isRequired === true && binding.tagGroup.tags.length === 0) {
    return {
      ok: false,
      error: "กลุ่มนี้ยังไม่มีแท็กที่ใช้งานได้ ไม่สามารถตั้งเป็นจำเป็นได้",
    };
  }

  return withActor(auth.userId, async () => {
    await db.productTypeTagGroup.update({
      where: { id },
      data: patch,
    });

    await logAdminTagGroupAction(auth.userId, "update_binding", id, {
      patch,
      productTypeLabel: binding.productType.label,
      tagGroupLabel: binding.tagGroup.label,
    });

    revalidatePath("/admin/tag-groups");
    return { ok: true };
  });
}

/**
 * Unbind (delete) a ProductTypeTagGroup row.
 * NOTE: deleting a binding does NOT delete any ProductTag rows — products keep
 * their existing tags; the group simply stops appearing in the seller form for
 * that product type going forward.
 */
export async function unbindTagGroup(id: string): Promise<{ ok: boolean; error?: string }> {
  const auth = await requireAdmin();
  if (!auth.ok) return auth;

  const binding = await db.productTypeTagGroup.findUnique({
    where: { id },
    include: {
      productType: { select: { label: true } },
      tagGroup: { select: { label: true } },
    },
  });
  if (!binding) return { ok: false, error: "ไม่พบการผูก" };

  return withActor(auth.userId, async () => {
    await db.productTypeTagGroup.delete({ where: { id } });

    await logAdminTagGroupAction(auth.userId, "unbind_tag_group", id, {
      productTypeLabel: binding.productType.label,
      tagGroupLabel: binding.tagGroup.label,
    });

    revalidatePath("/admin/tag-groups");
    return { ok: true };
  });
}
