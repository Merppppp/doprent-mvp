"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/browser";
import { createDress, updateDress } from "@/app/actions/seller";
import type { Color, Occasion, OccasionKey, PriceTier, Size } from "@/lib/types";
import { priceForNights, validateTiers } from "@/lib/pricing";

type TierRow = { max: number | null; perDay: number };

/** Min day for each row: row 0 = 1, others = prev row's max + 1. */
function rowMins(rows: TierRow[]): number[] {
  const mins: number[] = [];
  let min = 1;
  for (let i = 0; i < rows.length; i++) {
    mins.push(min);
    const isLast = i === rows.length - 1;
    const max = isLast ? null : rows[i].max;
    if (max != null) min = max + 1;
  }
  return mins;
}

function toPriceTiers(rows: TierRow[]): PriceTier[] {
  const mins = rowMins(rows);
  return rows.map((r, i) => ({
    min: mins[i],
    max: i === rows.length - 1 ? null : r.max,
    per_day: r.perDay,
  }));
}

const COLORS: Color[] = ["rose", "ivory", "green", "black", "navy", "red", "blue", "purple"];
const COLOR_TH: Record<Color, string> = {
  rose: "กุหลาบ",
  ivory: "งาช้าง",
  green: "เขียว",
  black: "ดำ",
  navy: "กรมท่า",
  red: "แดง",
  blue: "ฟ้า",
  purple: "ม่วง",
};
const SIZES: Size[] = ["XXXS","XXS","XS","S","M","L","XL","XXL","3XL","4XL"];

type Props =
  | {
      mode: "create";
      boutiqueId: string;
      defaultLineUrl: string;
      occasions: Occasion[];
    }
  | {
      mode: "edit";
      dressId: string;
      boutiqueId: string;
      defaultLineUrl: string;
      occasions: Occasion[];
      initial: {
        name: string;
        designer: string | null;
        size: Size;
        color: Color;
        price_per_day: number;
        price_tiers: PriceTier[] | null;
        deposit: number;
        description: string | null;
        line_url: string;
        images: string[];
        occasions: OccasionKey[];
        available: boolean;
      };
    };

export default function DressForm(props: Props) {
  const router = useRouter();
  const isEdit = props.mode === "edit";
  const initial = isEdit ? props.initial : null;

  const [name, setName] = useState(initial?.name ?? "");
  const [designer, setDesigner] = useState(initial?.designer ?? "");
  const [size, setSize] = useState<Size>(initial?.size ?? "M");
  const [color, setColor] = useState<Color>(initial?.color ?? "rose");
  const [tiers, setTiers] = useState<TierRow[]>(
    initial?.price_tiers && initial.price_tiers.length
      ? initial.price_tiers.map((t) => ({ max: t.max, perDay: t.per_day }))
      : [{ max: null, perDay: initial?.price_per_day ?? 500 }],
  );
  const [tierError, setTierError] = useState<string | null>(null);
  const updateMax = (i: number, v: number) =>
    setTiers((p) => p.map((r, idx) => (idx === i ? { ...r, max: v } : r)));
  const updatePerDay = (i: number, v: number) =>
    setTiers((p) => p.map((r, idx) => (idx === i ? { ...r, perDay: v } : r)));
  const removeTier = (i: number) =>
    setTiers((p) => (p.length <= 1 ? p : p.filter((_, idx) => idx !== i)));
  const addTier = () =>
    setTiers((p) => {
      const mins = rowMins(p);
      const lastIdx = p.length - 1;
      const copy = [...p];
      copy.splice(lastIdx, 0, { max: mins[lastIdx] + 1, perDay: p[lastIdx].perDay });
      return copy;
    });
  const [deposit, setDeposit] = useState(initial?.deposit ?? 3000);
  const [description, setDescription] = useState(initial?.description ?? "");
  const [lineUrl, setLineUrl] = useState(initial?.line_url ?? props.defaultLineUrl);
  const [occasions, setOccasions] = useState<OccasionKey[]>(initial?.occasions ?? []);
  const [images, setImages] = useState<string[]>(initial?.images ?? []);
  const [available, setAvailable] = useState(initial?.available ?? true);
  const [uploadingCount, setUploadingCount] = useState(0);
  const [urlInput, setUrlInput] = useState("");
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function toggleOccasion(k: OccasionKey) {
    setOccasions((curr) =>
      curr.includes(k) ? curr.filter((x) => x !== k) : [...curr, k],
    );
  }

  function addUrlImage() {
    const urls = urlInput
      .split(/[\n,]/)
      .map((s) => s.trim())
      .filter((s) => /^https?:\/\//.test(s));
    if (urls.length === 0) {
      setError("ใส่ URL รูปที่ขึ้นต้นด้วย http:// หรือ https://");
      return;
    }
    setImages((curr) => [...curr, ...urls]);
    setUrlInput("");
    setShowUrlInput(false);
    setError(null);
  }

  async function uploadImages(files: FileList | null) {
    if (!files || files.length === 0) return;
    setError(null);
    const sb = createClient();
    const uploads: string[] = [];
    setUploadingCount(files.length);
    try {
      for (let i = 0; i < files.length; i++) {
        const f = files[i];
        const ext = (f.name.split(".").pop() ?? "jpg").toLowerCase();
        const path = `${props.boutiqueId}/${Date.now()}-${i}.${ext}`;
        const { data, error: upErr } = await sb.storage
          .from("dress-images")
          .upload(path, f, { upsert: false, contentType: f.type || undefined });
        if (upErr || !data) {
          setError(`อัปโหลดรูปไม่สำเร็จ: ${upErr?.message ?? "unknown"}`);
          break;
        }
        const { data: pub } = sb.storage.from("dress-images").getPublicUrl(data.path);
        uploads.push(pub.publicUrl);
      }
      setImages((curr) => [...curr, ...uploads]);
    } finally {
      setUploadingCount(0);
    }
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const fd = new FormData();
    fd.set("boutique_id", props.boutiqueId);
    fd.set("name", name);
    fd.set("designer", designer);
    fd.set("size", size);
    fd.set("color", color);
    const pt = toPriceTiers(tiers);
    const v = validateTiers(pt);
    if (!v.ok) {
      setTierError(v.error ?? "ราคาไม่ถูกต้อง");
      setSubmitting(false);
      return;
    }
    setTierError(null);
    const basePerDay = Math.min(...pt.map((t) => t.per_day));
    fd.set("price_tiers", JSON.stringify(pt));
    fd.set("price_per_day", String(basePerDay));
    fd.set("deposit", String(deposit));
    fd.set("description", description);
    fd.set("line_url", lineUrl);
    fd.set("images", images.join("\n"));
    occasions.forEach((o) => fd.append("occasions", o));
    fd.set("available", available ? "true" : "false");

    try {
      const res = isEdit
        ? await updateDress(props.dressId, fd)
        : await createDress(fd);
      if (!res.ok) {
        setError(res.error ?? "บันทึกไม่สำเร็จ");
        setSubmitting(false);
        return;
      }
      router.push("/sell/dashboard");
    } catch (err) {
      setError((err as Error).message);
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: 22 }}>
      {/* Images */}
      <div>
        <label style={labelStyle}>รูปชุด</label>
        <div style={{ fontSize: 12, color: "var(--ink-3)", marginBottom: 8 }}>
          อัปโหลดได้หลายรูป รูปแรกจะเป็นรูปหลัก
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
          {images.map((url, i) => (
            <div
              key={i}
              style={{
                position: "relative",
                width: 80,
                height: 100,
                borderRadius: 6,
                overflow: "hidden",
                background: "var(--bg)",
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              <button
                type="button"
                onClick={() => setImages((c) => c.filter((_, idx) => idx !== i))}
                aria-label="ลบรูป"
                style={{
                  position: "absolute",
                  top: 2,
                  right: 2,
                  width: 22,
                  height: 22,
                  borderRadius: 999,
                  background: "oklch(0.18 0.008 70 / 0.72)",
                  color: "var(--on-dark)",
                  border: "none",
                  fontSize: 11,
                  cursor: "pointer",
                }}
              >
                ×
              </button>
            </div>
          ))}
          <label
            style={{
              width: 80,
              height: 100,
              borderRadius: 6,
              border: "1px dashed var(--line)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              fontSize: 11,
              color: "var(--ink-3)",
              background: "var(--surface)",
              textAlign: "center",
              padding: 8,
            }}
          >
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => uploadImages(e.target.files)}
              style={{ display: "none" }}
            />
            {uploadingCount > 0 ? `กำลังขึ้น... (${uploadingCount})` : "+ อัปโหลด"}
          </label>
        </div>
        <button
          type="button"
          onClick={() => setShowUrlInput((s) => !s)}
          style={{
            background: "none",
            border: "none",
            color: "var(--ink-3)",
            fontSize: 12,
            textDecoration: "underline",
            cursor: "pointer",
            padding: 0,
            marginTop: 4,
          }}
        >
          {showUrlInput ? "↑ ซ่อน URL input" : "หรือใส่ลิงก์รูปจากเว็บอื่น (Unsplash, IG, ฯลฯ)"}
        </button>
        {showUrlInput ? (
          <div style={{ display: "flex", gap: 8, marginTop: 8, alignItems: "flex-start" }}>
            <textarea
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="https://images.unsplash.com/photo-...&#10;https://..."
              rows={3}
              style={{ ...inputStyle, flex: 1, resize: "vertical", fontSize: 12 }}
            />
            <button
              type="button"
              onClick={addUrlImage}
              className="btn btn-outline"
              style={{ padding: "10px 14px", fontSize: 12, whiteSpace: "nowrap" }}
            >
              + เพิ่ม
            </button>
          </div>
        ) : null}
      </div>

      <Labeled label="ชื่อชุด *">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          maxLength={80}
          style={inputStyle}
        />
      </Labeled>

      <Labeled label="แบรนด์/ดีไซเนอร์ (ไม่บังคับ)">
        <input
          type="text"
          value={designer}
          onChange={(e) => setDesigner(e.target.value)}
          maxLength={60}
          style={inputStyle}
        />
      </Labeled>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <Labeled label="ขนาด *">
          <select value={size} onChange={(e) => setSize(e.target.value as Size)} style={inputStyle}>
            {SIZES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </Labeled>
        <Labeled label="สี *">
          <select value={color} onChange={(e) => setColor(e.target.value as Color)} style={inputStyle}>
            {COLORS.map((c) => (
              <option key={c} value={c}>
                {COLOR_TH[c]}
              </option>
            ))}
          </select>
        </Labeled>
      </div>

      <Labeled label="ราคาเช่า (ตามจำนวนวัน) *">
        <div style={{ fontSize: 12, color: "var(--ink-3)", marginBottom: 8 }}>
          ตั้งราคาต่อวันให้ครบทุกช่วง ยิ่งเช่านานต่อวันยิ่งถูก ระบบคิดเงินตามช่วงที่ลูกค้าจองอัตโนมัติ
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {tiers.map((row, i) => {
            const mins = rowMins(tiers);
            const isLast = i === tiers.length - 1;
            return (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 30px", gap: 8, alignItems: "center" }}>
                <div style={{ fontSize: 13, color: "var(--ink-2)", display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                  {isLast ? (
                    <span>ตั้งแต่ {mins[i]} วันขึ้นไป</span>
                  ) : (
                    <>
                      <span style={{ color: "var(--ink-3)" }}>ตั้งแต่ {mins[i]} ถึง</span>
                      <input
                        type="number"
                        min={mins[i]}
                        value={row.max ?? ""}
                        onChange={(e) => updateMax(i, parseInt(e.target.value) || mins[i])}
                        style={{ ...inputStyle, width: 60, textAlign: "center" }}
                      />
                      <span style={{ color: "var(--ink-3)" }}>วัน</span>
                    </>
                  )}
                </div>
                <input
                  type="number"
                  min={1}
                  step={50}
                  value={row.perDay}
                  onChange={(e) => updatePerDay(i, parseInt(e.target.value) || 0)}
                  placeholder="บาท / วัน"
                  style={inputStyle}
                />
                {!isLast ? (
                  <button
                    type="button"
                    onClick={() => removeTier(i)}
                    aria-label="ลบช่วง"
                    style={{ border: 0, background: "none", color: "var(--ink-3)", cursor: "pointer", fontSize: 18, lineHeight: 1 }}
                  >
                    ×
                  </button>
                ) : (
                  <span />
                )}
              </div>
            );
          })}
        </div>
        <button
          type="button"
          onClick={addTier}
          style={{ marginTop: 10, fontSize: 13, color: "var(--ink-2)", background: "var(--bg)", border: "1px solid var(--line)", borderRadius: 6, padding: "7px 12px", cursor: "pointer" }}
        >
          + เพิ่มช่วง
        </button>
        {tierError ? (
          <div style={{ marginTop: 8, fontSize: 12, color: "var(--danger)" }}>{tierError}</div>
        ) : null}
        <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
          {[2, 4, 7].map((n) => {
            const q = priceForNights(toPriceTiers(tiers), Math.min(...tiers.map((t) => t.perDay)), n);
            return (
              <div key={n} style={{ background: "var(--bg)", borderRadius: 6, padding: "8px 10px", textAlign: "center" }}>
                <div style={{ fontSize: 11, color: "var(--ink-3)" }}>เช่า {n} วัน</div>
                <div style={{ fontSize: 15, fontWeight: 600 }}>฿{q.total.toLocaleString()}</div>
              </div>
            );
          })}
        </div>
      </Labeled>

      <Labeled label="ค่ามัดจำ (฿)">
        <input
          type="number"
          min={0}
          step={500}
          value={deposit}
          onChange={(e) => setDeposit(parseInt(e.target.value) || 0)}
          style={inputStyle}
        />
      </Labeled>

      <Labeled label="โอกาส (เลือกได้หลายอัน)">
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 4 }}>
          {props.occasions.map((o) => {
            const active = occasions.includes(o.key);
            return (
              <button
                key={o.key}
                type="button"
                onClick={() => toggleOccasion(o.key)}
                style={{
                  padding: "6px 12px",
                  fontSize: 13,
                  border: `1px solid ${active ? "var(--ink)" : "var(--line)"}`,
                  background: active ? "var(--ink)" : "var(--surface)",
                  color: active ? "var(--on-dark)" : "var(--ink)",
                  borderRadius: 6,
                  cursor: "pointer",
                }}
              >
                {o.th}
              </button>
            );
          })}
        </div>
      </Labeled>

      <Labeled label="รายละเอียดชุด">
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          maxLength={500}
          placeholder="เช่น ผ้าซาตินสีกุหลาบ ปักลูกไม้ตรงคอ จับจีบที่เอว ใส่กับเข็มขัดได้"
          style={{ ...inputStyle, resize: "vertical" }}
        />
      </Labeled>

      <Labeled label="LINE สำหรับชุดนี้" hint="ปล่อยว่างถ้าใช้ LINE หลักของร้าน">
        <input
          type="text"
          value={lineUrl}
          onChange={(e) => setLineUrl(e.target.value)}
          style={inputStyle}
        />
      </Labeled>

      {isEdit ? (
        <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <input
            type="checkbox"
            checked={available}
            onChange={(e) => setAvailable(e.target.checked)}
          />
          <span style={{ fontSize: 14 }}>เปิดให้เช่า (ติ๊กออกเพื่อหยุดให้บริการชุดนี้ชั่วคราว)</span>
        </label>
      ) : null}

      {error ? (
        <div
          style={{
            padding: 12,
            background: "var(--danger-soft)",
            border: "1px solid var(--danger)",
            borderRadius: 6,
            color: "var(--danger)",
            fontSize: 14,
          }}
        >
          {error}
        </div>
      ) : null}

      <div style={{ display: "flex", gap: 8, paddingTop: 6 }}>
        <button
          type="submit"
          className="btn btn-dark"
          disabled={submitting || uploadingCount > 0}
          style={{ padding: "12px 22px" }}
        >
          {submitting ? "กำลังบันทึก…" : isEdit ? "บันทึกการแก้ไข" : "ส่งให้ admin อนุมัติ"}
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

function Labeled({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      {hint ? <div style={{ fontSize: 12, color: "var(--ink-3)", marginBottom: 6 }}>{hint}</div> : null}
      {children}
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 14,
  fontWeight: 500,
  marginBottom: 6,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  border: "1px solid var(--line)",
  borderRadius: 6,
  background: "var(--surface)",
  fontSize: 14,
  fontFamily: "inherit",
};
