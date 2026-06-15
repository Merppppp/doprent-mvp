"use client";

import { useState } from "react";

type Props = {
  /** Absolute URL to share. */
  url: string;
  /** Title used for the native share sheet. */
  title: string;
};

/**
 * Share control for the product detail page.
 *
 * Mobile: uses the native share sheet (navigator.share) which surfaces LINE,
 * Messenger, etc. — the natural Thai sharing path.
 * Desktop (no Web Share API): opens a small menu with LINE / Facebook / X and
 * a copy-link action.
 */
export default function ShareButton({ url, title }: Props) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  async function onClick() {
    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      try {
        await navigator.share({ title, url });
        return;
      } catch {
        // user cancelled or share failed → fall back to the menu
      }
    }
    setOpen((o) => !o);
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // clipboard blocked — leave menu open so user can copy manually
    }
  }

  const enc = encodeURIComponent(url);
  const encText = encodeURIComponent(title);
  const lineHref = `https://social-plugins.line.me/lineit/share?url=${enc}`;
  const fbHref = `https://www.facebook.com/sharer/sharer.php?u=${enc}`;
  const xHref = `https://twitter.com/intent/tweet?url=${enc}&text=${encText}`;

  return (
    <div style={{ position: "relative" }}>
      <button
        type="button"
        onClick={onClick}
        aria-label="แชร์ชุดนี้"
        aria-haspopup="menu"
        aria-expanded={open}
        style={{
          width: 48,
          height: 48,
          padding: 0,
          border: "1px solid var(--line)",
          background: "var(--surface)",
          borderRadius: 8,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--ink-2)",
          cursor: "pointer",
          transition: "color var(--dur-1) var(--ease), border-color var(--dur-1) var(--ease)",
        }}
      >
        <ShareIcon size={18} />
      </button>

      {open ? (
        <>
          {/* click-away backdrop */}
          <div
            onClick={() => setOpen(false)}
            style={{ position: "fixed", inset: 0, zIndex: 40 }}
          />
          <div
            role="menu"
            style={{
              position: "absolute",
              top: 56,
              right: 0,
              zIndex: 50,
              minWidth: 180,
              background: "var(--surface)",
              border: "1px solid var(--line)",
              borderRadius: 10,
              boxShadow: "0 10px 30px rgba(0,0,0,0.12)",
              padding: 6,
              display: "flex",
              flexDirection: "column",
              gap: 2,
            }}
          >
            <ShareMenuLink href={lineHref} label="LINE" onClick={() => setOpen(false)} />
            <ShareMenuLink href={fbHref} label="Facebook" onClick={() => setOpen(false)} />
            <ShareMenuLink href={xHref} label="X (Twitter)" onClick={() => setOpen(false)} />
            <button
              type="button"
              role="menuitem"
              onClick={copyLink}
              style={{
                textAlign: "left",
                padding: "9px 12px",
                border: "none",
                background: "transparent",
                borderRadius: 7,
                fontSize: 14,
                color: copied ? "var(--accent-2)" : "var(--ink)",
                cursor: "pointer",
              }}
            >
              {copied ? "คัดลอกลิงก์แล้ว ✓" : "คัดลอกลิงก์"}
            </button>
          </div>
        </>
      ) : null}
    </div>
  );
}

function ShareMenuLink({
  href,
  label,
  onClick,
}: {
  href: string;
  label: string;
  onClick: () => void;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      role="menuitem"
      onClick={onClick}
      style={{
        display: "block",
        padding: "9px 12px",
        borderRadius: 7,
        fontSize: 14,
        color: "var(--ink)",
        textDecoration: "none",
      }}
    >
      {label}
    </a>
  );
}

function ShareIcon({ size = 18 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <line x1="8.6" y1="13.5" x2="15.4" y2="17.5" />
      <line x1="15.4" y1="6.5" x2="8.6" y2="10.5" />
    </svg>
  );
}
