import { auth } from "@/auth";
import type { Role } from "@prisma/client";

export type CurrentUser = {
  id: string;
  email: string;
  fullName: string | null;
  role: Role;
};

/** Returns the signed-in user from the NextAuth session, or null. */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const session = await auth();
  if (!session?.user?.id) return null;

  return {
    id: session.user.id,
    email: session.user.email,
    fullName: session.user.name ?? null,
    role: session.user.role,
  };
}

export async function isCurrentUserAdmin(): Promise<boolean> {
  const user = await getCurrentUser();
  return user?.role === "admin";
}
