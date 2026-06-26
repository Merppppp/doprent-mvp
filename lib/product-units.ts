import { db } from "@/lib/db";
import { BOOKING_BLOCKING_STATUSES } from "@/lib/booking-policy";

// Interactive-transaction shape of our (extended) client — `db.$transaction`'s
// `tx` arg matches this, and the full `db` satisfies it structurally too.
type DbClient = Omit<
  typeof db,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
>;

/**
 * Eagerly reconciles a variant's serialized ProductUnit rows so their count
 * matches `quantity` — units are the single source of truth for booking guards,
 * so they must exist the moment a seller sets a stock number, not lazily on the
 * units page. Codes follow `<slug>-<size>-NNN`, numbered from the lowest unused
 * index so existing units keep stable codes.
 *
 * Increasing quantity tops up new available units. Decreasing it deletes only
 * surplus units that are `available` AND not held by a blocking booking — units
 * in repair/retired or attached to an active rental are never removed (quantity
 * is a floor for those, not a cap). Idempotent and safe under concurrency
 * (skipDuplicates on the unique [variantId, code]).
 */
export async function syncVariantUnits(
  variantId: string,
  size: string,
  productSlug: string,
  quantity: number,
  client: DbClient = db,
): Promise<void> {
  const target = Math.max(0, quantity);
  const units = await client.productUnit.findMany({
    where: { variantId },
    select: { id: true, code: true, status: true },
    orderBy: { code: "asc" },
  });

  if (units.length < target) {
    const existing = new Set(units.map((u) => u.code));
    const toCreate: { variantId: string; code: string }[] = [];
    let n = 1;
    while (units.length + toCreate.length < target) {
      const code = `${productSlug}-${size}-${String(n).padStart(3, "0")}`;
      if (!existing.has(code)) toCreate.push({ variantId, code });
      n++;
    }
    if (toCreate.length > 0) {
      await client.productUnit.createMany({ data: toCreate, skipDuplicates: true });
    }
    return;
  }

  if (units.length > target) {
    const surplus = units.length - target;
    const free = units.filter((u) => u.status === "available");
    if (free.length === 0) return;
    const held = await client.bookingItem.findMany({
      where: {
        unitId: { in: free.map((u) => u.id) },
        booking: { status: { in: [...BOOKING_BLOCKING_STATUSES] } },
      },
      select: { unitId: true },
    });
    const heldIds = new Set(held.map((b) => b.unitId));
    const deletable = free
      .filter((u) => !heldIds.has(u.id))
      .sort((a, b) => b.code.localeCompare(a.code))
      .slice(0, surplus)
      .map((u) => u.id);
    if (deletable.length > 0) {
      await client.productUnit.deleteMany({ where: { id: { in: deletable } } });
    }
  }
}

/**
 * Per-code (unit-level) blackout rows for a variant whose date falls in
 * [startYmd, endYmd] inclusive. A seller closes a single physical unit on a
 * given date via ProductBlackoutDate rows that carry both variantId and unitId.
 * Booking guards use these to drop a unit from the assignable pool whenever its
 * closed date intersects the booking's window, and the day-count capacity path
 * uses them to shrink capacity on the affected days.
 */
export async function blockedUnitDatesInRange(
  client: DbClient,
  variantId: string,
  startYmd: string,
  endYmd: string,
): Promise<{ unitId: string; ymd: string }[]> {
  const rows = await client.productBlackoutDate.findMany({
    where: {
      variantId,
      unitId: { not: null },
      date: { gte: new Date(startYmd), lte: new Date(endYmd) },
    },
    select: { unitId: true, date: true },
  });
  return rows.map((r) => ({ unitId: r.unitId as string, ymd: r.date.toISOString().slice(0, 10) }));
}

export type UnitView = {
  id: string;
  code: string;
  status: "available" | "rented" | "repair" | "retired" | "lost";
  note: string | null;
  lostFromBookingId: string | null;
};

export type VariantUnits = {
  variantId: string;
  size: string;
  quantity: number;
  available: boolean;
  units: UnitView[];
};

/**
 * Loads each variant of a product with its serialized physical units, seeding
 * missing units lazily so the count matches the variant's `quantity` column.
 *
 * Serialized inventory is opt-in per product: legacy products start with zero
 * units, so the first visit to the unit-management screen backfills them. The
 * seed is idempotent (skipDuplicates + sequential `<size>-NNN` codes), so
 * concurrent visits simply no-op. Units already marked repair/retired are never
 * deleted — `quantity` is only ever a floor for the seed, not a hard cap.
 */
export async function loadProductUnits(productId: string): Promise<VariantUnits[]> {
  const product = await db.product.findUnique({
    where: { id: productId },
    select: { slug: true },
  });
  const prefix = product?.slug ?? productId;

  const variants = await db.productVariant.findMany({
    where: { productId },
    orderBy: { size: "asc" },
    select: {
      id: true,
      size: true,
      quantity: true,
      available: true,
      units: {
        orderBy: { code: "asc" },
        select: { id: true, code: true, status: true, note: true, lostFromBookingId: true },
      },
    },
  });

  let seeded = false;
  for (const v of variants) {
    if (v.units.length >= v.quantity) continue;
    const existing = new Set(v.units.map((u) => u.code));
    const toCreate: { variantId: string; code: string }[] = [];
    let n = 1;
    while (v.units.length + toCreate.length < v.quantity) {
      const code = `${prefix}-${v.size}-${String(n).padStart(3, "0")}`;
      if (!existing.has(code)) toCreate.push({ variantId: v.id, code });
      n++;
    }
    if (toCreate.length > 0) {
      await db.productUnit.createMany({ data: toCreate, skipDuplicates: true });
      seeded = true;
    }
  }

  if (!seeded) {
    return variants.map((v) => ({
      variantId: v.id,
      size: v.size,
      quantity: v.quantity,
      available: v.available,
      units: v.units as UnitView[],
    }));
  }

  const reread = await db.productVariant.findMany({
    where: { productId },
    orderBy: { size: "asc" },
    select: {
      id: true,
      size: true,
      quantity: true,
      available: true,
      units: {
        orderBy: { code: "asc" },
        select: { id: true, code: true, status: true, note: true, lostFromBookingId: true },
      },
    },
  });
  return reread.map((v) => ({
    variantId: v.id,
    size: v.size,
    quantity: v.quantity,
    available: v.available,
    units: v.units as UnitView[],
  }));
}
