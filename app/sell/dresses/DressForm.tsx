"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createDress, updateDress, updateDressPriceTiers } from "@/app/actions/seller";
import type { Color, Occasion, OccasionKey, PriceTier, Size } from "@/lib/types";

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
const SIZES: Size[] = ["XS", "S", "M", "L", "XL"];

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
        deposit: number;
        description: string | null;
        line_url: string;
        images: string[];
        occasions: OccasionKey[];
        available: boolean;
        price_tiers: PriceTier[];
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
  const [pricePerDay, setPricePerDay] = useState(initial?.price_per_day ?? 1500);
  const [deposit, setDeposit] = useState(initial?.deposit ?? 3000);
  const [description, setDescription] = useState(initial?.description ?? "");
  const [lineUrl, setLineUrl] = useState(initial?.line_url ?? props.defaultLineUrl);
  const [occasions, setOccasions] = useState<OccasionKey[]>(initial?.occasions ?? []);
  const [images, setImages] = useState<string[]>(initial?.images ?? []);
  const [available, setAvailable] = useState(initial?.available ?? true);
  const [priceTiers, setPriceTiers] = useState<PriceTier[]>(initial?.price_tiers ?? []);
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
    const uploads: string[] = [];
    setUploadingCount(files.length);
    try {
      for (let i = 0; i < files.length; i++) {
        const fd = new FormData();
        fd.append("file", files[i]);
        const res = await fetch("/api/upload", { method: "POST", body: fd });
        if (!res.ok) {
          setError("อัปโหลดรูปไม่สำเร็จ — กรุณาลองใหม่อีกครั้ง");
          break;
        }
        const json = await res.json();
        uploads.push(json.urls?.large ?? json.url ?? "");
      }
      setImages((curr) => [...curr, ...uploads.filter(Boolean)]);
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
    fd.set("price_per_day", String(pricePerDay));
    fd.set("deposit", String(deposit));
    fd.set("description", description);
    fd.set("line_url", lineUrl);
    fd.set("images", images.join("\n"));
    occasions.forEach((o) => fd.append("occasions", o));
    fd.set("available", available ? "true" : "false");

    try {
      let dressId: string | undefined;
      if (isEdit) {
        const res = await updateDress(props.dressId, fd);
        if (!res.ok) { setError(res.error ?? "บันทึกไม่สำเร็จ"); setSubmitting(false); return; }
        dressId = props.dressId;
      } else {
        const res = await createDress(fd);
        if (!res.ok) { setError(res.error ?? "บันทึกไม่สำเร็จ"); setSubmitting(false); return; }
        dressId = res.id;
      }
      if (dressId) {
        const tiersRes = await updateDressPriceTiers(dressId, priceTiers);
        if (!tiersRes.ok) {
          setError(tiersRes.error ?? "บันทึกแพ็กเกจราคาไม่สำเร็จ");
          setSubmitting(false);
          return;
        }
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

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <Labeled label="ค่าเช่า / วัน (฿) *">
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={pricePerDay || ""}
            onChange={(e) => setPricePerDay(parseInt(e.target.value) || 0)}
            style={inputStyle}
          />
        </Labeled>
        <Labeled label="ค่ามัดจำ (฿)">
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={deposit || ""}
            onChange={(e) => setDeposit(parseInt(e.target.value) || 0)}
            style={inputStyle}
          />
        </Labeled>
      </div>

      {/* Price tiers */}
      <div>
        <label style={labelStyle}>แพ็กเกจราคา (ไม่บังคับ)</label>
        <div style={{ fontSize: 12, color: "var(--ink-3)", marginBottom: 10 }}>
          กำหนดราคาตามจำนวนวัน เช่น เช่า 3 วัน ราคา 2,100 บาท
        </div>
        {priceTiers.map((tier, i) => (
          <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 8, marginBottom: 8 }}>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              placeholder="จำนวนวัน"
              value={tier.days || ""}
              onChange={(e) => {
                const v = parseInt(e.target.value) || 0;
                setPriceTiers((curr) => curr.map((t, idx) => idx === i ? { ...t, days: v } : t));
              }}
              style={inputStyle}
            />
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              placeholder="ราคา (฿)"
              value={tier.price || ""}
              onChange={(e) => {
                const v = parseInt(e.target.value) || 0;
                setPriceTiers((curr) => curr.map((t, idx) => idx === i ? { ...t, price: v } : t));
              }}
              style={inputStyle}
            />
            <button
              type="button"
              onClick={() => setPriceTiers((curr) => curr.filter((_, idx) => idx !== i))}
              style={{
                padding: "0 12px",
                border: "1px solid rgba(220,38,38,0.4)",
                borderRadius: 6,
                background: "rgba(220,38,38,0.08)",
                color: "#DC2626",
                cursor: "pointer",
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              ลบ
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => setPriceTiers((curr) => [...curr, { days: 1, price: 0 }])}
          style={{
            width: "100%",
            padding: "10px",
            border: "1px dashed var(--line)",
            borderRadius: 6,
            background: "var(--surface)",
            color: "var(--ink-2)",
            fontSize: 13,
            cursor: "pointer",
            marginTop: 4,
          }}
        >
          + เพิ่มแพ็กเกจวันใหม่
        </button>
      </div>

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
