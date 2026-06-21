"use client";

import { useState, useCallback, useEffect, useTransition, useRef } from "react";
import Link from "next/link";
import BookingStatusBadge from "@/components/BookingStatusBadge";
import { fmtThaiShort } from "@/lib/date-th";
import { RENTER_TABS, RENTER_PAGE_SIZE, type RenterTabKey } from "@/lib/renter-booking-tabs";
import { fetchRenterBookingsPage } from "@/app/actions/renter-bookings";
import type { RenterBookingCard } from "@/lib/booking-queries";

type Props = {
  initialRows: RenterBookingCard[];
  initialTotal: number;
  statusCounts: Record<string, number>;
  initialTab?: string;
};

function tabCount(tab: typeof RENTER_TABS[number], counts: Record<string, number>): number {
  if (!tab.statuses) {
    return Object.values(counts).reduce((a, b) => a + b, 0);
  }
  return tab.statuses.reduce((sum, s) => sum + (counts[s] || 0), 0);
}

export default function RenterBookingsList({ initialRows, initialTotal, statusCounts, initialTab }: Props) {
  const validTab = RENTER_TABS.find((t) => t.key === initialTab)?.key ?? "all";
  const [activeTab, setActiveTab] = useState<RenterTabKey>(validTab);
  const [rows, setRows] = useState<RenterBookingCard[]>(initialRows);
  const [total, setTotal] = useState(initialTotal);
  const [search, setSearch] = useState("");
  const [isPending, startTransition] = useTransition();
  const searchTimer = useRef<ReturnType<typeof setTimeout>>();
  const tabsRef = useRef<HTMLDivElement>(null);

  const load = useCallback(
    (tab: RenterTabKey, skip: number, q: string, append: boolean) => {
      startTransition(async () => {
        const res = await fetchRenterBookingsPage(tab, skip, q || null);
        if (append) {
          setRows((prev) => [...prev, ...res.rows]);
        } else {
          setRows(res.rows);
        }
        setTotal(res.total);
      });
    },
    [],
  );

  const revealTab = useCallback((tab: HTMLButtonElement, behavior: ScrollBehavior = "auto") => {
    const tabList = tabsRef.current;
    if (!tabList) return;

    const gutter = 16;
    const visibleStart = tabList.scrollLeft + gutter;
    const visibleEnd = tabList.scrollLeft + tabList.clientWidth - gutter;
    const tabStart = tab.offsetLeft;
    const tabEnd = tabStart + tab.offsetWidth;

    if (tabStart < visibleStart) {
      tabList.scrollTo({ left: Math.max(0, tabStart - gutter), behavior });
    } else if (tabEnd > visibleEnd) {
      tabList.scrollTo({ left: tabEnd - tabList.clientWidth + gutter, behavior });
    }
  }, []);

  const switchTab = (key: RenterTabKey, tab: HTMLButtonElement) => {
    setActiveTab(key);
    setSearch("");
    load(key, 0, "", false);
    revealTab(tab, "smooth");
  };

  useEffect(() => {
    const activeTabButton = tabsRef.current?.querySelector<HTMLButtonElement>("button[aria-selected='true']");
    if (activeTabButton) revealTab(activeTabButton);
  }, [activeTab, revealTab]);

  const handleSearch = (val: string) => {
    setSearch(val);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      load(activeTab, 0, val, false);
    }, 350);
  };

  const loadMore = () => {
    load(activeTab, rows.length, search, true);
  };

  const grouped = groupByShop(rows);
  const hasMore = rows.length < total;

  return (
    <div className="max-w-full min-w-0">
      {/* ── Tabs ── */}
      <div className="relative mb-4 max-[900px]:sticky max-[900px]:top-0 max-[900px]:z-20 max-[900px]:-mx-4 max-[900px]:mb-0 max-[900px]:bg-bg max-[900px]:px-4 max-[900px]:after:pointer-events-none max-[900px]:after:absolute max-[900px]:after:inset-y-0 max-[900px]:after:right-0 max-[900px]:after:z-[1] max-[900px]:after:w-7 max-[900px]:after:bg-gradient-to-r max-[900px]:after:from-transparent max-[900px]:after:to-bg max-[900px]:after:content-['']">
        <div ref={tabsRef} role="tablist" className="flex overflow-x-auto border-b-2 border-line [-webkit-overflow-scrolling:touch] [scrollbar-width:none] overscroll-x-contain [&::-webkit-scrollbar]:hidden max-[900px]:snap-x max-[900px]:snap-mandatory max-[900px]:scroll-px-4 max-[900px]:pr-7">
          {RENTER_TABS.map((tab) => {
            const active = activeTab === tab.key;
            const count = tabCount(tab, statusCounts);
            return (
              <button
                key={tab.key}
                role="tab"
                aria-selected={active}
                onClick={(event) => switchTab(tab.key, event.currentTarget)}
                className={`-mb-0.5 shrink-0 cursor-pointer whitespace-nowrap border-b-2 border-transparent bg-transparent px-[18px] py-3 text-[13.5px] font-normal text-ink-2 transition-colors duration-150 hover:text-ink max-[900px]:snap-start max-[900px]:px-3.5 max-[900px]:py-2.5 max-[900px]:text-[13px]${active ? " border-accent font-semibold text-accent" : ""}`}
              >
                {tab.label}
                {count > 0 && (
                  <span className={`ml-1 text-[11px] font-semibold${active ? " text-accent" : " text-ink-3"}`}>({count})</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Search ── */}
      <div className="mb-4 pt-2">
        <input
          type="search"
          placeholder="ค้นหาชื่อสินค้าหรือร้าน..."
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
          className="w-full px-3.5 py-2.5 border border-[var(--line)] rounded-lg text-[13.5px] bg-[var(--surface)] outline-none"
        />
      </div>

      {/* ── Loading ── */}
      {isPending && rows.length === 0 && (
        <div className="text-center py-10 text-[var(--ink-3)] text-[13px]">กำลังโหลด...</div>
      )}

      {/* ── Empty ── */}
      {!isPending && rows.length === 0 && (
        <div className="text-center py-16 text-[var(--ink-2)]">
          <p className="mb-4 text-sm">ไม่มีรายการจอง</p>
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-transparent bg-ink px-5 py-2.5 text-[13px] font-medium leading-none text-on-dark transition-[background,border-color,transform,box-shadow,color] duration-[var(--dur-1)] ease-[var(--ease)] will-change-transform hover:-translate-y-px hover:bg-[oklch(0.32_0.014_85)] hover:shadow-[var(--shadow-2)] active:translate-y-px active:scale-[.985]"
          >
            เริ่มเลือกชุด
          </Link>
        </div>
      )}

      {/* ── Booking cards grouped by shop ── */}
      <div className="grid gap-3.5">
        {grouped.map((group) => (
          <div
            key={group.shopSlug ?? group.shopName}
            className="border border-[var(--line)] rounded-xl bg-[var(--surface)] overflow-hidden"
          >
            {/* Shop header */}
            <div className="flex items-center gap-2 px-3.5 py-2.5 border-b border-[var(--line)] text-[13px] font-semibold">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="shrink-0">
                <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                <path d="M9 22V12h6v10" />
              </svg>
              {group.shopSlug ? (
                <Link href={`/shop/${group.shopSlug}`} className="text-inherit no-underline">{group.shopName}</Link>
              ) : (
                <span>{group.shopName}</span>
              )}
            </div>

            {/* Booking items */}
            {group.bookings.map((b) => (
              <Link
                key={b.id}
                href={`/account/bookings/${b.id}`}
                className="flex gap-3 px-3.5 py-3 border-b border-[var(--line-2,var(--line))] no-underline text-inherit items-start transition-colors duration-100"
              >
                {/* Product image */}
                <div className="w-[72px] h-[90px] rounded-lg overflow-hidden shrink-0 bg-[var(--accent-soft)]">
                  {b.dress_image && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={b.dress_image} alt={b.dress_name ?? ""} className="w-full h-full object-cover" />
                  )}
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start gap-2">
                    <div className="font-semibold text-sm truncate">{b.dress_name ?? "ชุด"}</div>
                    <BookingStatusBadge status={b.status} />
                  </div>
                  <div className="text-[var(--ink-3)] text-xs mt-1">
                    {fmtThaiShort(b.start_date)} – {fmtThaiShort(b.end_date)}
                  </div>
                  <div className="text-sm font-semibold mt-1.5">
                    ฿{(b.rental_total + b.deposit + (b.shipping_fee ?? 0)).toLocaleString()}
                    {b.shipping_fee == null && (
                      <span className="font-normal text-[11px] text-[var(--ink-3)] ml-1">(ยังไม่รวมค่าส่ง)</span>
                    )}
                  </div>

                  {/* Action buttons */}
                  <div className="flex gap-2 mt-2 flex-wrap">
                    {b.shop_line_url && (
                      <span
                        onClick={(e) => { e.preventDefault(); window.open(b.shop_line_url!, "_blank"); }}
                        className="px-3 py-1 border border-[var(--line)] rounded-md text-xs cursor-pointer bg-[var(--bg)]"
                      >
                        ติดต่อร้าน
                      </span>
                    )}
                    {(b.status === "completed" || b.status === "returned") && b.dress_slug && (
                      <span
                        onClick={(e) => { e.preventDefault(); window.location.href = `/product/${b.dress_slug}`; }}
                        className="px-3 py-1 border border-[var(--accent)] rounded-md text-xs cursor-pointer bg-[var(--bg)] text-[var(--accent)] font-semibold"
                      >
                        จองอีกครั้ง
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ))}
      </div>

      {/* ── Load more ── */}
      {hasMore && (
        <div className="text-center mt-5">
          <button
            onClick={loadMore}
            disabled={isPending}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-line bg-surface px-7 py-2.5 text-[13px] font-medium leading-none transition-[background,border-color,transform,box-shadow,color] duration-[var(--dur-1)] ease-[var(--ease)] will-change-transform hover:-translate-y-px hover:border-ink disabled:cursor-wait active:translate-y-px active:scale-[.985]"
          >
            {isPending ? "กำลังโหลด..." : "ดูเพิ่มเติม"}
          </button>
        </div>
      )}

      {/* ── Count ── */}
      {rows.length > 0 && (
        <div className="text-center mt-3 text-xs text-[var(--ink-3)]">
          แสดง {rows.length} จาก {total} รายการ
        </div>
      )}
    </div>
  );
}

type ShopGroup = {
  shopName: string;
  shopSlug: string | null;
  bookings: RenterBookingCard[];
};

function groupByShop(rows: RenterBookingCard[]): ShopGroup[] {
  const map = new Map<string, ShopGroup>();
  for (const b of rows) {
    const key = b.shop_slug ?? b.shop_name ?? "unknown";
    let group = map.get(key);
    if (!group) {
      group = { shopName: b.shop_name ?? "ร้าน", shopSlug: b.shop_slug, bookings: [] };
      map.set(key, group);
    }
    group.bookings.push(b);
  }
  return [...map.values()];
}
