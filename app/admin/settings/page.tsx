import type { Metadata } from "next";
import { db } from "@/lib/db";
import { SETTING_KEYS } from "@/lib/site-settings";
import SiteSettingsForm from "./SiteSettingsForm";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "ตั้งค่าเว็บ — Admin" };

const FIELDS = [
  { key: SETTING_KEYS.LINE_URL, label: "LINE URL", placeholder: "https://line.me/R/ti/p/@doprent", hint: "ลิงก์ LINE OA ของเว็บ (ใช้ใน Header, Footer)" },
  { key: SETTING_KEYS.LINE_DISPLAY, label: "LINE แสดงผล", placeholder: "@doprent", hint: "ชื่อ LINE ที่แสดงใน Footer เช่น @doprent" },
  { key: SETTING_KEYS.CONTACT_EMAIL, label: "อีเมลติดต่อ", placeholder: "hello@doprent.com", hint: "อีเมลที่แสดงใน Footer" },
];

export default async function SettingsPage() {
  const rows = await db.siteSetting.findMany();
  const current: Record<string, string> = {};
  for (const r of rows) current[r.key] = r.value;

  return (
    <div style={{ padding: "28px 24px", maxWidth: 600 }}>
      <h1 style={{ fontSize: 22, fontWeight: 600, marginBottom: 8 }}>ตั้งค่าเว็บ</h1>
      <p style={{ fontSize: 14, color: "var(--ink-2)", marginBottom: 24 }}>
        ตั้งค่า LINE และช่องทางติดต่อที่แสดงบนเว็บ
      </p>
      <SiteSettingsForm fields={FIELDS} current={current} />
    </div>
  );
}
