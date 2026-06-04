// First-touch attribution helpers — shared by middleware (capture),
// /api/track (store), and createBooking (stamp on the booking).
//
// Pure TS only: no next/* or node imports, so this file is safe to import
// from both server (middleware, route handlers, server actions) and client
// (PageViewTracker, LineButton) bundles.

/** Cookie holding the visitor's FIRST-touch attribution (set once, never overwritten). */
export const FIRST_TOUCH_COOKIE = "dp_ft";
/** Cookie holding an anonymous session id (so we can count unique visitors pre-login). */
export const SESSION_COOKIE = "dp_sid";

/** 180 days — first-touch should survive across visits within an acquisition window. */
export const FIRST_TOUCH_MAX_AGE = 60 * 60 * 24 * 180;
/** 1 year for the rolling session id (it is not security-sensitive). */
export const SESSION_MAX_AGE = 60 * 60 * 24 * 365;

export type Attribution = {
  source: string | null; // raw utm_source (or derived host)
  medium: string | null; // raw utm_medium
  campaign: string | null; // raw utm_campaign
  referrer: string | null; // document.referrer / Referer header host
  channel: string; // normalized bucket (see classifyChannel)
};

export type Channel =
  | "instagram"
  | "facebook"
  | "tiktok"
  | "line"
  | "google"
  | "youtube"
  | "twitter"
  | "email"
  | "referral"
  | "direct"
  | "other";

const HOST_CHANNEL: Array<[RegExp, Channel]> = [
  [/(^|\.)instagram\.com$|(^|\.)ig\b|^l\.instagram/, "instagram"],
  [/(^|\.)facebook\.com$|(^|\.)fb\.(com|me)$|^lm\.facebook|^l\.facebook/, "facebook"],
  [/(^|\.)tiktok\.com$/, "tiktok"],
  [/(^|\.)line\.me$|(^|\.)liff\.line/, "line"],
  [/(^|\.)google\./, "google"],
  [/(^|\.)youtube\.com$|(^|\.)youtu\.be$/, "youtube"],
  [/(^|\.)t\.co$|(^|\.)twitter\.com$|(^|\.)x\.com$/, "twitter"],
];

const UTM_SOURCE_CHANNEL: Record<string, Channel> = {
  ig: "instagram",
  instagram: "instagram",
  fb: "facebook",
  facebook: "facebook",
  meta: "facebook",
  tiktok: "tiktok",
  tt: "tiktok",
  line: "line",
  google: "google",
  google_ads: "google",
  adwords: "google",
  youtube: "youtube",
  yt: "youtube",
  twitter: "twitter",
  x: "twitter",
  email: "email",
  newsletter: "email",
};

function hostOf(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    // referrer may already be a bare host
    const bare = url.trim().toLowerCase();
    return bare && !bare.includes(" ") ? bare.replace(/^https?:\/\//, "").split("/")[0] : null;
  }
}

/**
 * Resolve a normalized channel bucket. UTM wins over referrer (explicit
 * campaign tagging is more reliable than the referring host).
 */
export function classifyChannel(input: {
  utmSource?: string | null;
  utmMedium?: string | null;
  referrer?: string | null;
}): Channel {
  const src = input.utmSource?.trim().toLowerCase();
  if (src && UTM_SOURCE_CHANNEL[src]) return UTM_SOURCE_CHANNEL[src];

  const medium = input.utmMedium?.trim().toLowerCase();
  if (medium === "email") return "email";

  const host = hostOf(input.referrer);
  if (host) {
    for (const [re, ch] of HOST_CHANNEL) if (re.test(host)) return ch;
    return "referral"; // known referrer host we don't bucket explicitly
  }

  // utm_source present but unrecognized -> treat as tagged "other" (not direct)
  if (src) return "other";
  return "direct";
}

/** Build an Attribution from raw utm/referrer inputs (used at capture time). */
export function buildAttribution(input: {
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
  referrer?: string | null;
}): Attribution {
  return {
    source: input.utmSource?.trim() || hostOf(input.referrer) || null,
    medium: input.utmMedium?.trim() || null,
    campaign: input.utmCampaign?.trim() || null,
    referrer: input.referrer?.trim() || null,
    channel: classifyChannel(input),
  };
}

/** Serialize for cookie storage (compact). */
export function encodeAttribution(a: Attribution): string {
  return encodeURIComponent(JSON.stringify(a));
}

/** Parse a first-touch cookie value back to an Attribution (tolerant). */
export function decodeAttribution(raw: string | null | undefined): Attribution | null {
  if (!raw) return null;
  try {
    const obj = JSON.parse(decodeURIComponent(raw));
    if (obj && typeof obj === "object" && typeof obj.channel === "string") {
      return {
        source: obj.source ?? null,
        medium: obj.medium ?? null,
        campaign: obj.campaign ?? null,
        referrer: obj.referrer ?? null,
        channel: obj.channel,
      };
    }
  } catch {
    /* ignore malformed cookie */
  }
  return null;
}
