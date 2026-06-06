"use client";

import Script from "next/script";

/**
 * Microsoft Clarity — free, unlimited session replay + click/scroll heatmaps.
 * Answers "what did the user actually click / where did they get stuck".
 *
 * Loads ONLY when:
 *   - NEXT_PUBLIC_CLARITY_ID is set, AND
 *   - we are in a production build (never tracks dev/preview sessions).
 *
 * PDPA note: Clarity masks all text + input content by default (only layout
 * and interactions are recorded). Keep the project id in env, not in code.
 */
const CLARITY_ID = process.env.NEXT_PUBLIC_CLARITY_ID;

export default function ClarityAnalytics() {
  if (!CLARITY_ID || process.env.NODE_ENV !== "production") return null;

  return (
    <Script id="ms-clarity" strategy="afterInteractive">
      {`(function(c,l,a,r,i,t,y){
        c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
        t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
        y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
      })(window,document,"clarity","script","${CLARITY_ID}");`}
    </Script>
  );
}
