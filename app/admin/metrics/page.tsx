import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/* ------------------------------- types ------------------------------- */

type TrafficRow = { day: string; channel: string; views: number; sessions: number; users: number };
type ProvinceRow = { province: string; views: number; sessions: number };
type ChannelSignupRow = { channel: string; signups: number };
type MauRow = { month: string; mau: number };
type DailyBookingRow = {
  day: string;
  bookings: number;
  confirmed: number;
  gmv: number;
  gmv_confirmed: number;
  commission_revenue: number;
};
type OccasionRow = { occasion: string; bookings: number; confirmed: number; commission_revenue: number };
type Funnel = { total: number; confirmed: number; lost: number; in_progress: number; confirm_rate_pct: number | null };
type SubRevenueRow = { plan: string; active_subs: number; mrr: number };
type SubAdoption = { total_boutiques: number; paid_boutiques: number; adoption_rate_pct: number | null };

type Overview = {
  range_days: number;
  traffic: TrafficRow[];
  traffic_by_province: ProvinceRow[];
  channel_signups: ChannelSignupRow[];
  mau: MauRow[];
  total_users: number;
  new_users: number;
  active_users: number;
  daily_bookings: DailyBookingRow[];
  by_occasion: OccasionRow[];
  funnel: Funnel | null;
  subscription_revenue: SubRevenueRow[];
  subscription_adoption: SubAdoption | null;
};

/* ------------------------------ helpers ------------------------------ */

const CHANNEL_TH: Record<string, string> = {
  instagram: "Instagram",
  facebook: "Facebook",
  tiktok: "TikTok",
  line: "LINE",
  google: "Google",
  youtube: "YouTube",
  twitter: "X / Twitter",
  email: "อีเมล",
  referral: "เว็บอื่นแนะนำ",
  direct: "เข้าตรง",
  other: "อื่นๆ",
};

const OCCASION_TH: Record<string, string> = {
  engagement: "หมั้น",
  wedding: "แต่งงาน",
  cocktail: "ค็อกเทล",
  evening: "ราตรี",
  gala: "กาล่า",
  party: "ปาร์ตี้",
  work: "ทำงาน",
  casual: "ลำลอง",
};

const baht = (n: number) => `฿${(n ?? 0).toLocaleString("th-TH")}`;
const num = (n: number) => (n ?? 0).toLocaleString("th-TH");

function sum<T>(rows: T[], pick: (r: T) => number) {
  return rows.reduce((a, r) => a + (pick(r) || 0), 0);
}

/* ------------------------------- page -------------------------------- */

export default async function AdminMetricsPage() {
  const sb = createClient();
  const { data, error } = await sb.rpc("admin_metrics_overview", { days: 30 });
  const m = (data as Overview | null) ?? null;

  if (error || !m) {
    return (
      <div>
        <H1>Business Metrics</H1>
        <Notice>
          ยังดึงข้อมูลไม่ได้ — ตรวจว่าได้รัน migration{" "}
          <code>2026-06-04_business_analytics.sql</code> ใน Supabase SQL Editor แล้ว
          {error ? (
            <div style={{ marginTop: 8, fontSize: 12, color: "var(--ink-3)" }}>{error.message}</div>
          ) : null}
        </Notice>
      </div>
    );
  }

  const totalViews = sum(m.traffic, (r) => r.views);
  const totalSessions = sum(m.traffic, (r) => r.sessions);
  const totalBookings = sum(m.daily_bookings, (r) => r.bookings);
  const totalConfirmed = sum(m.daily_bookings, (r) => r.confirmed);
  const commissionRev = sum(m.daily_bookings, (r) => r.commission_revenue);
  const gmvConfirmed = sum(m.daily_bookings, (r) => r.gmv_confirmed);
  const mrr = sum(m.subscription_revenue, (r) => r.mrr);

  // Traffic by channel (aggregate the daily rows).
  const byChannel = new Map<string, { views: number; sessions: number }>();
  for (const r of m.traffic) {
    const cur = byChannel.get(r.channel) ?? { views: 0, sessions: 0 };
    cur.views += r.views;
    cur.sessions += r.sessions;
    byChannel.set(r.channel, cur);
  }
  const channelRows = [...byChannel.entries()].sort((a, b) => b[1].views - a[1].views);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
      <div>
        <H1>Business Metrics</H1>
        <p style={{ color: "var(--ink-2)", fontSize: 13, marginTop: 4 }}>
          ช่วง {m.range_days} วันล่าสุด · สำหรับรายงานผู้บริหาร / นักลงทุน
        </p>
      </div>

      {/* KPI cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
          gap: 12,
        }}
      >
        <Kpi label="ผู้เข้าชม (sessions)" value={num(totalSessions)} sub={`${num(totalViews)} pageviews`} />
        <Kpi label="ผู้ใช้ทั้งหมด" value={num(m.total_users)} sub={`+${num(m.new_users)} สมัครใหม่`} />
        <Kpi label="Active users" value={num(m.active_users)} sub={`${m.range_days} วัน`} />
        <Kpi label="การจอง" value={num(totalBookings)} sub={`ยืนยัน ${num(totalConfirmed)}`} />
        <Kpi
          label="Conversion จอง→ยืนยัน"
          value={m.funnel?.confirm_rate_pct != null ? `${m.funnel.confirm_rate_pct}%` : "—"}
          sub={`จากทั้งหมด ${num(m.funnel?.total ?? 0)}`}
        />
        <Kpi label="Commission (ยืนยันแล้ว)" value={baht(commissionRev)} sub={`GMV ${baht(gmvConfirmed)}`} accent />
        <Kpi label="MRR (subscription)" value={baht(mrr)} sub="รายเดือน" accent />
        <Kpi
          label="Subscription adoption"
          value={m.subscription_adoption?.adoption_rate_pct != null ? `${m.subscription_adoption.adoption_rate_pct}%` : "—"}
          sub={`${num(m.subscription_adoption?.paid_boutiques ?? 0)}/${num(
            m.subscription_adoption?.total_boutiques ?? 0,
          )} ร้าน`}
        />
      </div>

      {/* Traffic source / channel */}
      <Section title="แหล่งที่มาผู้เข้าชม (channel)">
        {channelRows.length ? (
          <Table
            head={["ช่องทาง", "Sessions", "Pageviews", "สมัคร"]}
            rows={channelRows.map(([ch, v]) => [
              CHANNEL_TH[ch] ?? ch,
              num(v.sessions),
              num(v.views),
              num(m.channel_signups.find((c) => c.channel === ch)?.signups ?? 0),
            ])}
          />
        ) : (
          <Empty>ยังไม่มีข้อมูล traffic — เริ่มเก็บเมื่อมีผู้เข้าชมหลัง deploy</Empty>
        )}
      </Section>

      {/* Geography */}
      <Section title="พื้นที่ผู้เข้าชม (โดยประมาณ)">
        {m.traffic_by_province.length ? (
          <Table
            head={["พื้นที่", "Sessions", "Pageviews"]}
            rows={m.traffic_by_province
              .slice(0, 12)
              .map((r) => [r.province, num(r.sessions), num(r.views)])}
          />
        ) : (
          <Empty>ต้องเปิด edge geo headers (Vercel) จึงจะเห็นพื้นที่</Empty>
        )}
      </Section>

      {/* Bookings by category */}
      <Section title="การจองตามประเภทชุด (occasion)">
        {m.by_occasion.length ? (
          <Table
            head={["ประเภท", "จอง", "ยืนยัน", "Commission"]}
            rows={m.by_occasion.map((r) => [
              OCCASION_TH[r.occasion] ?? r.occasion,
              num(r.bookings),
              num(r.confirmed),
              baht(r.commission_revenue),
            ])}
          />
        ) : (
          <Empty>ยังไม่มีการจอง</Empty>
        )}
      </Section>

      {/* Subscription revenue */}
      <Section title="Subscription → Revenue">
        {m.subscription_revenue.length ? (
          <Table
            head={["แพ็กเกจ", "Active subs", "MRR"]}
            rows={m.subscription_revenue.map((r) => [r.plan, num(r.active_subs), baht(r.mrr)])}
          />
        ) : (
          <Empty>ยังไม่มี subscription (ตาราง seller_subscriptions ว่าง)</Empty>
        )}
      </Section>

      {/* Daily bookings trend (compact) */}
      <Section title="การจองรายวัน">
        {m.daily_bookings.length ? (
          <Table
            head={["วันที่", "จอง", "ยืนยัน", "GMV ยืนยัน", "Commission"]}
            rows={m.daily_bookings
              .slice(-14)
              .reverse()
              .map((r) => [r.day, num(r.bookings), num(r.confirmed), baht(r.gmv_confirmed), baht(r.commission_revenue)])}
          />
        ) : (
          <Empty>ยังไม่มีการจองในช่วงนี้</Empty>
        )}
      </Section>
    </div>
  );
}

/* ----------------------------- UI atoms ------------------------------ */

function H1({ children }: { children: React.ReactNode }) {
  return <h1 style={{ fontSize: 22, fontWeight: 600 }}>{children}</h1>;
}

function Kpi({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: boolean }) {
  return (
    <div
      style={{
        border: "1px solid var(--line)",
        borderRadius: 10,
        padding: "14px 16px",
        background: accent ? "var(--warm)" : "var(--surface, #fff)",
      }}
    >
      <div style={{ fontSize: 12, color: "var(--ink-2)", marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700, lineHeight: 1.1 }}>{value}</div>
      {sub ? <div style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 4 }}>{sub}</div> : null}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 10 }}>{title}</h2>
      {children}
    </section>
  );
}

function Table({ head, rows }: { head: string[]; rows: (string | number)[][] }) {
  return (
    <div style={{ overflowX: "auto", border: "1px solid var(--line)", borderRadius: 10 }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead>
          <tr>
            {head.map((h, i) => (
              <th
                key={i}
                style={{
                  textAlign: i === 0 ? "left" : "right",
                  padding: "9px 14px",
                  fontWeight: 600,
                  color: "var(--ink-2)",
                  borderBottom: "1px solid var(--line)",
                  whiteSpace: "nowrap",
                }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, ri) => (
            <tr key={ri}>
              {r.map((c, ci) => (
                <td
                  key={ci}
                  style={{
                    textAlign: ci === 0 ? "left" : "right",
                    padding: "9px 14px",
                    borderBottom: ri === rows.length - 1 ? "none" : "1px solid var(--line)",
                    whiteSpace: "nowrap",
                  }}
                >
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        border: "1px dashed var(--line)",
        borderRadius: 10,
        padding: "18px 16px",
        fontSize: 13,
        color: "var(--ink-3)",
      }}
    >
      {children}
    </div>
  );
}

function Notice({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        border: "1px solid var(--line)",
        background: "var(--warm)",
        borderRadius: 10,
        padding: "16px 18px",
        fontSize: 14,
        lineHeight: 1.6,
        marginTop: 12,
      }}
    >
      {children}
    </div>
  );
}
