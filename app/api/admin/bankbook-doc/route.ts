import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { r2, R2_PRIVATE_BUCKET } from "@/lib/r2";
import { GetObjectCommand } from "@aws-sdk/client-s3";

/**
 * Admin-only proxy for private bankbook (passbook cover) images.
 *
 * GET /api/admin/bankbook-doc?key=bankbook/<uuid>.<ext>
 * → streams the object bytes (avoids ORB/CORS cross-origin blocks).
 *
 * Only keys under the `bankbook/` prefix are allowed — path traversal,
 * arbitrary objects, and other prefixes are all rejected.
 */

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

  try {
    const res = await r2.send(
      new GetObjectCommand({ Bucket: R2_PRIVATE_BUCKET, Key: key }),
    );
    if (!res.Body) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const bodyBytes = Buffer.from(await res.Body.transformToByteArray());
    return new NextResponse(bodyBytes, {
      status: 200,
      headers: {
        "Content-Type": res.ContentType || "application/octet-stream",
        "Cache-Control": "private, max-age=900",
        "Content-Length": String(bodyBytes.length),
      },
    });
  } catch (err: unknown) {
    const code = (err as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode;
    if (code === 404) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    console.error("[bankbook-doc] S3 error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
