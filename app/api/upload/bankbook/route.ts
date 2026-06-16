import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import sharp from "sharp";
import { auth } from "@/auth";
import { uploadPrivateToR2 } from "@/lib/r2";

/**
 * Bankbook (passbook cover) upload — PRIVATE bucket.
 *
 * Bank account verification photos must never land in the public bucket.
 * This route uploads to R2_PRIVATE_BUCKET via uploadPrivateToR2 and returns
 * the object KEY (e.g. `bankbook/<uuid>.jpg`) — NOT a public URL.
 * Admin can view via the guarded GET /api/admin/bankbook-doc route (signed URL).
 *
 * Images only (jpg/png/webp); PDF is intentionally excluded.
 */

// 2MB hard limit
const MAX_SIZE = 2 * 1024 * 1024;

// Image-only magic byte signatures (no PDF)
const MAGIC_SIGNATURES = [
  { mime: "image/jpeg", ext: "jpg",  offset: 0, bytes: [0xff, 0xd8, 0xff] },
  { mime: "image/png",  ext: "png",  offset: 0, bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] },
  { mime: "image/webp", ext: "webp", offset: 0, bytes: [0x52, 0x49, 0x46, 0x46] }, // "RIFF"
] as const;

function detectFileType(buf: Buffer): { mime: string; ext: string } | null {
  for (const sig of MAGIC_SIGNATURES) {
    const slice = buf.subarray(sig.offset, sig.offset + sig.bytes.length);
    if (sig.bytes.every((b, i) => slice[i] === b)) {
      // Extra check for webp: bytes 8-11 must be "WEBP"
      if (sig.mime === "image/webp") {
        const webp = buf.subarray(8, 12);
        if (![0x57, 0x45, 0x42, 0x50].every((b, i) => webp[i] === b)) continue;
      }
      return { mime: sig.mime, ext: sig.ext };
    }
  }
  return null;
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get("file");

  if (!file || typeof file === "string") {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: "ไฟล์ใหญ่เกิน 2MB" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  // Validate by magic bytes, not by client-supplied MIME type
  const detected = detectFileType(buffer);
  if (!detected) {
    return NextResponse.json(
      { error: "รองรับเฉพาะไฟล์ภาพ (JPG, PNG, WebP)" },
      { status: 400 },
    );
  }

  // Auto-orient + strip EXIF (GPS etc.) + resize
  const body = await sharp(buffer)
    .rotate()
    .resize(1600, undefined, { withoutEnlargement: true })
    .toBuffer();

  const key = `bankbook/${randomUUID()}.${detected.ext}`;
  await uploadPrivateToR2(key, body, detected.mime);

  // Return the private object KEY — caller stores this, never a public URL.
  return NextResponse.json({ key });
}
