"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  setBoutiqueStatus,
  toggleBoutiqueVerified,
  toggleBoutiqueFeatured,
} from "@/app/actions/admin";

type Boutique = {
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
};

export default function BoutiqueRow({ b }: { b: Boutique }) {
  const router = useRouter();
  const [working, setWorking] = useState(false);
  const [showReject, setShowReject] = useState(false);
  const [reason, setReason] = useState(b.status === "rejected" ? "" : "");
  const [error, setError] = useState<string | null>(null);

  async function act(fn: () => Promise<{ ok: boolean; error?: string }>) {
    setWorking(true);
    setError(null);
    const res = await fn();
    if (!res.ok) setError(res.error ?? "ผิดพลาด");
    setWorking(false);
    router.refresh();
  }

  return (
    <div
      style={{
        padding: 14,
        border: "1px solid var(--line)",
        borderRadius: 8,
        background: "var(--surface)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 12,
          marginBottom: 10,
          flexWrap: "wrap",
        }}
      >
        <div>
          <Link href={`/boutique/${b.slug}`} target="_blank" style={{ fontWeight: 600, fontSize: 16 }}>
            {b.name}
          </Link>
          <div style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 4 }}>
            {b.area_label}
            {b.owner_name ? ` · ดูแลโดย ${b.owner_name}` : ""}
            {b.since_year ? ` · ตั้งแต่ ${b.since_year}` : ""}
            {b.instagram ? ` · ${b.instagram}` : ""}
          </div>
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <Badge
            text={b.status}
            color={b.status === "live" ? "#15803D" : b.status === "rejected" ? "#DC2626" : "#D97706"}
          />
          <Badge
            text={`KYC: ${b.kyc_status}`}
            color={
              b.kyc_status === "verified" ? "#15803D" :
              b.kyc_status === "rejected" ? "#DC2626" :
              b.kyc_status === "submitted" ? "#1F6FEB" :
              "#6B7280"
            }
          />
          {b.verified ? <Badge text="✓ Verified" color="#1F6FEB" /> : null}
          {b.featured ? <Badge text="★ Featured" color="#D97706" /> : null}
        </div>
      </div>

      {error ? (
        <div style={{ color: "var(--danger)", fontSize: 13, marginBottom: 10 }}>{error}</div>
      ) : null}

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {b.status === "pending" ? (
          <>
            <button
              type="button"
              className="btn btn-dark"
              style={btnSm}
              disabled={working}
              onClick={() => act(() => setBoutiqueStatus(b.id, "live"))}
            >
              ✓ Approve
            </button>
            <button
              type="button"
              className="btn btn-outline"
              style={{ ...btnSm, color: "#DC2626", borderColor: "#DC2626" }}
              onClick={() => setShowReject((s) => !s)}
            >
              Reject
            </button>
          </>
        ) : b.status === "live" ? (
          <button
            type="button"
            className="btn btn-outline"
            style={{ ...btnSm, color: "#D97706" }}
            disabled={working}
            onClick={() => act(() => setBoutiqueStatus(b.id, "pending"))}
          >
            กลับเป็น pending
          </button>
        ) : (
          <button
            type="button"
            className="btn btn-outline"
            style={btnSm}
            disabled={working}
            onClick={() => act(() => setBoutiqueStatus(b.id, "pending"))}
          >
            กลับเป็น pending
          </button>
        )}

        <button
          type="button"
          className="btn btn-outline"
          style={btnSm}
          disabled={working}
          onClick={() => act(() => toggleBoutiqueVerified(b.id, !b.verified))}
        >
          {b.verified ? "✕ ถอด Verified" : "✓ ติด Verified"}
        </button>

        <button
          type="button"
          className="btn btn-outline"
          style={btnSm}
          disabled={working}
          onClick={() => act(() => toggleBoutiqueFeatured(b.id, !b.featured))}
        >
          {b.featured ? "✕ ถอด Featured" : "★ ติด Featured"}
        </button>

        <Link href={`/boutique/${b.slug}`} target="_blank" className="btn btn-outline" style={btnSm}>
          ดูหน้าร้าน →
        </Link>
      </div>

      {showReject ? (
        <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
          <input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="เหตุผลที่ปฏิเสธ"
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
            className="btn btn-dark"
            style={{ ...btnSm, background: "#DC2626", borderColor: "#DC2626" }}
            disabled={working}
            onClick={() => act(() => setBoutiqueStatus(b.id, "rejected", reason))}
          >
            ยืนยัน Reject
          </button>
        </div>
      ) : null}
    </div>
  );
}

function Badge({ text, color }: { text: string; color: string }) {
  return (
    <span
      style={{
        padding: "3px 8px",
        background: `${color}1A`,
        color,
        fontSize: 10,
        fontWeight: 600,
        borderRadius: 3,
        letterSpacing: "0.04em",
        textTransform: "uppercase",
      }}
    >
      {text}
    </span>
  );
}

const btnSm: React.CSSProperties = { padding: "7px 12px", fontSize: 12 };
