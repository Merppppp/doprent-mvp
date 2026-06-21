import type { Metadata } from "next";
import { base } from "@/lib/db";
import { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Email Monitor — Admin" };

type Period = "day" | "week" | "month";

const PERIOD_LABEL: Record<Period, string> = { day: "วันนี้", week: "สัปดาห์นี้", month: "เดือนนี้" };

function startOf(period: Period): Date {
  const now = new Date();
  const bkk = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Bangkok" }));
  if (period === "day") {
    bkk.setHours(0, 0, 0, 0);
  } else if (period === "week") {
    const dayOfWeek = bkk.getDay();
    bkk.setDate(bkk.getDate() - dayOfWeek);
    bkk.setHours(0, 0, 0, 0);
  } else {
    bkk.setDate(1);
    bkk.setHours(0, 0, 0, 0);
  }
  return bkk;
}

async function getStats(period: Period) {
  const since = startOf(period);
  const rows = await base.$queryRaw<{ category: string; success: boolean; count: bigint }[]>(
    Prisma.sql`
      SELECT category, success, COUNT(*)::bigint AS count
      FROM email_logs
      WHERE created_at >= ${since}
      GROUP BY category, success
      ORDER BY category
    `,
  );

  let total = 0;
  let failed = 0;
  const byCategory: Record<string, { sent: number; failed: number }> = {};

  for (const r of rows) {
    const n = Number(r.count);
    const cat = r.category;
    if (!byCategory[cat]) byCategory[cat] = { sent: 0, failed: 0 };
    if (r.success) {
      byCategory[cat].sent += n;
      total += n;
    } else {
      byCategory[cat].failed += n;
      failed += n;
    }
  }

  return { total, failed, byCategory };
}

async function getRecentEmails() {
  return base.emailLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
  });
}

const CATEGORY_LABEL: Record<string, string> = {
  notification: "แจ้งเตือนการจอง",
  "password-reset": "ลืมรหัสผ่าน",
  verification: "ยืนยันอีเมล",
  other: "อื่นๆ",
};

export default async function EmailMonitorPage() {
  const [day, week, month, recent] = await Promise.all([
    getStats("day"),
    getStats("week"),
    getStats("month"),
    getRecentEmails(),
  ]);

  const periods = [
    { key: "day" as Period, stats: day },
    { key: "week" as Period, stats: week },
    { key: "month" as Period, stats: month },
  ];

  return (
    <div style={{ padding: "28px 24px", maxWidth: 900 }}>
      <h1 style={{ fontSize: 22, fontWeight: 600, marginBottom: 24 }}>Email Monitor</h1>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16, marginBottom: 32 }}>
        {periods.map((p) => (
          <div key={p.key} style={cardStyle}>
            <div style={{ fontSize: 13, color: "var(--ink-3)", marginBottom: 8 }}>{PERIOD_LABEL[p.key]}</div>
            <div style={{ fontSize: 32, fontWeight: 700, lineHeight: 1 }}>{p.stats.total}</div>
            <div style={{ fontSize: 13, color: "var(--ink-3)", marginTop: 4 }}>
              ส่งสำเร็จ {p.stats.total - p.stats.failed} · ล้มเหลว {p.stats.failed}
            </div>
          </div>
        ))}
      </div>

      <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>แยกตามประเภท</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16, marginBottom: 32 }}>
        {periods.map((p) => (
          <div key={p.key} style={cardStyle}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>{PERIOD_LABEL[p.key]}</div>
            {Object.keys(p.stats.byCategory).length === 0 ? (
              <div style={{ fontSize: 13, color: "var(--ink-3)" }}>ยังไม่มีข้อมูล</div>
            ) : (
              Object.entries(p.stats.byCategory).map(([cat, v]) => (
                <div key={cat} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "3px 0" }}>
                  <span style={{ color: "var(--ink-2)" }}>{CATEGORY_LABEL[cat] ?? cat}</span>
                  <span style={{ fontWeight: 600 }}>
                    {v.sent}
                    {v.failed > 0 && <span style={{ color: "var(--danger, #dc2626)", marginLeft: 4 }}>({v.failed} fail)</span>}
                  </span>
                </div>
              ))
            )}
          </div>
        ))}
      </div>

      <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>ส่งล่าสุด (50 รายการ)</h2>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: "2px solid var(--line)", textAlign: "left" }}>
              <th style={thStyle}>เวลา</th>
              <th style={thStyle}>ผู้รับ</th>
              <th style={thStyle}>หัวข้อ</th>
              <th style={thStyle}>ประเภท</th>
              <th style={thStyle}>สถานะ</th>
            </tr>
          </thead>
          <tbody>
            {recent.map((e) => (
              <tr key={e.id} style={{ borderBottom: "1px solid var(--line)" }}>
                <td style={tdStyle}>{fmtTime(e.createdAt)}</td>
                <td style={tdStyle}>{maskEmail(e.to)}</td>
                <td style={{ ...tdStyle, maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.subject}</td>
                <td style={tdStyle}>{CATEGORY_LABEL[e.category] ?? e.category}</td>
                <td style={tdStyle}>
                  {e.success ? (
                    <span style={{ color: "var(--success, #16a34a)" }}>OK</span>
                  ) : (
                    <span style={{ color: "var(--danger, #dc2626)" }} title={e.error ?? ""}>FAIL</span>
                  )}
                </td>
              </tr>
            ))}
            {recent.length === 0 && (
              <tr>
                <td colSpan={5} style={{ ...tdStyle, textAlign: "center", color: "var(--ink-3)" }}>ยังไม่มีข้อมูล</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function fmtTime(d: Date): string {
  return d.toLocaleString("th-TH", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Bangkok",
  });
}

function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!domain) return email;
  const visible = local.slice(0, 3);
  return `${visible}***@${domain}`;
}

const cardStyle: React.CSSProperties = {
  padding: 16,
  border: "1px solid var(--line)",
  borderRadius: 12,
  background: "var(--surface)",
};

const thStyle: React.CSSProperties = { padding: "8px 10px", fontWeight: 600, whiteSpace: "nowrap" };
const tdStyle: React.CSSProperties = { padding: "8px 10px" };
