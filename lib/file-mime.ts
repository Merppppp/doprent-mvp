// Slip upload validation (magic bytes + size), mirrors /api/upload.
const SLIP_SIGNATURES: Array<{ mime: string; bytes: number[] }> = [
  { mime: "image/jpeg", bytes: [0xff, 0xd8, 0xff] },
  { mime: "image/png", bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] },
  { mime: "image/webp", bytes: [0x52, 0x49, 0x46, 0x46] },
];

export function detectSlipMime(buf: Buffer): string | null {
  for (const sig of SLIP_SIGNATURES) {
    if (sig.bytes.every((b, i) => buf[i] === b)) {
      if (sig.mime === "image/webp") {
        const webp = buf.subarray(8, 12);
        if (![0x57, 0x45, 0x42, 0x50].every((b, i) => webp[i] === b)) continue;
      }
      return sig.mime;
    }
  }
  return null;
}
