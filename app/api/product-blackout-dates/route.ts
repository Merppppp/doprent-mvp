import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getBlackoutsByMonth } from "@/lib/products";

const MONTH_REGEX = /^\d{4}-\d{2}$/;

export async function GET(request: Request) {
  const url = new URL(request.url);
  // Accept product_id (new vocabulary); dress_id kept as a fallback for
  // cached clients during the rename deploy window.
  const productId = url.searchParams.get("product_id") ?? url.searchParams.get("dress_id");
  const month = url.searchParams.get("month");

  if (!productId || !month) {
    return NextResponse.json({ error: "product_id and month are required" }, { status: 400 });
  }
  if (!MONTH_REGEX.test(month)) {
    return NextResponse.json({ error: "month must be in YYYY-MM format" }, { status: 400 });
  }

  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const product = await db.product.findUnique({
    where: { id: productId },
    include: { shop: { select: { ownerId: true } } },
  });
  if (!product || product.shop.ownerId !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const blackouts = await getBlackoutsByMonth([productId], month);
  return NextResponse.json({ blackouts: blackouts.map((r) => r.date), month });
}
