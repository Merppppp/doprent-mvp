/** Add `days` calendar days to a YYYY-MM-DD string (UTC). Mirrors the helper in booking-policy.ts. */
export function addDaysLocal(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Enumerate all YYYY-MM-DD strings in [start, end] inclusive (UTC). */
export function dateRangeLocal(start: string, end: string): string[] {
  const result: string[] = [];
  let cur = start;
  while (cur <= end) {
    result.push(cur);
    cur = addDaysLocal(cur, 1);
  }
  return result;
}
