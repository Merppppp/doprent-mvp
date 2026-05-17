import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
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

  const sb = createClient();
  const { data, error } = await sb
    .from("kyc_submissions")
    .select(
      "id, boutique_id, business_type, legal_name, tax_id, dbd_reg_no, bank_name, bank_acc_no, bank_acc_name, id_card_url, dbd_doc_url, book_bank_url, plan, status, review_notes, submitted_at, boutiques!inner(name, slug, area_label)",
    )
    .eq("status", activeStatus)
    .order("submitted_at", { ascending: false });

  const rows = ((data ?? []) as unknown) as Array<{
    id: string;
    boutique_id: string;
    business_type: string;
    legal_name: string;
    tax_id: string;
    dbd_reg_no: string | null;
    bank_name: string;
    bank_acc_no: string;
    bank_acc_name: string;
    id_card_url: string | null;
    dbd_doc_url: string | null;
    book_bank_url: string | null;
    plan: string;
    status: string;
    review_notes: string | null;
    submitted_at: string;
    boutiques: { name: string; slug: string; area_label: string };
  }>;

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
