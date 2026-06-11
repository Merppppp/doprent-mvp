#!/usr/bin/env node
/**
 * Standalone functional test for the S3-compatible storage config (lib/r2.ts).
 * Mirrors the same env resolution (S3_* primary, legacy R2_* fallback) and
 * exercises: upload -> public URL fetch -> private upload -> presigned GET -> delete.
 *
 * Usage:
 *   node --env-file=.env scripts/test-s3.mjs            # R2 (legacy R2_* vars)
 *   node --env-file=.env.minio scripts/test-s3.mjs      # MinIO (S3_* vars)
 * or export the env vars manually before running.
 */
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// --- same resolution logic as lib/r2.ts ---
const endpoint =
  process.env.S3_ENDPOINT ||
  (process.env.R2_ACCOUNT_ID
    ? `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`
    : undefined);
const region = process.env.S3_REGION || "auto";
const forcePathStyle = process.env.S3_FORCE_PATH_STYLE === "true";
const accessKeyId = process.env.S3_ACCESS_KEY_ID || process.env.R2_ACCESS_KEY_ID;
const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY || process.env.R2_SECRET_ACCESS_KEY;
const BUCKET = process.env.S3_BUCKET || process.env.R2_BUCKET_NAME;
const PUBLIC_URL = process.env.S3_PUBLIC_URL || process.env.R2_PUBLIC_URL;
const PRIVATE_BUCKET =
  process.env.S3_PRIVATE_BUCKET || process.env.R2_PRIVATE_BUCKET_NAME || BUCKET;

if (!endpoint || !accessKeyId || !secretAccessKey || !BUCKET) {
  console.error("Missing storage env vars (need endpoint, credentials, bucket). Aborting.");
  process.exit(2);
}

console.log("== storage config ==");
console.log("endpoint:       ", endpoint);
console.log("region:         ", region);
console.log("forcePathStyle: ", forcePathStyle);
console.log("bucket:         ", BUCKET);
console.log("privateBucket:  ", PRIVATE_BUCKET);
console.log("publicUrl:      ", PUBLIC_URL || "(unset)");

const s3 = new S3Client({
  region,
  endpoint,
  forcePathStyle,
  credentials: { accessKeyId, secretAccessKey },
});

const key = `test-s3/${Date.now()}.txt`;
const body = Buffer.from(`s3 smoke test ${new Date().toISOString()}`);
let failed = false;

async function step(name, fn) {
  try {
    const out = await fn();
    console.log(`PASS  ${name}${out ? ` — ${out}` : ""}`);
  } catch (e) {
    failed = true;
    console.error(`FAIL  ${name} — ${e.name}: ${e.message}`);
  }
}

// 1. public bucket upload
await step("upload (public bucket)", async () => {
  await s3.send(
    new PutObjectCommand({ Bucket: BUCKET, Key: key, Body: body, ContentType: "text/plain" })
  );
  return key;
});

// 2. public URL serve (only if PUBLIC_URL set)
if (PUBLIC_URL) {
  await step("serve via public URL", async () => {
    const url = `${PUBLIC_URL}/${key}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
    return url;
  });
}

// 3. private bucket upload + presigned GET
const privKey = `test-s3/private-${Date.now()}.txt`;
await step("upload (private bucket)", async () => {
  await s3.send(
    new PutObjectCommand({
      Bucket: PRIVATE_BUCKET,
      Key: privKey,
      Body: body,
      ContentType: "text/plain",
    })
  );
  return privKey;
});

await step("presigned GET (private)", async () => {
  const url = await getSignedUrl(
    s3,
    new GetObjectCommand({ Bucket: PRIVATE_BUCKET, Key: privKey }),
    { expiresIn: 300 }
  );
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const text = await res.text();
  if (text !== body.toString()) throw new Error("content mismatch");
  return "content verified";
});

// 4. cleanup
await step("delete test objects", async () => {
  await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
  await s3.send(new DeleteObjectCommand({ Bucket: PRIVATE_BUCKET, Key: privKey }));
});

process.exit(failed ? 1 : 0);
