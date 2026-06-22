"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { withActor } from "@/lib/db-context";

export async function toggleSavedProduct(productId: string): Promise<{
  ok: boolean;
  saved: boolean;
  redirectTo?: string;
}> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, saved: false, redirectTo: "/login?next=/browse" };

  return withActor(user.id, async () => {
    const existing = await db.favorite.findUnique({
      where: { userId_productId: { userId: user.id, productId } },
      select: { id: true },
    });

    let saved: boolean;
    if (existing) {
      await db.favorite.delete({ where: { id: existing.id } });
      saved = false;
    } else {
      await db.favorite.create({ data: { userId: user.id, productId } });
      saved = true;
    }

    revalidatePath("/account");
    return { ok: true, saved };
  });
}
