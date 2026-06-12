import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getSignedPrivateUrl } from "@/lib/r2";

/**
 * Admin-only resolver for private KYC documents.
 *
 * GET /api/admin/kyc-doc?key=kyc/<uuid>.<ext>
 * → 302 redirect to a short-lived (15 min) presigned GET URL on the
 *   private bucket.
 *
 * Only keys under the `kyc/` prefix are signable here — anything else
 * (path traversal, slips, arbitrary bucket objects) is rejected, so this
 * route cannot be abused as a generic object signer.
 */

const EXPIRES_IN = 60 * 15; // 15 นาที

// strict allowlist: kyc/<safe-filename>.<ext> — no slashes beyond the prefix,
// no "..", no query tricks.
const KYC_KEY_RE = /^kyc\/[A-Za-z0-9_-]+\.[A-Za-z0-9]{1,5}$/;

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const key = req.nextUrl.searchParams.get("key") ?? "";
  if (!KYC_KEY_RE.test(key)) {
    return NextResponse.json({ error: "Invalid key" }, { status: 400 });
  }

  const signedUrl = await getSignedPrivateUrl(key, EXPIRES_IN);
  return NextResponse.redirect(signedUrl, 302);
}
