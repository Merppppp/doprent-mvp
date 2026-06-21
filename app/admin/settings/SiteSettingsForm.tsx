"use client";

import { useState } from "react";

type Field = { key: string; label: string; placeholder: string; hint: string };

export default function SiteSettingsForm({
  fields,
  current,
}: {
  fields: Field[];
  current: Record<string, string>;
}) {
  const [values, setValues] = useState<Record<string, string>>({ ...current });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings: values }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "บันทึกไม่สำเร็จ");
      }
      setMsg({ type: "ok", text: "บันทึกสำเร็จ" });
    } catch (err: any) {
      setMsg({ type: "err", text: err.message ?? "เกิดข้อผิดพลาด" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit}>
      {msg && (
        <div
          style={{
            padding: "10px 14px",
            borderRadius: 6,
            fontSize: 13,
            marginBottom: 16,
            background: msg.type === "ok" ? "oklch(0.93 0.04 145)" : "oklch(0.92 0.04 25)",
            border: `1px solid ${msg.type === "ok" ? "oklch(0.78 0.12 145)" : "oklch(0.78 0.12 25)"}`,
            color: msg.type === "ok" ? "oklch(0.35 0.12 145)" : "oklch(0.4 0.13 25)",
          }}
        >
          {msg.text}
        </div>
      )}

      {fields.map((f) => (
        <div key={f.key} style={{ marginBottom: 18 }}>
          <label style={{ display: "block", fontSize: 13, fontWeight: 500, marginBottom: 6 }}>
            {f.label}
          </label>
          <input
            className="input"
            value={values[f.key] ?? ""}
            onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
            placeholder={f.placeholder}
          />
          <span style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 4, display: "block" }}>
            {f.hint}
          </span>
        </div>
      ))}

      <button
        type="submit"
        disabled={saving}
        className="btn btn-dark btn-lg"
        style={{ marginTop: 8, opacity: saving ? 0.6 : 1, padding: "12px 32px" }}
      >
        {saving ? "กำลังบันทึก..." : "บันทึก"}
      </button>
    </form>
  );
}
