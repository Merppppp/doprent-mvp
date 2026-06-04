"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";

export async function toggleSavedDress(dressId: string): Promise<{
  ok: boolean;
  saved: boolean;
  redirectTo?: string;
}> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, saved: false, redirectTo: "/login?next=/browse" };

  const current = user.savedDressIds;
  const exists = current.includes(dressId);
  const next = exists ? current.filter((id) => id !== dressId) : [...current, dressId];

  await db.user.update({
    where: { id: user.id },
    data: { savedDressIds: next },
  });

  revalidatePath("/account");
  revalidatePath("/", "layout");
  return { ok: true, saved: !exists };
}
