"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { withActor } from "@/lib/db-context";

/**
 * Seller submits a request to add a new tag inside an existing tag group.
 * The request enters the admin queue; admin creates the actual Tag on approve.
 * This action is independent of saving the product — it does NOT attach the tag.
 */
export async function requestTag(payload: {
  shopId: string;
  tagGroupId: string;
  requestedLabel: string;
  requestedKey?: string;
}): Promise<{ ok: boolean; error?: string }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "ยังไม่ได้เข้าสู่ระบบ" };

  const { shopId, tagGroupId, requestedKey } = payload;
  const label = payload.requestedLabel.trim();

  if (!label) return { ok: false, error: "กรุณาระบุชื่อแท็ก" };
  if (!tagGroupId) return { ok: false, error: "กรุณาเลือกกลุ่มแท็ก" };
  if (!shopId) return { ok: false, error: "ไม่พบร้าน" };

  // Ownership guard — user must own the shop
  const shop = await db.shop.findUnique({
    where: { id: shopId },
    select: { ownerId: true },
  });
  if (!shop || shop.ownerId !== user.id) {
    return { ok: false, error: "ไม่มีสิทธิ์ยื่นคำขอสำหรับร้านนี้" };
  }

  // Verify group exists and is active
  const group = await db.tagGroup.findUnique({
    where: { id: tagGroupId, isActive: true },
    select: { id: true },
  });
  if (!group) return { ok: false, error: "ไม่พบกลุ่มแท็กที่เลือก" };

  // Reject duplicate: same pending label in same group for same shop (case-insensitive)
  const existing = await db.tagRequest.findFirst({
    where: {
      shopId,
      tagGroupId,
      status: "pending",
      requestedLabel: { equals: label, mode: "insensitive" },
    },
  });
  if (existing) return { ok: false, error: "คุณมีคำขอแท็กชื่อนี้รออยู่แล้ว" };

  const key = requestedKey?.trim() || null;

  return withActor(user.id, async () => {
    await db.tagRequest.create({
      data: {
        tagGroupId,
        shopId,
        requestedLabel: label,
        requestedKey: key,
        status: "pending",
      },
    });
    revalidatePath("/sell/products");
    return { ok: true };
  });
}
