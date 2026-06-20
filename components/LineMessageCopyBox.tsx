"use client";

import { useMemo, useState } from "react";
import { fmtThai } from "@/lib/date-th";

type Props = {
  dressName: string;
  boutiqueName: string;
  pricePerDay?: number;
  dressPageUrl: string;
  dateFrom?: string;
  dateTo?: string;
  tagCode?: string;
};

export default function LineMessageCopyBox({
  dressName,
  boutiqueName,
  pricePerDay,
  dressPageUrl,
  dateFrom,
  dateTo,
  tagCode,
}: Props) {
  const [copied, setCopied] = useState(false);
  const [copying, setCopying] = useState(false);

  const message = useMemo(() => {
    const lines = ["สวัสดีค่ะ/ครับ"];

    if (dressName || boutiqueName) {
      lines.push(`สนใจเช่าชุด "${dressName}" จากร้าน ${boutiqueName}`);
    }

    if (dateFrom || dateTo) {
      if (dateFrom && dateTo) {
        lines.push(`วันที่: ${fmtThai(dateFrom)} ถึง ${fmtThai(dateTo)}`);
      } else if (dateFrom) {
        lines.push(`วันที่เริ่ม: ${fmtThai(dateFrom)}`);
      } else if (dateTo) {
        lines.push(`วันที่สิ้นสุด: ${fmtThai(dateTo)}`);
      }
    }

    if (typeof pricePerDay === "number" && pricePerDay > 0) {
      lines.push(`ราคา ${pricePerDay.toLocaleString()} บาท/วัน`);
    }

    if (tagCode) {
      lines.push(`รหัสชุด: ${tagCode}`);
    }

    lines.push("รบกวนช่วยแจ้งรายละเอียดการเช่า วันว่าง และค่าจัดส่งให้ด้วยค่ะ/ครับ");
    if (dressPageUrl) lines.push(dressPageUrl);

    return lines.join("\n");
  }, [dressName, boutiqueName, pricePerDay, dressPageUrl, dateFrom, dateTo]);

  const copyToClipboard = async () => {
    setCopying(true);
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = message;
      textarea.style.position = "fixed";
      textarea.style.left = "-9999px";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
    } finally {
      setCopying(false);
    }

    window.setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section
      style={{
        marginBottom: 24,
        padding: 16,
        background: "var(--bg)",
        border: "1px solid var(--line)",
        borderRadius: 12,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 13, color: "var(--ink-3)", marginBottom: 4 }}>ข้อความพร้อมส่งใน LINE</div>
          <div style={{ fontSize: 15, fontWeight: 600 }}>คัดลอกแล้วส่งได้เลย</div>
        </div>
        <button
          type="button"
          onClick={copyToClipboard}
          disabled={copying}
          style={{
            border: "none",
            borderRadius: 8,
            background: "var(--ink)",
            color: "white",
            padding: "10px 14px",
            fontSize: 13,
            fontWeight: 600,
            cursor: copying ? "wait" : "pointer",
            opacity: copying ? 0.85 : 1,
          }}
        >
          {copying ? <Spinner size={14} label="กำลังคัดลอก..." /> : copied ? "คัดลอกแล้ว" : "คัดลอกข้อความ"}
        </button>
      </div>
      <textarea
        readOnly
        value={message}
        rows={5}
        style={{
          width: "100%",
          resize: "none",
          borderRadius: 10,
          border: "1px solid var(--line)",
          background: "var(--surface)",
          color: "var(--ink)",
          padding: 12,
          fontSize: 13,
          lineHeight: 1.6,
        }}
      />
    </section>
  );
}
