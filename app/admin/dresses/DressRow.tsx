"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { setDressStatus, toggleDressFeatured } from "@/app/actions/admin";
import { DressArt } from "@/components/DressArt";
import StatusBadge from "@/components/StatusBadge";
import type { Color } from "@/lib/types";

type D = {
  id: string;
  slug: string;
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
};

export default function DressRow({ d }: { d: D }) {
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

  const hasImg = Array.isArray(d.images) && d.images.length > 0;

  return (
    <div
      style={{
        padding: 14,
        border: "1px solid var(--line)",
        borderRadius: 8,
        background: "var(--surface)",
        display: "grid",
        gridTemplateColumns: "72px 1fr auto",
        gap: 14,
        alignItems: "flex-start",
      }}
    >
      <div
        style={{
          width: 72,
          height: 90,
          borderRadius: 6,
          overflow: "hidden",
          background: "var(--bg)",
        }}
      >
        {hasImg ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={d.images[0]} alt={d.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          <DressArt color={d.color as Color} variant={0} />
        )}
      </div>

      <div style={{ minWidth: 0 }}>
        <Link href={`/dress/${d.slug}`} target="_blank" style={{ fontWeight: 600, fontSize: 15 }}>
          {d.name}
        </Link>
        <div style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 4 }}>
          {d.designer || "—"} · Size {d.size} · ฿{d.price_per_day.toLocaleString()}/วัน · {d.boutique_name}
        </div>
        <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
          <StatusBadge
            text={d.status}
            tone={d.status === "live" ? "success" : d.status === "rejected" ? "danger" : "warn"}
          />
          {!d.available ? <StatusBadge text="ปิด" tone="neutral" /> : null}
          {d.featured ? <StatusBadge text="★ Featured" tone="warn" /> : null}
          <span style={{ fontSize: 11, color: "var(--ink-3)", alignSelf: "center" }}>· {d.views} views</span>
        </div>

        {error ? (
          <div style={{ color: "var(--danger)", fontSize: 13, marginTop: 8 }}>{error}</div>
        ) : null}

        {showReject ? (
          <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="เหตุผลที่ปฏิเสธ"
              style={{
                flex: 1,
                padding: "8px 12px",
                border: "1px solid var(--line)",
                borderRadius: 6,
                fontSize: 13,
                minWidth: 200,
              }}
            />
            <button
              type="button"
              className="btn btn-dark"
              style={{ background: "var(--danger)", borderColor: "var(--danger)", padding: "7px 12px", fontSize: 12 }}
              disabled={working}
              onClick={() => act(() => setDressStatus(d.id, "rejected", reason))}
            >
              ยืนยัน
            </button>
          </div>
        ) : null}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-end" }}>
        {d.status === "pending" ? (
          <>
            <button
              type="button"
              className="btn btn-dark"
              style={btnSm}
              disabled={working}
              onClick={() => act(() => setDressStatus(d.id, "live"))}
            >
              ✓ Approve
            </button>
            <button
              type="button"
              className="btn btn-outline"
              style={{ ...btnSm, color: "var(--danger)", borderColor: "var(--danger)" }}
              onClick={() => setShowReject((s) => !s)}
            >
              Reject
            </button>
          </>
        ) : (
          <button
            type="button"
            className="btn btn-outline"
            style={btnSm}
            disabled={working}
            onClick={() => act(() => setDressStatus(d.id, "pending"))}
          >
            กลับ pending
          </button>
        )}
        <button
          type="button"
          className="btn btn-outline"
          style={btnSm}
          disabled={working}
          onClick={() => act(() => toggleDressFeatured(d.id, !d.featured))}
        >
          {d.featured ? "ถอด ★" : "ติด ★"}
        </button>
      </div>
    </div>
  );
}

const btnSm: React.CSSProperties = { padding: "6px 12px", fontSize: 12, minWidth: 100 };
