import type { Metadata } from "next";
import { db } from "@/lib/db";
import KycRow from "./KycRow";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "KYC Review · Admin",
  robots: { index: false, follow: false },
};

const STATUS_OPTS = ["pending", "approved", "rejected"] as const;
type StatusOpt = (typeof STATUS_OPTS)[number];

export default async function KycReviewPage({
  searchParams,
}: {
  searchParams: { status?: string };
}) {
  const activeStatus = (STATUS_OPTS as readonly string[]).includes(searchParams?.status ?? "")
    ? (searchParams!.status as StatusOpt)
    : "pending";

  const rawRows = await db.kycSubmission.findMany({
    where: { status: activeStatus },
    orderBy: { submittedAt: "desc" },
    include: { boutique: { select: { name: true, slug: true, areaLabel: true } } },
  });

  const rows = rawRows.map((r) => ({
    id: r.id, boutique_id: r.boutiqueId, business_type: r.businessType,
    legal_name: r.legalName, tax_id: r.taxId, dbd_reg_no: r.dbdRegNo,
    bank_name: r.bankName, bank_acc_no: r.bankAccNo, bank_acc_name: r.bankAccName,
    id_card_url: r.idCardUrl, dbd_doc_url: r.dbdDocUrl, book_bank_url: r.bookBankUrl,
    plan: r.plan, status: r.status, review_notes: r.reviewNotes,
    submitted_at: r.submittedAt.toISOString(),
    boutiques: { name: r.boutique.name, slug: r.boutique.slug, area_label: r.boutique.areaLabel },
  }));
  const error = null as { message: string } | null;

  return (
    <div>
      <h1 className="page-title" style={{ fontSize: 26, fontWeight: 600, marginBottom: 4 }}>
        KYC Review
      </h1>
      <p style={{ fontSize: 14, color: "var(--ink-3)", marginBottom: 18 }}>
        ตรวจเอกสารยืนยันตัวตนของร้านค้า
      </p>

      <div style={{ display: "flex", gap: 6, marginBottom: 20 }}>
        {STATUS_OPTS.map((s) => (
          <a
            key={s}
            href={`/admin/kyc?status=${s}`}
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
        <div style={{ color: "var(--danger)" }}>โหลดข้อมูลไม่สำเร็จ: {error.message}</div>
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
          ไม่มีรายการในสถานะ &ldquo;{activeStatus}&rdquo;
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {rows.map((r) => (
            <KycRow key={r.id} kyc={r} />
          ))}
        </div>
      )}
    </div>
  );
}
