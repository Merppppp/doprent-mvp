import type { Metadata } from "next";
import Link from "next/link";
import DressCard from "@/components/DressCard";
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
            <Link
              href={makeHref({ occasion: undefined })}
              className="check-row"
              style={chipBaseStyle(!activeOcc)}
            >
              ทั้งหมด
            </Link>
            {occasions.map((o) => (
              <Link
                key={o.key}
                href={makeHref({ occasion: o.key })}
                style={chipBaseStyle(activeOcc === o.key)}
              >
                {o.th}
              </Link>
            ))}
          </FilterGroup>

          {/* Designers */}
          {designers.length > 0 ? (
            <FilterGroup title="ดีไซเนอร์">
              <DesignerFilter
                designers={designers}
                active={activeDesigner}
                makeHref={makeHref}
              />
            </FilterGroup>
          ) : null}

          {/* Color chips */}
          <FilterGroup title="สี">
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              <Link
                href={makeHref({ color: undefined })}
                style={colorChipStyle(activeColor === "all")}
              >
                ทั้งหมด
              </Link>
              {COLORS.map((c) => (
                <Link
                  key={c}
                  href={makeHref({ color: c })}
                  style={colorChipStyle(activeColor === c)}
                >
                  <span
                    style={{
                      width: 12,
                      height: 12,
                      borderRadius: 999,
                      background: COLOR_SWATCH[c],
                      border: "1px solid rgba(0,0,0,0.1)",
                      display: "inline-block",
                      marginRight: 6,
                      verticalAlign: "middle",
                    }}
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

          {(activeColor !== "all" || activeOcc || activeSize || activeDesigner || search) && (
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

/**
 * Designer filter. Shows first 6 inline; rest collapsed in <details>.
 * "ทั้งหมด" chip clears the filter.
 */
function DesignerFilter({
  designers,
  active,
  makeHref,
}: {
  designers: string[];
  active: string | undefined;
  makeHref: (overrides: Partial<SearchParams>) => string;
}) {
  const HEAD = 6;
  const head = designers.slice(0, HEAD);
  const rest = designers.slice(HEAD);

  // Ensure active designer is always visible even if it'd be hidden behind expand
  const activeInRest = active && rest.includes(active);

  return (
    <>
      <Link
        href={makeHref({ designer: undefined })}
        style={chipBaseStyle(!active)}
      >
        ทั้งหมด
      </Link>
      {head.map((d) => (
        <Link
          key={d}
          href={makeHref({ designer: active === d ? undefined : d })}
          style={chipBaseStyle(active === d)}
        >
          {d}
        </Link>
      ))}
      {rest.length > 0 ? (
        <details open={!!activeInRest} style={{ marginTop: 2 }}>
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
            ดูเพิ่ม ({rest.length})
          </summary>
          {rest.map((d) => (
            <Link
              key={d}
              href={makeHref({ designer: active === d ? undefined : d })}
              style={chipBaseStyle(active === d)}
            >
              {d}
            </Link>
          ))}
        </details>
      ) : null}
    </>
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

function chipBaseStyle(active: boolean): React.CSSProperties {
  return {
    display: "block",
    padding: "5px 0",
    fontSize: 14,
    color: active ? "var(--ink)" : "var(--ink-2)",
    fontWeight: active ? 600 : 400,
  };
}

function colorChipStyle(active: boolean): React.CSSProperties {
  return {
    padding: "5px 11px",
    border: `1px solid ${active ? "var(--ink)" : "var(--line)"}`,
    borderRadius: 6,
    fontSize: 12,
    background: active ? "var(--ink)" : "var(--surface)",
    color: active ? "var(--on-dark)" : "var(--ink)",
    display: "inline-flex",
    alignItems: "center",
    cursor: "pointer",
  };
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
