"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { bindTagGroup } from "@/app/actions/admin-tag-groups";

type AvailableGroup = { id: string; key: string; label: string };

export default function AddBinding({
  productTypeId,
  availableGroups,
}: {
  productTypeId: string;
  availableGroups: AvailableGroup[];
}) {
  const router = useRouter();
  const [selectedGroupId, setSelectedGroupId] = useState(availableGroups[0]?.id ?? "");
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  if (availableGroups.length === 0) {
    return (
      <span style={{ fontSize: 12, color: "var(--ink-3)" }}>ผูกครบทุกกลุ่มแล้ว</span>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        className="btn btn-outline"
        onClick={() => setOpen(true)}
        style={{ padding: "5px 12px", fontSize: 12 }}
      >
        + เพิ่มการผูกกลุ่ม
      </button>
    );
  }

  async function onAdd() {
    if (!selectedGroupId) return;
    setWorking(true);
    setError(null);
    const res = await bindTagGroup({ productTypeId, tagGroupId: selectedGroupId });
    if (!res.ok) {
      setError(res.error ?? "ผิดพลาด");
      setWorking(false);
      return;
    }
    setOpen(false);
    router.refresh();
  }

  return (
    <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
      <select
        value={selectedGroupId}
        disabled={working}
        onChange={(e) => setSelectedGroupId(e.target.value)}
        style={{
          padding: "5px 8px",
          border: "1px solid var(--line)",
          borderRadius: 4,
          fontSize: 13,
          background: "var(--surface)",
        }}
      >
        {availableGroups.map((g) => (
          <option key={g.id} value={g.id}>
            {g.label} ({g.key})
          </option>
        ))}
      </select>
      <button
        type="button"
        className="btn btn-dark"
        onClick={onAdd}
        disabled={working || !selectedGroupId}
        style={{ padding: "5px 14px", fontSize: 13 }}
      >
        {working ? "กำลังเพิ่ม…" : "เพิ่ม"}
      </button>
      <button
        type="button"
        className="btn btn-outline"
        onClick={() => { setOpen(false); setError(null); }}
        style={{ padding: "5px 10px", fontSize: 13 }}
      >
        ยกเลิก
      </button>
      {error ? <span style={{ fontSize: 12, color: "var(--danger)" }}>{error}</span> : null}
    </div>
  );
}
