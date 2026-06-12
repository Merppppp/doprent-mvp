import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import sharp from "sharp";
import { auth } from "@/auth";
import { uploadPrivateToR2 } from "@/lib/r2";

/**
 * KYC document upload — PRIVATE bucket.
 *
 * Sensitive documents (Thai ID card, book bank, DBD/VAT papers) must never
 * land in the public bucket. This route uploads to R2_PRIVATE_BUCKET via
 * uploadPrivateToR2 and returns the object KEY (e.g. `kyc/<uuid>.png`) —
 * NOT a public URL. The key is stored in kyc_submissions and resolved for
 * admins via the guarded GET /api/admin/kyc-doc route (short-lived signed URL).
 */

// 2MB hard limit at server level (same as /api/upload)
const MAX_SIZE = 2 * 1024 * 1024;

// magic bytes signatures for allowed KYC document types (images + PDF)
const MAGIC_SIGNATURES = [
  { mime: "image/jpeg",      ext: "jpg",  offset: 0, bytes: [0xff, 0xd8, 0xff] },
  { mime: "image/png",       ext: "png",  offset: 0, bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] },
  { mime: "image/webp",      ext: "webp", offset: 0, bytes: [0x52, 0x49, 0x46, 0x46] }, // "RIFF" header
  { mime: "application/pdf", ext: "pdf",  offset: 0, bytes: [0x25, 0x50, 0x44, 0x46] }, // "%PDF"
] as const;

function detectFileType(buf: Buffer): { mime: string; ext: string } | null {
  for (const sig of MAGIC_SIGNATURES) {
    const slice = buf.subarray(sig.offset, sig.offset + sig.bytes.length);
    if (sig.bytes.every((b, i) => slice[i] === b)) {
      // extra check for webp: bytes 8-11 must be "WEBP"
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

  // validate by magic bytes, not by client-supplied MIME type
  const detected = detectFileType(buffer);
  if (!detected) {
    return NextResponse.json({ error: "Invalid file type" }, { status: 400 });
  }

  let body: Buffer = buffer;
  if (detected.mime !== "application/pdf") {
    // images: auto-orient + strip EXIF (GPS etc. — these are ID documents)
    body = await sharp(buffer).rotate().resize(1600, undefined, { withoutEnlargement: true }).toBuffer();
  }

  const key = `kyc/${randomUUID()}.${detected.ext}`;
  await uploadPrivateToR2(key, body, detected.mime);

  // Return the private object KEY — caller stores this, never a public URL.
  return NextResponse.json({ key });
}
