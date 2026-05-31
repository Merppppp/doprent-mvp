import type { Metadata } from "next";
import Link from "next/link";
import DressCard from "@/components/DressCard";
import LineMessageCopyBox from "@/components/LineMessageCopyBox";
import { getCurrentUser } from "@/lib/auth";
import { listDesigners, listDresses, listOccasions } from "@/lib/dresses";
import {
  COLOR_LABELS_TH,
  COLOR_SWATCH,
  type Color,
  type OccasionKey,
} from "@/lib/types";

export const dynamic = "force-dynamic";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://doprent.com";

export const metadata: Metadata = {
  title: "ดูชุดทั้งหมด",
  description: "เลือกดูชุดเดรสเช่าจากร้านในกรุงเทพฯ กรองตามสี โอกาส ขนาด ทักร้านผ่าน LINE ได้ทันที",
  alternates: { canonical: `${SITE}/browse` },
};

const COLORS: Color[] = ["rose", "ivory", "green", "black", "navy", "red", "blue", "purple"];

type SearchParams = {
  color?: string;
  occasion?: string;
  size?: string;
  designer?: string;
  q?: string;
  sort?: string;
  dateFrom?: string;
  dateTo?: string;
};

export default async function BrowsePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const activeColor = (searchParams?.color ?? "all") as Color | "all";
  const activeOcc = searchParams?.occasion as OccasionKey | undefined;
  const activeSize = searchParams?.size;
  const activeDesigner = searchParams?.designer?.trim() || undefined;
  const search = searchParams?.q?.trim() ?? "";
  const activeDateFrom = searchParams?.dateFrom?.trim() || undefined;
  const activeDateTo = searchParams?.dateTo?.trim() || undefined;
  const today = new Date().toISOString().slice(0, 10);
  const sort = (searchParams?.sort ?? "featured") as
    | "featured"
    | "price-asc"
    | "price-desc"
    | "name";

  const [dresses, occasions, designers, user] = await Promise.all([
    listDresses({
      color: activeColor === "all" ? undefined : activeColor,
      occasions: activeOcc ? [activeOcc] : undefined,
      sizes: activeSize ? [activeSize] : undefined,
      designers: activeDesigner ? [activeDesigner] : undefined,
      search: search || undefined,
      sort,
      dateFrom: activeDateFrom,
      dateTo: activeDateTo,
    }),
    listOccasions(),
    listDesigners(),
    getCurrentUser().catch(() => null),
  ]);
  const savedSet = new Set(user?.profile.saved_dress_ids ?? []);
  const isLoggedIn = !!user;

  function makeHref(overrides: Partial<SearchParams>) {
    const sp = new URLSearchParams();
    const next = { ...searchParams, ...overrides };
    Object.entries(next).forEach(([k, v]) => {
      if (v && v !== "all") sp.set(k, v as string);
    });
    const qs = sp.toString();
    return `/browse${qs ? `?${qs}` : ""}`;
  }

  return (
    <div className="shell" style={{ paddingTop: 28, paddingBottom: 80 }}>
      <div style={{ marginBottom: 20 }}>
        <h1 className="page-title" style={{ fontSize: 32, fontWeight: 600, letterSpacing: "-0.01em" }}>
          {activeOcc
            ? occasions.find((o) => o.key === activeOcc)?.th || "ทั้งหมด"
            : "ทั้งหมด"}
        </h1>
        <div style={{ color: "var(--ink-3)", fontSize: 14, marginTop: 6 }}>
          คัดจากร้านเช่าในกรุงเทพ กดเข้าไปดูแล้วทักร้านผ่าน LINE
        </div>
      </div>

      <div className="browse-grid">
        {/* SIDEBAR */}
        <aside style={{ fontSize: 14 }}>
          {/* Search */}
          <form method="get" style={{ paddingBottom: 18 }}>
            <div style={{ fontSize: 13, marginBottom: 10, fontWeight: 600 }}>ค้นหา</div>
            {/* preserve other params */}
            {activeColor !== "all" ? (
              <input type="hidden" name="color" value={activeColor} />
            ) : null}
            {activeOcc ? <input type="hidden" name="occasion" value={activeOcc} /> : null}
            {activeSize ? <input type="hidden" name="size" value={activeSize} /> : null}
            {activeDesigner ? <input type="hidden" name="designer" value={activeDesigner} /> : null}
            <input
              type="search"
              name="q"
              defaultValue={search}
              placeholder="ชื่อชุด, ดีไซเนอร์..."
              style={{
                width: "100%",
                padding: "9px 12px",
                border: "1px solid var(--line)",
                borderRadius: 6,
                background: "var(--surface)",
                fontSize: 14,
              }}
            />
          </form>

          {/* Occasions */}
          <FilterGroup title="โอกาส">
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href={makeHref({ occasion: undefined })}
                className={`rounded-full border px-3 py-1.5 text-sm transition ${
                  !activeOcc
                    ? "border-ink bg-ink/10 text-ink"
                    : "border-ink/15 bg-white text-ink hover:border-ink/40"
                }`}
              >
                ทั้งหมด
              </Link>
              {occasions.map((o) => (
                <Link
                  key={o.key}
                  href={makeHref({ occasion: o.key })}
                  className={`rounded-full border px-3 py-1.5 text-sm transition ${
                    activeOcc === o.key
                      ? "border-ink bg-ink/10 text-ink"
                      : "border-ink/15 bg-white text-ink hover:border-ink/40"
                  }`}
                >
                  {o.th}
                </Link>
              ))}
            </div>
          </FilterGroup>

          {/* Designers */}
          {designers.length > 0 ? (
            <FilterGroup title="ดีไซเนอร์">
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  href={makeHref({ designer: undefined })}
                  className={`rounded-full border px-3 py-1.5 text-sm transition ${
                    !activeDesigner
                      ? "border-ink bg-ink/10 text-ink"
                      : "border-ink/15 bg-white text-ink hover:border-ink/40"
                  }`}
                >
                  ทั้งหมด
                </Link>
                {designers.slice(0, 6).map((d) => (
                  <Link
                    key={d}
                    href={makeHref({ designer: activeDesigner === d ? undefined : d })}
                    className={`rounded-full border px-3 py-1.5 text-sm transition ${
                      activeDesigner === d
                        ? "border-ink bg-ink/10 text-ink"
                        : "border-ink/15 bg-white text-ink hover:border-ink/40"
                    }`}
                  >
                    {d}
                  </Link>
                ))}
                {designers.length > 6 ? (
                  <details open={designers.slice(6).includes(activeDesigner || "")} style={{ marginTop: 2 }}>
                    <summary
                      style={{
                        listStyle: "none",
                        cursor: "pointer",
                        fontSize: 13,
                        color: "var(--ink-3)",
                        padding: "5px 0",
                        fontWeight: 500,
                      }}
                    >
                      ดูเพิ่ม ({designers.length - 6})
                    </summary>
                    <div className="flex flex-wrap items-center gap-2" style={{ marginTop: 8 }}>
                      {designers.slice(6).map((d) => (
                        <Link
                          key={d}
                          href={makeHref({ designer: activeDesigner === d ? undefined : d })}
                          className={`rounded-full border px-3 py-1.5 text-sm transition ${
                            activeDesigner === d
                              ? "border-ink bg-ink/10 text-ink"
                              : "border-ink/15 bg-white text-ink hover:border-ink/40"
                          }`}
                        >
                          {d}
                        </Link>
                      ))}
                    </div>
                  </details>
                ) : null}
              </div>
            </FilterGroup>
          ) : null}

          {/* Color chips */}
          <FilterGroup title="สี">
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href={makeHref({ color: undefined })}
                className={`rounded-full border px-3 py-1.5 text-sm transition ${
                  activeColor === "all"
                    ? "border-ink bg-ink/10 text-ink"
                    : "border-ink/15 bg-white text-ink hover:border-ink/40"
                }`}
              >
                ทั้งหมด
              </Link>
              {COLORS.map((c) => (
                <Link
                  key={c}
                  href={makeHref({ color: c })}
                  className={`rounded-full border px-3 py-1.5 text-sm transition flex items-center gap-2 ${
                    activeColor === c
                      ? "border-ink bg-ink/10 text-ink"
                      : "border-ink/15 bg-white text-ink hover:border-ink/40"
                  }`}
                >
                  <span
                    className="h-3 w-3 rounded-full ring-1 ring-black/10"
                    style={{ background: COLOR_SWATCH[c] }}
                  />
                  {COLOR_LABELS_TH[c]}
                </Link>
              ))}
            </div>
          </FilterGroup>

          {/* Size */}
          <FilterGroup title="ขนาด">
            <div style={{ display: "flex", gap: 6 }}>
              {(["S", "M", "L"] as const).map((s) => (
                <Link
                  key={s}
                  href={makeHref({ size: activeSize === s ? undefined : s })}
                  style={sizeBtnStyle(activeSize === s)}
                >
                  {s}
                </Link>
              ))}
            </div>
          </FilterGroup>

          <form method="get" style={{ paddingBottom: 18, marginTop: 14 }}>
            {activeColor !== "all" ? (
              <input type="hidden" name="color" value={activeColor} />
            ) : null}
            {activeOcc ? <input type="hidden" name="occasion" value={activeOcc} /> : null}
            {activeSize ? <input type="hidden" name="size" value={activeSize} /> : null}
            {activeDesigner ? <input type="hidden" name="designer" value={activeDesigner} /> : null}
            {search ? <input type="hidden" name="q" value={search} /> : null}
            {sort ? <input type="hidden" name="sort" value={sort} /> : null}
            <div style={{ display: "grid", gap: 12 }}>
              <label style={{ display: "block", fontSize: 13, color: "var(--ink-3)" }}>
                วันที่เช่าเริ่มต้น
                <input
                  type="date"
                  name="dateFrom"
                  defaultValue={activeDateFrom}
                  min={today}
                  style={{
                    width: "100%",
                    marginTop: 6,
                    padding: "9px 12px",
                    border: "1px solid var(--line)",
                    borderRadius: 6,
                    background: "var(--surface)",
                    fontSize: 14,
                  }}
                />
              </label>
              <label style={{ display: "block", fontSize: 13, color: "var(--ink-3)" }}>
                วันที่เช่าสิ้นสุด
                <input
                  type="date"
                  name="dateTo"
                  defaultValue={activeDateTo}
                  min={activeDateFrom ?? today}
                  style={{
                    width: "100%",
                    marginTop: 6,
                    padding: "9px 12px",
                    border: "1px solid var(--line)",
                    borderRadius: 6,
                    background: "var(--surface)",
                    fontSize: 14,
                  }}
                />
              </label>
              <button
                type="submit"
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  borderRadius: 8,
                  border: "none",
                  background: "var(--ink)",
                  color: "var(--on-dark)",
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                กรองวันที่
              </button>
            </div>
          </form>

          {activeDateFrom && activeDateTo ? (
            <div style={{ marginTop: 16 }}>
              <LineMessageCopyBox
                dressName="ชุดที่สนใจ"
                boutiqueName="ร้านเช่า"
                dressPageUrl={makeHref({})}
                dateFrom={activeDateFrom}
                dateTo={activeDateTo}
              />
            </div>
          ) : null}

          {(activeColor !== "all" || activeOcc || activeSize || activeDesigner || search || activeDateFrom || activeDateTo) && (
            <div style={{ paddingTop: 12 }}>
              <Link
                href="/browse"
                style={{
                  display: "block",
                  textAlign: "center",
                  padding: 9,
                  border: "1px solid var(--line)",
                  borderRadius: 6,
                  fontSize: 13,
                  color: "var(--ink-2)",
                  fontWeight: 500,
                }}
              >
                ล้างตัวกรองทั้งหมด
              </Link>
            </div>
          )}
        </aside>

        {/* MAIN */}
        <main>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 16,
              flexWrap: "wrap",
              gap: 10,
            }}
          >
            <div style={{ fontSize: 14, color: "var(--ink-2)" }}>
              พบ <b style={{ color: "var(--ink)" }}>{dresses.length}</b> ชุด
            </div>
          </div>

          {dresses.length === 0 ? (
            <div
              style={{
                padding: "60px 20px",
                textAlign: "center",
                color: "var(--ink-3)",
                background: "var(--surface)",
                border: "1px solid var(--line)",
                borderRadius: 8,
              }}
            >
              <h3 style={{ fontSize: 16, color: "var(--ink)", marginBottom: 6, fontWeight: 600 }}>
                ไม่พบชุดที่ตรงกับตัวกรอง
              </h3>
              <p style={{ fontSize: 14, marginBottom: 18 }}>ลองล้างตัวกรองหรือทักหาเรา เราจะหาให้</p>
              <Link href="/browse" className="btn btn-outline">
                ล้างตัวกรองทั้งหมด
              </Link>
            </div>
          ) : (
            <div className="grid-3" style={{ gap: "24px 20px" }}>
              {dresses.map((d, i) => (
                <DressCard key={d.id} dress={d} variant={i} savedSet={savedSet} isLoggedIn={isLoggedIn} />
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

function FilterGroup({ title, children }: { title: string; children: React.ReactNode }) {
  // Spacing-only separation between filter groups — borders between every group
  // creates visual fatigue in a narrow sidebar.
  return (
    <div style={{ padding: "20px 0 4px" }}>
      <div
        style={{
          fontSize: 12,
          marginBottom: 10,
          fontWeight: 600,
          color: "var(--ink-3)",
        }}
      >
        {title}
      </div>
      {children}
    </div>
  );
}

function sizeBtnStyle(active: boolean): React.CSSProperties {
  return {
    padding: "8px 0",
    border: `1px solid ${active ? "var(--ink)" : "var(--line)"}`,
    borderRadius: 6,
    background: active ? "var(--ink)" : "var(--surface)",
    color: active ? "var(--on-dark)" : "var(--ink)",
    fontSize: 13,
    flex: 1,
    fontWeight: 500,
    textAlign: "center",
    minWidth: 50,
  };
}
