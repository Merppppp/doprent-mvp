import type { Metadata } from "next";
import Link from "next/link";
import DressResults from "@/components/DressResults";
import BrowseFilters from "@/components/BrowseFilters";
import { getCurrentUser } from "@/lib/auth";
import { listDesigners, listDresses, listOccasions } from "@/lib/dresses";
import {
  COLOR_LABELS_TH,
  COLOR_SWATCH,
  type Color,
  type OccasionKey,
  SIZES,
} from "@/lib/types";

export const dynamic = "force-dynamic";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://doprent.com";

export const metadata: Metadata = {
  title: "ดูชุดทั้งหมด",
  description: "เลือกดูชุดเดรสเช่าจากร้านในกรุงเทพฯ กรองตามสี โอกาส ขนาด ทักร้านผ่าน LINE ได้ทันที",
  alternates: { canonical: `${SITE}/browse` },
};

const COLORS: Color[] = ["rose", "ivory", "green", "black", "navy", "red", "blue", "purple"];
const PRICE_BOUNDS = { min: 0, max: 10000 };

type SearchParams = {
  color?: string;
  occasion?: string;
  size?: string;
  designer?: string;
  q?: string;
  sort?: string;
  dateFrom?: string;
  dateTo?: string;
  priceMin?: string;
  priceMax?: string;
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
  const activePriceMin = Number(searchParams?.priceMin) || PRICE_BOUNDS.min;
  const activePriceMax = Number(searchParams?.priceMax) || PRICE_BOUNDS.max;
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
      priceMin: activePriceMin > PRICE_BOUNDS.min ? activePriceMin : undefined,
      priceMax: activePriceMax < PRICE_BOUNDS.max ? activePriceMax : undefined,
      search: search || undefined,
      sort,
      dateFrom: activeDateFrom,
      dateTo: activeDateTo,
    }),
    listOccasions(),
    listDesigners(),
    getCurrentUser().catch(() => null),
  ]);
  const savedSet = new Set<string>(user?.savedDressIds ?? []);
  const isLoggedIn = !!user;
  const occasionOptions = occasions.map((o) => ({ value: o.key, label: o.th }));
  const colorOptions = COLORS.map((c) => ({ value: c, label: COLOR_LABELS_TH[c], swatch: COLOR_SWATCH[c] }));
  const sizeOptions = SIZES.map((sz) => ({ value: sz, label: sz }));
  const designerOptions = designers.map((d) => ({ value: d, label: d }));

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
          <BrowseFilters
            q={search}
            color={activeColor === "all" ? null : activeColor}
            occasion={activeOcc ?? null}
            size={activeSize ?? null}
            designer={activeDesigner ?? null}
            priceMin={activePriceMin}
            priceMax={activePriceMax}
            priceBounds={PRICE_BOUNDS}
            occasions={occasionOptions}
            colors={colorOptions}
            sizes={sizeOptions}
            designers={designerOptions}
          />
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
            <DressResults dresses={dresses} savedIds={[...savedSet]} isLoggedIn={isLoggedIn} />
          )}
        </main>
      </div>
    </div>
  );
}
