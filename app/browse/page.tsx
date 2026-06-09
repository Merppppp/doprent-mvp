import { redirect } from "next/navigation";

type SearchParams = Record<string, string | string[] | undefined>;

/**
 * /browse is no longer a standalone page — it redirects to the home catalog (/).
 * Query params (color, occasion, q, etc.) are preserved so existing links still work.
 */
export default function BrowsePage({ searchParams }: { searchParams: SearchParams }) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams ?? {})) {
    if (typeof value === "string" && value) params.set(key, value);
  }
  const qs = params.toString();
  redirect(qs ? `/?${qs}` : "/");
}
