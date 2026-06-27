"use client";

import { useState } from "react";

type Props = {
  recipientName?: string | null;
  phone?: string | null;
  address?: string | null;
};

export default function CopyAddressButton({ recipientName, phone, address }: Props) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    const parts: string[] = [];
    if (recipientName) parts.push(recipientName);
    if (phone) parts.push(phone);
    if (address) parts.push(address);
    const text = parts.join("\n");
    if (!text) return;

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      title="คัดลอกที่อยู่"
      style={{
        background: "none",
        border: "none",
        cursor: "pointer",
        padding: "2px 6px",
        borderRadius: 4,
        fontSize: 12,
        color: copied ? "var(--success)" : "var(--accent)",
        fontWeight: 500,
        whiteSpace: "nowrap",
        transition: "color 0.15s",
      }}
    >
      {copied ? "คัดลอกแล้ว" : "คัดลอก"}
    </button>
  );
}
