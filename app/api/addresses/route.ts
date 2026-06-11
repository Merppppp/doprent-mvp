import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const addresses = await db.address.findMany({
    where: { userId: session.user.id },
    orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
  });

  return NextResponse.json(addresses);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { label, recipientName, phone, addressLine, subdistrict, district, province, postalCode, isDefault } = body;

  if (!label || !recipientName || !phone || !addressLine || !postalCode) {
    return NextResponse.json({ error: "กรุณากรอกข้อมูลให้ครบ" }, { status: 400 });
  }

  if (isDefault) {
    await db.address.updateMany({
      where: { userId: session.user.id },
      data: { isDefault: false },
    });
  }

  const address = await db.address.create({
    data: {
      userId: session.user.id,
      label, recipientName, phone, addressLine,
      subdistrict, district,
      province: province ?? "กรุงเทพมหานคร",
      postalCode,
      isDefault: isDefault ?? false,
    },
  });

  return NextResponse.json(address, { status: 201 });
}
