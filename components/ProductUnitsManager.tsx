"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setUnitStatus } from "@/app/actions/product-units";
import type { VariantUnits, UnitView } from "@/lib/product-units";

const STATUS_LABEL: Record<UnitView["status"], string> = {
  available: "พร้อมเช่า",
  rented: "กำลังเช่า",
  repair: "ติดซ่อม",
  retired: "ปลดระวาง",
};

const STATUS_BADGE: Record<UnitView["status"], string> = {
  available: "bg-success-soft text-success",
  rented: "bg-info-soft text-info",
  repair: "bg-warn-soft text-warn",
  retired: "bg-danger-soft text-danger",
};

export default function ProductUnitsManager({ variants }: { variants: VariantUnits[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");

  function act(unitId: string, status: "available" | "repair" | "retired") {
    setError("");
    setBusyId(unitId);
    startTransition(async () => {
      const res = await setUnitStatus(unitId, status);
      setBusyId(null);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      router.refresh();
    });
  }

  if (variants.length === 0) {
    return <p className="text-sm text-ink-3">สินค้านี้ยังไม่มีไซซ์ — เพิ่มไซซ์ก่อนในหน้าแก้ไขสินค้า</p>;
  }

  return (
    <div className="flex flex-col gap-6">
      {error ? (
        <div className="rounded-lg bg-danger-soft px-4 py-2.5 text-sm text-danger">{error}</div>
      ) : null}

      {variants.map((v) => {
        const rentable = v.units.filter((u) => u.status === "available" || u.status === "rented").length;
        return (
          <section key={v.variantId} className="rounded-xl border border-line bg-surface p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-semibold">ไซซ์ {v.size}</h2>
              <span className="text-xs text-ink-3">
                เช่าได้ {rentable} / ทั้งหมด {v.units.length} ตัว
              </span>
            </div>

            <ul className="flex flex-col gap-2">
              {v.units.map((u) => {
                const isRented = u.status === "rented";
                const busy = pending && busyId === u.id;
                return (
                  <li
                    key={u.id}
                    className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border border-line bg-bg px-3 py-2.5"
                  >
                    <span className="font-mono text-sm">{u.code}</span>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[u.status]}`}>
                      {STATUS_LABEL[u.status]}
                    </span>
                    <div className="ml-auto flex gap-2">
                      {u.status !== "available" && (
                        <button
                          type="button"
                          disabled={busy || isRented}
                          onClick={() => act(u.id, "available")}
                          className="btn btn-outline !px-3 !py-1.5 !text-xs disabled:opacity-50"
                        >
                          พร้อมเช่า
                        </button>
                      )}
                      {u.status !== "repair" && (
                        <button
                          type="button"
                          disabled={busy || isRented}
                          onClick={() => act(u.id, "repair")}
                          className="btn btn-outline !px-3 !py-1.5 !text-xs disabled:opacity-50"
                        >
                          ติดซ่อม
                        </button>
                      )}
                      {u.status !== "retired" && (
                        <button
                          type="button"
                          disabled={busy || isRented}
                          onClick={() => act(u.id, "retired")}
                          className="btn btn-outline !px-3 !py-1.5 !text-xs disabled:opacity-50"
                        >
                          ปลดระวาง
                        </button>
                      )}
                    </div>
                    {isRented ? (
                      <span className="w-full text-xs text-ink-3">
                        หน่วยนี้กำลังถูกเช่าอยู่ — เปลี่ยนสถานะได้เมื่อลูกค้าคืนแล้ว
                      </span>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
