"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { updateBoutique } from "@/app/actions/seller";
import type { Color } from "@/lib/types";

const COLORS: Array<{ key: Color; label: string }> = [
  { key: "rose", label: "กุหลาบ" },
  { key: "ivory", label: "งาช้าง" },
  { key: "green", label: "เขียว" },
  { key: "black", label: "ดำ" },
  { key: "navy", label: "กรมท่า" },
  { key: "red", label: "แดง" },
  { key: "blue", label: "ฟ้า" },
  { key: "purple", label: "ม่วง" },
];

type Props = {
  areas: Array<{ key: string; th: string }>;
  boutique: {
    id: string;
    name: string;
    area_key: string | null;
    area_label: string;
    line_url: string;
    instagram: string | null;
    since_year: number | null;
    tag: string | null;
    story: string | null;
    delivery_info: string | null;
    owner_name: string | null;
    address: string | null;
    hours: string | null;
    cover_color: Color;
  };
};

export default function EditBoutiqueForm({ areas, boutique }: Props) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    setSubmitting(true);
    try {
      const fd = new FormData(e.currentTarget);
      const areaKey = String(fd.get("area_key") ?? "");
      const matched = areas.find((a) => a.key === areaKey);
      if (matched) fd.set("area_label", `${matched.key} · ${matched.th}`);

      const res = await updateBoutique(boutique.id, fd);
      if (!res.ok) {
        setError(res.error ?? "บันทึกไม่สำเร็จ");
        setSubmitting(false);
        return;
      }
      setSaved(true);
      setSubmitting(false);
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <Labeled label="ชื่อร้าน">
        <input type="text" name="name" defaultValue={boutique.name} required style={inputStyle} />
      </Labeled>
      <Labeled label="ผู้ดูแล">
        <input type="text" name="owner_name" defaultValue={boutique.owner_name ?? ""} style={inputStyle} />
      </Labeled>
      <Labeled label="ย่าน">
        <select name="area_key" defaultValue={boutique.area_key ?? ""} style={inputStyle}>
          <option value="">— เลือกย่าน —</option>
          {areas.map((a) => (
            <option key={a.key} value={a.key}>
              {a.th} ({a.key})
            </option>
          ))}
        </select>
        <input type="hidden" name="area_label" defaultValue={boutique.area_label} />
      </Labeled>
      <Labeled label="LINE">
        <input type="text" name="line_url" defaultValue={boutique.line_url} required style={inputStyle} />
      </Labeled>
      <Labeled label="Instagram">
        <input type="text" name="instagram" defaultValue={boutique.instagram ?? ""} style={inputStyle} />
      </Labeled>
      <Labeled label="ที่อยู่ร้าน">
        <input type="text" name="address" defaultValue={boutique.address ?? ""} style={inputStyle} />
      </Labeled>
      <Labeled label="เวลาทำการ">
        <input
          type="text"
          name="hours"
          defaultValue={boutique.hours ?? ""}
          placeholder="เช่น จ-ศ 10:00-19:00, ส-อา 10:00-20:00"
          style={inputStyle}
        />
      </Labeled>
      <Labeled label="ปีที่เปิดบริการ">
        <input
          type="number"
          name="since_year"
          defaultValue={boutique.since_year ?? ""}
          min={1980}
          max={new Date().getFullYear()}
          style={{ ...inputStyle, width: 140 }}
        />
      </Labeled>
      <Labeled label="Tagline">
        <input type="text" name="tag" defaultValue={boutique.tag ?? ""} maxLength={80} style={inputStyle} />
      </Labeled>
      <Labeled label="เกี่ยวกับร้าน">
        <textarea
          name="story"
          defaultValue={boutique.story ?? ""}
          rows={4}
          maxLength={500}
          style={{ ...inputStyle, resize: "vertical" }}
        />
      </Labeled>
      <Labeled label="ข้อมูลการจัดส่ง">
        <textarea
          name="delivery_info"
          defaultValue={boutique.delivery_info ?? ""}
          rows={3}
          maxLength={250}
          style={{ ...inputStyle, resize: "vertical" }}
        />
      </Labeled>
      <Labeled label="สีหลักของร้าน">
        <select name="cover_color" defaultValue={boutique.cover_color} style={inputStyle}>
          {COLORS.map((c) => (
            <option key={c.key} value={c.key}>
              {c.label}
            </option>
          ))}
        </select>
      </Labeled>

      {error ? (
        <div
          style={{
            padding: 12,
            background: "rgba(220,38,38,0.08)",
            border: "1px solid rgba(220,38,38,0.3)",
            borderRadius: 6,
            color: "var(--danger)",
            fontSize: 14,
          }}
        >
          {error}
        </div>
      ) : null}
      {saved ? (
        <div
          style={{
            padding: 12,
            background: "rgba(21,128,61,0.08)",
            border: "1px solid rgba(21,128,61,0.3)",
            borderRadius: 6,
            color: "#15803D",
            fontSize: 14,
          }}
        >
          ✓ บันทึกเรียบร้อย
        </div>
      ) : null}

      <div style={{ display: "flex", gap: 8 }}>
        <button type="submit" className="btn btn-dark" disabled={submitting} style={{ padding: "12px 22px" }}>
          {submitting ? "กำลังบันทึก…" : "บันทึกการแก้ไข"}
        </button>
        <button
          type="button"
          className="btn btn-outline"
          onClick={() => router.push("/sell/dashboard")}
          style={{ padding: "12px 22px" }}
        >
          ยกเลิก
        </button>
      </div>
    </form>
  );
}

function Labeled({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: "block", fontSize: 14, fontWeight: 500, marginBottom: 6 }}>
        {label}
      </label>
      {children}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  border: "1px solid var(--line)",
  borderRadius: 6,
  background: "var(--surface)",
  fontSize: 14,
  fontFamily: "inherit",
};
