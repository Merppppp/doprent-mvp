"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

interface Props {
  code: string;
  url: string;
  shopName: string;
}

export default function StaffQRSection({ code, url, shopName }: Props) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  useEffect(() => {
    QRCode.toDataURL(url, { width: 220, margin: 2, errorCorrectionLevel: "M" })
      .then(setQrDataUrl)
      .catch(console.error);
  }, [url]);

  return (
    <div
      style={{
        background: "var(--surface)",
        border: "1px solid var(--line)",
        borderRadius: 10,
        padding: 20,
        marginBottom: 28,
        maxWidth: 700,
      }}
    >
      <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>QR เข้าสู่ระบบพนักงาน</h2>
      <p style={{ fontSize: 13, color: "var(--ink-3)", marginBottom: 16 }}>
        พิมพ์ QR นี้ติดไว้ที่ร้าน พนักงานสแกนเพื่อเข้าสู่ระบบด้วย username + PIN ของตนเอง
      </p>
      <div style={{ display: "flex", gap: 28, alignItems: "flex-start", flexWrap: "wrap" }}>
        <div>
          {qrDataUrl ? (
            <img
              src={qrDataUrl}
              alt={`QR เข้าสู่ระบบพนักงาน ${shopName}`}
              width={160}
              height={160}
              style={{ border: "1px solid var(--line)", borderRadius: 8, display: "block" }}
            />
          ) : (
            <div
              style={{
                width: 160,
                height: 160,
                border: "1px solid var(--line)",
                borderRadius: 8,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--ink-3)",
                fontSize: 12,
              }}
            >
              กำลังโหลด...
            </div>
          )}
        </div>
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 12, color: "var(--ink-3)", marginBottom: 3 }}>รหัสร้าน</div>
            <code
              style={{
                fontSize: 20,
                fontWeight: 700,
                letterSpacing: "0.15em",
                background: "var(--surface-2, #f5f5f5)",
                padding: "4px 10px",
                borderRadius: 6,
                display: "inline-block",
              }}
            >
              {code}
            </code>
          </div>
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 12, color: "var(--ink-3)", marginBottom: 3 }}>ลิงก์เข้าสู่ระบบ</div>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              style={{ fontSize: 13, color: "var(--accent)", wordBreak: "break-all" }}
            >
              {url}
            </a>
          </div>
          <button
            type="button"
            className="btn btn-outline"
            style={{ fontSize: 13, padding: "7px 16px" }}
            onClick={() => window.print()}
          >
            🖨️ พิมพ์
          </button>
        </div>
      </div>
    </div>
  );
}
