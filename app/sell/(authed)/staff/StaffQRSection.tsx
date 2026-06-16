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

  // Print ONLY the QR label (not the whole admin page). We open a minimal
  // print-only document containing just the QR image + shop name + code.
  function printQR() {
    if (!qrDataUrl) return;
    const win = window.open("", "_blank", "width=420,height=560");
    if (!win) return;
    const esc = (s: string) =>
      s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] ?? c));
    win.document.write(`<!DOCTYPE html><html lang="th"><head><meta charset="utf-8" />
<title>QR เข้าสู่ระบบพนักงาน</title>
<style>
  @page { margin: 12mm; }
  * { box-sizing: border-box; }
  body { font-family: -apple-system, "Helvetica Neue", Arial, sans-serif; text-align: center; margin: 0; padding: 24px; }
  h1 { font-size: 18px; margin: 0 0 4px; }
  p { font-size: 13px; color: #555; margin: 0 0 16px; }
  img { width: 260px; height: 260px; display: block; margin: 0 auto 14px; }
  .code { font-size: 26px; font-weight: 700; letter-spacing: 0.18em; margin-top: 6px; }
  .label { font-size: 12px; color: #777; margin-top: 14px; }
</style></head><body>
  <h1>${esc(shopName)}</h1>
  <p>สแกนเพื่อเข้าสู่ระบบพนักงาน</p>
  <img src="${qrDataUrl}" alt="QR เข้าสู่ระบบพนักงาน" />
  <div class="label">รหัสร้าน</div>
  <div class="code">${esc(code)}</div>
</body></html>`);
    win.document.close();
    win.focus();
    // Give the image a tick to render before invoking the print dialog.
    setTimeout(() => {
      win.print();
      win.close();
    }, 250);
  }

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
            onClick={printQR}
          >
            🖨️ พิมพ์
          </button>
        </div>
      </div>
    </div>
  );
}
