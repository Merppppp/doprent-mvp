"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";

async function verifyDressOwner(dressId: string): Promise<{ ok: boolean; error?: string }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "ยังไม่ได้เข้าสู่ระบบ" };

  const dress = await db.dress.findUnique({
    where: { id: dressId },
    include: { boutique: { select: { ownerId: true } } },
  });
  if (!dress || dress.boutique.ownerId !== user.id) {
    return { ok: false, error: "ไม่มีสิทธิ์แก้ปฏิทินของชุดนี้" };
  }
  return { ok: true };
}

export async function toggleBlackout(
  dressId: string,
  date: string,
): Promise<{ ok: boolean; blocked: boolean; error?: string }> {
  const owner = await verifyDressOwner(dressId);
  if (!owner.ok) return { ok: false, blocked: false, error: owner.error };

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return { ok: false, blocked: false, error: "รูปแบบวันที่ไม่ถูกต้อง" };
  }

  const dateObj = new Date(date);
  const existing = await db.dressBlackout.findUnique({
    where: { dressId_date: { dressId, date: dateObj } },
  });

  if (existing) {
    await db.dressBlackout.delete({ where: { dressId_date: { dressId, date: dateObj } } });
    revalidatePath(`/dress/${dressId}`);
    return { ok: true, blocked: false };
  } else {
    await db.dressBlackout.create({ data: { dressId, date: dateObj } });
    revalidatePath(`/dress/${dressId}`);
    return { ok: true, blocked: true };
  }
}

export async function setBlackouts(
  dressId: string,
  dates: string[],
): Promise<{ ok: boolean; error?: string }> {
  const owner = await verifyDressOwner(dressId);
  if (!owner.ok) return owner;

  const validDates = dates.filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d));
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  await db.dressBlackout.deleteMany({ where: { dressId, date: { gte: today } } });

  if (validDates.length > 0) {
    await db.dressBlackout.createMany({
      data: validDates.map((d) => ({ dressId, date: new Date(d) })),
      skipDuplicates: true,
    });
  }

  revalidatePath(`/dress/${dressId}`);
  return { ok: true };
}
