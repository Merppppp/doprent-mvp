import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

/**
 * Neutral S3-compatible storage config (works with both MinIO and Cloudflare R2).
 * Primary env scheme: S3_* — the MinIO/R2 switch is pure configuration.
 * Legacy R2_* vars are kept as fallback for ONE release only.
 */

// TODO(remove next release): legacy R2_ACCOUNT_ID fallback — once all envs
// define S3_ENDPOINT, delete this and require S3_ENDPOINT directly.
const S3_ENDPOINT =
  process.env.S3_ENDPOINT ||
  (process.env.R2_ACCOUNT_ID
    ? `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`
    : undefined);

export const r2 = new S3Client({
  region: process.env.S3_REGION || "auto",
  endpoint: S3_ENDPOINT,
  // MinIO requires path-style addressing (http://host/bucket/key); R2 uses
  // virtual-hosted style — so this is opt-in via env.
  forcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true",
  credentials: {
    accessKeyId: (process.env.S3_ACCESS_KEY_ID || process.env.R2_ACCESS_KEY_ID)!,
    secretAccessKey: (process.env.S3_SECRET_ACCESS_KEY || process.env.R2_SECRET_ACCESS_KEY)!,
  },
  // Disable automatic checksum headers — MinIO rejects the
  // `x-amz-checksum-mode=ENABLED` query param that AWS SDK v3 appends to
  // presigned GetObject URLs (SignatureDoesNotMatch).
  requestChecksumCalculation: "WHEN_REQUIRED",
  responseChecksumValidation: "WHEN_REQUIRED",
});

export const R2_BUCKET = (process.env.S3_BUCKET || process.env.R2_BUCKET_NAME)!;
export const R2_PUBLIC_URL = (process.env.S3_PUBLIC_URL || process.env.R2_PUBLIC_URL)!;
export const R2_PRIVATE_BUCKET =
  process.env.S3_PRIVATE_BUCKET || process.env.R2_PRIVATE_BUCKET_NAME || R2_BUCKET;

export async function uploadToR2(key: string, body: Buffer, contentType: string): Promise<string> {
  await r2.send(
    new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
      Body: body,
      ContentType: contentType,
    })
  );
  return `${R2_PUBLIC_URL}/${key}`;
}

export async function deleteFromR2(key: string): Promise<void> {
  await r2.send(
    new DeleteObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
    })
  );
}

/* ------------------------- private files (slips) ------------------------- */

/** Upload a private object to the slips bucket. Returns the KEY (no public URL). */
export async function uploadPrivateToR2(
  key: string,
  body: Buffer,
  contentType: string
): Promise<string> {
  await r2.send(
    new PutObjectCommand({
      Bucket: R2_PRIVATE_BUCKET,
      Key: key,
      Body: body,
      ContentType: contentType,
    })
  );
  return key;
}

/** Short-lived presigned GET URL for a private object (default 30 min). */
export async function getSignedPrivateUrl(key: string, expiresIn = 1800): Promise<string> {
  return getSignedUrl(
    r2,
    new GetObjectCommand({ Bucket: R2_PRIVATE_BUCKET, Key: key }),
    { expiresIn }
  );
}

/** Delete a private object from the private bucket by key. */
export async function deletePrivateFromR2(key: string): Promise<void> {
  await r2.send(
    new DeleteObjectCommand({
      Bucket: R2_PRIVATE_BUCKET,
      Key: key,
    })
  );
}

/**
 * Return a URL the browser can use to load a private image.
 *
 * Instead of exposing a raw presigned S3 URL (which triggers ORB / CORS
 * blocks when the S3 host differs from the page origin), we proxy through
 * `/api/private-image?key=…`.  The proxy fetches from S3 server-side so
 * the browser only ever talks to the same origin.
 */
export function privateImageUrl(key: string): string {
  return `/api/private-image?key=${encodeURIComponent(key)}`;
}
