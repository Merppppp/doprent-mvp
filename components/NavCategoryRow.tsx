"use client";

import Link from "next/link";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import type { Occasion } from "@/lib/types";
import { t, type Locale } from "@/lib/i18n";

type Props = {
  occasions: Occasion[];
  locale?: Locale;
};

function NavCategoryRowInner({ occasions, locale = "th" }: Props) {
  const params = useSearchParams();
  const active = params.get("occasion");

  return (
    <div
      style={{
        borderTop: "1px solid rgba(0,0,0,0.18)",
        background: "#163828",
        overflow: "hidden",
      }}
    >
      <div
        className="shell nav-cat-scroll"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          paddingTop: 8,
          paddingBottom: 8,
          overflowX: "auto",
        }}
      >
        {occasions.map((occ) => {
          const isActive = active === occ.key;
          const label =
            locale === "en"
              ? t(`occasion.${occ.key}`, "en")
              : occ.th;
          return (
            <Link
              key={occ.key}
              href={isActive ? "/" : `/?occasion=${occ.key}`}
              style={{
                flexShrink: 0,
                padding: "5px 16px",
                borderRadius: 999,
                fontSize: 13,
                fontWeight: isActive ? 600 : 400,
                color: isActive ? "#1B4332" : "rgba(255,255,255,0.82)",
                background: isActive ? "#fff" : "transparent",
                border: `1px solid ${isActive ? "#fff" : "rgba(255,255,255,0.18)"}`,
                textDecoration: "none",
                transition: "color .15s, background .15s, border-color .15s",
                whiteSpace: "nowrap",
                lineHeight: 1.4,
              }}
              className="nav-cat-item"
            >
              {label}
            </Link>
          );
        })}
      </div>
      <style dangerouslySetInnerHTML={{ __html: `
        .nav-cat-scroll::-webkit-scrollbar { display: none; }
        .nav-cat-scroll { scrollbar-width: none; -ms-overflow-style: none; }
        .nav-cat-item:hover { color: #fff !important; border-color: rgba(255,255,255,0.4) !important; }
      ` }} />
    </div>
  );
}

export default function NavCategoryRow({ occasions, locale = "th" }: Props) {
  return (
    <Suspense
      fallback={
        <div
          style={{
            borderTop: "1px solid rgba(0,0,0,0.18)",
            background: "#163828",
            height: 37,
          }}
        />
      }
    >
      <NavCategoryRowInner occasions={occasions} locale={locale} />
    </Suspense>
  );
}
