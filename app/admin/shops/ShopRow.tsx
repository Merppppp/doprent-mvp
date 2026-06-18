"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  setShopStatus,
  toggleShopVerified,
  toggleShopFeatured,
} from "@/app/actions/admin";
import StatusBadge from "@/components/StatusBadge";

type Shop = {
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
  bankbook_image_path?: string | null;
  bank_account_number?: string | null;
  bank_account_name?: string | null;
};

export default function ShopRow({ b }: { b: Shop }) {
  const router = useRouter();
  const [working, setWorking] = useState(false);
  const [showReject, setShowReject] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function act(fn: () => Promise<{ ok: boolean; error?: string }>) {
    setWorking(true);
    setError(null);
    const res = await fn();
    if (!res.ok) setError(res.error ?? "ผิดพลาด");
    setWorking(false);
    router.refresh();
  }

  const thaiDate = new Date(b.created_at).toLocaleDateString("th-TH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  return (
    <>
      <tr style={{ borderBottom: "1px solid var(--line)" }}>
        {/* ร้าน */}
        <td style={tdStyle}>
          <Link
            href={`/shop/${b.slug}`}
            target="_blank"
            style={{ fontWeight: 600, fontSize: 14 }}
          >
            {b.name}
          </Link>
          <div style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 2 }}>
            {b.area_label}
            {b.owner_name ? ` · ${b.owner_name}` : ""}
            {b.since_year ? ` · ตั้งแต่ ${b.since_year}` : ""}
            {b.instagram ? ` · ${b.instagram}` : ""}
          </div>
        </td>

        {/* สถานะ */}
        <td style={tdStyle}>
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
            <StatusBadge
              text={b.status}
              tone={
                b.status === "live"
                  ? "success"
                  : b.status === "rejected"
                  ? "danger"
                  : "warn"
              }
            />
            <StatusBadge
              text={`KYC: ${b.kyc_status}`}
              tone={
                b.kyc_status === "verified"
                  ? "success"
                  : b.kyc_status === "rejected"
                  ? "danger"
                  : b.kyc_status === "submitted"
                  ? "info"
                  : "neutral"
              }
            />
            {b.verified ? (
              <StatusBadge text="✓ Verified" tone="info" />
            ) : null}
            {b.featured ? (
              <StatusBadge text="★ Featured" tone="warn" />
            ) : null}
          </div>
          {error ? (
            <div
              style={{ color: "var(--danger)", fontSize: 11, marginTop: 4 }}
            >
              {error}
            </div>
          ) : null}
        </td>

        {/* สร้างเมื่อ */}
        <td
          style={{
            ...tdStyle,
            whiteSpace: "nowrap",
            color: "var(--ink-3)",
            fontSize: 12,
          }}
        >
          {thaiDate}
        </td>

        {/* จัดการ */}
        <td style={{ ...tdStyle, textAlign: "right" }}>
          <div
            style={{
              display: "flex",
              gap: 6,
              justifyContent: "flex-end",
              flexWrap: "wrap",
            }}
          >
            {b.status === "pending" ? (
              <>
                <button
                  type="button"
                  className="btn btn-dark"
                  style={btnSm}
                  disabled={working}
                  onClick={() => act(() => setShopStatus(b.id, "live"))}
                >
                  ✓ Approve
                </button>
                <button
                  type="button"
                  className="btn btn-outline"
                  style={{
                    ...btnSm,
                    color: "var(--danger)",
                    borderColor: "var(--danger)",
                  }}
                  onClick={() => setShowReject((s) => !s)}
                >
                  Reject
                </button>
              </>
            ) : (
              <button
                type="button"
                className="btn btn-outline"
                style={{ ...btnSm, color: "var(--warn)" }}
                disabled={working}
                onClick={() => act(() => setShopStatus(b.id, "pending"))}
              >
                กลับเป็น pending
              </button>
            )}

            <button
              type="button"
              className="btn btn-outline"
              style={btnSm}
              disabled={working}
              onClick={() => act(() => toggleShopVerified(b.id, !b.verified))}
            >
              {b.verified ? "✕ ถอด Verified" : "✓ ติด Verified"}
            </button>

            <button
              type="button"
              className="btn btn-outline"
              style={btnSm}
              disabled={working}
              onClick={() => act(() => toggleShopFeatured(b.id, !b.featured))}
            >
              {b.featured ? "✕ ถอด Featured" : "★ ติด Featured"}
            </button>

            <Link
              href={`/shop/${b.slug}`}
              target="_blank"
              className="btn btn-outline"
              style={btnSm}
            >
              ดูร้าน →
            </Link>

            {b.bankbook_image_path ? (
              <a
                href={`/api/admin/bankbook-doc?key=${encodeURIComponent(b.bankbook_image_path)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-outline"
                style={{ ...btnSm, color: "var(--info, #0EA5E9)" }}
                title={`บัญชี: ${b.bank_account_number ?? ""}${b.bank_account_name ? ` · ${b.bank_account_name}` : ""}`}
              >
                ดูสมุดบัญชี
              </a>
            ) : null}
          </div>
        </td>
      </tr>

      {showReject ? (
        <tr
          style={{
            borderBottom: "1px solid var(--line)",
            background: "var(--bg)",
          }}
        >
          <td colSpan={4} style={{ padding: "10px 12px" }}>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="เหตุผลที่ปฏิเสธ"
                className="input"
                style={{ flex: 1, minWidth: 250 }}
              />
              <button
                type="button"
                className="btn btn-dark"
                style={{
                  ...btnSm,
                  background: "var(--danger)",
                  borderColor: "var(--danger)",
                }}
                disabled={working}
                onClick={() =>
                  act(() => setShopStatus(b.id, "rejected", reason))
                }
              >
                ยืนยัน Reject
              </button>
            </div>
          </td>
        </tr>
      ) : null}
    </>
  );
}

const tdStyle: React.CSSProperties = { padding: "10px 12px", verticalAlign: "top" };
const btnSm: React.CSSProperties = { padding: "5px 10px", fontSize: 11 };
