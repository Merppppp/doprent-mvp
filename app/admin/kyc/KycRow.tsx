"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { approveKyc, rejectKyc } from "@/app/actions/admin";

type Kyc = {
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
};

export default function KycRow({ kyc }: { kyc: Kyc }) {
  const router = useRouter();
  const [working, setWorking] = useState(false);
  const [showReject, setShowReject] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  const isPending = kyc.status === "pending";

  async function onApprove() {
    setWorking(true);
    setError(null);
    const res = await approveKyc(kyc.id);
    if (!res.ok) setError(res.error ?? "ผิดพลาด");
    setWorking(false);
    router.refresh();
  }

  async function onReject() {
    if (!reason.trim()) {
      setError("ระบุเหตุผลด้วย");
      return;
    }
    setWorking(true);
    setError(null);
    const res = await rejectKyc(kyc.id, reason.trim());
    if (!res.ok) setError(res.error ?? "ผิดพลาด");
    setShowReject(false);
    setWorking(false);
    router.refresh();
  }

  return (
    <div
      style={{
        border: "1px solid var(--line)",
        borderRadius: 8,
        padding: 16,
        background: "var(--surface)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 12,
          marginBottom: 14,
          flexWrap: "wrap",
        }}
      >
        <div>
          <div style={{ fontSize: 12, color: "var(--ink-3)", marginBottom: 4 }}>
            {kyc.boutiques.area_label} · ส่งเมื่อ {new Date(kyc.submitted_at).toLocaleString("th-TH")}
          </div>
          <Link
            href={`/boutique/${kyc.boutiques.slug}`}
            target="_blank"
            style={{ fontWeight: 600, fontSize: 17 }}
          >
            {kyc.boutiques.name}
          </Link>
          <div style={{ fontSize: 13, color: "var(--ink-2)", marginTop: 4 }}>
            {kyc.business_type === "company" ? "นิติบุคคล" : "บุคคลธรรมดา"} · plan: {kyc.plan}
          </div>
        </div>
        <span
          style={{
            padding: "3px 10px",
            background:
              kyc.status === "approved" ? "rgba(21,128,61,0.1)" :
              kyc.status === "rejected" ? "rgba(220,38,38,0.1)" :
              "rgba(217,119,6,0.1)",
            color:
              kyc.status === "approved" ? "#15803D" :
              kyc.status === "rejected" ? "#DC2626" :
              "#D97706",
            fontSize: 11,
            fontWeight: 600,
            borderRadius: 3,
            textTransform: "uppercase",
            letterSpacing: "0.04em",
          }}
        >
          {kyc.status}
        </span>
      </div>

      <div className="grid-2" style={{ gap: 14, marginBottom: 14, fontSize: 13 }}>
        <Info label="ชื่อตามเอกสาร" value={kyc.legal_name} />
        <Info label="เลขประจำตัว" value={kyc.tax_id} />
        {kyc.dbd_reg_no ? <Info label="DBD" value={kyc.dbd_reg_no} /> : null}
        <Info label="ธนาคาร" value={kyc.bank_name} />
        <Info label="ชื่อบัญชี" value={kyc.bank_acc_name} />
        <Info label="เลขบัญชี" value={kyc.bank_acc_no} />
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
        {kyc.id_card_url ? (
          <a href={kyc.id_card_url} target="_blank" rel="noopener noreferrer" className="btn btn-outline" style={btnSm}>
            📄 บัตรประชาชน
          </a>
        ) : null}
        {kyc.dbd_doc_url ? (
          <a href={kyc.dbd_doc_url} target="_blank" rel="noopener noreferrer" className="btn btn-outline" style={btnSm}>
            📄 หนังสือรับรอง
          </a>
        ) : null}
        {kyc.book_bank_url ? (
          <a href={kyc.book_bank_url} target="_blank" rel="noopener noreferrer" className="btn btn-outline" style={btnSm}>
            📄 สมุดบัญชี
          </a>
        ) : null}
      </div>

      {kyc.review_notes && !isPending ? (
        <div
          style={{
            padding: 10,
            background: "var(--bg)",
            borderRadius: 6,
            fontSize: 13,
            color: "var(--ink-2)",
            marginBottom: 14,
          }}
        >
          <b>Notes:</b> {kyc.review_notes}
        </div>
      ) : null}

      {error ? (
        <div style={{ color: "var(--danger)", fontSize: 13, marginBottom: 10 }}>{error}</div>
      ) : null}

      {isPending ? (
        showReject ? (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="เหตุผลที่ตีกลับ (จะแสดงให้ seller)"
              style={{
                flex: 1,
                padding: "9px 12px",
                border: "1px solid var(--line)",
                borderRadius: 6,
                fontSize: 13,
                minWidth: 250,
              }}
            />
            <button
              type="button"
              onClick={onReject}
              disabled={working}
              className="btn btn-dark"
              style={{ background: "#DC2626", borderColor: "#DC2626", padding: "9px 14px", fontSize: 13 }}
            >
              ยืนยันตีกลับ
            </button>
            <button
              type="button"
              onClick={() => setShowReject(false)}
              className="btn btn-outline"
              style={{ padding: "9px 14px", fontSize: 13 }}
            >
              ยกเลิก
            </button>
          </div>
        ) : (
          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="button"
              onClick={onApprove}
              disabled={working}
              className="btn btn-dark"
              style={{ padding: "9px 16px", fontSize: 13 }}
            >
              ✓ Approve (auto-verify ร้าน)
            </button>
            <button
              type="button"
              onClick={() => setShowReject(true)}
              className="btn btn-outline"
              style={{ padding: "9px 16px", fontSize: 13, color: "#DC2626", borderColor: "#DC2626" }}
            >
              Reject
            </button>
          </div>
        )
      ) : null}
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: "var(--ink-3)", marginBottom: 2, textTransform: "uppercase", letterSpacing: "0.04em" }}>
        {label}
      </div>
      <div style={{ fontWeight: 500 }}>{value}</div>
    </div>
  );
}

const btnSm: React.CSSProperties = { padding: "6px 12px", fontSize: 12 };
