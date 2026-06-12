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

/**
 * Resolve a stored KYC doc reference to a viewable href.
 * - New rows store a PRIVATE-bucket key (`kyc/<uuid>.<ext>`) → served via the
 *   admin-guarded signed-URL route /api/admin/kyc-doc.
 * - Legacy rows store a full public URL (https://…) → rendered as-is.
 */
function resolveKycDocHref(value: string | null): string | null {
  if (!value) return null;
  if (value.startsWith("kyc/")) {
    return `/api/admin/kyc-doc?key=${encodeURIComponent(value)}`;
  }
  if (/^https?:\/\//.test(value)) return value; // legacy public-bucket URL
  return null;
}

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
    orderBy: { createdAt: "desc" },
    include: { shop: { select: { name: true, slug: true, areaLabel: true } } },
  });

  const rows = rawRows.map((r) => ({
    id: r.id, shop_id: r.shopId, business_type: r.businessType,
    legal_name: r.legalName, tax_id: r.taxId, dbd_reg_no: r.dbdRegNo,
    bank_name: r.bankName, bank_acc_no: r.bankAccNo, bank_acc_name: r.bankAccName,
    id_card_url: resolveKycDocHref(r.idCardUrl),
    dbd_doc_url: resolveKycDocHref(r.dbdDocUrl),
    book_bank_url: resolveKycDocHref(r.bookBankUrl),
    plan: r.plan, status: r.status, review_notes: r.reviewNotes,
    created_at: r.createdAt.toISOString(),
    shop: { name: r.shop.name, slug: r.shop.slug, area_label: r.shop.areaLabel },
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
