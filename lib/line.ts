/**
 * Normalize LINE contact strings into a clickable URL.
 *
 * Accepts (all → return clickable URL):
 *   • Full URL: "https://line.me/R/ti/p/@yourshop" → as-is
 *   • Full URL personal: "https://line.me/ti/p/~yourid" → as-is
 *   • LINE invite link: "https://lin.ee/abc123" → as-is
 *   • Official @handle: "@yourshop" → "https://line.me/R/ti/p/@yourshop"
 *   • Plain handle: "yourshop" → "https://line.me/R/ti/p/@yourshop"
 *   • line:// scheme: "line://ti/p/yourshop" → as-is
 *
 * Returns empty string for empty input.
 */
export function normalizeLineUrl(input: string): string {
  const s = input.trim();
  if (!s) return "";

  // Full URLs — accept as-is
  if (/^https?:\/\//i.test(s)) return s;
  if (/^line:\/\//i.test(s)) return s;

  // Bare line.me/... → add https://
  if (/^line\.me\//i.test(s) || /^lin\.ee\//i.test(s)) {
    return `https://${s}`;
  }

  // @handle → LINE Official deep-link
  if (s.startsWith("@")) {
    return `https://line.me/R/ti/p/${s}`;
  }

  // Plain handle (alphanumeric + . _ -) → assume LINE Official
  if (/^[A-Za-z0-9._-]+$/.test(s)) {
    return `https://line.me/R/ti/p/@${s}`;
  }

  // Fallback: return raw input (won't be a valid link but won't break either)
  return s;
}

/** Quick validity check — true if it looks like something we can normalize. */
export function isValidLineContact(input: string): boolean {
  const s = input.trim();
  if (!s) return false;
  // Full URL
  if (/^https?:\/\/(line\.me|lin\.ee)\//i.test(s)) return true;
  // line:// deep link
  if (/^line:\/\//i.test(s)) return true;
  // bare line.me / lin.ee
  if (/^(line\.me|lin\.ee)\//i.test(s)) return true;
  // @handle or plain handle
  if (/^@?[A-Za-z0-9._-]{2,}$/.test(s)) return true;
  return false;
}
