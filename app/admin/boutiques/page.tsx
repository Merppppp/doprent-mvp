import type { Metadata } from "next";
import { db } from "@/lib/db";
import BoutiqueRow from "./BoutiqueRow";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Boutiques · Admin",
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

  const rawRows = await db.boutique.findMany({
    where: activeStatus !== "all" ? { status: activeStatus } : undefined,
    orderBy: { createdAt: "desc" },
    select: { id: true, slug: true, name: true, ownerName: true, areaLabel: true, lineUrl: true, instagram: true, sinceYear: true, status: true, kycStatus: true, verified: true, featured: true, createdAt: true, ownerId: true },
  });

  const rows = rawRows.map((b) => ({
    id: b.id, slug: b.slug, name: b.name, owner_name: b.ownerName,
    area_label: b.areaLabel, line_url: b.lineUrl, instagram: b.instagram,
    since_year: b.sinceYear, status: b.status, kyc_status: b.kycStatus,
    verified: b.verified, featured: b.featured,
    created_at: b.createdAt.toISOString(), owner_id: b.ownerId,
  }));
  const error = null;

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
