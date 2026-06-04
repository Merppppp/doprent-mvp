import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { db } from "@/lib/db";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));

    const ipRaw =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "";
    const ipHash = ipRaw
      ? createHash("sha256")
          .update(ipRaw + (process.env.IP_HASH_SALT || "doprent"))
          .digest("hex")
          .slice(0, 16)
      : null;

    await db.lineClick.create({
      data: {
        dressId: body?.dress_id ?? null,
        boutiqueId: body?.boutique_id ?? null,
        source: body?.source ?? "unknown",
        userAgent: req.headers.get("user-agent") ?? null,
        ipHash,
      },
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[doprent] /api/track error", err);
    return NextResponse.json({ ok: false }, { status: 200 });
  }
}
