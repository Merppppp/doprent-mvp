import Link from "next/link";
import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://doprent.com";

export const metadata: Metadata = {
  title: "เปิดร้านบน DopRent",
  description:
    "ร้านเช่าชุดในกรุงเทพฯ ลงประกาศฟรี · ลูกค้าทักร้านผ่าน LINE ตรง · DopRent ไม่หักเปอร์เซ็นต์",
  alternates: { canonical: `${SITE}/sell` },
};

const TIERS = [
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
    accent: false,
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
    cta: "อัปเกรดทีหลัง",
    href: "/sell/signup",
    accent: false,
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
    cta: "อัปเกรดทีหลัง",
    href: "/sell/signup",
    accent: true,
  },
];

export default async function SellLanding() {
  const user = await getCurrentUser().catch(() => null);

  // If already a seller with a boutique, send them to their dashboard
  let existingBoutique: { slug: string } | null = null;
  if (user) {
    existingBoutique = await db.boutique.findFirst({
      where: { ownerId: user.id },
      select: { slug: true },
    });
  }

  return (
    <div className="shell" style={{ paddingTop: 60, paddingBottom: 80 }}>
      {/* Hero */}
      <div style={{ textAlign: "center", maxWidth: 680, margin: "0 auto 56px" }}>
        <h1
          className="page-title"
          style={{ fontSize: 40, fontWeight: 600, letterSpacing: "-0.02em", marginBottom: 16 }}
        >
          เปิดร้านเช่าชุดบน DopRent
        </h1>
        <p
          style={{
            fontSize: 17,
            color: "var(--ink-2)",
            lineHeight: 1.6,
            marginBottom: 28,
          }}
        >
          ลงประกาศฟรี · ไม่มีค่าธรรมเนียม · ลูกค้าทักร้านผ่าน LINE ตรงๆ คุณคุมเงิน คุมการส่ง คุมลูกค้าเอง
        </p>
        {existingBoutique ? (
          <Link href="/sell/dashboard" className="btn btn-dark" style={{ padding: "12px 22px" }}>
            เข้า Dashboard ร้านของคุณ →
          </Link>
        ) : (
          <Link
            href="/sell/signup"
            className="btn btn-dark"
            style={{ padding: "12px 22px" }}
          >
            เปิดร้านได้เลย
          </Link>
        )}
      </div>

      {/* Why DopRent */}
      <div style={{ maxWidth: 880, margin: "0 auto 64px" }}>
        <h2
          style={{
            textAlign: "center",
            fontSize: 24,
            fontWeight: 600,
            marginBottom: 32,
            letterSpacing: "-0.01em",
          }}
        >
          ทำไมร้านเช่าชุดเลือก DopRent
        </h2>
        <div className="grid-3" style={{ gap: 20 }}>
          <Feature icon="💸" title="ไม่เก็บเปอร์เซ็นต์" body="ราคา ค่ามัดจำ ค่าส่ง ลูกค้าคุยกับร้านโดยตรง DopRent ไม่หักเงิน" />
          <Feature icon="💚" title="LINE ตรงๆ" body="ลูกค้ากดปุ่ม LINE ทักร้านทันที ไม่มีระบบ chat กลาง ไม่มี middleman" />
          <Feature icon="🎯" title="ลูกค้าตรงกลุ่ม" body="ผู้ใช้ DopRent คือผู้หญิงกรุงเทพฯ 25-35 ที่กำลังหาชุดเฉพาะกิจ" />
        </div>
      </div>

      {/* Pricing */}
      <div style={{ maxWidth: 1080, margin: "0 auto" }}>
        <h2
          style={{
            textAlign: "center",
            fontSize: 24,
            fontWeight: 600,
            marginBottom: 8,
            letterSpacing: "-0.01em",
          }}
        >
          แพ็กเกจ
        </h2>
        <p style={{ textAlign: "center", color: "var(--ink-3)", marginBottom: 32, fontSize: 14 }}>
          เริ่มฟรีก่อนได้เลย อัปเกรดทีหลังเมื่อพร้อม
        </p>
        <div className="grid-3" style={{ gap: 20 }}>
          {TIERS.map((t) => (
            <div
              key={t.key}
              style={{
                border: `${t.accent ? 2 : 1}px solid ${t.accent ? "var(--ink)" : "var(--line)"}`,
                background: "var(--surface)",
                borderRadius: 8,
                padding: 24,
                position: "relative",
              }}
            >
              {t.accent ? (
                <span
                  style={{
                    position: "absolute",
                    top: -10,
                    right: 16,
                    background: "var(--ink)",
                    color: "var(--on-dark)",
                    fontSize: 10,
                    fontWeight: 600,
                    padding: "3px 8px",
                    borderRadius: 3,
                    letterSpacing: "0.05em",
                    textTransform: "uppercase",
                  }}
                >
                  Popular
                </span>
              ) : null}
              <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>{t.name}</div>
              <div style={{ marginBottom: 18 }}>
                <span style={{ fontSize: 28, fontWeight: 700, letterSpacing: "-0.02em" }}>
                  {t.price}
                </span>
                <span style={{ fontSize: 13, color: "var(--ink-3)", marginLeft: 4 }}>{t.sub}</span>
              </div>
              <ul style={{ listStyle: "none", padding: 0, margin: "0 0 22px", color: "var(--ink-2)", fontSize: 13.5 }}>
                {t.bullets.map((b) => (
                  <li key={b} style={{ padding: "6px 0", display: "flex", gap: 8, alignItems: "flex-start" }}>
                    <span style={{ color: "var(--ink)", flexShrink: 0 }}>✓</span>
                    <span style={{ lineHeight: 1.4 }}>{b}</span>
                  </li>
                ))}
              </ul>
              <Link
                href={t.href}
                className={t.accent ? "btn btn-dark" : "btn btn-outline"}
                style={{ width: "100%", display: "block", textAlign: "center" }}
              >
                {t.cta}
              </Link>
            </div>
          ))}
        </div>
      </div>

      {/* FAQ */}
      <div style={{ maxWidth: 720, margin: "64px auto 0" }}>
        <h2
          style={{
            textAlign: "center",
            fontSize: 24,
            fontWeight: 600,
            marginBottom: 24,
            letterSpacing: "-0.01em",
          }}
        >
          คำถามที่พบบ่อย
        </h2>
        <Faq q="DopRent หักค่าธรรมเนียมจากการเช่ามั้ย?" a="ไม่หัก ลูกค้าโอนตรงให้ร้าน DopRent ไม่เก็บเงิน เราคิดค่าบริการเฉพาะแพ็กเกจ Boost/Featured เป็นรายเดือน" />
        <Faq q="ต้องมีหน้าร้านมั้ย?" a="ไม่จำเป็น Home studio / Online-only ใช้บริการเราได้เลย แต่ต้องระบุย่านบริการ เช่น ทองหล่อ / สยาม" />
        <Faq q="ลูกค้าจ่ายเงินยังไง?" a="ตกลงกับลูกค้าใน LINE โอนผ่าน PromptPay หรือธนาคาร ค่ามัดจำคุณกำหนดเอง" />
        <Faq q="KYC คืออะไร?" a="ขั้นตอนยืนยันตัวตน ส่งบัตรประชาชน/หนังสือรับรองบริษัท + เลขบัญชีธนาคาร ใช้เวลา 24-72 ชม. ทุกร้านต้องทำเพื่อให้ admin อนุมัติร้านขึ้นออนไลน์ — แต่ ✓ verified badge จะแสดงเฉพาะร้านที่อยู่แพ็กเกจ Boost หรือ Featured" />
        <Faq q="ถ้าอยากเลิกขาย?" a="แจ้งทีม DopRent ผ่าน LINE ทางการ ปิดร้านได้ทันที ไม่มีค่าธรรมเนียม" />
      </div>
    </div>
  );
}

function Feature({ icon, title, body }: { icon: string; title: string; body: string }) {
  return (
    <div style={{ padding: 20, border: "1px solid var(--line)", borderRadius: 8, background: "var(--surface)" }}>
      <div style={{ fontSize: 28, marginBottom: 10 }}>{icon}</div>
      <div style={{ fontWeight: 600, marginBottom: 6 }}>{title}</div>
      <div style={{ fontSize: 13.5, color: "var(--ink-2)", lineHeight: 1.55 }}>{body}</div>
    </div>
  );
}

function Faq({ q, a }: { q: string; a: string }) {
  return (
    <details
      style={{
        borderTop: "1px solid var(--line)",
        padding: "16px 0",
      }}
    >
      <summary
        style={{
          fontSize: 15,
          fontWeight: 500,
          cursor: "pointer",
          listStyle: "none",
          display: "flex",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <span>{q}</span>
        <span style={{ color: "var(--ink-3)", fontSize: 12 }}>＋</span>
      </summary>
      <div style={{ marginTop: 10, color: "var(--ink-2)", lineHeight: 1.6, fontSize: 14 }}>{a}</div>
    </details>
  );
}
