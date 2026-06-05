import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const R2_ENDPOINT = `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;

export const r2 = new S3Client({
  region: "auto",
  endpoint: R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

export const R2_BUCKET = process.env.R2_BUCKET_NAME!;
export const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL!;
export const R2_PRIVATE_BUCKET = process.env.R2_PRIVATE_BUCKET_NAME!;

/**
 * Bucket for SENSITIVE files (payment slips). This bucket must NOT be bound to
 * a public domain — slips are served only via short-lived presigned URLs to
 * authorized parties. Falls back to the main bucket if unset, but in production
 * configure a SEPARATE private bucket (see DEPLOY notes).
 */
export const R2_SLIPS_BUCKET = process.env.R2_SLIPS_BUCKET || R2_BUCKET;

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
      Bucket: R2_SLIPS_BUCKET,
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
    new GetObjectCommand({ Bucket: R2_SLIPS_BUCKET, Key: key }),
    { expiresIn }
  );
}
