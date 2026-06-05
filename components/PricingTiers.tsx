"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Tier = {
  key: string;
  name: string;
  price: string;
  sub: string;
  bullets: string[];
  cta: string;
  href: string;
  paid: boolean;
  popular?: boolean;
};

const TIERS: Tier[] = [
  {
    key: "free",
    name: "Free",
    price: "ฟรี",
    sub: "ตลอดชีพ",
    bullets: [
      "ลงประกาศได้ไม่จำกัด",
      "ลูกค้าทักร้านผ่าน LINE โดยตรง",
      "DopRent ไม่หักเปอร์เซ็นต์",
      "KYC ผ่านการตรวจ (ไม่มี badge สาธารณะ)",
    ],
    cta: "เริ่มเปิดร้านฟรี",
    href: "/sell/signup",
    paid: false,
  },
  {
    key: "boost",
    name: "Boost",
    price: "฿990",
    sub: "/เดือน",
    bullets: [
      "ทุกอย่างใน Free",
      "Verified badge ✓ ข้างชื่อร้าน",
      "ชุด 3 ตัวขึ้นหน้าแรกหมุนเวียน",
      "Sponsored badge บน listing",
      "Dashboard sales analytics",
    ],
    cta: "เลือก package นี้",
    href: "/sell/upgrade?plan=boost",
    paid: true,
    popular: true,
  },
  {
    key: "featured",
    name: "Featured",
    price: "฿2,900",
    sub: "/เดือน",
    bullets: [
      "ทุกอย่างใน Boost",
      'ร้านขึ้น "Featured Boutique" บนหน้าแรก',
      "Priority KYC review (24 ชม.)",
      "Custom branded LINE message",
    ],
    cta: "เลือก package นี้",
    href: "/sell/upgrade?plan=featured",
    paid: true,
  },
];

export default function PricingTiers() {
  const router = useRouter();
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <div className="grid-3 pricing-tiers" style={{ gap: 20 }}>
      {TIERS.map((t) => {
        const isSel = selected === t.key;
        return (
          <div
            key={t.key}
            role="button"
            tabIndex={0}
            aria-pressed={isSel}
            onClick={() => setSelected(t.key)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                setSelected(t.key);
              }
            }}
            className={`tier-card${isSel ? " is-selected" : ""}`}
          >
            {t.popular ? <span className="tier-pop">ยอดนิยม</span> : null}

            <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>{t.name}</div>
            <div style={{ marginBottom: 18 }}>
              <span style={{ fontSize: 28, fontWeight: 700, letterSpacing: "-0.02em" }}>
                {t.price}
              </span>
              <span style={{ fontSize: 13, color: "var(--ink-3)", marginLeft: 4 }}>{t.sub}</span>
            </div>
            <ul
              style={{
                listStyle: "none",
                padding: 0,
                margin: "0 0 22px",
                color: "var(--ink-2)",
                fontSize: 13.5,
              }}
            >
              {t.bullets.map((b) => (
                <li key={b} style={{ padding: "6px 0", display: "flex", gap: 8, alignItems: "flex-start" }}>
                  <span style={{ color: "var(--accent)", flexShrink: 0 }}>✓</span>
                  <span style={{ lineHeight: 1.4 }}>{b}</span>
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setSelected(t.key);
                router.push(t.href);
              }}
              className={`btn ${isSel ? "btn-dark" : "btn-outline"}`}
              style={{ width: "100%", display: "block", textAlign: "center" }}
            >
              {t.cta}
            </button>
          </div>
        );
      })}
    </div>
  );
}
