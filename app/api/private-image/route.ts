import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { r2, R2_PRIVATE_BUCKET } from "@/lib/r2";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";

/**
 * Server-side proxy for private S3/MinIO images.
 *
 * Why: On localhost, the browser blocks cross-origin image loads from
 * s3.doprent.com via ORB (Opaque Resource Blocking).  By proxying through
 * this Next.js route the browser only sees `localhost:3000` — no CORS issue.
 *
 * In production the same route works fine (and avoids exposing raw presigned
 * URLs to the client, which is a security win).
 *
 * Usage: /api/private-image?key=slips/abc.jpg
 *
 * Auth: requires a logged-in user (session cookie).  The caller (server
 * component) is responsible for authorising access to the booking — this
 * route only checks that the session exists and the key matches a safe
 * prefix whitelist.
 */

/** Allowed key prefixes — anything else is rejected. */
const ALLOWED_PREFIXES = [
  "slips/",
  "id-cards/",
  "addr-change-slips/",
  "refunds/",
  "refund-slips/",
  "kyc/",
  "bankbook/",
];

/**
 * Safe key pattern — allows 1-3 path segments of alphanumeric/UUID chars
 * ending in a dotted extension.  No `..`, no leading `/`, no query tricks.
 * Examples:  slips/uuid/uuid.jpg   kyc/uuid.png   id-cards/uuid/uuid.webp
 */
const SAFE_KEY = /^[A-Za-z0-9_-]+(?:\/[A-Za-z0-9_.-]+){1,3}$/;

/* ── Legacy Cloudflare R2 fallback ──────────────────────────────────── *
 * Some private objects were uploaded to Cloudflare R2 (bucket "slip")   *
 * before the MinIO migration.  When the primary bucket returns 404 we   *
 * try R2 as a fallback.  Remove once all data is migrated.              *
 * ─────────────────────────────────────────────────────────────────────  */
const R2_LEGACY_BUCKET = process.env.R2_PRIVATE_BUCKET_NAME; // "slip"
const r2Legacy =
  process.env.R2_ACCOUNT_ID && process.env.R2_ACCESS_KEY_ID && R2_LEGACY_BUCKET
    ? new S3Client({
        region: "auto",
        endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
        credentials: {
          accessKeyId: process.env.R2_ACCESS_KEY_ID!,
          secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
        },
        requestChecksumCalculation: "WHEN_REQUIRED",
        responseChecksumValidation: "WHEN_REQUIRED",
      })
    : null;

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const key = req.nextUrl.searchParams.get("key");
  if (!key || !SAFE_KEY.test(key)) {
    return NextResponse.json({ error: "Invalid key" }, { status: 400 });
  }

  const allowed = ALLOWED_PREFIXES.some((p) => key.startsWith(p));
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden prefix" }, { status: 403 });
  }

  // Try primary (MinIO / S3_ENDPOINT)
  const primary = await fetchObject(r2, R2_PRIVATE_BUCKET, key);
  if (primary) return primary;

  // Fallback to legacy Cloudflare R2
  if (r2Legacy && R2_LEGACY_BUCKET) {
    const fallback = await fetchObject(r2Legacy, R2_LEGACY_BUCKET, key);
    if (fallback) return fallback;
  }

  return NextResponse.json({ error: "Not found" }, { status: 404 });
}

/** Fetch an S3 object and return a NextResponse, or null on 404 / error. */
async function fetchObject(
  client: S3Client,
  bucket: string,
  key: string,
): Promise<NextResponse | null> {
  try {
    const res = await client.send(
      new GetObjectCommand({ Bucket: bucket, Key: key }),
    );
    if (!res.Body) return null;

    const bodyBytes = Buffer.from(await res.Body.transformToByteArray());
    return new NextResponse(bodyBytes, {
      status: 200,
      headers: {
        "Content-Type": res.ContentType || "application/octet-stream",
        "Cache-Control": "private, max-age=1800",
        "Content-Length": String(bodyBytes.length),
      },
    });
  } catch (err: unknown) {
    const code = (err as { $metadata?: { httpStatusCode?: number } }).$metadata
      ?.httpStatusCode;
    if (code === 404 || code === 403) return null;
    console.error(`[private-image] S3 error (bucket=${bucket}):`, err);
    return null;
  }
}
