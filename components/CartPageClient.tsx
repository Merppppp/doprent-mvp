"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCart, type CartGroup, type CartItem } from "@/lib/cart";
import { fmtThai } from "@/lib/date-th";

function nightsBetween(start: string, end: string): number {
  if (!start || !end) return 1;
  const s = new Date(start).getTime();
  const e = new Date(end).getTime();
  if (isNaN(s) || isNaN(e) || e < s) return 1;
  return Math.round((e - s) / 86_400_000) + 1;
}

function ItemRow({ item, onRemove, onSetQty }: {
  item: CartItem;
  onRemove: (id: string) => void;
  onSetQty: (id: string, qty: number) => void;
}) {
  const nights = nightsBetween(item.startDate, item.endDate);
  const lineRental = item.pricePerDay * nights * item.qty;

  return (
    <div className="flex gap-3 py-3 border-b border-line last:border-0">
      {/* Thumbnail */}
      <div className="w-16 h-20 rounded-lg overflow-hidden shrink-0 bg-accent-soft">
        {item.productImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.productImage}
            alt={item.productName}
            className="w-full h-full object-cover"
          />
        ) : null}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <Link
          href={`/product/${item.productSlug}`}
          className="block font-semibold text-[14px] text-ink leading-snug hover:text-accent truncate"
        >
          {item.productName}
        </Link>
        {item.size ? (
          <div className="text-[12px] text-ink-3 mt-0.5">ไซซ์: {item.size}</div>
        ) : null}
        <div className="text-[12px] text-ink-2 mt-0.5">
          {fmtThai(item.startDate)} → {fmtThai(item.endDate)} ({nights} วัน)
        </div>
        {item.startTime && item.endTime ? (
          <div className="text-[11px] text-ink-3">
            รับ {item.startTime} · คืน {item.endTime}
          </div>
        ) : null}
        <div className="text-[12px] text-ink-2 mt-1">
          ฿{lineRental.toLocaleString()} ค่าเช่า + ฿{(item.deposit * item.qty).toLocaleString()} มัดจำ
        </div>
      </div>

      {/* Qty + remove */}
      <div className="flex flex-col items-end gap-2 shrink-0">
        <button
          type="button"
          onClick={() => onRemove(item.id)}
          className="text-[11px] text-ink-3 underline underline-offset-2 hover:text-danger"
        >
          ลบ
        </button>
        <div className="flex items-center gap-1 border border-line rounded-lg overflow-hidden text-[13px]">
          <button
            type="button"
            className="px-2 py-1 text-ink-2 hover:bg-surface"
            onClick={() => onSetQty(item.id, item.qty - 1)}
          >
            −
          </button>
          <span className="px-2 py-1 font-semibold text-ink">{item.qty}</span>
          <button
            type="button"
            className="px-2 py-1 text-ink-2 hover:bg-surface"
            onClick={() => onSetQty(item.id, item.qty + 1)}
          >
            +
          </button>
        </div>
      </div>
    </div>
  );
}

function GroupCard({ group }: { group: CartGroup }) {
  const { remove, setQty } = useCart();
  const router = useRouter();
  const groupKey = encodeURIComponent(group.key);

  return (
    <div className="rounded-2xl border border-line bg-surface overflow-hidden mb-4">
      {/* Group header */}
      <div className="px-4 py-3 bg-bg border-b border-line flex items-center justify-between gap-3">
        <div>
          <div className="font-semibold text-[14px] text-ink">{group.shopName}</div>
          <div className="text-[12px] text-ink-2 mt-0.5">
            {fmtThai(group.startDate)} → {fmtThai(group.endDate)}
          </div>
        </div>
        <span className="text-[11px] text-ink-3 font-medium">
          {group.items.length} รายการ
        </span>
      </div>

      {/* Items */}
      <div className="px-4">
        {group.items.map((item) => (
          <ItemRow
            key={item.id}
            item={item}
            onRemove={remove}
            onSetQty={setQty}
          />
        ))}
      </div>

      {/* Subtotal + checkout CTA */}
      <div className="px-4 py-3 border-t border-line bg-bg flex flex-col gap-2">
        <div className="text-[12px] text-ink-3">ประมาณการ (ร้านจะคำนวณค่าจัดส่งภายหลัง)</div>
        <div className="flex items-center justify-between text-[13px]">
          <span className="text-ink-2">ค่าเช่ารวม</span>
          <span className="font-semibold text-ink">฿{group.estimatedRental.toLocaleString()}</span>
        </div>
        <div className="flex items-center justify-between text-[13px]">
          <span className="text-ink-2">มัดจำรวม</span>
          <span className="font-semibold text-ink">฿{group.estimatedDeposit.toLocaleString()}</span>
        </div>
        <div className="flex items-center justify-between text-[14px] font-bold border-t border-line pt-2 mt-1">
          <span className="text-ink">ยอดรวมเบื้องต้น</span>
          <span className="text-ink">฿{(group.estimatedRental + group.estimatedDeposit).toLocaleString()}</span>
        </div>
        <button
          type="button"
          className="btn btn-primary w-full mt-2 py-3 px-4 text-[14px] font-semibold"
          onClick={() => router.push(`/checkout/cart?group=${groupKey}`)}
        >
          ดำเนินการต่อ →
        </button>
      </div>
    </div>
  );
}

export default function CartPageClient() {
  const { groups, clear } = useCart();

  if (groups.length === 0) {
    return (
      <div className="container pt-20 pb-[100px] max-w-[520px] text-center">
        <div className="mb-6">
          <svg
            width="64"
            height="64"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-ink-3 mx-auto mb-4"
          >
            <circle cx="9" cy="21" r="1" />
            <circle cx="20" cy="21" r="1" />
            <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
          </svg>
          <p className="text-[17px] font-semibold text-ink mb-2">ตะกร้าว่างอยู่</p>
          <p className="text-[14px] text-ink-2">เพิ่มชุดจากหน้าสินค้าเพื่อเริ่มต้น</p>
        </div>
        <Link
          href="/"
          className="btn btn-dark py-3 px-6 text-[14px]"
        >
          เลือกชุดเช่า
        </Link>
      </div>
    );
  }

  return (
    <div className="container pt-8 pb-20 max-w-[680px]">
      <div className="flex items-center justify-between mb-6 gap-4">
        <h1 className="text-[26px] font-semibold tracking-tight text-ink">
          ตะกร้าสินค้า
        </h1>
        <button
          type="button"
          onClick={clear}
          className="text-[12px] text-ink-3 underline underline-offset-2 hover:text-danger"
        >
          ล้างตะกร้า
        </button>
      </div>

      <div className="text-[13px] text-ink-2 mb-5 px-3 py-2 rounded-lg bg-surface border border-line">
        สินค้าในตะกร้าจัดกลุ่มตามร้านค้าและวันที่เช่า — กด “ดำเนินการต่อ” ในแต่ละกลุ่มเพื่อชำระเงิน
      </div>

      {groups.map((g) => (
        <GroupCard key={g.key} group={g} />
      ))}
    </div>
  );
}
