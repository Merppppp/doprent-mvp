# Similar Dresses — Code Review Pack

**Context:** The `/dress/[slug]` page has a "ชุดที่คล้ายกัน" rail. Until this change, it called `listDresses({ limit: 4 })` and the dev-page filter `.filter(d => d.id !== seed.id).slice(0, 4)` — i.e. it just rendered the 4 newest live dresses, no similarity at all.

**Goal:** Real content-based similarity using fields already on the `dresses` table. No schema changes.

**Stack reminder:** Next.js 14 App Router (RSC), Supabase Postgres via `@supabase/ssr`, TypeScript strict.

---

## Files changed

1. `lib/dresses.ts` — new exported function `listSimilarDresses(seed, limit)`
2. `app/dress/[id]/page.tsx` — swap call site, hide section when empty

No migration. No new dependencies.

---

## 1. `lib/dresses.ts` — new function

Added below `listDresses()` and above `listDressesByBoutique()`. Uses the existing `PUBLIC_DRESS_QUERY` constant and `fetchVerifiedBoutiqueIds()` helper that both other list functions use, so behaviour stays consistent (e.g. denormalized `boutique_verified` flag).

```ts
/**
 * Content-based similarity scorer for the "ชุดที่คล้ายกัน" rail on
 * /dress/[slug]. Pools up to 60 recent live+available candidates (excluding
 * the seed dress), ranks them in-memory, returns the top `limit`.
 *
 * Weights — tuned for renter intent on DopRent (occasion is the primary
 * decision axis, then color/size/price band):
 *
 *   occasion overlap (Jaccard on shared keys)  ×5
 *   same color                                 ×3
 *   same size                                  ×3
 *   price within ±30%                          ×2
 *   same designer (when both have one)         ×2
 *   same boutique                              ×1  (low — section is
 *     primarily for discovery, the boutique card on the page already
 *     surfaces same-boutique inventory)
 *
 * Fallback: if scored pool yields fewer than `limit` results (e.g. tiny
 * inventory or every candidate scored 0), pads from the recency-sorted
 * remainder so the rail never renders empty.
 */
export async function listSimilarDresses(seed: Dress, limit = 4): Promise<Dress[]> {
  const sb = getSupabase();
  if (!sb) return [];

  const [{ data, error }, verifiedSet] = await Promise.all([
    sb
      .from("dresses")
      .select(PUBLIC_DRESS_QUERY)
      .eq("status", "live")
      .eq("available", true)
      .neq("id", seed.id)
      .order("featured", { ascending: false })
      .order("sponsored", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(60),
    fetchVerifiedBoutiqueIds(),
  ]);
  if (error) {
    console.error("[doprent] supabase listSimilarDresses error", error);
    return [];
  }
  const pool: Dress[] = ((data ?? []) as Dress[]).map((d) => ({
    ...d,
    boutique_verified: verifiedSet.has(d.boutique_id),
  }));

  const seedOcc = new Set(seed.occasions ?? []);
  const seedPrice = seed.price_per_day;
  const priceBand = seedPrice * 0.3; // ±30% window

  const scored = pool.map((d) => {
    let score = 0;

    // Occasion overlap — Jaccard to prevent a dress tagged for every
    // occasion from dominating purely on tag count.
    const dOcc = d.occasions ?? [];
    if (seedOcc.size && dOcc.length) {
      const shared = dOcc.filter((o) => seedOcc.has(o)).length;
      const union = new Set([...seedOcc, ...dOcc]).size;
      if (union > 0) score += (shared / union) * 5;
    }

    if (d.color === seed.color) score += 3;
    if (d.size === seed.size) score += 3;

    if (Math.abs(d.price_per_day - seedPrice) <= priceBand) score += 2;

    if (seed.designer && d.designer && d.designer === seed.designer) score += 2;

    if (d.boutique_id === seed.boutique_id) score += 1;

    return { dress: d, score };
  });

  // Sort by score desc, then by recency (pool already pre-sorted, so a
  // stable sort preserves recency among ties).
  scored.sort((a, b) => b.score - a.score);

  const ranked = scored.filter((s) => s.score > 0).map((s) => s.dress);

  if (ranked.length >= limit) return ranked.slice(0, limit);

  // Fallback: pad from recency-sorted pool, skipping anything already in
  // the ranked list, so the rail always renders `limit` items if there
  // are at least `limit` other live dresses in the catalogue.
  const rankedIds = new Set(ranked.map((d) => d.id));
  const padding = pool.filter((d) => !rankedIds.has(d.id));
  return [...ranked, ...padding].slice(0, limit);
}
```

### Why these design choices

- **Pool of 60 + in-memory scoring** instead of computing similarity in SQL. Catalogue size today is small (low hundreds at most), and Supabase RLS makes scoring-in-SQL awkward. In-memory rank is O(n) for n=60 — trivial. Revisit if catalogue passes ~5k live dresses.
- **Jaccard for occasions** rather than raw shared-count. A dress tagged with all 8 occasions would otherwise dominate every result. Jaccard penalises tag-stuffing.
- **Price band ±30%** rather than absolute distance. Keeps the comparison budget-cohort aware (a ฿500/day and ฿15,000/day dress should never be "similar").
- **Same boutique weight is intentionally low (×1).** The boutique card higher up on the page already links to the boutique's full inventory; the rail's value is discovery across boutiques. Confirmed with PM.
- **Defensive nullability:** `seed.occasions ?? []`, `seed.designer && d.designer && …` — these fields can be null on legacy rows.
- **Recency tiebreaker for free** by relying on JS `Array.prototype.sort` being stable since ES2019 and the pool already being sorted by `created_at desc` from the query.

### Edge cases handled

| Case | Behaviour |
|---|---|
| No Supabase client (build-time) | Returns `[]` |
| Query error | Logs, returns `[]` |
| Seed has no occasions / no designer | Those signals skip cleanly, no NaN |
| Catalogue has < 4 other dresses | Returns whatever exists (page hides section if 0) |
| Every candidate scores 0 | Fallback pads with recency order |
| Seed price is 0 (free? deposit-only?) | `priceBand = 0`, only exact-match price contributes — acceptable degraded behaviour |

---

## 2. `app/dress/[id]/page.tsx` — call site changes

### Import diff

```diff
 import {
   getBoutiqueBySlug,
   getDressBySlug,
   listBlackouts,
-  listDresses,
   listOccasions,
+  listSimilarDresses,
 } from "@/lib/dresses";
```

### Data-fetch diff

```diff
 const [occasions, boutique, related, user, blackouts] = await Promise.all([
   listOccasions(),
   getBoutiqueBySlug(slugify(dress.boutique_name)).catch(() => null),
-  listDresses({ limit: 4 }),
+  listSimilarDresses(dress, 4),
   getCurrentUser().catch(() => null),
   listBlackouts(dress.id),
 ]);
```

### Render diff

```diff
-{/* RELATED */}
-<div style={{ paddingTop: 48, paddingBottom: 60, borderTop: "1px solid var(--line)" }}>
-  <div className="section-head" style={{ ... }}>
-    <h2 ...>ชุดที่คล้ายกัน</h2>
-    <Link href="/browse" ...>ดูทั้งหมด →</Link>
-  </div>
-  <div className="grid-4" style={{ gap: 20 }}>
-    {related.filter((d) => d.id !== dress.id).slice(0, 4).map((d, i) => (
-      <DressCard key={d.id} dress={d} variant={i} savedSet={savedSet} isLoggedIn={isLoggedIn} />
-    ))}
-  </div>
-</div>
+{/* RELATED — content-based similarity: occasion overlap, color, size,
+    price band, designer, boutique (see listSimilarDresses). Hidden
+    entirely if the catalogue can't yield even one candidate, so the
+    section header doesn't dangle over an empty grid. */}
+{related.length > 0 ? (
+  <div style={{ paddingTop: 48, paddingBottom: 60, borderTop: "1px solid var(--line)" }}>
+    <div className="section-head" style={{ ... }}>
+      <h2 ...>ชุดที่คล้ายกัน</h2>
+      <Link href="/browse" ...>ดูทั้งหมด →</Link>
+    </div>
+    <div className="grid-4" style={{ gap: 20 }}>
+      {related.map((d, i) => (
+        <DressCard key={d.id} dress={d} variant={i} savedSet={savedSet} isLoggedIn={isLoggedIn} />
+      ))}
+    </div>
+  </div>
+) : null}
```

Notes:
- Dropped the `.filter(d => d.id !== seed.id)` and `.slice(0, 4)` because both are now guaranteed by the helper (`.neq("id", seed.id)` in the query, `.slice(0, limit)` at the end).
- Section wraps in a `related.length > 0` guard so a brand-new catalogue with only one dress doesn't render a header with nothing under it.

---

## Verification

`tsc --noEmit` was run against a shadow copy of the repo with fresh `node_modules` (the Windows OneDrive virtiofs mount of `node_modules` is unreliable in this environment — see `project_doprent_2026-05-18.md`). Zero errors in the touched files. The only error in the tsc output was an unrelated `Cannot find module 'tailwindcss'` from `tailwind.config.ts`, caused by the minimal devDep set in the shadow — not present in real CI.

No new tests added — the function is pure-with-IO and small enough to inspect. If you want a unit test, the pure ranking part is easy to extract; happy to do that in a follow-up.

---

## Questions for the dev

1. **Pool size of 60** — comfortable, or do you want this configurable? At current catalogue size it's >50% of total dresses so it's effectively "score everything"; once we pass a few hundred we may want to tighten the pre-filter (e.g. require `overlaps(occasions, seed.occasions)` in the query).
2. **No tests** — fine for v1, or do you want a small unit test on the ranker before merging?
3. **Logging:** kept the existing `console.error` style used by every other function in this file. If you've started piping errors somewhere centrally, let me know and I'll align.
