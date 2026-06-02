import { auth } from "@/auth";
import { db } from "@/lib/db";
import type { Role } from "@prisma/client";

export type CurrentUser = {
  id: string;
  email: string;
  fullName: string | null;
  role: Role;
  savedDressIds: string[];
};

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const session = await auth();
  if (!session?.user?.id) return null;

  const dbUser = await db.user.findUnique({
    where: { id: session.user.id },
    select: { fullName: true, role: true, savedDressIds: true },
  });
  if (!dbUser) return null;

  return {
    id: session.user.id,
    email: session.user.email,
    fullName: dbUser.fullName ?? session.user.name ?? null,
    role: dbUser.role,
    savedDressIds: dbUser.savedDressIds,
  };
}

export async function isCurrentUserAdmin(): Promise<boolean> {
  const user = await getCurrentUser();
  return user?.role === "admin";
}
