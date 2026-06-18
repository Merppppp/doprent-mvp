"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { updateBinding, unbindTagGroup } from "@/app/actions/admin-tag-groups";

export type BindingRowData = {
  id: string;
  sortOrder: number;
  isRequired: boolean;
  selectionMode: "single" | "multi";
  isActive: boolean;
  tagGroup: { id: string; key: string; label: string };
};

export default function BindingRow({ binding }: { binding: BindingRowData }) {
  const router = useRouter();
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmUnbind, setConfirmUnbind] = useState(false);

  const [sortOrder, setSortOrder] = useState(binding.sortOrder);
  const [isRequired, setIsRequired] = useState(binding.isRequired);
  const [selectionMode, setSelectionMode] = useState<"single" | "multi">(binding.selectionMode);
  const [isActive, setIsActive] = useState(binding.isActive);

  async function onUpdate(patch: Parameters<typeof updateBinding>[1]) {
    setWorking(true);
    setError(null);
    const res = await updateBinding(binding.id, patch);
    if (!res.ok) {
      setError(res.error ?? "ผิดพลาด");
    }
    setWorking(false);
    router.refresh();
  }

  async function onUnbind() {
    setWorking(true);
    setError(null);
    const res = await unbindTagGroup(binding.id);
    if (!res.ok) {
      setError(res.error ?? "ผิดพลาด");
      setWorking(false);
      return;
    }
    router.refresh();
  }

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr auto auto auto auto auto auto",
        alignItems: "center",
        gap: 8,
        padding: "10px 14px",
        background: isActive ? "var(--surface)" : "var(--bg)",
        border: "1px solid var(--line)",
        borderRadius: 6,
        opacity: isActive ? 1 : 0.65,
      }}
    >
      {/* Tag group label */}
      <div>
        <span style={{ fontSize: 14, fontWeight: 500 }}>{binding.tagGroup.label}</span>
        <span style={{ fontSize: 11, color: "var(--ink-3)", marginLeft: 6 }}>{binding.tagGroup.key}</span>
      </div>

      {/* Sort order */}
      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
        <span style={{ fontSize: 11, color: "var(--ink-3)" }}>ลำดับ</span>
        <input
          type="number"
          value={sortOrder}
          min={0}
          disabled={working}
          onChange={(e) => setSortOrder(Number(e.target.value))}
          onBlur={() => {
            if (sortOrder !== binding.sortOrder) onUpdate({ sortOrder });
          }}
          className="input"
          style={{ width: 52, textAlign: "center" }}
        />
      </div>

      {/* Selection mode */}
      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
        <span style={{ fontSize: 11, color: "var(--ink-3)" }}>โหมด</span>
        <select
          value={selectionMode}
          disabled={working}
          onChange={(e) => {
            const v = e.target.value as "single" | "multi";
            setSelectionMode(v);
            onUpdate({ selectionMode: v });
          }}
          className="input input-surface"
        >
          <option value="multi">หลายตัว</option>
          <option value="single">ตัวเดียว</option>
        </select>
      </div>

      {/* isRequired toggle */}
      <label
        style={{
          display: "flex",
          alignItems: "center",
          gap: 4,
          fontSize: 12,
          cursor: working ? "not-allowed" : "pointer",
          userSelect: "none",
        }}
      >
        <input
          type="checkbox"
          checked={isRequired}
          disabled={working}
          onChange={(e) => {
            setIsRequired(e.target.checked);
            onUpdate({ isRequired: e.target.checked });
          }}
        />
        จำเป็น
      </label>

      {/* isActive toggle */}
      <label
        style={{
          display: "flex",
          alignItems: "center",
          gap: 4,
          fontSize: 12,
          cursor: working ? "not-allowed" : "pointer",
          userSelect: "none",
        }}
      >
        <input
          type="checkbox"
          checked={isActive}
          disabled={working}
          onChange={(e) => {
            setIsActive(e.target.checked);
            onUpdate({ isActive: e.target.checked });
          }}
        />
        ใช้งาน
      </label>

      {/* Unbind */}
      {confirmUnbind ? (
        <div style={{ display: "flex", gap: 4 }}>
          <button
            type="button"
            disabled={working}
            onClick={onUnbind}
            className="btn btn-dark"
            style={{
              padding: "4px 10px",
              fontSize: 12,
              background: "var(--danger)",
              borderColor: "var(--danger)",
            }}
          >
            {working ? "…" : "ยืนยัน"}
          </button>
          <button
            type="button"
            onClick={() => setConfirmUnbind(false)}
            className="btn btn-outline"
            style={{ padding: "4px 10px", fontSize: 12 }}
          >
            ยกเลิก
          </button>
        </div>
      ) : (
        <button
          type="button"
          disabled={working}
          onClick={() => setConfirmUnbind(true)}
          className="btn btn-outline"
          style={{
            padding: "4px 10px",
            fontSize: 12,
            color: "var(--danger)",
            borderColor: "var(--danger)",
          }}
        >
          ยกเลิกการผูก
        </button>
      )}

      {/* Error inline */}
      {error ? (
        <span style={{ fontSize: 11, color: "var(--danger)", gridColumn: "1 / -1" }}>{error}</span>
      ) : null}
    </div>
  );
}
