"use server";

import { listShopsPage, SHOPS_PAGE_SIZE, type ShopListItem } from "@/lib/products";

/**
 * Fetch the next page of public shops for the /shops "load more" feed.
 * `skip` is the number already loaded; the client appends the returned rows.
 */
export async function fetchShopsPage(
  q: string,
  skip: number,
): Promise<{ rows: ShopListItem[]; hasMore: boolean }> {
  const safeSkip = Number.isFinite(skip) && skip > 0 ? Math.trunc(skip) : 0;
  const { rows, total } = await listShopsPage({
    q,
    skip: safeSkip,
    take: SHOPS_PAGE_SIZE,
  });
  return { rows, hasMore: safeSkip + rows.length < total };
}
