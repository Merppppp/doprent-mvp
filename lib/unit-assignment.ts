/**
 * lib/unit-assignment.ts
 *
 * Pure, DB-free helpers for assigning a physical ProductUnit to a booking when
 * the shop accepts it. The serialized-inventory model says each booking that
 * holds stock (waiting_for_payment → renting) occupies exactly one unit for its
 * buffered window [startDate − bufferBefore .. endDate + bufferAfter]. Two
 * bookings whose windows overlap can never share a unit.
 *
 * The DB caller (app/actions/bookings.ts) loads units + holding bookings inside
 * a row-locked transaction, then uses these functions to pick a free unit and
 * to detect pending requests that have become unfulfillable.
 */

export type UnitRow = { id: string; code: string };

/** A booking currently holding a unit, with its already-buffered window. */
export type Hold = { unitId: string; winStart: string; winEnd: string };

const DAY = 24 * 3600 * 1000;

/** Add `days` (may be negative) to a YYYY-MM-DD string (UTC). */
function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T00:00:00Z");
  d.setTime(d.getTime() + days * DAY);
  return d.toISOString().slice(0, 10);
}

/** Buffered occupancy window [start − before, end + after] as YYYY-MM-DD strings. */
export function bookingWindow(
  startDate: string,
  endDate: string,
  bufferBefore: number,
  bufferAfter: number,
): { winStart: string; winEnd: string } {
  return {
    winStart: addDays(startDate, -Math.max(0, bufferBefore)),
    winEnd: addDays(endDate, Math.max(0, bufferAfter)),
  };
}

/** Two inclusive windows overlap when neither ends before the other starts. */
export function windowsOverlap(
  aStart: string,
  aEnd: string,
  bStart: string,
  bEnd: string,
): boolean {
  return aStart <= bEnd && aEnd >= bStart;
}

/**
 * Returns the first unit (lowest code) with no holding booking overlapping
 * [winStart, winEnd], or null when every unit is occupied for that window.
 * `units` is assumed pre-sorted by code (greedy, stable assignment).
 */
export function pickFreeUnit(
  units: UnitRow[],
  holds: Hold[],
  winStart: string,
  winEnd: string,
): string | null {
  for (const u of units) {
    const taken = holds.some(
      (h) => h.unitId === u.id && windowsOverlap(h.winStart, h.winEnd, winStart, winEnd),
    );
    if (!taken) return u.id;
  }
  return null;
}

/**
 * True when at least one unit is free for [winStart, winEnd]. Used to decide
 * whether a still-pending request remains fulfillable after another booking was
 * accepted and consumed a unit.
 */
export function hasFreeUnit(
  units: UnitRow[],
  holds: Hold[],
  winStart: string,
  winEnd: string,
): boolean {
  return pickFreeUnit(units, holds, winStart, winEnd) !== null;
}
