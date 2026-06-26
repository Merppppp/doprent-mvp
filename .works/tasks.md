# Plan: Size-Aware Availability — Customer Flow + Seller Inventory View

> Created: 2026-06-22
> Project: doprent-mvp

---

## Overview

### User Story
ลูกค้าที่เข้าจองต้องเห็นขนาดและจำนวนชุดที่เหลือต่อไซส์อย่างชัดเจน รวมถึง seller ต้องมองเห็นสต็อกต่อไซส์ / ชุดที่ติดเช่าอยู่ / และดูแบบรายวันได้ว่าไซส์ไหนว่างเหลือกี่ตัว

### What already works (do NOT re-implement)
- `ProductVariant` has `quantity` per size — schema is complete, no migration needed
- `Booking.variantId` already nullable FK to `ProductVariant` — bookings are already size-linked
- `computeUnavailableDates()` in `lib/booking-policy.ts` already handles `quantity > 1` (multi-unit blocking only when `count >= quantity`)
- `createBooking` server action already does per-size oversell prevention via DB transaction
- `DateRangePicker` already accepts `variants: VariantOption[]` with per-variant `unavailable` dates

### What is missing
1. `DateRangePicker` does NOT show remaining qty per size for a selected date range (shows total qty but not "เหลือ X ตัว")
2. Booking query results (`getSellerBookingsPage`, `getRenterBookingsPage`, `toBookingDetail`) do NOT include variant size label
3. Seller products list shows variant sizes but NOT quantities and NOT booked-today counts
4. No seller day-view: pick a date → see per-size stock snapshot

### Flow / Sequence
T1 (booking queries) is independent. T2 (customer UI) is independent. T3 (seller products list) is independent. T4 (seller day-view) depends on a new server function from T3.

### References
- `lib/booking-policy.ts` — `computeUnavailableDates()`, `resolveEffectivePolicy()`, `validateBookingRange()`
- `lib/booking-queries.ts` — `toBookingDetail`, `getSellerBookingsPage`, `getRenterBookingsPage`
- `lib/bookings.ts` — `ACTIVE_STATUSES`, `isActive()`
- `app/(storefront)/product/[id]/page.tsx` — customer product detail, builds `variantOptions` array
- `components/DateRangePicker.tsx` — client component, `VariantOption` type, size selection UI
- `app/sell/(authed)/products/page.tsx` — seller products table

---

## Tasks

---

## Task 1: Add size label to all booking query results — `doprent-mvp`

> Booking cards and detail views currently don't show which size was booked. This task threads `variant.size` through all query helpers and the booking list UIs so every booking card shows "ไซส์: M".

### T1.S1 — Extend booking query helpers to include variant size

**Depends on:** None
**AI:** Open GPT

**Prompt:**

```
You are working on doprent-mvp, a Next.js 14 App Router + Prisma project (Thai dress-rental marketplace).

GOAL: Add variant size to all booking query results so UI can display "ไซส์: M" on booking cards.

FILES TO EDIT:
1. lib/booking-queries.ts

CHANGES NEEDED:

A) In the `toBookingDetail` mapper function:
   - The `PrismaBookingWithJoins` type (inline or imported) currently includes `product` and `shop` joins. Add `variant: { size: string } | null` to this Prisma select type.
   - In the mapper, add `size: b.variant?.size ?? null` to the returned `BookingDetail` object.

B) In `getSellerBookingsPage()`:
   - The inner `select` already picks product name/image. Add `variant: { select: { size: true } }` to the select.
   - In the mapping step that builds `SellerBookingCard`, add `size: r.variant?.size ?? null`.

C) In `getRenterBookingsPage()`:
   - Same pattern: add `variant: { select: { size: true } }` to select, add `size` to the mapped result.

D) In `getBookingForView()`:
   - The query loads product + shop. Add `variant: { select: { size: true, quantity: true } }`.
   - In the returned object (or `BookingDetail`), add `size` and `variantQty`.

IMPORTANT CONSTRAINTS:
- Keep TypeScript types consistent — if `BookingDetail` type is defined in `lib/types.ts` or inline, add `size: string | null` to it.
- Do NOT change any status transition logic, email notifications, or DB writes.
- Thai error strings stay Thai; code/identifiers stay English.

---
When you finish this step, open `.works/tasks.md` and update ONLY the status line of T1.S1:
Change: `**Status:** ⏳ Pending`
To:     `**Status:** ✅ Done`
Do not modify any other part of the file.
```

**Status:** ⏳ Pending

---

### T1.S2 — Show size label in seller and renter booking list UIs

**Depends on:** T1.S1 must be done first
**AI:** Open GPT

**Prompt:**

```
You are working on doprent-mvp, a Next.js 14 App Router + Prisma project (Thai dress-rental marketplace).

CONTEXT: T1.S1 added `size: string | null` to `SellerBookingCard`, `RenterBookingCard`, and `BookingDetail` returned by the query helpers. Now expose it in the UI.

FILES TO EDIT:
1. app/sell/(authed)/bookings/page.tsx — seller booking list
2. app/account/bookings/page.tsx — renter booking list (if it exists; find the actual path)
3. app/(storefront)/account/bookings/page.tsx — alternative path if above not found

CHANGES NEEDED:

For each booking card / table row that shows a product name and date range, add a small size badge next to the product name:

```tsx
{booking.size && (
  <span style={{ fontSize: 11, fontWeight: 600, background: "var(--bg-hover, rgba(0,0,0,0.06))", borderRadius: 4, padding: "1px 6px", color: "var(--ink-2)", whiteSpace: "nowrap" }}>
    ไซส์ {booking.size}
  </span>
)}
```

Also: in the booking DETAIL view (`app/sell/(authed)/bookings/[id]/page.tsx` or similar), add a row in the booking info table:
- Label: "ไซส์ที่จอง"
- Value: booking.size ?? "ไม่ระบุ (booking เก่า)"

CONSTRAINTS:
- Show size only when non-null (legacy bookings have null variantId → null size → show "ไม่ระบุ")
- Do not change layout or other UI elements
- Keep existing Tailwind/inline-style patterns used in the file

---
When you finish this step, open `.works/tasks.md` and update ONLY the status line of T1.S2:
Change: `**Status:** ⏳ Pending`
To:     `**Status:** ✅ Done`
Do not modify any other part of the file.
```

**Status:** ⏳ Pending

---

## Task 2: Show per-size remaining qty to customer in DateRangePicker — `doprent-mvp`

> When a customer selects a date range, each size button should show how many units remain (total - max concurrent bookings in that range). Currently DateRangePicker knows `quantity` per variant but doesn't show remaining counts.

### T2.S1 — Pass daily booking counts to DateRangePicker from the product detail page

**Depends on:** None
**AI:** Claude Sonnet

**Prompt:**

```
You are working on doprent-mvp, a Next.js 14 App Router + Prisma project (Thai dress-rental marketplace).

GOAL: Allow the DateRangePicker to compute and display remaining available units per size for a selected date range.

CONTEXT:
- File: app/(storefront)/product/[id]/page.tsx
  This RSC already fetches all ProductVariants for a product, including their active bookings, to build `variantOptions: VariantOption[]` (defined in components/DateRangePicker.tsx).
- File: components/DateRangePicker.tsx
  VariantOption currently has: { id, size, quantity, pricePerDay, deposit, available, unavailable?: string[] }
- File: lib/booking-policy.ts
  computeUnavailableDates() takes bookings, quantity, policy and returns a Set<string> of fully-blocked dates.

STEP 1 — Extend VariantOption in components/DateRangePicker.tsx:
Add a new optional field:
  `dailyBooked?: Record<string, number>`
This is a map of YYYY-MM-DD → concurrent active booking count for that day for this variant.

STEP 2 — Compute dailyBooked in app/(storefront)/product/[id]/page.tsx:
For each variant, when building variantOptions, compute dailyBooked:
```typescript
// active booking statuses that hold inventory
const ACTIVE = new Set(["booking_pending","waiting_for_payment","payment_review","confirmed","renting"]);
function buildDailyBooked(bookings: {startDate: Date; endDate: Date; status: string}[], bufferDaysAfter: number): Record<string, number> {
  const map: Record<string, number> = {};
  for (const b of bookings) {
    if (!ACTIVE.has(b.status)) continue;
    let cur = new Date(b.startDate);
    const end = new Date(b.endDate);
    end.setUTCDate(end.getUTCDate() + bufferDaysAfter);
    while (cur <= end) {
      const key = cur.toISOString().slice(0, 10);
      map[key] = (map[key] ?? 0) + 1;
      cur.setUTCDate(cur.getUTCDate() + 1);
    }
  }
  return map;
}
```
Pass it as `dailyBooked` in each VariantOption.

The variants query already loads `bookings` for each variant (scoped to ACTIVE statuses). If it doesn't, add:
```typescript
bookings: {
  where: { status: { in: ["booking_pending","waiting_for_payment","payment_review","confirmed","renting"] } },
  select: { startDate: true, endDate: true, status: true },
},
```

STEP 3 — SKIP the DateRangePicker UI change (that's T2.S2). This step only extends the data flow.

CONSTRAINTS:
- bufferDaysAfter comes from effectivePolicy — pass it when calling buildDailyBooked
- Do NOT change the DateRangePicker component in this step
- Do NOT modify createBooking or any server actions
- TypeScript must stay clean (run `npm run typecheck` to verify)

---
When you finish this step, open `.works/tasks.md` and update ONLY the status line of T2.S1:
Change: `**Status:** ⏳ Pending`
To:     `**Status:** ✅ Done`
Do not modify any other part of the file.
```

**Status:** ⏳ Pending

---

### T2.S2 — Show "เหลือ X ตัว" remaining count on size buttons in DateRangePicker

**Depends on:** T2.S1 must be done first
**AI:** Claude Sonnet

**Prompt:**

```
You are working on doprent-mvp, a Next.js 14 App Router + Prisma project (Thai dress-rental marketplace).

GOAL: In the DateRangePicker client component, show remaining available units per size once the customer selects a date range.

FILE TO EDIT: components/DateRangePicker.tsx

CONTEXT:
- `VariantOption` now has `dailyBooked?: Record<string, number>` (map of YYYY-MM-DD → concurrent bookings on that day for this variant). Added in T2.S1.
- The component already tracks `selectedVariant` (the chosen VariantOption) and `startDate`/`endDate` (selected range as strings).
- Size buttons are already rendered for each variant. They already show the size label and price.
- `quantity` in VariantOption is the total stock for that size.

CHANGES NEEDED:

A) Add a helper function (inside or above the component):
```typescript
function remainingQty(variant: VariantOption, start: string | null, end: string | null): number | null {
  if (!start || !end || !variant.dailyBooked) return null;
  let maxBooked = 0;
  let cur = start;
  while (cur <= end) {
    maxBooked = Math.max(maxBooked, variant.dailyBooked[cur] ?? 0);
    const d = new Date(cur + "T00:00:00Z");
    d.setUTCDate(d.getUTCDate() + 1);
    cur = d.toISOString().slice(0, 10);
  }
  return Math.max(0, variant.quantity - maxBooked);
}
```

B) In the size button rendering, after selecting a date range (i.e., when both `startDate` and `endDate` are set), display the remaining count:
```tsx
const remaining = remainingQty(v, startDate, endDate);
// ...inside each size button:
{remaining !== null && (
  <span style={{ fontSize: 10, opacity: 0.75 }}>
    {remaining === 0 ? "เต็ม" : `เหลือ ${remaining} ตัว`}
  </span>
)}
```

C) When `remaining === 0` for a variant, treat it the same as `!v.available` — disable the size button and prevent selection (even if the dates individually aren't "fully blocked" by unavailable set, a remaining of 0 means no stock for that range).

D) Style the badge:
- "เหลือ X ตัว" → green-tinted or neutral (remaining > 0)
- "เต็ม" → red-tinted, e.g., `color: "#ef4444"`

CONSTRAINTS:
- The `remaining` display only shows AFTER the user picks both start and end date (not before, since it depends on the range)
- Do not change the calendar rendering, date validation, or checkout URL logic
- The `isFullForRange` variable (if it already exists in the component) should now also be set when `remaining === 0`
- TypeScript must stay clean

---
When you finish this step, open `.works/tasks.md` and update ONLY the status line of T2.S2:
Change: `**Status:** ⏳ Pending`
To:     `**Status:** ✅ Done`
Do not modify any other part of the file.
```

**Status:** ⏳ Pending

---

## Task 3: Seller products list — per-size inventory and day-view — `doprent-mvp`

> Seller product table must show total qty per size and how many are booked today. Plus an inline day-picker that lets the seller check availability on any date.

### T3.S1 — Add per-size qty + today's active booking counts to seller products query

**Depends on:** None
**AI:** Claude Sonnet

**Prompt:**

```
You are working on doprent-mvp, a Next.js 14 App Router + Prisma project (Thai dress-rental marketplace).

GOAL: Extend the seller products page data query to include (a) quantity per size variant and (b) how many bookings are active TODAY per size.

FILE TO EDIT: app/sell/(authed)/products/page.tsx

CURRENT QUERY (approximate):
```typescript
db.product.findMany({
  where: { shopId },
  orderBy: { createdAt: "desc" },
  select: {
    id, slug, tagCode, name, designer, size, color, pricePerDay,
    status, rejectReason, available, views,
    images: { take: 1 },
    variants: { select: { size: true, available: true } },
  },
})
```

CHANGE NEEDED — Extend `variants` select:
```typescript
variants: {
  orderBy: { size: "asc" },
  select: {
    id: true,
    size: true,
    quantity: true,
    available: true,
    _count: {
      select: {
        bookings: {
          where: {
            status: { in: ["booking_pending","waiting_for_payment","payment_review","confirmed","renting"] },
            startDate: { lte: today },
            endDate: { gte: today },
          },
        },
      },
    },
  },
},
```

Where `today` is computed once above the query:
```typescript
const today = new Date();
today.setUTCHours(0, 0, 0, 0);
```

This gives, for each variant: size, total quantity, available flag, and count of bookings that overlap today.

The "_count.bookings" field in Prisma gives the count of related records matching the `where` filter. For the product page we need the count per variant.

CONSTRAINTS:
- Active booking statuses: "booking_pending", "waiting_for_payment", "payment_review", "confirmed", "renting"
- Keep all existing columns in the query select — do not remove any
- TypeScript: add appropriate types for the extended variant shape
- Run `npm run typecheck` to verify

---
When you finish this step, open `.works/tasks.md` and update ONLY the status line of T3.S1:
Change: `**Status:** ⏳ Pending`
To:     `**Status:** ✅ Done`
Do not modify any other part of the file.
```

**Status:** ⏳ Pending

---

### T3.S2 — Render per-size inventory panel in the seller products table

**Depends on:** T3.S1 must be done first
**AI:** Open GPT

**Prompt:**

```
You are working on doprent-mvp, a Next.js 14 App Router + Prisma project (Thai dress-rental marketplace).

GOAL: In the seller products table, replace the current "size" column (which only shows size labels) with a per-size inventory grid showing quantity and how many are booked today.

FILE TO EDIT: app/sell/(authed)/products/page.tsx

DATA AVAILABLE per variant (from T3.S1):
  - variant.size: string (e.g. "M")
  - variant.quantity: number (total stock, e.g. 3)
  - variant.available: boolean
  - variant._count.bookings: number (active bookings overlapping today)

CHANGE:
Replace wherever `formatVariantSizes(d.variants, d.size)` is rendered (size column) with a new inline component:

```tsx
function SizeInventoryBadges({ variants }: { variants: typeof d.variants }) {
  if (!variants.length) return <span style={{ color: "var(--ink-3)", fontSize: 12 }}>—</span>;
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
      {variants.map(v => {
        const booked = v._count.bookings;
        const free = v.quantity - booked;
        return (
          <span key={v.size} style={{
            fontSize: 11,
            fontWeight: 600,
            padding: "2px 7px",
            borderRadius: 6,
            background: !v.available ? "rgba(0,0,0,0.05)" : free === 0 ? "rgba(239,68,68,0.1)" : "rgba(16,185,129,0.1)",
            color: !v.available ? "var(--ink-3)" : free === 0 ? "#dc2626" : "#059669",
            border: "1px solid",
            borderColor: !v.available ? "rgba(0,0,0,0.08)" : free === 0 ? "rgba(239,68,68,0.25)" : "rgba(16,185,129,0.25)",
          }}>
            {v.size}
            <span style={{ fontWeight: 400, marginLeft: 3, opacity: 0.8 }}>
              {!v.available ? "(ปิด)" : `${free}/${v.quantity}`}
            </span>
          </span>
        );
      })}
    </div>
  );
}
```

Legend for the badge: `{size} {free}/{total}` — e.g. "M 2/3" means size M has 3 units, 2 free today.
- Green = free > 0 and available
- Red = free = 0 (fully booked today)
- Gray = variant.available = false (seller paused this size)

Also add a small legend note above the table (once, not per row):
```tsx
<p style={{ fontSize: 11, color: "var(--ink-3)", margin: "4px 0 8px" }}>
  ไซส์: จำนวนว่าง/ทั้งหมด (วันนี้)
</p>
```

CONSTRAINTS:
- The SizeInventoryBadges function can be a plain function in the same file (it's an RSC, no 'use client' needed here)
- Remove the now-unused `formatVariantSizes` call for this column (keep the import if used elsewhere)
- Do not change any other columns or the action buttons

---
When you finish this step, open `.works/tasks.md` and update ONLY the status line of T3.S2:
Change: `**Status:** ⏳ Pending`
To:     `**Status:** ✅ Done`
Do not modify any other part of the file.
```

**Status:** ⏳ Pending

---

### T3.S3 — Add server action for per-size availability by date

**Depends on:** None (can run parallel to T3.S1 and T3.S2)
**AI:** Open GPT

**Prompt:**

```
You are working on doprent-mvp, a Next.js 14 App Router + Prisma project (Thai dress-rental marketplace).

GOAL: Create a new server action `getVariantAvailabilityByDate` that the seller can call to check per-size stock on any chosen date.

FILE TO EDIT: app/actions/availability.ts (create if not exists, otherwise add to it)

FUNCTION SIGNATURE:
```typescript
export async function getVariantAvailabilityByDate(
  productId: string,
  date: string // YYYY-MM-DD
): Promise<{ ok: true; rows: VariantAvailRow[] } | { ok: false; error: string }>

type VariantAvailRow = {
  variantId: string;
  size: string;
  quantity: number;
  available: boolean; // variant-level toggle
  bookedCount: number; // concurrent active bookings on `date`
  freeCount: number; // quantity - bookedCount (capped at 0)
}
```

IMPLEMENTATION:
```typescript
"use server"
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

const ACTIVE_STATUSES = ["booking_pending","waiting_for_payment","payment_review","confirmed","renting"] as const;

export async function getVariantAvailabilityByDate(productId: string, date: string) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) return { ok: false as const, error: "กรุณาเข้าสู่ระบบ" };

  // Authorization: seller must own the shop that owns this product
  const product = await db.product.findUnique({
    where: { id: productId },
    select: { shopId: true, shop: { select: { ownerId: true } } },
  });
  if (!product) return { ok: false as const, error: "ไม่พบสินค้า" };
  if (product.shop.ownerId !== user.id && user.role !== "admin")
    return { ok: false as const, error: "ไม่มีสิทธิ์" };

  const targetDate = new Date(date + "T00:00:00Z");

  const variants = await db.productVariant.findMany({
    where: { productId },
    orderBy: { size: "asc" },
    select: {
      id: true,
      size: true,
      quantity: true,
      available: true,
      _count: {
        select: {
          bookings: {
            where: {
              status: { in: ACTIVE_STATUSES },
              startDate: { lte: targetDate },
              endDate: { gte: targetDate },
            },
          },
        },
      },
    },
  });

  const rows: VariantAvailRow[] = variants.map(v => ({
    variantId: v.id,
    size: v.size,
    quantity: v.quantity,
    available: v.available,
    bookedCount: v._count.bookings,
    freeCount: Math.max(0, v.quantity - v._count.bookings),
  }));

  return { ok: true as const, rows };
}
```

CONSTRAINTS:
- Use `"use server"` directive at top
- Validate that the requesting user owns the shop (or is admin)
- Return discriminated union `{ ok: true, rows } | { ok: false, error }`
- Export the `VariantAvailRow` type so the client component can import it

---
When you finish this step, open `.works/tasks.md` and update ONLY the status line of T3.S3:
Change: `**Status:** ⏳ Pending`
To:     `**Status:** ✅ Done`
Do not modify any other part of the file.
```

**Status:** ⏳ Pending

---

### T3.S4 — Add inline day-picker availability panel to seller products page

**Depends on:** T3.S2 and T3.S3 must be done first
**AI:** Claude Sonnet

**Prompt:**

```
You are working on doprent-mvp, a Next.js 14 App Router + Prisma project (Thai dress-rental marketplace).

GOAL: Add a "ตรวจสอบสต็อกรายวัน" (check daily stock) client component to the seller products page. The seller picks a product and a date, clicks check, and sees per-size availability for that date.

FILES TO EDIT/CREATE:
1. Create: components/SellerStockChecker.tsx  (new 'use client' component)
2. Edit: app/sell/(authed)/products/page.tsx  (import and render SellerStockChecker)

COMPONENT SPEC — SellerStockChecker.tsx:
```tsx
"use client";
import { useState, useTransition } from "react";
import { getVariantAvailabilityByDate } from "@/app/actions/availability";
import type { VariantAvailRow } from "@/app/actions/availability";

type Props = {
  products: { id: string; name: string }[];
};

export default function SellerStockChecker({ products }: Props) {
  const [productId, setProductId] = useState(products[0]?.id ?? "");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [rows, setRows] = useState<VariantAvailRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function check() {
    startTransition(async () => {
      const result = await getVariantAvailabilityByDate(productId, date);
      if (result.ok) {
        setRows(result.rows);
        setError(null);
      } else {
        setError(result.error);
        setRows(null);
      }
    });
  }

  return (
    <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 10, padding: "16px 20px", marginBottom: 20 }}>
      <p style={{ fontWeight: 700, fontSize: 14, marginBottom: 12 }}>ตรวจสอบสต็อกรายวัน</p>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-end" }}>
        <div>
          <label style={{ fontSize: 12, color: "var(--ink-2)" }}>สินค้า</label>
          <select value={productId} onChange={e => setProductId(e.target.value)} className="input" style={{ fontSize: 13, display: "block" }}>
            {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div>
          <label style={{ fontSize: 12, color: "var(--ink-2)" }}>วันที่</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} className="input" style={{ fontSize: 13, display: "block" }} />
        </div>
        <button onClick={check} disabled={isPending} className="btn btn-primary" style={{ height: 38 }}>
          {isPending ? "กำลังโหลด..." : "ตรวจสอบ"}
        </button>
      </div>

      {error && <p style={{ color: "#dc2626", fontSize: 13, marginTop: 10 }}>{error}</p>}

      {rows && (
        <table style={{ marginTop: 14, borderCollapse: "collapse", width: "100%", maxWidth: 400, fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--line)" }}>
              <th style={{ textAlign: "left", padding: "4px 8px", color: "var(--ink-2)", fontWeight: 600 }}>ไซส์</th>
              <th style={{ textAlign: "center", padding: "4px 8px", color: "var(--ink-2)", fontWeight: 600 }}>ทั้งหมด</th>
              <th style={{ textAlign: "center", padding: "4px 8px", color: "var(--ink-2)", fontWeight: 600 }}>ติดเช่า</th>
              <th style={{ textAlign: "center", padding: "4px 8px", color: "var(--ink-2)", fontWeight: 600 }}>ว่าง</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.variantId} style={{ borderBottom: "1px solid var(--line)", opacity: r.available ? 1 : 0.4 }}>
                <td style={{ padding: "6px 8px", fontWeight: 600 }}>{r.size}{!r.available && " (ปิด)"}</td>
                <td style={{ padding: "6px 8px", textAlign: "center" }}>{r.quantity}</td>
                <td style={{ padding: "6px 8px", textAlign: "center", color: r.bookedCount > 0 ? "#dc2626" : "var(--ink-3)" }}>{r.bookedCount}</td>
                <td style={{ padding: "6px 8px", textAlign: "center", color: r.freeCount > 0 ? "#059669" : "#dc2626", fontWeight: 700 }}>{r.freeCount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
```

In app/sell/(authed)/products/page.tsx:
- Import `SellerStockChecker`
- Render it above the products table, passing `products={dresses.map(d => ({ id: d.id, name: d.name }))}`

CONSTRAINTS:
- Use `useTransition` (not useState loading flag) to call the server action without wrapping in a form
- Style matches existing seller pages (var(--surface), var(--line), .input, .btn, .btn-primary classes)
- No additional npm packages needed
- TypeScript must stay clean

---
When you finish this step, open `.works/tasks.md` and update ONLY the status line of T3.S4:
Change: `**Status:** ⏳ Pending`
To:     `**Status:** ✅ Done`
Do not modify any other part of the file.
```

**Status:** ⏳ Pending
