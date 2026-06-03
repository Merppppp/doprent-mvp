import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { auth } from "@/auth";
import { uploadToR2 } from "@/lib/r2";

const MAX_SIZE = 10 * 1024 * 1024; // 10MB raw (BE-02 will enforce 2MB after resize)

// BE-01: magic bytes signatures for allowed image types
const MAGIC_SIGNATURES = [
  { mime: "image/jpeg", offset: 0, bytes: [0xff, 0xd8, 0xff] },
  { mime: "image/png",  offset: 0, bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] },
  { mime: "image/webp", offset: 0, bytes: [0x52, 0x49, 0x46, 0x46] }, // "RIFF" header
] as const;

function detectMimeType(buf: Buffer): string | null {
  for (const sig of MAGIC_SIGNATURES) {
    const slice = buf.subarray(sig.offset, sig.offset + sig.bytes.length);
    if (sig.bytes.every((b, i) => slice[i] === b)) {
      // extra check for webp: bytes 8-11 must be "WEBP"
      if (sig.mime === "image/webp") {
        const webp = buf.subarray(8, 12);
        if (![0x57, 0x45, 0x42, 0x50].every((b, i) => webp[i] === b)) continue;
      }
      return sig.mime;
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
    return NextResponse.json({ error: "File too large" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  // BE-01: validate by magic bytes, not by client-supplied MIME type
  const detectedMime = detectMimeType(buffer);
  if (!detectedMime) {
    return NextResponse.json({ error: "Invalid file type" }, { status: 400 });
  }

  const ext = detectedMime === "image/jpeg" ? "jpg" : detectedMime.split("/")[1];
  const key = `uploads/${randomUUID()}.${ext}`;

  const url = await uploadToR2(key, buffer, detectedMime);

  return NextResponse.json({ url, urls: { thumb: url, medium: url, large: url } });
}
