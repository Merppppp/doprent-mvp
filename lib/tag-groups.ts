import { db } from "@/lib/db";

export type BoundTagGroup = {
  groupId: string;
  groupKey: string;
  groupLabel: string;
  sortOrder: number;
  isRequired: boolean;
  selectionMode: "single" | "multi";
  tags: Array<{ id: string; key: string; label: string; swatchHex: string | null; swatchImageUrl: string | null }>;
};

/** Bound tag groups for a product type, ordered, each hydrated with active tags.
 *  Single DB round-trip (nested include), N+1 safe. */
export async function getTagGroupsForProductType(productTypeId: string): Promise<BoundTagGroup[]> {
  if (!productTypeId) return [];
  const rows = await db.productTypeTagGroup.findMany({
    where: { productTypeId, isActive: true, tagGroup: { isActive: true } },
    orderBy: { sortOrder: "asc" },
    select: {
      sortOrder: true,
      isRequired: true,
      selectionMode: true,
      tagGroup: {
        select: {
          id: true,
          key: true,
          label: true,
          tags: {
            where: { isActive: true },
            orderBy: { label: "asc" },
            select: { id: true, key: true, label: true, swatchHex: true, swatchImageUrl: true },
          },
        },
      },
    },
  });
  return rows.map((r) => ({
    groupId: r.tagGroup.id,
    groupKey: r.tagGroup.key,
    groupLabel: r.tagGroup.label,
    sortOrder: r.sortOrder,
    isRequired: r.isRequired,
    selectionMode: r.selectionMode as "single" | "multi",
    tags: r.tagGroup.tags,
  }));
}

/** Convenience: resolve bindings by product-type KEY (for the dress-only create path). */
export async function getTagGroupsForProductTypeKey(key: string): Promise<{
  productTypeId: string | null;
  groups: BoundTagGroup[];
}> {
  const pt = await db.productType.findUnique({ where: { key }, select: { id: true } });
  if (!pt) return { productTypeId: null, groups: [] };
  return { productTypeId: pt.id, groups: await getTagGroupsForProductType(pt.id) };
}

/** Validate selections against bindings and return the flat list of tag ids to write.
 *  Enforces: required (>=1), selectionMode (single <= 1), tag belongs to a bound group. */
export async function resolveTagSelections(
  productTypeId: string,
  selectionsByGroup: Record<string, string[]>,
): Promise<{ ok: true; tagIds: string[] } | { ok: false; error: string }> {
  const groups = await getTagGroupsForProductType(productTypeId);
  const tagIds: string[] = [];
  for (const g of groups) {
    const picked = (selectionsByGroup[g.groupKey] ?? []).filter(Boolean);
    if (g.isRequired && picked.length === 0) {
      return { ok: false, error: `กรุณาเลือก "${g.groupLabel}" อย่างน้อย 1 รายการ` };
    }
    if (g.selectionMode === "single" && picked.length > 1) {
      return { ok: false, error: `"${g.groupLabel}" เลือกได้เพียง 1 รายการ` };
    }
    const valid = new Map(g.tags.map((t) => [t.key, t.id]));
    for (const k of picked) {
      const id = valid.get(k);
      if (!id) return { ok: false, error: `แท็กไม่ถูกต้องในกลุ่ม "${g.groupLabel}"` };
      tagIds.push(id);
    }
  }
  return { ok: true, tagIds };
}
