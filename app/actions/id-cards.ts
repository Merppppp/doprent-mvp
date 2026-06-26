"use server";

import { randomUUID } from "node:crypto";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { withActor } from "@/lib/db-context";
import { uploadPrivateToR2, deletePrivateFromR2, getSignedPrivateUrl } from "@/lib/r2";
import { detectSlipMime } from "@/lib/file-mime";
import { ID_CARD_MAX_BYTES, MAX_ID_CARDS_PER_USER } from "@/lib/config";

type Result<T = unknown> =
  | ({ ok: true } & T)
  | { ok: false; error: string };

export type IdCardItem = {
  id: string;
  path: string;
  signedUrl: string;
  createdAt: string;
};

/**
 * Upload a national ID card photo to R2.
 * - Validates auth, MIME type (JPG/PNG/WebP), and file size.
 * - If the user already has MAX_ID_CARDS_PER_USER photos, deletes the oldest
 *   from both R2 and the DB before inserting the new one.
 * - Returns { ok, id, path } on success.
 */
export async function uploadIdCard(
  formData: FormData,
): Promise<Result<{ id: string; path: string }>> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "ยังไม่ได้เข้าสู่ระบบ" };

  const file = formData.get("id_card");
  if (!file || typeof file === "string") return { ok: false, error: "ยังไม่ได้เลือกไฟล์" };
  if (file.size > ID_CARD_MAX_BYTES) return { ok: false, error: "ไฟล์ใหญ่เกิน 5MB" };

  const buffer = Buffer.from(await file.arrayBuffer());
  const mime = detectSlipMime(buffer);
  if (!mime) return { ok: false, error: "ไฟล์ต้องเป็นรูปภาพ (JPG/PNG/WebP)" };
  const ext = mime === "image/jpeg" ? "jpg" : mime.split("/")[1];

  return withActor(user.id, async () => {
    // Load existing cards sorted oldest first so we can drop the oldest if full.
    const existing = await db.userIdCard.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "asc" },
      select: { id: true, path: true },
    });

    // Delete the oldest card when at the limit.
    if (existing.length >= MAX_ID_CARDS_PER_USER) {
      const oldest = existing[0];
      try {
        await deletePrivateFromR2(oldest.path);
      } catch (e) {
        console.error("[doprent] id-card R2 delete error", e);
      }
      await db.userIdCard.delete({ where: { id: oldest.id } });
    }

    const key = `id-cards/${user.id}/${randomUUID()}.${ext}`;
    try {
      await uploadPrivateToR2(key, buffer, mime);
    } catch (e) {
      console.error("[doprent] id-card upload error", e);
      return { ok: false, error: "อัปโหลดรูปไม่สำเร็จ ลองใหม่อีกครั้ง" };
    }

    const row = await db.userIdCard.create({
      data: {
        userId: user.id,
        path: key,
      },
      select: { id: true, path: true },
    });

    return { ok: true, id: row.id, path: row.path };
  });
}

/**
 * Return the current user's ID card photos (newest first) with signed URLs.
 */
export async function getUserIdCards(): Promise<IdCardItem[]> {
  const user = await getCurrentUser();
  if (!user) return [];

  const rows = await db.userIdCard.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    select: { id: true, path: true, createdAt: true },
  });

  return Promise.all(
    rows.map(async (r) => ({
      id: r.id,
      path: r.path,
      signedUrl: await getSignedPrivateUrl(r.path),
      createdAt: r.createdAt.toISOString(),
    })),
  );
}
