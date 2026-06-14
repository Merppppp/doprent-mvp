import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import type { Address, BookingDetail } from "@/lib/types";

/** Prisma include that hydrates the product + shop fields a BookingDetail needs. */
const BOOKING_INCLUDE = {
  product: {
    select: {
      name: true,
      slug: true,
      images: { orderBy: { sortOrder: "asc" as const }, take: 1, select: { url: true } },
    },
  },
  shop: { select: { name: true, slug: true, lineUrl: true, promptpayId: true, bankName: true, bankAccountNumber: true, bankAccountName: true } },
} as const;

type PrismaBookingWithJoins = {
  id: string;
  renterId: string;
  shopId: string;
  productId: string;
  startDate: Date;
  endDate: Date;
  rentalTotal: number;
  deposit: number;
  shippingFee: number | null;
  commissionRate: { toString(): string } | number;
  commissionAmount: number | null;
  channel: string | null;
  status: string;
  slipPath: string | null;
  addressId: string | null;
  recipientName: string | null;
  phone: string | null;
  addressText: string | null;
  currentDueAt: Date | null;
  cancelReason: string | null;
  cancelFromStatus: string | null;
  createdAt: Date;
  updatedAt: Date;
  product?: { name: string | null; slug: string | null; images: Array<{ url: string }> } | null;
  shop?: {
    name: string | null;
    slug: string | null;
    lineUrl: string | null;
    promptpayId: string | null;
    bankName: string | null;
    bankAccountNumber: string | null;
    bankAccountName: string | null;
  } | null;
};

const ymd = (d: Date) => d.toISOString().slice(0, 10);

/** Map a Prisma booking (camelCase + joins) to the snake_case BookingDetail UI shape. */
export function toBookingDetail(b: PrismaBookingWithJoins): BookingDetail {
  const images = (b.product?.images ?? []).map((img) => img.url);
  return {
    id: b.id,
    renter_id: b.renterId,
    boutique_id: b.shopId,
    dress_id: b.productId,
    start_date: ymd(b.startDate),
    end_date: ymd(b.endDate),
    rental_total: b.rentalTotal,
    deposit: b.deposit,
    shipping_fee: b.shippingFee,
    commission_rate: Number(b.commissionRate),
    commission_amount: b.commissionAmount,
    channel: b.channel,
    status: b.status as BookingDetail["status"],
    slip_path: b.slipPath,
    address_id: b.addressId,
    recipient_name: b.recipientName,
    phone: b.phone,
    address_text: b.addressText,
    current_due_at: b.currentDueAt ? b.currentDueAt.toISOString() : null,
    cancel_reason: b.cancelReason,
    cancel_from_status: b.cancelFromStatus,
    created_at: b.createdAt.toISOString(),
    updated_at: b.updatedAt.toISOString(),
    dress_name: b.product?.name ?? null,
    dress_slug: b.product?.slug ?? null,
    dress_image: images[0] ?? null,
    boutique_name: b.shop?.name ?? null,
    boutique_slug: b.shop?.slug ?? null,
    boutique_line_url: b.shop?.lineUrl ?? null,
    boutique_promptpay_id: b.shop?.promptpayId ?? null,
    boutique_bank_name: b.shop?.bankName ?? null,
    boutique_bank_account_number: b.shop?.bankAccountNumber ?? null,
    boutique_bank_account_name: b.shop?.bankAccountName ?? null,
  };
}

export async function getMyAddresses(): Promise<Address[]> {
  const user = await getCurrentUser();
  if (!user) return [];
  const rows = await db.address.findMany({
    where: { userId: user.id },
    orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
  });
  return rows.map((a) => ({
    id: a.id,
    user_id: a.userId,
    recipient_name: a.recipientName,
    phone: a.phone,
    address_text: a.addressLine,
    is_default: a.isDefault,
    created_at: a.createdAt.toISOString(),
  }));
}

export async function getRenterBookings(): Promise<BookingDetail[]> {
  const user = await getCurrentUser();
  if (!user) return [];
  const rows = await db.booking.findMany({
    where: { renterId: user.id },
    include: BOOKING_INCLUDE,
    orderBy: { createdAt: "desc" },
  });
  return rows.map(toBookingDetail);
}

export async function getSellerBookings(): Promise<BookingDetail[]> {
  const user = await getCurrentUser();
  if (!user) return [];
  const shops = await db.shop.findMany({
    where: { ownerId: user.id },
    select: { id: true },
  });
  const ids = shops.map((s) => s.id);
  if (ids.length === 0) return [];
  const rows = await db.booking.findMany({
    where: { shopId: { in: ids } },
    include: BOOKING_INCLUDE,
    orderBy: { createdAt: "desc" },
  });
  return rows.map(toBookingDetail);
}

/**
 * Single booking by id — authorization is enforced HERE (Postgres has no RLS):
 * only the renter, the boutique's seller, or an admin may view it.
 */
export async function getBookingForView(id: string): Promise<BookingDetail | null> {
  const user = await getCurrentUser();
  if (!user) return null;
  const b = await db.booking.findUnique({
    where: { id },
    include: {
      product: {
        select: {
          name: true,
          slug: true,
          images: { orderBy: { sortOrder: "asc" as const }, take: 1, select: { url: true } },
        },
      },
      shop: {
        select: { name: true, slug: true, lineUrl: true, promptpayId: true, ownerId: true, bankName: true, bankAccountNumber: true, bankAccountName: true },
      },
    },
  });
  if (!b) return null;
  const isRenter = b.renterId === user.id;
  const isSeller = b.shop?.ownerId === user.id;
  if (!isRenter && !isSeller && user.role !== "admin") return null;
  return toBookingDetail(b as unknown as PrismaBookingWithJoins);
}

/** Counts for the nav notification badges:
 *  renter = bookings waiting on the renter to pay;
 *  seller = bookings waiting on the shop (new request or slip to review). */
export async function getBookingBadges(): Promise<{ renter: number; seller: number }> {
  const user = await getCurrentUser();
  if (!user) return { renter: 0, seller: 0 };

  const renterCount = await db.booking.count({
    where: { renterId: user.id, status: "waiting_for_payment" },
  });

  const shops = await db.shop.findMany({
    where: { ownerId: user.id },
    select: { id: true },
  });
  const ids = shops.map((s) => s.id);

  let seller = 0;
  if (ids.length > 0) {
    seller = await db.booking.count({
      where: {
        shopId: { in: ids },
        status: { in: ["booking_pending", "payment_review"] },
      },
    });
  }
  return { renter: renterCount, seller };
}

/** Is the current user the owner of this booking's shop? (for view role) */
export async function currentUserIsSellerOf(shopId: string): Promise<boolean> {
  const user = await getCurrentUser();
  if (!user) return false;
  const b = await db.shop.findFirst({
    where: { id: shopId, ownerId: user.id },
    select: { id: true },
  });
  return !!b;
}
