"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createProduct, updateProduct } from "@/app/actions/seller";
import { requestTag } from "@/app/actions/seller-tags";
import type { BoundTagGroup } from "@/lib/tag-groups";
import type { PriceTier, Size } from "@/lib/types";
import { priceForNights, validateTiers } from "@/lib/pricing";
import RequiredMark from "@/components/RequiredMark";

/** กลุ่มแท็กสำหรับ dropdown ขอเพิ่มแท็ก */
type TagGroupOption = { id: string; key: string; label: string };
/** คำขอเพิ่มแท็กของร้านนี้ */
type ShopTagRequest = {
  id: string;
  requestedLabel: string;
  requestedKey: string | null;
  status: string;
  reviewNotes: string | null;
  tagGroup: { label: string; key: string };
};

type TierRow = { max: number | null; perDay: number };

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

const SIZES: Size[] = ["XXXS","XXS","XS","S","M","L","XL","XXL","3XL","4XL"];

type InitialData = {
  name: string;
  designer: string | null;
  size: Size;
  color?: string | null;
  price_per_day: number;
  price_tiers: PriceTier[] | null;
  deposit: number;
  description: string | null;
  line_url: string;
  images: string[];
  available: boolean;
  selectedByGroup?: Record<string, string[]>;
  policy_override?: boolean;
  lead_time_days?: number | null;
  min_rental_days?: number | null;
  max_rental_days?: number | null;
  return_window_days?: number | null;
  buffer_days_after?: number | null;
};

type Props =
  | {
      mode: "create";
      shopId: string;
      defaultLineUrl: string;
      productTypeId: string;
      tagGroupSections: BoundTagGroup[];
      tagGroups: TagGroupOption[];
      shopTagRequests: ShopTagRequest[];
    }
  | {
      mode: "edit";
      productId: string;
      shopId: string;
      defaultLineUrl: string;
      productTypeId: string;
      tagGroupSections: BoundTagGroup[];
      tagGroups: TagGroupOption[];
      shopTagRequests: ShopTagRequest[];
      initial: InitialData;
    };

export default function ProductForm(props: Props) {
  const router = useRouter();
  const isEdit = props.mode === "edit";
  const initial = isEdit ? props.initial : null;

  const [name, setName] = useState(initial?.name ?? "");
  const [designer, setDesigner] = useState(initial?.designer ?? "");
  const [size, setSize] = useState<Size>(initial?.size ?? "M");
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
  // Dynamic tag group selections (replaces hardcoded occasions state)
  const [selectedByGroup, setSelectedByGroup] = useState<Record<string, string[]>>(
    initial?.selectedByGroup ?? {},
  );
  const [images, setImages] = useState<string[]>(initial?.images ?? []);
  const [available, setAvailable] = useState(initial?.available ?? true);
  const [policyOverride, setPolicyOverride] = useState<boolean>(initial?.policy_override ?? false);
  const [overrideLeadTime, setOverrideLeadTime] = useState<string>(
    initial?.lead_time_days != null ? String(initial.lead_time_days) : "",
  );
  const [overrideMinRental, setOverrideMinRental] = useState<string>(
    initial?.min_rental_days != null ? String(initial.min_rental_days) : "",
  );
  const [overrideMaxRental, setOverrideMaxRental] = useState<string>(
    initial?.max_rental_days != null ? String(initial.max_rental_days) : "",
  );
  const [overrideReturnWindow, setOverrideReturnWindow] = useState<string>(
    initial?.return_window_days != null ? String(initial.return_window_days) : "",
  );
  const [overrideBuffer, setOverrideBuffer] = useState<string>(
    initial?.buffer_days_after != null ? String(initial.buffer_days_after) : "",
  );
  const [uploadingCount, setUploadingCount] = useState(0);
  const [urlInput, setUrlInput] = useState("");
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  // Tag-request panel state
  const [showTagRequest, setShowTagRequest] = useState(false);
  const [tagReqGroupId, setTagReqGroupId] = useState(props.tagGroups[0]?.id ?? "");
  const [tagReqLabel, setTagReqLabel] = useState("");
  const [tagReqKey, setTagReqKey] = useState("");
  const [tagReqSubmitting, setTagReqSubmitting] = useState(false);
  const [tagReqError, setTagReqError] = useState<string | null>(null);
  const [tagReqSuccess, setTagReqSuccess] = useState<string | null>(null);

  /** Toggle a tag in a group, honoring selectionMode. */
  function toggleTag(groupKey: string, tagKey: string, mode: "single" | "multi") {
    setSelectedByGroup((curr) => {
      const cur = curr[groupKey] ?? [];
      if (mode === "single") {
        return { ...curr, [groupKey]: cur.includes(tagKey) ? [] : [tagKey] };
      }
      return {
        ...curr,
        [groupKey]: cur.includes(tagKey)
          ? cur.filter((k) => k !== tagKey)
          : [...cur, tagKey],
      };
    });
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

    // Client-side required validation for tag groups
    for (const g of props.tagGroupSections) {
      if (g.isRequired) {
        const sel = selectedByGroup[g.groupKey] ?? [];
        if (sel.length === 0) {
          setError(`กรุณาเลือก "${g.groupLabel}" อย่างน้อย 1 รายการ`);
          setSubmitting(false);
          return;
        }
      }
    }

    const fd = new FormData();
    fd.set("shop_id", props.shopId);
    fd.set("name", name);
    fd.set("designer", designer);
    fd.set("size", size);
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
    // Submit dynamic tag selections as JSON
    fd.set("tag_selections", JSON.stringify(selectedByGroup));
    fd.set("available", available ? "true" : "false");

    fd.set("policy_override", policyOverride ? "true" : "false");
    if (policyOverride) {
      fd.set("lead_time_days", overrideLeadTime);
      fd.set("min_rental_days", overrideMinRental);
      fd.set("max_rental_days", overrideMaxRental);
      fd.set("return_window_days", overrideReturnWindow);
      fd.set("buffer_days_after", overrideBuffer);
    }

    try {
      if (isEdit) {
        const res = await updateProduct(props.productId, fd);
        if (!res.ok) { setError(res.error ?? "บันทึกไม่สำเร็จ"); setSubmitting(false); return; }
      } else {
        const res = await createProduct(fd);
        if (!res.ok) { setError(res.error ?? "บันทึกไม่สำเร็จ"); setSubmitting(false); return; }
      }
      router.push("/sell/dashboard");
    } catch (err) {
      setError((err as Error).message);
      setSubmitting(false);
    }
  }

  async function onTagRequest() {
    setTagReqError(null);
    setTagReqSuccess(null);
    if (!tagReqLabel.trim()) { setTagReqError("กรุณาระบุชื่อแท็ก"); return; }
    if (!tagReqGroupId) { setTagReqError("กรุณาเลือกกลุ่มแท็ก"); return; }
    setTagReqSubmitting(true);
    try {
      const res = await requestTag({
        shopId: props.shopId,
        tagGroupId: tagReqGroupId,
        requestedLabel: tagReqLabel.trim(),
        requestedKey: tagReqKey.trim() || undefined,
      });
      if (!res.ok) {
        setTagReqError(res.error ?? "ส่งคำขอไม่สำเร็จ");
      } else {
        setTagReqSuccess("ส่งคำขอแล้ว รอแอดมินอนุมัติ");
        setTagReqLabel("");
        setTagReqKey("");
        setShowTagRequest(false);
      }
    } catch (e) {
      setTagReqError((e as Error).message);
    } finally {
      setTagReqSubmitting(false);
    }
  }

  // Bound group ids for constraining the tag-request dropdown
  const boundGroupIds = new Set(props.tagGroupSections.map((g) => g.groupId));
  const boundTagGroups = props.tagGroups.filter((g) => boundGroupIds.has(g.id));
  // If no bound groups in tagGroups list, fall back to all tagGroups
  const tagReqGroupOptions = boundTagGroups.length > 0 ? boundTagGroups : props.tagGroups;

  return (
    <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: 22 }}>

      {/* ═══════════════════════════════════════════
          PART A — ชุดนี้คืออะไร
          ═══════════════════════════════════════════ */}

      {/* 1) รูปชุด */}
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
                  position: "absolute", top: 2, right: 2, width: 22, height: 22,
                  borderRadius: 999,
                  background: "color-mix(in oklch, var(--ink) 75%, transparent)",
                  color: "var(--on-dark)", border: "none", fontSize: 11, cursor: "pointer",
                }}
              >×</button>
            </div>
          ))}
          <label
            style={{
              width: 80, height: 100, borderRadius: 6,
              border: "1px dashed var(--line)", display: "flex", alignItems: "center",
              justifyContent: "center", cursor: "pointer", fontSize: 11,
              color: "var(--ink-3)", background: "var(--surface)", textAlign: "center", padding: 8,
            }}
          >
            <input
              type="file" accept="image/*" multiple
              onChange={(e) => uploadImages(e.target.files)}
              style={{ display: "none" }}
            />
            {uploadingCount > 0 ? `กำลังขึ้น... (${uploadingCount})` : "+ อัปโหลด"}
          </label>
        </div>
        <button
          type="button" onClick={() => setShowUrlInput((s) => !s)}
          style={{ background: "none", border: "none", color: "var(--ink-3)", fontSize: 12, textDecoration: "underline", cursor: "pointer", padding: 0, marginTop: 4 }}
        >
          {showUrlInput ? "↑ ซ่อน URL input" : "หรือใส่ลิงก์รูปจากเว็บอื่น (Unsplash, IG, ฯลฯ)"}
        </button>
        {showUrlInput ? (
          <div style={{ display: "flex", gap: 8, marginTop: 8, alignItems: "flex-start" }}>
            <textarea
              value={urlInput} onChange={(e) => setUrlInput(e.target.value)}
              placeholder={"https://images.unsplash.com/photo-...\nhttps://..."}
              rows={3} style={{ ...inputStyle, flex: 1, resize: "vertical", fontSize: 12 }}
            />
            <button type="button" onClick={addUrlImage} className="btn btn-outline"
              style={{ padding: "10px 14px", fontSize: 12, whiteSpace: "nowrap" }}>
              + เพิ่ม
            </button>
          </div>
        ) : null}
      </div>

      {/* 2) ชื่อชุด* */}
      <Labeled label="ชื่อชุด" required>
        <input
          type="text" value={name} onChange={(e) => setName(e.target.value)}
          required aria-required={true} maxLength={80} style={inputStyle}
        />
      </Labeled>

      {/* 3) ขนาด* */}
      <Labeled label="ขนาด" required>
        <select value={size} onChange={(e) => setSize(e.target.value as Size)} aria-required={true} style={inputStyle}>
          {SIZES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </Labeled>

      {/* 4) § คุณสมบัติชุด — dynamic tag group sections */}
      {props.tagGroupSections.length > 0 ? (
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink-2)", marginBottom: 12, paddingBottom: 6, borderBottom: "1px solid var(--line)" }}>
            คุณสมบัติชุด
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {props.tagGroupSections.map((g) => (
              <Labeled
                key={g.groupId}
                label={g.selectionMode === "single" ? g.groupLabel : `${g.groupLabel} (เลือกได้หลายอัน)`}
                required={g.isRequired}
              >
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 4 }}>
                  {g.tags.map((t) => {
                    const sel = selectedByGroup[g.groupKey] ?? [];
                    const active = sel.includes(t.key);
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => toggleTag(g.groupKey, t.key, g.selectionMode)}
                        style={{
                          padding: "6px 12px", fontSize: 13,
                          border: `1px solid ${active ? "var(--ink)" : "var(--line)"}`,
                          background: active ? "var(--ink)" : "var(--surface)",
                          color: active ? "var(--on-dark)" : "var(--ink)",
                          borderRadius: 6, cursor: "pointer",
                          display: "inline-flex", alignItems: "center",
                        }}
                      >
                        {t.swatchImageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={t.swatchImageUrl} alt="" style={{ width: 14, height: 14, borderRadius: "50%", objectFit: "cover", display: "inline-block", marginRight: 4, verticalAlign: "middle" }} />
                        ) : t.swatchHex ? (
                          <span style={{ display: "inline-block", width: 12, height: 12, borderRadius: "50%", background: t.swatchHex, marginRight: 4, verticalAlign: "middle", border: "1px solid rgba(0,0,0,0.1)", flexShrink: 0 }} />
                        ) : null}
                        {t.label}
                      </button>
                    );
                  })}
                </div>
                {/* per-section "+ ขอเพิ่มแท็กในกลุ่มนี้" preset link */}
                <button
                  type="button"
                  onClick={() => {
                    const grp = props.tagGroups.find((tg) => tg.id === g.groupId);
                    if (grp) setTagReqGroupId(grp.id);
                    setShowTagRequest(true);
                  }}
                  style={{ background: "none", border: "none", color: "var(--ink-3)", fontSize: 11, textDecoration: "underline", cursor: "pointer", padding: 0, marginTop: 6 }}
                >
                  + ขอเพิ่มแท็กในกลุ่มนี้
                </button>
              </Labeled>
            ))}
          </div>
        </div>
      ) : null}

      {/* 5) แบรนด์/ดีไซเนอร์ */}
      <Labeled label="แบรนด์/ดีไซเนอร์ (ไม่บังคับ)">
        <input
          type="text" value={designer} onChange={(e) => setDesigner(e.target.value)}
          maxLength={60} style={inputStyle}
        />
      </Labeled>

      {/* 6) รายละเอียด */}
      <Labeled label="รายละเอียดชุด">
        <textarea
          value={description} onChange={(e) => setDescription(e.target.value)}
          rows={4} maxLength={500}
          placeholder="เช่น ผ้าซาตินสีกุหลาบ ปักลูกไม้ตรงคอ จับจีบที่เอว ใส่กับเข็มขัดได้"
          style={{ ...inputStyle, resize: "vertical" }}
        />
      </Labeled>

      {/* ── visual divider ─── */}
      <div style={{ borderTop: "2px solid var(--line)", paddingTop: 18 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: "var(--ink-2)", marginBottom: 18, letterSpacing: "0.02em" }}>
          ปล่อยเช่ายังไง
        </div>

        {/* PART B */}

        {/* 7) เปิด/ปิดให้เช่า — EDIT MODE ONLY, first item in Part B */}
        {isEdit ? (
          <label style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 18 }}>
            <input
              type="checkbox" checked={available}
              onChange={(e) => setAvailable(e.target.checked)}
            />
            <span style={{ fontSize: 14 }}>เปิดให้เช่า (ติ๊กออกเพื่อหยุดให้บริการชุดนี้ชั่วคราว)</span>
          </label>
        ) : null}

        {/* 8) ราคาเช่า* */}
        <Labeled label="ราคาเช่า (ตามจำนวนวัน)" required>
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
                          type="number" min={mins[i]} value={row.max ?? ""}
                          onChange={(e) => updateMax(i, parseInt(e.target.value) || mins[i])}
                          style={{ ...inputStyle, width: 60, textAlign: "center" }}
                        />
                        <span style={{ color: "var(--ink-3)" }}>วัน</span>
                      </>
                    )}
                  </div>
                  <input
                    type="number" min={1} step={1} value={row.perDay}
                    onChange={(e) => updatePerDay(i, parseInt(e.target.value) || 0)}
                    placeholder="บาท / วัน" style={inputStyle}
                  />
                  {!isLast ? (
                    <button type="button" onClick={() => removeTier(i)} aria-label="ลบช่วง"
                      style={{ border: 0, background: "none", color: "var(--ink-3)", cursor: "pointer", fontSize: 18, lineHeight: 1 }}>
                      ×
                    </button>
                  ) : <span />}
                </div>
              );
            })}
          </div>
          <button type="button" onClick={addTier}
            style={{ marginTop: 10, fontSize: 13, color: "var(--ink-2)", background: "var(--bg)", border: "1px solid var(--line)", borderRadius: 6, padding: "7px 12px", cursor: "pointer" }}>
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

        {/* 9) ค่ามัดจำ */}
        <Labeled label="ค่ามัดจำ (฿)">
          <input
            type="number" min={0} step={1} value={deposit}
            onChange={(e) => setDeposit(parseInt(e.target.value) || 0)}
            style={inputStyle}
          />
        </Labeled>

        {/* 10) LINE override */}
        <Labeled label="LINE สำหรับชุดนี้" hint="ปล่อยว่างถ้าใช้ LINE หลักของร้าน">
          <input
            type="text" value={lineUrl} onChange={(e) => setLineUrl(e.target.value)}
            style={inputStyle}
          />
        </Labeled>

        {/* ▼ ขั้นสูง — เงื่อนไขการจอง (policy overrides, collapsible) */}
        <div style={{ borderTop: "1px solid var(--line)", paddingTop: 18, marginTop: 8 }}>
          <label style={{ ...labelStyle, marginBottom: 8 }}>เงื่อนไขการจอง (override ร้าน)</label>
          <div style={{ fontSize: 12, color: "var(--ink-3)", marginBottom: 12 }}>
            เปิดใช้งานเพื่อกำหนดเงื่อนไขเฉพาะสินค้าชิ้นนี้ ช่องว่าง = ใช้ค่าร้าน
          </div>
          <label style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
            <input type="checkbox" checked={policyOverride} onChange={(e) => setPolicyOverride(e.target.checked)} />
            <span style={{ fontSize: 14 }}>กำหนดเงื่อนไขเฉพาะสินค้านี้ (override ร้าน)</span>
          </label>
          {policyOverride ? (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, paddingLeft: 8, borderLeft: "2px solid var(--line)" }}>
              <Labeled label="จองล่วงหน้าขั้นต่ำ (วัน)" hint="ว่าง = ใช้ค่าร้าน">
                <input type="number" min={0} value={overrideLeadTime} onChange={(e) => setOverrideLeadTime(e.target.value)} placeholder="ใช้ค่าร้าน" style={inputStyle} />
              </Labeled>
              <Labeled label="เช่าขั้นต่ำ (วัน)" hint="ว่าง = ใช้ค่าร้าน">
                <input type="number" min={1} value={overrideMinRental} onChange={(e) => setOverrideMinRental(e.target.value)} placeholder="ใช้ค่าร้าน" style={inputStyle} />
              </Labeled>
              <Labeled label="เช่าสูงสุด (วัน)" hint="ว่าง = ไม่จำกัด (ใช้ค่าร้าน)">
                <input type="number" min={1} value={overrideMaxRental} onChange={(e) => setOverrideMaxRental(e.target.value)} placeholder="ไม่จำกัด" style={inputStyle} />
              </Labeled>
              <Labeled label="คืนสินค้าภายใน (วัน)" hint="ว่าง = ใช้ค่าร้าน">
                <input type="number" min={0} value={overrideReturnWindow} onChange={(e) => setOverrideReturnWindow(e.target.value)} placeholder="ใช้ค่าร้าน" style={inputStyle} />
              </Labeled>
              <Labeled label="บัฟเฟอร์หลังเช่า (วัน)" hint="ว่าง = ใช้ค่าร้าน">
                <input type="number" min={0} value={overrideBuffer} onChange={(e) => setOverrideBuffer(e.target.value)} placeholder="ใช้ค่าร้าน" style={inputStyle} />
              </Labeled>
            </div>
          ) : null}
        </div>
      </div>

      {/* ─── ขอเพิ่มแท็ก ─── */}
      {tagReqGroupOptions.length > 0 ? (
        <div style={{ borderTop: "1px solid var(--line)", paddingTop: 18 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
            <label style={labelStyle}>ขอเพิ่มแท็กใหม่</label>
            <button
              type="button"
              onClick={() => { setShowTagRequest((s) => !s); setTagReqError(null); setTagReqSuccess(null); }}
              style={{ background: "none", border: "none", color: "var(--ink-3)", fontSize: 12, textDecoration: "underline", cursor: "pointer", padding: 0 }}
            >
              {showTagRequest ? "ซ่อน" : "+ ขอเพิ่มแท็ก"}
            </button>
          </div>
          <div style={{ fontSize: 12, color: "var(--ink-3)", marginBottom: showTagRequest ? 12 : 0 }}>
            คำขอจะถูกส่งให้แอดมินอนุมัติ • เมื่ออนุมัติแล้วผู้ขายทุกคนและผู้ใช้จะเห็นแท็กนี้{" "}
            <a href="/sell/tags" style={{ color: "var(--ink-3)", textDecoration: "underline", whiteSpace: "nowrap" }}>
              จัดการคำขอแท็กทั้งหมด →
            </a>
          </div>
          {showTagRequest ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 10, paddingLeft: 8, borderLeft: "2px solid var(--line)" }}>
              <div>
                <label style={{ ...labelStyle, fontSize: 13 }}>กลุ่มแท็ก</label>
                <select value={tagReqGroupId} onChange={(e) => setTagReqGroupId(e.target.value)} style={inputStyle}>
                  {tagReqGroupOptions.map((g) => (
                    <option key={g.id} value={g.id}>{g.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ ...labelStyle, fontSize: 13 }}>ชื่อแท็กที่ต้องการ (ภาษาไทย) <RequiredMark /></label>
                <input
                  type="text" value={tagReqLabel} onChange={(e) => setTagReqLabel(e.target.value)}
                  maxLength={80} placeholder="เช่น งานกีฬาสี" style={inputStyle}
                />
              </div>
              <div>
                <label style={{ ...labelStyle, fontSize: 13 }}>slug key (ไม่บังคับ — admin กำหนดได้เอง)</label>
                <input
                  type="text" value={tagReqKey} onChange={(e) => setTagReqKey(e.target.value)}
                  maxLength={48} placeholder="เช่น sport-event" style={inputStyle}
                />
              </div>
              {tagReqError ? <div style={{ fontSize: 12, color: "var(--danger)" }}>{tagReqError}</div> : null}
              <button type="button" onClick={onTagRequest} disabled={tagReqSubmitting}
                className="btn btn-outline" style={{ alignSelf: "flex-start", padding: "9px 16px", fontSize: 13 }}>
                {tagReqSubmitting ? "กำลังส่ง…" : "ส่งคำขอ"}
              </button>
            </div>
          ) : null}
          {tagReqSuccess ? (
            <div style={{ marginTop: 8, fontSize: 13, color: "var(--success, #16a34a)" }}>{tagReqSuccess}</div>
          ) : null}

          {/* คำขอที่ส่งไปแล้วของร้านนี้ */}
          {props.shopTagRequests.length > 0 ? (
            <div style={{ marginTop: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 500, color: "var(--ink-2)", marginBottom: 6 }}>คำขอที่ส่งไปแล้ว</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {props.shopTagRequests.slice(0, 5).map((r) => (
                  <div key={r.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12, padding: "6px 10px", background: "var(--bg)", borderRadius: 6, border: "1px solid var(--line)", gap: 8, flexWrap: "wrap" }}>
                    <span>
                      <span style={{ color: "var(--ink-3)" }}>{r.tagGroup.label} /</span>{" "}
                      <strong>{r.requestedLabel}</strong>
                    </span>
                    <span style={{
                      fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 999,
                      background: r.status === "approved" ? "color-mix(in oklch, #16a34a 15%, transparent)" :
                        r.status === "rejected" ? "color-mix(in oklch, var(--danger) 12%, transparent)" :
                        "color-mix(in oklch, #d97706 12%, transparent)",
                      color: r.status === "approved" ? "#16a34a" :
                        r.status === "rejected" ? "var(--danger)" : "#d97706",
                    }}>
                      {r.status === "approved" ? "อนุมัติแล้ว" : r.status === "rejected" ? "ตีกลับ" : "รออนุมัติ"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {error ? (
        <div style={{ padding: 12, background: "color-mix(in oklch, var(--danger) 10%, transparent)", borderRadius: 8, fontSize: 13, color: "var(--danger)", border: "1px solid color-mix(in oklch, var(--danger) 30%, transparent)" }}>
          {error}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={submitting || uploadingCount > 0}
        className="btn btn-primary"
        style={{ padding: "14px 28px", fontSize: 15, fontWeight: 600 }}
      >
        {submitting ? "กำลังบันทึก…" : isEdit ? "บันทึกการแก้ไข" : "เพิ่มสินค้า"}
      </button>
    </form>
  );
}

// ── Shared sub-components ────────────────────────────────────────────────────

const labelStyle: React.CSSProperties = {
  display: "block", fontSize: 13, fontWeight: 500,
  color: "var(--ink-2)", marginBottom: 6,
};

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "10px 12px", fontSize: 14, borderRadius: 7,
  border: "1px solid var(--line)", background: "var(--surface)",
  color: "var(--ink)", outline: "none", boxSizing: "border-box",
};

function Labeled({
  label, hint, required, children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label style={labelStyle}>
        {label}
        {required ? <RequiredMark /> : null}
        {hint ? <span style={{ fontWeight: 400, color: "var(--ink-3)", marginLeft: 4 }}>— {hint}</span> : null}
      </label>
      {children}
    </div>
  );
}
