"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { withActor } from "@/lib/db-context";

async function verifyProductOwner(productId: string): Promise<{ ok: boolean; error?: string; userId?: string }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "ยังไม่ได้เข้าสู่ระบบ" };

  const product = await db.product.findUnique({
    where: { id: productId },
    include: { shop: { select: { ownerId: true } } },
  });
  if (!product || product.shop.ownerId !== user.id) {
    return { ok: false, error: "ไม่มีสิทธิ์แก้ปฏิทินของสินค้านี้" };
  }
  return { ok: true, userId: user.id };
}

export async function toggleBlackout(
  productId: string,
  date: string,
): Promise<{ ok: boolean; blocked: boolean; error?: string }> {
  const owner = await verifyProductOwner(productId);
  if (!owner.ok) return { ok: false, blocked: false, error: owner.error };

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return { ok: false, blocked: false, error: "รูปแบบวันที่ไม่ถูกต้อง" };
  }

  const dateObj = new Date(date);
  const existing = await db.productBlackoutDate.findUnique({
    where: { productId_date: { productId, date: dateObj } },
  });

  return withActor(owner.userId, async () => {
    if (existing) {
      await db.productBlackoutDate.delete({ where: { productId_date: { productId, date: dateObj } } });
      revalidatePath(`/product/${productId}`);
      return { ok: true, blocked: false };
    } else {
      await db.productBlackoutDate.create({ data: { productId, date: dateObj } });
      revalidatePath(`/product/${productId}`);
      return { ok: true, blocked: true };
    }
  });
}

export async function setBlackouts(
  productId: string,
  dates: string[],
): Promise<{ ok: boolean; error?: string }> {
  const owner = await verifyProductOwner(productId);
  if (!owner.ok) return owner;

  const validDates = dates.filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d));
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return withActor(owner.userId, async () => {
    await db.productBlackoutDate.deleteMany({ where: { productId, date: { gte: today } } });

    if (validDates.length > 0) {
      await db.productBlackoutDate.createMany({
        data: validDates.map((d) => ({ productId, date: new Date(d) })),
        skipDuplicates: true,
      });
    }

    revalidatePath(`/product/${productId}`);
    return { ok: true };
  });
}
