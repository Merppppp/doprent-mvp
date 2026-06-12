import { auth } from "@/auth";
import { db } from "@/lib/db";
import type { Role } from "@prisma/client";

export type CurrentUser = {
  id: string;
  email: string;
  name: string | null;
  role: Role;
  /** ids of products the user saved (favorites table — was users.saved_dress_ids uuid[]). */
  savedProductIds: string[];
};

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const session = await auth();
  if (!session?.user?.id) return null;

  const [dbUser, favorites] = await Promise.all([
    db.user.findUnique({
      where: { id: session.user.id },
      select: { name: true, role: true },
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
    name: dbUser.name ?? session.user.name ?? null,
    role: dbUser.role,
    savedProductIds: favorites.map((f) => f.productId),
  };
}

export async function isCurrentUserAdmin(): Promise<boolean> {
  const user = await getCurrentUser();
  return user?.role === "admin";
}
