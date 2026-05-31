import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import DressRow from "./DressRow";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Dresses · Admin",
  robots: { index: false, follow: false },
};

const STATUS_OPTS = ["pending", "live", "rejected", "all"] as const;
type StatusOpt = (typeof STATUS_OPTS)[number];

export default async function DressesAdmin({
  searchParams,
}: {
  searchParams: { status?: string };
}) {
  const activeStatus = (STATUS_OPTS as readonly string[]).includes(searchParams?.status ?? "")
    ? (searchParams!.status as StatusOpt)
    : "pending";

  const sb = createClient();
  let q = sb
    .from("dresses")
    .select("id, slug, tag_code, name, designer, boutique_name, size, color, price_per_day, status, available, featured, sponsored, images, created_at, views")
    .order("created_at", { ascending: false });
  if (activeStatus !== "all") q = q.eq("status", activeStatus);
  const { data, error } = await q;

  const rows = (data ?? []) as Array<{
    id: string;
    slug: string;
    tag_code: string;
    name: string;
    designer: string | null;
    boutique_name: string;
    size: string;
    color: string;
    price_per_day: number;
    status: string;
    available: boolean;
    featured: boolean;
    sponsored: boolean;
    images: string[];
    created_at: string;
    views: number;
  }>;

  return (
    <div>
      <h1 className="page-title" style={{ fontSize: 26, fontWeight: 600, marginBottom: 4 }}>
        Dresses
      </h1>
      <p style={{ fontSize: 14, color: "var(--ink-3)", marginBottom: 18 }}>
        จัดการประกาศชุด อนุมัติชุดใหม่ ติ๊ก Featured
      </p>

      <div style={{ display: "flex", gap: 6, marginBottom: 20, flexWrap: "wrap" }}>
        {STATUS_OPTS.map((s) => (
          <a
            key={s}
            href={`/admin/dresses?status=${s}`}
            style={{
              padding: "7px 14px",
              fontSize: 13,
              border: `1px solid ${activeStatus === s ? "var(--ink)" : "var(--line)"}`,
              borderRadius: 6,
              background: activeStatus === s ? "var(--ink)" : "var(--surface)",
              color: activeStatus === s ? "var(--on-dark)" : "var(--ink)",
              fontWeight: activeStatus === s ? 600 : 500,
            }}
          >
            {s}
          </a>
        ))}
      </div>

      {error ? (
        <div style={{ color: "var(--danger)" }}>โหลดไม่สำเร็จ: {error.message}</div>
      ) : rows.length === 0 ? (
        <div
          style={{
            padding: 40,
            textAlign: "center",
            background: "var(--surface)",
            border: "1px solid var(--line)",
            borderRadius: 8,
            color: "var(--ink-3)",
          }}
        >
          ไม่มีชุดในสถานะ &ldquo;{activeStatus}&rdquo;
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {rows.map((d) => (
            <DressRow key={d.id} d={d} />
          ))}
        </div>
      )}
    </div>
  );
}
