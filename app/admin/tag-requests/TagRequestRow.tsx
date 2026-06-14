"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { approveTagRequest, rejectTagRequest } from "@/app/actions/admin-tags";
import StatusBadge from "@/components/StatusBadge";

type TagRequestRowData = {
  id: string;
  requestedLabel: string;
  requestedKey: string | null;
  status: "pending" | "approved" | "rejected";
  reviewNotes: string | null;
  createdAt: string;
  reviewedAt: string | null;
  tagGroup: { id: string; label: string; key: string };
  shop: { id: string; name: string; slug: string };
};

export default function TagRequestRow({ req }: { req: TagRequestRowData }) {
  const router = useRouter();
  const [working, setWorking] = useState(false);
  const [showReject, setShowReject] = useState(false);
  const [showApproveKeyInput, setShowApproveKeyInput] = useState(false);
  const [approveKey, setApproveKey] = useState(req.requestedKey ?? "");
  const [swatchHex, setSwatchHex] = useState("");
  const [swatchImageUrl, setSwatchImageUrl] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  const isPending = req.status === "pending";

  async function onApprove() {
    setWorking(true);
    setError(null);
    const res = await approveTagRequest(req.id, approveKey.trim() || undefined, swatchHex.trim() || undefined, swatchImageUrl.trim() || undefined);
    if (!res.ok) {
      setError(res.error ?? "ผิดพลาด");
      setWorking(false);
      return;
    }
    router.refresh();
  }

  async function onReject() {
    if (!rejectReason.trim()) { setError("ระบุเหตุผลด้วย"); return; }
    setWorking(true);
    setError(null);
    const res = await rejectTagRequest(req.id, rejectReason.trim());
    if (!res.ok) {
      setError(res.error ?? "ผิดพลาด");
      setWorking(false);
      return;
    }
    router.refresh();
  }

  const statusTone =
    req.status === "approved" ? "success" :
    req.status === "rejected" ? "danger" :
    "warn";

  const statusLabel =
    req.status === "approved" ? "อนุมัติแล้ว" :
    req.status === "rejected" ? "ตีกลับ" :
    "รออนุมัติ";

  return (
    <div
      style={{
        border: "1px solid var(--line)",
        borderRadius: 8,
        padding: 16,
        background: "var(--surface)",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: 10,
          marginBottom: 12,
        }}
      >
        <div>
          <div style={{ fontSize: 12, color: "var(--ink-3)", marginBottom: 4 }}>
            ส่งเมื่อ {new Date(req.createdAt).toLocaleString("th-TH")}
          </div>
          <div style={{ fontSize: 17, fontWeight: 600 }}>
            {req.requestedLabel}
          </div>
          <div style={{ fontSize: 13, color: "var(--ink-2)", marginTop: 3 }}>
            กลุ่ม: <strong>{req.tagGroup.label}</strong>
            {" · "}
            ร้าน:{" "}
            <a
              href={`/shop/${req.shop.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "var(--ink-2)" }}
            >
              {req.shop.name}
            </a>
          </div>
          {req.requestedKey ? (
            <div style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 2 }}>
              slug ที่เสนอ: <code>{req.requestedKey}</code>
            </div>
          ) : null}
        </div>
        <StatusBadge
          text={statusLabel}
          tone={statusTone}
          style={{ padding: "3px 10px", fontSize: 11 }}
        />
      </div>

      {/* Review notes (on reviewed items) */}
      {req.reviewNotes && !isPending ? (
        <div
          style={{
            padding: 10,
            background: "var(--bg)",
            borderRadius: 6,
            fontSize: 13,
            color: "var(--ink-2)",
            marginBottom: 12,
          }}
        >
          <b>Notes:</b> {req.reviewNotes}
        </div>
      ) : null}

      {req.reviewedAt && !isPending ? (
        <div style={{ fontSize: 12, color: "var(--ink-3)", marginBottom: 12 }}>
          ตรวจเมื่อ {new Date(req.reviewedAt).toLocaleString("th-TH")}
        </div>
      ) : null}

      {error ? (
        <div style={{ color: "var(--danger)", fontSize: 13, marginBottom: 10 }}>{error}</div>
      ) : null}

      {/* Action buttons (pending only) */}
      {isPending ? (
        showReject ? (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <input
              type="text"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="เหตุผลที่ตีกลับ (แสดงให้ seller เห็น)"
              style={{
                flex: 1,
                padding: "9px 12px",
                border: "1px solid var(--line)",
                borderRadius: 6,
                fontSize: 13,
                minWidth: 220,
              }}
            />
            <button
              type="button"
              onClick={onReject}
              disabled={working}
              className="btn btn-dark"
              style={{ background: "var(--danger)", borderColor: "var(--danger)", padding: "9px 14px", fontSize: 13 }}
            >
              ยืนยันตีกลับ
            </button>
            <button
              type="button"
              onClick={() => { setShowReject(false); setError(null); }}
              className="btn btn-outline"
              style={{ padding: "9px 14px", fontSize: 13 }}
            >
              ยกเลิก
            </button>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {showApproveKeyInput ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                  <input
                    type="text"
                    value={approveKey}
                    onChange={(e) => setApproveKey(e.target.value)}
                    placeholder="slug key (ว่าง = ระบบสร้างอัตโนมัติ)"
                    style={{
                      flex: 1,
                      padding: "9px 12px",
                      border: "1px solid var(--line)",
                      borderRadius: 6,
                      fontSize: 13,
                      minWidth: 220,
                    }}
                  />
                  <button
                    type="button"
                    onClick={onApprove}
                    disabled={working}
                    className="btn btn-dark"
                    style={{ padding: "9px 16px", fontSize: 13 }}
                  >
                    {working ? "กำลังอนุมัติ…" : "✓ ยืนยันอนุมัติ"}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowApproveKeyInput(false); setError(null); }}
                    className="btn btn-outline"
                    style={{ padding: "9px 14px", fontSize: 13 }}
                  >
                    ยกเลิก
                  </button>
                </div>
                {req.tagGroup.key === "color" && (
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", paddingLeft: 2 }}>
                    <label style={{ fontSize: 12, color: "var(--ink-2)", whiteSpace: "nowrap" }}>สี (hex):</label>
                    <input
                      type="color"
                      value={swatchHex || "#cccccc"}
                      onChange={(e) => setSwatchHex(e.target.value)}
                      style={{ width: 36, height: 28, padding: 2, border: "1px solid var(--line)", borderRadius: 4, cursor: "pointer" }}
                    />
                    <input
                      type="text"
                      value={swatchHex}
                      onChange={(e) => setSwatchHex(e.target.value)}
                      placeholder="#RRGGBB (ไม่บังคับ)"
                      style={{ width: 130, padding: "6px 10px", border: "1px solid var(--line)", borderRadius: 6, fontSize: 12 }}
                    />
                    <label style={{ fontSize: 12, color: "var(--ink-2)", whiteSpace: "nowrap" }}>URL รูป:</label>
                    <input
                      type="text"
                      value={swatchImageUrl}
                      onChange={(e) => setSwatchImageUrl(e.target.value)}
                      placeholder="https://... (ไม่บังคับ)"
                      style={{ flex: 1, minWidth: 160, padding: "6px 10px", border: "1px solid var(--line)", borderRadius: 6, fontSize: 12 }}
                    />
                  </div>
                )}
              </div>
            ) : (
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  type="button"
                  onClick={() => setShowApproveKeyInput(true)}
                  disabled={working}
                  className="btn btn-dark"
                  style={{ padding: "9px 16px", fontSize: 13 }}
                >
                  ✓ อนุมัติ
                </button>
                <button
                  type="button"
                  onClick={() => { setShowReject(true); setError(null); }}
                  className="btn btn-outline"
                  style={{ padding: "9px 16px", fontSize: 13, color: "var(--danger)", borderColor: "var(--danger)" }}
                >
                  ตีกลับ
                </button>
              </div>
            )}
          </div>
        )
      ) : null}
    </div>
  );
}
