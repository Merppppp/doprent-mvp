"use client";

import { useState } from "react";
import { requestTag } from "@/app/actions/seller-tags";
import RequiredMark from "@/components/RequiredMark";

type TagGroupOption = { id: string; key: string; label: string };

interface Props {
  shopId: string;
  tagGroups: TagGroupOption[];
}

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 14,
  fontWeight: 500,
  marginBottom: 6,
};

export default function TagRequestForm({ shopId, tagGroups }: Props) {
  const [groupId, setGroupId] = useState(tagGroups[0]?.id ?? "");
  const [label, setLabel] = useState("");
  const [key, setKey] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!label.trim()) { setError("กรุณาระบุชื่อแท็ก"); return; }
    if (!groupId) { setError("กรุณาเลือกกลุ่มแท็ก"); return; }

    setSubmitting(true);
    try {
      const res = await requestTag({
        shopId,
        tagGroupId: groupId,
        requestedLabel: label.trim(),
        requestedKey: key.trim() || undefined,
      });
      if (!res.ok) {
        setError(res.error ?? "ส่งคำขอไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
      } else {
        setSuccess("ส่งคำขอเรียบร้อยแล้ว — แอดมินจะตรวจสอบและแจ้งผลให้ทราบ");
        setLabel("");
        setKey("");
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  if (tagGroups.length === 0) {
    return (
      <div
        style={{
          padding: "20px 24px",
          background: "var(--surface)",
          border: "1px solid var(--line)",
          borderRadius: 8,
          color: "var(--ink-3)",
          fontSize: 14,
        }}
      >
        ยังไม่มีกลุ่มแท็กในระบบ — กรุณาติดต่อแอดมิน
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Group */}
      <div>
        <label style={labelStyle}>กลุ่มแท็ก <RequiredMark /></label>
        <select
          value={groupId}
          onChange={(e) => setGroupId(e.target.value)}
          required
          aria-required={true}
          className="input input-surface"
        >
          {tagGroups.map((g) => (
            <option key={g.id} value={g.id}>{g.label}</option>
          ))}
        </select>
        <div style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 4 }}>
          เลือกกลุ่มที่แท็กใหม่ควรอยู่ ผู้ขายไม่สามารถสร้างกลุ่มใหม่ได้
        </div>
      </div>

      {/* Thai label */}
      <div>
        <label style={labelStyle}>ชื่อแท็กที่ต้องการ (ภาษาไทย) <RequiredMark /></label>
        <input
          type="text"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          required
          aria-required={true}
          maxLength={80}
          placeholder="เช่น งานกีฬาสี, วันวาเลนไทน์"
          className="input input-surface"
        />
      </div>

      {/* Optional latin key */}
      <div>
        <label style={labelStyle}>
          slug key{" "}
          <span style={{ fontWeight: 400, color: "var(--ink-3)", fontSize: 13 }}>
            (ไม่บังคับ — admin กำหนดได้เอง)
          </span>
        </label>
        <input
          type="text"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          maxLength={48}
          placeholder="เช่น sport-event"
          className="input input-surface"
        />
      </div>

      {error && (
        <div
          style={{
            padding: "10px 14px",
            background: "var(--danger-soft)",
            border: "1px solid var(--danger)",
            borderRadius: 6,
            color: "var(--danger)",
            fontSize: 13,
          }}
        >
          {error}
        </div>
      )}

      {success && (
        <div
          style={{
            padding: "10px 14px",
            background: "color-mix(in oklch, #16a34a 10%, transparent)",
            border: "1px solid color-mix(in oklch, #16a34a 40%, transparent)",
            borderRadius: 6,
            color: "var(--success, #16a34a)",
            fontSize: 13,
            fontWeight: 500,
          }}
        >
          {success}
        </div>
      )}

      <div>
        <button
          type="submit"
          disabled={submitting}
          className="btn btn-dark"
          style={{ padding: "11px 22px", fontSize: 14 }}
        >
          {submitting ? "กำลังส่ง…" : "ส่งคำขอ"}
        </button>
      </div>
    </form>
  );
}
