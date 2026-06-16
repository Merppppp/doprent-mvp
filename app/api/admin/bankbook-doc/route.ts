import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getSignedPrivateUrl } from "@/lib/r2";

/**
 * Admin-only resolver for private bankbook (passbook cover) images.
 *
 * GET /api/admin/bankbook-doc?key=bankbook/<uuid>.<ext>
 * → 302 redirect to a short-lived (15 min) presigned GET URL on the
 *   private bucket.
 *
 * Only keys under the `bankbook/` prefix are signable here — path traversal,
 * arbitrary objects, and other prefixes are all rejected.
 */

const EXPIRES_IN = 60 * 15; // 15 minutes

// Strict allowlist: bankbook/<safe-filename>.<ext> — no extra slashes, no ".."
const BANKBOOK_KEY_RE = /^bankbook\/[A-Za-z0-9_-]+\.[A-Za-z0-9]{1,5}$/;

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const key = req.nextUrl.searchParams.get("key") ?? "";
  if (!BANKBOOK_KEY_RE.test(key)) {
    return NextResponse.json({ error: "Invalid key" }, { status: 400 });
  }

  const signedUrl = await getSignedPrivateUrl(key, EXPIRES_IN);
  return NextResponse.redirect(signedUrl, 302);
}
