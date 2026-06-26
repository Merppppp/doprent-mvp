"use client";

import { useState, useTransition, useMemo, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createManualBooking, getAssignableUnits, type AssignableUnit } from "@/app/actions/manual-booking";
import CalendarRangePicker from "@/components/CalendarRangePicker";
import { sizeLabel } from "@/lib/types";

// ─── Shared types ────────────────────────────────────────────────────────────

type Variant = {
  id: string;
  size: string;
  quantity: number;
  pricePerDay: number;
  deposit: number;
  available: boolean;
  unavailable: string[];
};

export type CatalogProduct = {
  id: string;
  name: string;
  imageUrl: string | null;
  pricePerDay: number;
  deposit: number;
  variants: Variant[];
};

type FulfillmentMethod = "walk_in" | "express" | "standard";

// ─── Line item state ─────────────────────────────────────────────────────────

type LineItem = {
  /** stable client-side id so React keys are stable */
  key: string;
  productId: string;
  productName: string;
  productImage: string | null;
  pricePerDay: number;
  deposit: number;
  variants: Variant[];
  variantId: string | null;
  unitId: string;           // "" = auto
  assignableUnits: AssignableUnit[] | null;
  unitsLoading: boolean;
};

let keyCounter = 0;
function newKey() {
  return `li-${++keyCounter}`;
}

// ─── Props ────────────────────────────────────────────────────────────────────

type Props = {
  productId: string;
  productName: string;
  productImage: string | null;
  pricePerDay: number;
  deposit: number;
  variants: Variant[];
  unavailable: string[];     // product-wide unavailable dates (entry product)
  initialStartDate?: string;
  initialEndDate?: string;
  initialVariantId?: string;
  catalog: CatalogProduct[];
};

const FULFILLMENT_OPTIONS: { value: FulfillmentMethod; label: string; hint: string }[] = [
  { value: "walk_in", label: "ลูกค้ามารับที่ร้าน", hint: "รับ–คืนหน้าร้าน" },
  { value: "express", label: "ส่งด่วน", hint: "ส่งแบบเร่งด่วน" },
  { value: "standard", label: "ส่งพัสดุ", hint: "ส่งพัสดุปกติ" },
];

// ─── Helper: pick default variantId ─────────────────────────────────────────

function defaultVariant(variants: Variant[], preferred?: string): string | null {
  if (!variants.length) return null;
  return (
    variants.find((v) => v.id === preferred && v.available)?.id ??
    variants.find((v) => v.available)?.id ??
    variants[0].id
  );
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function ManualBookingForm({
  productId,
  productName,
  productImage,
  pricePerDay,
  deposit,
  variants,
  unavailable,
  initialStartDate,
  initialEndDate,
  initialVariantId,
  catalog,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // ── Shared booking fields ──────────────────────────────────────────────────
  const [startDate, setStartDate] = useState(initialStartDate ?? "");
  const [endDate, setEndDate] = useState(initialEndDate ?? "");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [internalNote, setInternalNote] = useState("");
  const [fulfillment, setFulfillment] = useState<FulfillmentMethod>("walk_in");
  const [shippingAddress, setShippingAddress] = useState("");
  const [useCustomTotal, setUseCustomTotal] = useState(false);
  const [customTotal, setCustomTotal] = useState("");

  // ── Catalog picker modal ───────────────────────────────────────────────────
  const [showCatalogPicker, setShowCatalogPicker] = useState(false);

  // ── Line items ─────────────────────────────────────────────────────────────
  const [items, setItems] = useState<LineItem[]>(() => [
    {
      key: newKey(),
      productId,
      productName,
      productImage,
      pricePerDay,
      deposit,
      variants,
      variantId: defaultVariant(variants, initialVariantId),
      unitId: "",
      assignableUnits: null,
      unitsLoading: false,
    },
  ]);

  const isShipping = fulfillment !== "walk_in";
  const nights = useMemo(() => {
    if (!startDate || !endDate) return 0;
    const s = new Date(startDate).getTime();
    const e = new Date(endDate).getTime();
    if (isNaN(s) || isNaN(e) || e < s) return 0;
    return Math.round((e - s) / 86_400_000) + 1;
  }, [startDate, endDate]);

  // ── Fetch assignable units for a single item ───────────────────────────────
  const fetchUnitsForItem = useCallback(
    async (key: string, pid: string, vid: string | null, start: string, end: string, fm: FulfillmentMethod) => {
      if (!vid || !start || !end || end < start) {
        setItems((prev) =>
          prev.map((it) => (it.key === key ? { ...it, assignableUnits: null, unitId: "", unitsLoading: false } : it)),
        );
        return;
      }
      setItems((prev) =>
        prev.map((it) => (it.key === key ? { ...it, unitsLoading: true, unitId: "" } : it)),
      );
      const res = await getAssignableUnits(pid, vid, start, end, fm);
      setItems((prev) =>
        prev.map((it) =>
          it.key === key
            ? { ...it, unitsLoading: false, assignableUnits: res.ok ? res.units : null }
            : it,
        ),
      );
    },
    [],
  );

  // ── Re-fetch units for ALL items when shared date/fulfillment change ───────
  useEffect(() => {
    items.forEach((it) => {
      fetchUnitsForItem(it.key, it.productId, it.variantId, startDate, endDate, fulfillment);
    });
    // intentionally only re-run on shared fields, not items itself
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startDate, endDate, fulfillment]);

  // ── Item mutations ─────────────────────────────────────────────────────────

  function changeVariant(key: string, vid: string) {
    setItems((prev) =>
      prev.map((it) => (it.key === key ? { ...it, variantId: vid, unitId: "", assignableUnits: null } : it)),
    );
    const item = items.find((it) => it.key === key);
    if (item) fetchUnitsForItem(key, item.productId, vid, startDate, endDate, fulfillment);
  }

  function changeUnit(key: string, uid: string) {
    setItems((prev) => prev.map((it) => (it.key === key ? { ...it, unitId: uid } : it)));
  }

  function addProduct(cp: CatalogProduct) {
    const vid = defaultVariant(cp.variants);
    const newItem: LineItem = {
      key: newKey(),
      productId: cp.id,
      productName: cp.name,
      productImage: cp.imageUrl,
      pricePerDay: cp.pricePerDay,
      deposit: cp.deposit,
      variants: cp.variants,
      variantId: vid,
      unitId: "",
      assignableUnits: null,
      unitsLoading: false,
    };
    setItems((prev) => [...prev, newItem]);
    setShowCatalogPicker(false);
    // fetch units for the new item
    if (startDate && endDate && vid) {
      setTimeout(() => fetchUnitsForItem(newItem.key, cp.id, vid, startDate, endDate, fulfillment), 0);
    }
  }

  function removeItem(key: string) {
    setItems((prev) => (prev.length > 1 ? prev.filter((it) => it.key !== key) : prev));
  }

  // ── Pricing ────────────────────────────────────────────────────────────────

  const itemSubtotals = useMemo(
    () =>
      items.map((it) => {
        const v = it.variants.find((vv) => vv.id === it.variantId);
        const ppd = v?.pricePerDay ?? it.pricePerDay;
        const dep = v?.deposit ?? it.deposit;
        return {
          key: it.key,
          productName: it.productName,
          ppd,
          dep,
          rentalTotal: nights > 0 ? ppd * nights : null,
        };
      }),
    [items, nights],
  );

  const combinedRental = useMemo(
    () =>
      itemSubtotals.every((s) => s.rentalTotal !== null)
        ? itemSubtotals.reduce((sum, s) => sum + (s.rentalTotal ?? 0), 0)
        : null,
    [itemSubtotals],
  );
  const combinedDeposit = useMemo(
    () => itemSubtotals.reduce((sum, s) => sum + s.dep, 0),
    [itemSubtotals],
  );

  const isSingleItem = items.length === 1;

  // ── Calendar unavailability: union across all selected items' variants ──────
  const sharedUnavailableSet = useMemo(() => {
    const merged = new Set(unavailable);
    for (const it of items) {
      const v = it.variants.find((vv) => vv.id === it.variantId);
      if (v?.unavailable) {
        for (const d of v.unavailable) merged.add(d);
      }
    }
    return merged;
  }, [unavailable, items]);

  // ── Submit ─────────────────────────────────────────────────────────────────

  function handleSubmit() {
    setError(null);
    setSuccess(null);

    if (!startDate || !endDate) { setError("กรุณาเลือกวันเช่า"); return; }
    if (!customerName.trim()) { setError("กรุณาใส่ชื่อลูกค้า"); return; }
    if (isShipping && !shippingAddress.trim()) { setError("กรุณาใส่ที่อยู่จัดส่ง"); return; }

    const fd = new FormData();
    fd.set("start_date", startDate);
    fd.set("end_date", endDate);
    fd.set("customer_name", customerName.trim());
    fd.set("customer_phone", customerPhone.trim());
    fd.set("internal_note", internalNote.trim());
    fd.set("fulfillment", fulfillment);
    if (isShipping) fd.set("shipping_address", shippingAddress.trim());
    if (isSingleItem && useCustomTotal && customTotal) fd.set("custom_total", customTotal);

    const itemsPayload = items.map((it) => ({
      productId: it.productId,
      variantId: it.variantId ?? null,
      unitId: it.unitId || "",   // "" → auto
    }));
    fd.set("items", JSON.stringify(itemsPayload));

    startTransition(async () => {
      const res = await createManualBooking(fd);
      if (!res.ok) {
        setError(res.error);
      } else {
        setSuccess("สร้างรายการจองสำเร็จ");
        setTimeout(() => router.push(`/sell/bookings/${res.id}`), 1200);
      }
    });
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="grid gap-5">

      {/* ── Line items ─────────────────────────────────────────────────────── */}
      {items.map((item, idx) => {
        const subtotal = itemSubtotals[idx];
        const selectedVariant = item.variants.find((v) => v.id === item.variantId) ?? null;
        const hasVariants = item.variants.length > 0;

        return (
          <div key={item.key} className="rounded-xl border border-line bg-surface">
            {/* Product header */}
            <div className="flex items-center gap-3.5 p-3.5">
              <div className="h-[76px] w-[60px] shrink-0 overflow-hidden rounded-lg bg-bg">
                {item.productImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.productImage}
                    alt={item.productName}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="h-full w-full bg-accent-soft" />
                )}
              </div>
              <div className="min-w-0 grow">
                <div className="truncate text-[15px] font-semibold text-ink">{item.productName}</div>
                {subtotal.rentalTotal !== null ? (
                  <div className="mt-0.5 text-[13px] text-ink-2">
                    ฿{subtotal.ppd.toLocaleString()}/วัน · มัดจำ ฿{subtotal.dep.toLocaleString()}
                  </div>
                ) : (
                  <div className="mt-0.5 text-[13px] text-ink-3">
                    ฿{subtotal.ppd.toLocaleString()}/วัน · มัดจำ ฿{subtotal.dep.toLocaleString()}
                  </div>
                )}
              </div>
              {items.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeItem(item.key)}
                  className="shrink-0 rounded-lg border border-line bg-bg px-2.5 py-1.5 text-[12px] text-ink-3 hover:border-danger hover:text-danger"
                >
                  ลบ
                </button>
              )}
            </div>

            {/* Variant selector */}
            {hasVariants && (
              <div className="border-t border-line px-3.5 py-3">
                <div className="mb-2 text-[13px] font-semibold text-ink">เลือกไซซ์</div>
                <div className="flex flex-wrap gap-1.5">
                  {item.variants.map((v) => {
                    const isSelected = v.id === item.variantId;
                    return (
                      <button
                        key={v.id}
                        type="button"
                        disabled={!v.available}
                        onClick={() => changeVariant(item.key, v.id)}
                        className={[
                          "rounded-lg border px-3.5 py-[7px] text-[13px] transition-colors",
                          isSelected
                            ? "border-accent bg-accent font-semibold text-accent-ink"
                            : !v.available
                              ? "cursor-default border-line bg-bg text-ink-3 opacity-55"
                              : "border-line bg-bg text-ink hover:border-accent",
                        ].join(" ")}
                      >
                        {sizeLabel(v.size)}
                        <span className={`ml-1 text-[11px] ${isSelected ? "text-accent-ink" : "text-ink-3"}`}>
                          {v.quantity} ตัว · ฿{v.pricePerDay.toLocaleString()}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Unit picker */}
            {hasVariants && startDate && endDate && (
              <div className="border-t border-line px-3.5 py-3">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-[13px] font-semibold text-ink">เลือกตัวที่จะปล่อย</span>
                  {item.assignableUnits && (
                    <span className="text-[12px] text-ink-3">
                      ว่าง {item.assignableUnits.filter((u) => u.free).length}/{item.assignableUnits.length} ตัว
                    </span>
                  )}
                </div>
                {item.unitsLoading ? (
                  <div className="text-[13px] text-ink-3">กำลังตรวจสอบตัวที่ว่าง…</div>
                ) : !item.assignableUnits || item.assignableUnits.length === 0 ? (
                  <div className="text-[13px] text-ink-3">ไซซ์นี้ยังไม่มีตัวสินค้า (unit)</div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => changeUnit(item.key, "")}
                      className={`rounded-lg border px-3.5 py-2 text-[13px] font-semibold transition-colors ${
                        item.unitId === ""
                          ? "border-accent bg-accent text-accent-ink"
                          : "border-line bg-bg text-ink hover:border-accent"
                      }`}
                    >
                      อัตโนมัติ
                    </button>
                    {item.assignableUnits.map((u) => {
                      const active = item.unitId === u.id;
                      return (
                        <button
                          key={u.id}
                          type="button"
                          disabled={!u.free}
                          onClick={() => changeUnit(item.key, u.id)}
                          className={`rounded-lg border px-3.5 py-2 font-mono text-[12px] transition-colors ${
                            active
                              ? "border-accent bg-accent text-accent-ink"
                              : !u.free
                                ? "border-line bg-bg text-ink-3 line-through opacity-60"
                                : "border-line bg-bg text-ink hover:border-accent"
                          }`}
                        >
                          {u.code}
                          {!u.free && <span className="ml-1 no-underline">· ไม่ว่าง</span>}
                        </button>
                      );
                    })}
                  </div>
                )}
                <p className="mt-2 text-[12px] text-ink-3">
                  เลือก “อัตโนมัติ” เพื่อให้ระบบจับตัวที่ว่างให้ หรือกดเลือกรหัสตัวที่ต้องการปล่อยเอง
                </p>
              </div>
            )}

            {/* Per-item subtotal */}
            {subtotal.rentalTotal !== null && (
              <div className="flex items-center justify-between border-t border-line px-3.5 py-2.5">
                <span className="text-[13px] text-ink-2">ย่อย: {nights} วัน × ฿{subtotal.ppd.toLocaleString()}</span>
                <span className="text-[14px] font-semibold text-ink">฿{subtotal.rentalTotal.toLocaleString()}</span>
              </div>
            )}
          </div>
        );
      })}

      {/* ── Add product button ─────────────────────────────────────────────── */}
      {catalog.length > 0 && (
        <button
          type="button"
          onClick={() => setShowCatalogPicker(true)}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-line bg-bg py-3 text-[14px] font-medium text-ink-2 hover:border-accent hover:text-accent"
        >
          <span className="text-[18px] leading-none">＋</span> เพิ่มสินค้า
        </button>
      )}

      {/* ── Catalog picker modal ───────────────────────────────────────────── */}
      {showCatalogPicker && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 sm:items-center">
          <div className="w-full max-w-[520px] overflow-hidden rounded-t-2xl bg-surface sm:rounded-2xl">
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <span className="text-[15px] font-semibold text-ink">เลือกสินค้าเพิ่ม</span>
              <button
                type="button"
                onClick={() => setShowCatalogPicker(false)}
                className="rounded-lg px-2.5 py-1 text-[13px] text-ink-3 hover:bg-bg"
              >
                ปิด
              </button>
            </div>
            <div className="max-h-[60vh] overflow-y-auto p-3">
              {catalog.length === 0 ? (
                <div className="py-8 text-center text-[14px] text-ink-3">ไม่มีสินค้าอื่นในร้าน</div>
              ) : (
                <div className="grid gap-2">
                  {catalog.map((cp) => (
                    <button
                      key={cp.id}
                      type="button"
                      onClick={() => addProduct(cp)}
                      className="flex items-center gap-3 rounded-xl border border-line bg-bg px-3 py-2.5 text-left hover:border-accent"
                    >
                      <div className="h-12 w-10 shrink-0 overflow-hidden rounded-lg bg-accent-soft">
                        {cp.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={cp.imageUrl} alt={cp.name} className="h-full w-full object-cover" />
                        ) : null}
                      </div>
                      <div className="min-w-0">
                        <div className="truncate text-[14px] font-medium text-ink">{cp.name}</div>
                        <div className="text-[12px] text-ink-3">
                          ฿{cp.pricePerDay.toLocaleString()}/วัน
                          {cp.variants.length > 0 && ` · ${cp.variants.length} ไซซ์`}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Calendar (shared) ──────────────────────────────────────────────── */}
      <div className="rounded-xl border border-line bg-surface p-4">
        <div className="mb-2.5 text-[13px] font-semibold text-ink">เลือกวันเช่า</div>
        <CalendarRangePicker
          start={startDate}
          end={endDate}
          onChange={(s, e) => { setStartDate(s); setEndDate(e); }}
          unavailable={sharedUnavailableSet}
        />
      </div>

      {/* ── Pricing summary ─────────────────────────────────────────────────── */}
      {combinedRental !== null && (
        <div className="rounded-xl border border-line bg-bg p-3.5 text-[14px]">
          {/* Per-item rows when multiple items */}
          {!isSingleItem && (
            <div className="mb-2 grid gap-1.5">
              {itemSubtotals.map((s) => (
                <div key={s.key} className="flex justify-between">
                  <span className="truncate text-[13px] text-ink-2">{s.productName} ({nights} วัน)</span>
                  <span className="shrink-0 pl-2 text-[13px] font-medium text-ink">
                    ฿{(s.rentalTotal ?? 0).toLocaleString()}
                  </span>
                </div>
              ))}
              <div className="mt-1 border-t border-line" />
            </div>
          )}
          {isSingleItem && (
            <div className="mb-1 flex justify-between">
              <span className="text-ink-2">
                ค่าเช่า ({nights} วัน × ฿{itemSubtotals[0].ppd.toLocaleString()})
              </span>
              <span className="font-semibold text-ink">฿{combinedRental.toLocaleString()}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-ink-2">มัดจำ{!isSingleItem ? " (รวม)" : ""}</span>
            <span className="font-semibold text-ink">฿{combinedDeposit.toLocaleString()}</span>
          </div>
          <div className="mt-2 flex justify-between border-t border-line pt-2">
            <span className="font-semibold text-ink">รวมทั้งหมด</span>
            <span className="text-[16px] font-bold text-ink">
              ฿{(
                isSingleItem && useCustomTotal && customTotal
                  ? Number(customTotal) + combinedDeposit
                  : combinedRental + combinedDeposit
              ).toLocaleString()}
            </span>
          </div>
        </div>
      )}

      {/* ── Custom total (single-item only) ─────────────────────────────────── */}
      {isSingleItem && (
        <>
          <label className="flex cursor-pointer items-center gap-2 text-[13px] text-ink">
            <input
              type="checkbox"
              checked={useCustomTotal}
              onChange={(e) => setUseCustomTotal(e.target.checked)}
            />
            กำหนดยอดเช่าเอง (ตกลงราคาหน้าร้าน)
          </label>

          {useCustomTotal && (
            <label className="flex flex-col gap-1 text-[13px] font-medium text-ink-2">
              ยอดเช่า (บาท)
              <input
                type="number"
                value={customTotal}
                onChange={(e) => setCustomTotal(e.target.value)}
                placeholder={combinedRental?.toString() ?? "0"}
                min={0}
                className="rounded-lg border border-line bg-bg px-3 py-2.5 text-[14px] text-ink outline-none"
              />
            </label>
          )}
        </>
      )}

      {/* ── Fulfillment method ─────────────────────────────────────────────── */}
      <div className="rounded-xl border border-line bg-surface p-4">
        <div className="mb-2.5 text-[13px] font-semibold text-ink">วิธีรับชุด</div>
        <div className="flex flex-col gap-2">
          {FULFILLMENT_OPTIONS.map((opt) => {
            const active = fulfillment === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => setFulfillment(opt.value)}
                className={`flex items-center justify-between rounded-lg border px-3.5 py-2.5 text-left transition-colors ${
                  active ? "border-accent bg-accent-soft" : "border-line bg-bg hover:border-accent"
                }`}
              >
                <span className="flex flex-col">
                  <span className={`text-[14px] font-semibold ${active ? "text-accent" : "text-ink"}`}>
                    {opt.label}
                  </span>
                  <span className="text-[12px] text-ink-3">{opt.hint}</span>
                </span>
                <span
                  className={`flex h-4 w-4 items-center justify-center rounded-full border-2 ${
                    active ? "border-accent" : "border-line"
                  }`}
                >
                  {active ? <span className="h-2 w-2 rounded-full bg-accent" /> : null}
                </span>
              </button>
            );
          })}
        </div>
        {isShipping && (
          <label className="mt-3 flex flex-col gap-1.5 text-[13px] font-medium text-ink-2">
            ที่อยู่จัดส่ง *
            <textarea
              value={shippingAddress}
              onChange={(e) => setShippingAddress(e.target.value)}
              placeholder="บ้านเลขที่ ถนน ตำบล อำเภอ จังหวัด รหัสไปรษณีย์"
              rows={3}
              className="w-full resize-y rounded-lg border border-line bg-bg px-3 py-2.5 text-[14px] text-ink outline-none"
            />
          </label>
        )}
      </div>

      {/* ── Customer info ──────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-line bg-surface p-4">
        <div className="mb-2.5 text-[13px] font-semibold text-ink">ข้อมูลลูกค้า</div>
        <label className="mt-3 flex flex-col gap-1 text-[13px] font-medium text-ink-2">
          ชื่อลูกค้า *
          <input
            type="text"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            placeholder="ชื่อ-นามสกุล"
            className="rounded-lg border border-line bg-bg px-3 py-2.5 text-[14px] text-ink outline-none"
          />
        </label>
        <label className="mt-3 flex flex-col gap-1 text-[13px] font-medium text-ink-2">
          เบอร์โทร
          <input
            type="tel"
            value={customerPhone}
            onChange={(e) => setCustomerPhone(e.target.value)}
            placeholder="0xx-xxx-xxxx"
            className="rounded-lg border border-line bg-bg px-3 py-2.5 text-[14px] text-ink outline-none"
          />
        </label>
        <label className="mt-3 flex flex-col gap-1 text-[13px] font-medium text-ink-2">
          หมายเหตุภายใน
          <textarea
            value={internalNote}
            onChange={(e) => setInternalNote(e.target.value)}
            placeholder="เช่น ลูกค้า VIP, ตกลงราคาพิเศษ"
            rows={2}
            className="w-full resize-y rounded-lg border border-line bg-bg px-3 py-2.5 text-[14px] text-ink outline-none"
          />
        </label>
      </div>

      {/* ── Error / Success ─────────────────────────────────────────────────── */}
      {error && (
        <div className="rounded-md border border-danger/30 bg-danger/[0.08] px-3 py-2.5 text-[13px] text-danger">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-md border border-green-400/30 bg-green-400/[0.08] px-3 py-2.5 text-[13px] text-green-600">
          {success}
        </div>
      )}

      {/* ── Submit ──────────────────────────────────────────────────────────── */}
      <button
        type="button"
        onClick={handleSubmit}
        disabled={pending || !startDate || !endDate || !customerName}
        className={`w-full rounded-xl border-none py-3.5 text-[15px] font-semibold transition-colors ${
          pending || !startDate || !endDate || !customerName
            ? "cursor-not-allowed bg-line text-ink-3"
            : "cursor-pointer bg-accent text-accent-ink"
        }`}
      >
        {pending ? "กำลังบันทึก…" : "สร้างรายการจอง (ยืนยันทันที)"}
      </button>
    </div>
  );
}
