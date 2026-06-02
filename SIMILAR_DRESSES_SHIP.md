# Ship — Similar Dresses logic (2026-05-28)

## What changed
- `lib/dresses.ts` — added `listSimilarDresses(seed, limit)` (content-based scorer)
- `app/dress/[id]/page.tsx` — wired it in, hid the section entirely when zero candidates

## Scoring weights
| Signal | Weight |
|---|---|
| Occasion overlap (Jaccard) | ×5 |
| Same color | ×3 |
| Same size | ×3 |
| Price within ±30% | ×2 |
| Same designer | ×2 |
| Same boutique | ×1 |

Pool of 60 newest live+available dresses (excluding self). Sort by score desc, recency as tiebreaker. Pads with latest if fewer than 4 score > 0.

## No migration needed
Uses existing columns only (`occasions`, `color`, `size`, `price_per_day`, `designer`, `boutique_id`).

## Robocopy + push commands (run from Windows)

```powershell
robocopy "C:\Users\patch\OneDrive\Documents\Claude\Projects\rental\doprent-mvp\lib" "C:\Users\patch\OneDrive\Documents\GitHub\doprent-mvp\lib" dresses.ts
robocopy "C:\Users\patch\OneDrive\Documents\Claude\Projects\rental\doprent-mvp\app\dress\[id]" "C:\Users\patch\OneDrive\Documents\GitHub\doprent-mvp\app\dress\[id]" page.tsx
```

Then in `C:\Users\patch\OneDrive\Documents\GitHub\doprent-mvp`:

```bash
git add lib/dresses.ts "app/dress/[id]/page.tsx"
git commit -m "feat(dress): real similar-dresses logic — occasion/color/size/price scoring"
git push
```

## Commit message
```
feat(dress): real similar-dresses logic — occasion/color/size/price scoring

The /dress/[slug] "ชุดที่คล้ายกัน" rail was fetching the 4 newest dresses
with no similarity check. Replaced with listSimilarDresses() — pools 60
recent live+available candidates, scores each by occasion overlap (Jaccard
×5), color match (×3), size match (×3), price ±30% (×2), same designer
(×2), same boutique (×1), then returns the top N. Falls back to recency
when the catalogue can't yield enough scored candidates. Section hides
entirely when zero candidates exist.

No migration — uses existing columns only.
```
