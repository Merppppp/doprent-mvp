/**
 * lib/trust-score.ts — Renter reliability tier derived from past booking history.
 *
 * SCHEMA-FREE: reads only existing Booking rows (renterId + status).
 * No prisma/schema.prisma changes. No migrations.
 *
 * PURPOSE: Gives sellers a quick, at-a-glance signal about an incoming renter's
 * track record across ALL shops on the platform.
 */

import { base } from "@/lib/db";
import type { BookingStatus } from "@/lib/types";

// ---------------------------------------------------------------------------
// Thresholds — change these constants to tune the tiers without touching logic.
// ---------------------------------------------------------------------------

/// Minimum number of *resolved* bookings required to leave the NEW tier.
/// (A renter with only 1 booking has too little signal — stay neutral.)
const MIN_RESOLVED_FOR_TIER = 2;

/// Maximum bad-ratio allowed to qualify as RELIABLE (e.g. ≤ 20% bad).
const RELIABLE_BAD_RATIO_MAX = 0.2;

/// Minimum bad-ratio that triggers a CAUTION badge (e.g. ≥ 50% bad).
const CAUTION_BAD_RATIO_MIN = 0.5;

// ---------------------------------------------------------------------------
// Status classification
// ---------------------------------------------------------------------------

/**
 * "Good" outcomes: renter followed through to some positive resolution.
 *   - completed  → full lifecycle finished (best signal)
 *   - returned   → renter returned the item; waiting for shop to close
 *   - confirmed  → payment confirmed; currently in a healthy active booking
 */
const GOOD_STATUSES = new Set<BookingStatus>(["completed", "returned", "confirmed"]);

/**
 * "Bad" outcomes: renter did not honour the booking.
 *   - payment_expired → renter never paid within the 24-hour window
 *   - cancelled       → renter cancelled (or admin-cancelled on renter's behalf)
 *
 * Excluded from ratio (in-flight / seller-initiated / ambiguous):
 *   booking_pending, waiting_for_payment, payment_review,
 *   cancel_requested, slip_disputed, rejected
 */
const BAD_STATUSES = new Set<BookingStatus>(["payment_expired", "cancelled"]);

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type TrustTier = "NEW" | "RELIABLE" | "NORMAL" | "CAUTION";

export type TrustScore = {
  /** Reliability bucket. */
  tier: TrustTier;
  /** Thai display label shown in the badge. */
  label: string;
  /** Visual tone — maps to the same CSS vars used by BookingStatusBadge. */
  tone: "neutral" | "success" | "warn";
  /** Count of good-outcome bookings included in the ratio. */
  good: number;
  /** Count of bad-outcome bookings included in the ratio. */
  bad: number;
  /** good + bad (resolved bookings used for the ratio). */
  total: number;
};

const TIER_META: Record<TrustTier, Pick<TrustScore, "label" | "tone">> = {
  NEW:      { label: "ผู้เช่าใหม่",          tone: "neutral" },
  RELIABLE: { label: "น่าเชื่อถือ",          tone: "success" },
  NORMAL:   { label: "ปกติ",                 tone: "neutral" },
  CAUTION:  { label: "มีประวัติยกเลิกบ่อย", tone: "warn"    },
};

// ---------------------------------------------------------------------------
// Core computation (pure — no I/O)
// ---------------------------------------------------------------------------

function computeTier(good: number, bad: number): TrustTier {
  const total = good + bad;
  if (total < MIN_RESOLVED_FOR_TIER) return "NEW";
  const badRatio = bad / total;
  if (badRatio >= CAUTION_BAD_RATIO_MIN) return "CAUTION";
  if (badRatio <= RELIABLE_BAD_RATIO_MAX) return "RELIABLE";
  return "NORMAL";
}

function buildScore(good: number, bad: number): TrustScore {
  const tier = computeTier(good, bad);
  const { label, tone } = TIER_META[tier];
  return { tier, label, tone, good, bad, total: good + bad };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Compute trust score for a SINGLE renter.
 * Issues one `findMany` query against the bookings table.
 *
 * Use `getTrustScores` (batch) when you already have a list of bookings — it
 * runs just ONE query for all renters combined (no N+1).
 */
export async function getTrustScore(renterId: string): Promise<TrustScore> {
  const rows = await base.booking.findMany({
    where: { renterId },
    select: { status: true },
  });

  let good = 0;
  let bad = 0;
  for (const row of rows) {
    const s = row.status as BookingStatus;
    if (GOOD_STATUSES.has(s)) good++;
    else if (BAD_STATUSES.has(s)) bad++;
  }

  return buildScore(good, bad);
}

/**
 * Batch-compute trust scores for MULTIPLE renters in a single DB round-trip.
 *
 * Issues ONE `findMany` filtered to the given renter set, then reduces the
 * result into per-renter counters in memory — equivalent to GROUP BY without
 * needing raw SQL.
 *
 * Returns Map<renterId, TrustScore>. Every requested renterId has an entry;
 * renters whose bookings returned no resolved rows get the "NEW" score.
 */
export async function getTrustScores(
  renterIds: string[],
): Promise<Map<string, TrustScore>> {
  if (renterIds.length === 0) return new Map();

  // One query: fetch only the two columns we need for all renters at once.
  const rows = await base.booking.findMany({
    where: { renterId: { in: renterIds } },
    select: { renterId: true, status: true },
  });

  // Seed counters for every requested id (ensures every id gets a score).
  const counters = new Map<string, { good: number; bad: number }>();
  for (const id of renterIds) counters.set(id, { good: 0, bad: 0 });

  // Tally resolved outcomes.
  for (const row of rows) {
    const s = row.status as BookingStatus;
    const c = counters.get(row.renterId);
    if (!c) continue; // shouldn't happen, but guard
    if (GOOD_STATUSES.has(s)) c.good++;
    else if (BAD_STATUSES.has(s)) c.bad++;
  }

  // Build result map.
  const result = new Map<string, TrustScore>();
  for (const [id, { good, bad }] of counters) {
    result.set(id, buildScore(good, bad));
  }
  return result;
}
