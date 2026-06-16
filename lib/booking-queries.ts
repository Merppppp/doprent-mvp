import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import type { Address, BookingDetail, BookingStatus } from "@/lib/types";

/** Prisma include that hydrates the product + shop fields a BookingDetail needs. */
const BOOKING_INCLUDE = {
  product: {
    select: {
      name: true,
      slug: true,
      images: { orderBy: { sortOrder: "asc" as const }, take: 1, select: { url: true } },
    },
  },
  shop: { select: { name: true, slug: true, lineUrl: true, promptpayId: true, bankName: true, bankAccountNumber: true, bankAccountName: true, defaultPaymentMethod: true, instagram: true, facebook: true, twitter: true, tiktok: true } },
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
  paymentMethod: "promptpay" | "bank" | null;
  addressId: string | null;
  recipientName: string | null;
  phone: string | null;
  addressText: string | null;
  currentDueAt: Date | null;
  cancelReason: string | null;
  cancelFromStatus: string | null;
  addrChangeStatus: string | null;
  pendingRecipientName: string | null;
  pendingPhone: string | null;
  pendingAddressText: string | null;
  pendingShippingFee: number | null;
  addrChangeDiff: number | null;
  addrChangeSlipPath: string | null;
  addrChangeReason: string | null;
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
    defaultPaymentMethod: "promptpay" | "bank" | null;
    instagram: string | null;
    facebook: string | null;
    twitter: string | null;
    tiktok: string | null;
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
    payment_method: b.paymentMethod,
    address_id: b.addressId,
    recipient_name: b.recipientName,
    phone: b.phone,
    address_text: b.addressText,
    current_due_at: b.currentDueAt ? b.currentDueAt.toISOString() : null,
    cancel_reason: b.cancelReason,
    cancel_from_status: b.cancelFromStatus,
    addr_change_status: b.addrChangeStatus,
    pending_recipient_name: b.pendingRecipientName,
    pending_phone: b.pendingPhone,
    pending_address_text: b.pendingAddressText,
    pending_shipping_fee: b.pendingShippingFee,
    addr_change_diff: b.addrChangeDiff,
    addr_change_slip_path: b.addrChangeSlipPath,
    addr_change_reason: b.addrChangeReason,
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
    boutique_default_payment_method: b.shop?.defaultPaymentMethod ?? null,
    boutique_instagram: b.shop?.instagram ?? null,
    boutique_facebook: b.shop?.facebook ?? null,
    boutique_twitter: b.shop?.twitter ?? null,
    boutique_tiktok: b.shop?.tiktok ?? null,
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

export async function getSellerBookings(shopId?: string): Promise<BookingDetail[]> {
  // If shopId is provided (staff or pre-resolved owner), use it directly.
  if (shopId) {
    const rows = await db.booking.findMany({
      where: { shopId },
      include: BOOKING_INCLUDE,
      orderBy: { createdAt: "desc" },
    });
    return rows.map(toBookingDetail);
  }

  // Fall back to owner-based lookup.
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

/** Lightweight card row for the seller bookings list (tabbed + paginated). */
export type SellerBookingCard = {
  id: string;
  dress_name: string | null;
  dress_image: string | null;
  recipient_name: string | null;
  renter_id: string;
  start_date: string;
  end_date: string;
  amount_due: number;
  status: BookingStatus;
  created_at: string;
};

/**
 * Paginated + filtered seller bookings for the tabbed list UI.
 * - `statuses`: restrict to these statuses (a tab group); null/empty = all.
 * - `sinceDays`: only bookings created within the last N days; null = no limit.
 * Sorted newest → oldest. Returns the page rows plus the total matching count.
 */
export async function getSellerBookingsPage(
  shopId: string,
  opts: {
    statuses?: BookingStatus[] | null;
    sinceDays?: number | null;
    skip?: number;
    take?: number;
  } = {},
): Promise<{ rows: SellerBookingCard[]; total: number }> {
  const take = opts.take ?? 20;
  const skip = opts.skip ?? 0;

  const where: {
    shopId: string;
    status?: { in: BookingStatus[] };
    createdAt?: { gte: Date };
  } = { shopId };
  if (opts.statuses && opts.statuses.length > 0) {
    where.status = { in: opts.statuses };
  }
  if (opts.sinceDays && opts.sinceDays > 0) {
    where.createdAt = { gte: new Date(Date.now() - opts.sinceDays * 86400 * 1000) };
  }

  const [total, rows] = await Promise.all([
    db.booking.count({ where }),
    db.booking.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take,
      select: {
        id: true,
        renterId: true,
        startDate: true,
        endDate: true,
        rentalTotal: true,
        deposit: true,
        shippingFee: true,
        status: true,
        recipientName: true,
        createdAt: true,
        product: {
          select: {
            name: true,
            images: { orderBy: { sortOrder: "asc" }, take: 1, select: { url: true } },
          },
        },
      },
    }),
  ]);

  return {
    total,
    rows: rows.map((b) => ({
      id: b.id,
      dress_name: b.product?.name ?? null,
      dress_image: b.product?.images[0]?.url ?? null,
      recipient_name: b.recipientName,
      renter_id: b.renterId,
      start_date: ymd(b.startDate),
      end_date: ymd(b.endDate),
      amount_due: b.rentalTotal + b.deposit + (b.shippingFee ?? 0),
      status: b.status as BookingStatus,
      created_at: b.createdAt.toISOString(),
    })),
  };
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
        select: { name: true, slug: true, lineUrl: true, promptpayId: true, ownerId: true, bankName: true, bankAccountNumber: true, bankAccountName: true, defaultPaymentMethod: true, instagram: true, facebook: true, twitter: true, tiktok: true },
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
