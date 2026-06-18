import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { uploadSlip } from "@/app/actions/bookings";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // อ่าน formData ก่อน DB query เพื่อหลีกเลี่ยง Next.js body parsing issue
  const formData = await req.formData();

  // Re-key "file" → "slip" to match the server action's expected field name,
  // then delegate entirely. The server action enforces: ownership, status-transition
  // validity (waiting_for_payment → payment_review), magic-byte file validation
  // (JPG/PNG/WebP), 5 MB size cap, R2 upload, and atomic status guard.
  const uploadFd = new FormData();
  const slipFile = formData.get("file");
  if (slipFile && typeof slipFile !== "string") {
    uploadFd.set("slip", slipFile);
  }

  const result = await uploadSlip(params.id, uploadFd);
  if (!result.ok) {
    const status = result.error.includes("ไม่มีสิทธิ์")
      ? 403
      : result.error.includes("ไม่พบ")
        ? 404
        : 400;
    return NextResponse.json({ error: result.error }, { status });
  }

  const updated = await db.booking.findUnique({ where: { id: params.id } });
  return NextResponse.json(updated);
}
