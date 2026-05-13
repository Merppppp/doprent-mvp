import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import BoutiqueRow from "./BoutiqueRow";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Boutiques — DopRent Admin",
  robots: { index: false, follow: false },
};

const STATUS_OPTS = ["pending", "live", "rejected", "all"] as const;
type StatusOpt = (typeof STATUS_OPTS)[number];

export default async function BoutiquesAdmin({
  searchParams,
}: {
  searchParams: { status?: string };
}) {
  const activeStatus = (STATUS_OPTS as readonly string[]).includes(searchParams?.status ?? "")
    ? (searchParams!.status as StatusOpt)
    : "pending";

  const sb = createClient();
  let q = sb
    .from("boutiques")
    .select("id, slug, name, owner_name, area_label, line_url, instagram, since_year, status, kyc_status, verified, featured, created_at, owner_id")
    .order("created_at", { ascending: false });
  if (activeStatus !== "all") q = q.eq("status", activeStatus);
  const { data, error } = await q;

  const rows = (data ?? []) as Array<{
    id: string;
    slug: string;
    name: string;
    owner_name: string | null;
    area_label: string;
    line_url: string;
    instagram: string | null;
    since_year: number | null;
    status: string;
    kyc_status: string;
    verified: boolean;
    featured: boolean;
    created_at: string;
    owner_id: string | null;
  }>;

  return (
    <div>
      <h1 className="page-title" style={{ fontSize: 26, fontWeight: 600, marginBottom: 4 }}>
        Boutiques
      </h1>
      <p style={{ fontSize: 14, color: "var(--ink-3)", marginBottom: 18 }}>
        จัดการร้านค้า อนุมัติร้านใหม่ ติ๊ก verified / featured
      </p>

      <div style={{ display: "flex", gap: 6, marginBottom: 20, flexWrap: "wrap" }}>
        {STATUS_OPTS.map((s) => (
          <a
            key={s}
            href={`/admin/boutiques?status=${s}`}
            style={{
              padding: "7px 14px",
              fontSize: 13,
              border: `1px solid ${activeStatus === s ? "var(--ink)" : "var(--line)"}`,
              borderRadius: 6,
              background: activeStatus === s ? "var(--ink)" : "var(--surface)",
              color: activeStatus === s ? "#fff" : "var(--ink)",
              fontWeight: activeStatus === s ? 600 : 400,
              textTransform: "uppercase",
              letterSpacing: "0.04em",
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
          ไม่มีร้านในสถานะ &ldquo;{activeStatus}&rdquo;
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {rows.map((b) => (
            <BoutiqueRow key={b.id} b={b} />
          ))}
        </div>
      )}
    </div>
  );
}
