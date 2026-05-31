"use client";

import { useMemo, useState } from "react";

type Props = {
  dressName: string;
  boutiqueName: string;
  pricePerDay: number;
  dressPageUrl: string;
};

export default function LineMessageCopyBox({
  dressName,
  boutiqueName,
  pricePerDay,
  dressPageUrl,
}: Props) {
  const [copied, setCopied] = useState(false);

  const message = useMemo(() => {
    return [
      "สวัสดีค่ะ/ครับ",
      `สนใจเช่าชุด \"${dressName}\" จากร้าน ${boutiqueName}`,
      `ราคา ${pricePerDay.toLocaleString()} บาท/วัน`,
      "รบกวนช่วยแจ้งรายละเอียดการเช่า วันว่าง และค่าจัดส่งให้ด้วยค่ะ/ครับ",
      dressPageUrl,
    ].join("\n");
  }, [dressName, boutiqueName, pricePerDay, dressPageUrl]);

  const copyToClipboard = async () => {
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
          style={{
            border: "none",
            borderRadius: 8,
            background: "var(--ink)",
            color: "white",
            padding: "10px 14px",
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          {copied ? "คัดลอกแล้ว" : "คัดลอกข้อความ"}
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
