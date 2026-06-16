import crypto from "crypto";
import { db } from "@/lib/db";

/** Crockford base32 minus ambiguous chars (no I O L U). 32 chars. */
const ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

/** Generate a random opaque staff login code (default 8 chars). */
export function genStaffLoginCode(len = 8): string {
  const bytes = crypto.randomBytes(len);
  let code = "";
  for (let i = 0; i < len; i++) {
    code += ALPHABET[bytes[i] % 32];
  }
  return code;
}

/**
 * Allocate a unique staffLoginCode for a shop.
 * Loops up to 6 times; throws if all 6 attempts collide (astronomically unlikely).
 * The @unique DB constraint is the hard guarantee.
 */
export async function allocateStaffLoginCode(): Promise<string> {
  for (let i = 0; i < 6; i++) {
    const code = genStaffLoginCode();
    const existing = await db.shop.findUnique({ where: { staffLoginCode: code } });
    if (!existing) return code;
  }
  throw new Error("allocateStaffLoginCode: failed after 6 attempts (collision)");
}
