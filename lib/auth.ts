import { cache } from "react";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import type { Role } from "@prisma/client";

export type CurrentUser = {
  id: string;
  email: string;
  fullName: string | null;
  role: Role;
  /** ids of products the user saved (favorites table — was users.saved_dress_ids uuid[]). */
  savedProductIds: string[];
};

/**
 * Returns the current authenticated user from the DB, deduplicated per-request
 * via React.cache so multiple callers in the same render tree share one result.
 *
 * Staff sessions use a synthetic id ("staff:<shopStaffId>") with no User row —
 * we short-circuit before hitting the DB and return null. Header.tsx and other
 * staff-aware callers already detect the staff session via auth() separately.
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const session = await auth();
  if (!session?.user?.id) return null;

  // Staff principals have synthetic ids ("staff:<id>") — no User row exists.
  // Return null early to avoid a pointless DB lookup; callers that need staff
  // context (e.g. Header) detect the staff session via auth() directly.
  if (session.user.id.startsWith("staff:")) return null;

  const [dbUser, favorites] = await Promise.all([
    db.user.findUnique({
      where: { id: session.user.id },
      select: { fullName: true, role: true },
    }),
    db.favorite.findMany({
      where: { userId: session.user.id },
      select: { productId: true },
    }),
  ]);
  if (!dbUser) return null;

  return {
    id: session.user.id,
    email: session.user.email,
    // session.user.name = NextAuth JWT claim (OAuth profile) — fallback only
    fullName: dbUser.fullName ?? session.user.name ?? null,
    role: dbUser.role,
    savedProductIds: favorites.map((f) => f.productId),
  };
});

export async function isCurrentUserAdmin(): Promise<boolean> {
  const user = await getCurrentUser();
  return user?.role === "admin";
}
