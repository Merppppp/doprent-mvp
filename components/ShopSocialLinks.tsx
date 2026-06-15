import type { CSSProperties } from "react";

type Props = {
  instagram?: string | null;
  facebook?: string | null;
  twitter?: string | null;
  tiktok?: string | null;
  /** Optional LINE deep-link (already normalized). Pass to surface a LINE icon. */
  lineUrl?: string | null;
  /** Icon button size in px (default 36). */
  size?: number;
};

/** Strip a leading "@" and any surrounding whitespace from a handle. */
function handle(raw: string): string {
  return raw.trim().replace(/^@+/, "");
}

/** True if the value already looks like a full/absolute URL or bare domain. */
function isUrlLike(raw: string): boolean {
  return /^https?:\/\//i.test(raw) || /\b[a-z0-9-]+\.[a-z]{2,}\b/i.test(raw);
}

/** Ensure a URL-like string has an https:// scheme. */
function withScheme(raw: string): string {
  return /^https?:\/\//i.test(raw) ? raw : `https://${raw.trim()}`;
}

/**
 * Resolve a stored social value (handle or URL) into a clickable absolute URL.
 * `base` is the canonical profile prefix used when the value is a bare handle.
 */
function resolve(raw: string, base: string): string {
  const v = raw.trim();
  if (!v) return "";
  if (isUrlLike(v)) return withScheme(v);
  return `${base}${handle(v)}`;
}

export default function ShopSocialLinks({
  instagram,
  facebook,
  twitter,
  tiktok,
  lineUrl,
  size = 36,
}: Props) {
  const items: Array<{ key: string; label: string; href: string; icon: JSX.Element }> = [];

  if (lineUrl?.trim()) {
    items.push({ key: "line", label: "LINE", href: withScheme(lineUrl), icon: <LineIcon /> });
  }
  if (instagram?.trim()) {
    items.push({ key: "ig", label: "Instagram", href: resolve(instagram, "https://instagram.com/"), icon: <IgIcon /> });
  }
  if (facebook?.trim()) {
    items.push({ key: "fb", label: "Facebook", href: resolve(facebook, "https://facebook.com/"), icon: <FbIcon /> });
  }
  if (twitter?.trim()) {
    items.push({ key: "x", label: "X", href: resolve(twitter, "https://x.com/"), icon: <XIcon /> });
  }
  if (tiktok?.trim()) {
    items.push({ key: "tt", label: "TikTok", href: resolve(tiktok, "https://tiktok.com/@"), icon: <TiktokIcon /> });
  }

  if (items.length === 0) return null;

  const btn: CSSProperties = {
    width: size,
    height: size,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    border: "1px solid var(--line)",
    borderRadius: 8,
    background: "var(--surface)",
    color: "var(--ink-2)",
  };

  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      {items.map((it) => (
        <a
          key={it.key}
          href={it.href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={it.label}
          title={it.label}
          style={btn}
        >
          {it.icon}
        </a>
      ))}
    </div>
  );
}

/* — Monochrome brand glyphs (currentColor, 18px viewBox 24) — */

function IgIcon() {
  return (
    <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function FbIcon() {
  return (
    <svg width={18} height={18} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M13.5 21v-7h2.4l.4-2.8h-2.8V9.4c0-.8.25-1.4 1.45-1.4H17V5.5c-.3 0-1.3-.12-2.45-.12-2.42 0-4.05 1.48-4.05 4.2v2.62H8v2.8h2.5V21h3z" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M18.244 2H21.5l-7.5 8.57L22.5 22h-6.9l-4.6-6.01L5.7 22H2.44l8.02-9.17L1.5 2h7.07l4.16 5.5L18.244 2zm-1.21 18h1.8L7.04 3.9H5.1l11.934 16.1z" />
    </svg>
  );
}

function TiktokIcon() {
  return (
    <svg width={17} height={17} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M16.5 3c.3 2 1.5 3.6 3.5 3.9V9.5c-1.4 0-2.7-.45-3.8-1.2v6.2c0 3.2-2.6 5.5-5.6 5.5S5 17.7 5 14.5c0-3 2.3-5.4 5.5-5.4.3 0 .6 0 .9.07v2.8c-.3-.1-.6-.15-.9-.15-1.5 0-2.7 1.2-2.7 2.7s1.2 2.7 2.7 2.7 2.8-1.2 2.8-2.9V3h3.2z" />
    </svg>
  );
}

function LineIcon() {
  return (
    <svg width={18} height={18} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 3C6.9 3 2.75 6.36 2.75 10.5c0 3.7 3.3 6.8 7.77 7.4.3.06.71.2.81.46.09.24.06.6.03.85l-.13.79c-.04.24-.19.93.82.5 1-.42 5.4-3.18 7.37-5.45 1.36-1.49 2.01-3 2.01-4.95C21.43 6.36 17.27 3 12 3zM8.2 12.9H6.4c-.27 0-.48-.22-.48-.48V9.06c0-.27.21-.48.48-.48s.48.21.48.48v2.88h1.32c.27 0 .48.21.48.48s-.21.48-.48.48zm2.06-.48c0 .26-.21.48-.48.48s-.48-.22-.48-.48V9.06c0-.27.21-.48.48-.48s.48.21.48.48v3.36zm4.2 0c0 .2-.13.39-.33.45a.5.5 0 0 1-.15.03c-.15 0-.29-.07-.38-.19l-1.72-2.34v2.05c0 .26-.22.48-.48.48s-.48-.22-.48-.48V9.06c0-.2.13-.39.33-.45.05-.02.1-.03.15-.03.15 0 .29.08.38.2l1.72 2.34V9.06c0-.27.22-.48.48-.48s.48.21.48.48v3.36zm3.16-2.16c.27 0 .48.21.48.48s-.21.48-.48.48h-1.32v.72h1.32c.27 0 .48.21.48.48s-.21.48-.48.48h-1.8c-.26 0-.48-.22-.48-.48V9.06c0-.27.22-.48.48-.48h1.8c.27 0 .48.21.48.48s-.21.48-.48.48h-1.32v.72h1.32z" />
    </svg>
  );
}
