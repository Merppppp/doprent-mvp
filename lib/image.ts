export const MAX_UPLOAD_SIDE = 1920;
export const MAX_UPLOAD_BYTES = 2 * 1024 * 1024;

const WEBP_OUTPUT_TYPE = "image/webp";
const JPEG_OUTPUT_TYPE = "image/jpeg";
const OUTPUT_QUALITY = 0.85;

function getResizeDimensions(width: number, height: number, maxSide: number) {
  const ratio = Math.min(1, maxSide / width, maxSide / height);
  return {
    width: Math.round(width * ratio),
    height: Math.round(height * ratio),
  };
}

function isIos15(): boolean {
  if (typeof navigator === "undefined" || typeof navigator.userAgent !== "string") {
    return false;
  }
  const ua = navigator.userAgent;
  return /\b(iPhone|iPad|iPod)\b/.test(ua) && /OS 15[_\d]*\b/.test(ua);
}

function getOutputType(): string {
  return isIos15() ? JPEG_OUTPUT_TYPE : WEBP_OUTPUT_TYPE;
}

function getOutputFileName(file: File, mimeType: string): string {
  const baseName = file.name.replace(/\.[^/.]+$/, "");
  const extension = mimeType === WEBP_OUTPUT_TYPE ? "webp" : "jpg";
  return `${baseName}.${extension}`;
}

async function convertBitmapToBlob(
  bitmap: ImageBitmap,
  outputType: string,
  maxSide: number,
): Promise<Blob> {
  const { width, height } = bitmap;
  const { width: targetWidth, height: targetHeight } = getResizeDimensions(
    width,
    height,
    maxSide,
  );

  const canvas = new OffscreenCanvas(targetWidth, targetHeight);
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("ไม่สามารถสร้างภาพบน OffscreenCanvas ได้");
  }

  ctx.drawImage(bitmap, 0, 0, targetWidth, targetHeight);

  return canvas.convertToBlob({ type: outputType, quality: OUTPUT_QUALITY });
}

/**
 * Client-side preprocess before uploading to S3/R2: downscale so the longest
 * side is <= MAX_UPLOAD_SIDE and re-encode to WebP (JPEG fallback / iOS 15) at
 * OUTPUT_QUALITY. Throws a Thai 2MB-limit error if the result is still too big.
 * Non-images and browsers lacking createImageBitmap/OffscreenCanvas are passed
 * through unchanged (still subject to the 2MB hard limit).
 */
export async function prepareImageFileForUpload(file: File): Promise<File> {
  if (!file.type.startsWith("image/")) {
    if (file.size > MAX_UPLOAD_BYTES) {
      throw new Error("ไฟล์ต้องมีขนาดไม่เกิน 2MB");
    }
    return file;
  }

  if (typeof createImageBitmap === "undefined" || typeof OffscreenCanvas === "undefined") {
    if (file.size > MAX_UPLOAD_BYTES) {
      throw new Error("ไฟล์ต้องมีขนาดไม่เกิน 2MB");
    }
    return file;
  }

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error("ไม่สามารถอ่านไฟล์รูปภาพได้");
  }

  try {
    const preferredType = getOutputType();

    let blob: Blob;
    try {
      blob = await convertBitmapToBlob(bitmap, preferredType, MAX_UPLOAD_SIDE);
    } catch (error) {
      if (preferredType !== WEBP_OUTPUT_TYPE) {
        throw error;
      }
      console.warn("WebP conversion failed, fallback to JPEG", error);
      blob = await convertBitmapToBlob(bitmap, JPEG_OUTPUT_TYPE, MAX_UPLOAD_SIDE);
    }

    if (blob.size > MAX_UPLOAD_BYTES) {
      throw new Error("ไฟล์ต้องมีขนาดไม่เกิน 2MB");
    }

    return new File([blob], getOutputFileName(file, blob.type), { type: blob.type });
  } finally {
    bitmap.close();
  }
}
