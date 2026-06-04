import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

const RANGE_DAYS = 30;

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

/* --------------------------- data fetching --------------------------- */

type ChannelRow = { channel: string; views: number; sessions: number };
type ProvinceRow = { province: string; views: number; sessions: number };
type DailyRow = { day: string; bookings: number; confirmed: number; gmv_confirmed: number; commission: number };
type OccasionRow = { occasion: string; bookings: number; confirmed: number; commission: number };

async function getMetrics() {
  const since = new Date(Date.now() - RANGE_DAYS * 86400000);

  const [
    totalUsers,
    newUsers,
    activeUsers,
    signupGroups,
    traffic,
    provinces,
    daily,
    byOccasion,
    funnelGroups,
    activeSubs,
    totalBoutiques,
  ] = await Promise.all([
    db.user.count(),
    db.user.count({ where: { createdAt: { gte: since } } }),
    db.user.count({ where: { lastActiveAt: { gte: since } } }),
    db.user.groupBy({ by: ["signupChannel"], _count: { _all: true } }),
    db.$queryRaw<ChannelRow[]>`
      select coalesce(channel, 'direct') as channel,
             count(*)::int as views,
             count(distinct session_id)::int as sessions
      from page_views where created_at >= ${since}
      group by 1 order by views desc`,
    db.$queryRaw<ProvinceRow[]>`
      select coalesce(province, 'unknown') as province,
             count(*)::int as views,
             count(distinct session_id)::int as sessions
      from page_views where created_at >= ${since}
      group by 1 order by views desc limit 12`,
    db.$queryRaw<DailyRow[]>`
      select to_char(date_trunc('day', created_at), 'YYYY-MM-DD') as day,
             count(*)::int as bookings,
             count(*) filter (where status = 'confirmed')::int as confirmed,
             coalesce(sum(rental_total) filter (where status = 'confirmed'), 0)::int as gmv_confirmed,
             coalesce(sum(commission_amount) filter (where status = 'confirmed'), 0)::int as commission
      from bookings where created_at >= ${since}
      group by 1 order by day`,
    db.$queryRaw<OccasionRow[]>`
      select occ as occasion,
             count(*)::int as bookings,
             count(*) filter (where b.status = 'confirmed')::int as confirmed,
             coalesce(sum(b.commission_amount) filter (where b.status = 'confirmed'), 0)::int as commission
      from bookings b
      join dresses d on d.id = b.dress_id
      cross join lateral unnest(coalesce(d.occasions, array[]::text[])) as occ
      group by 1 order by bookings desc`,
    db.booking.groupBy({ by: ["status"], _count: { _all: true } }),
    db.sellerSubscription.findMany({
      where: { status: "active" },
      select: { plan: true, amount: true, billingCycle: true, boutiqueId: true },
    }),
    db.boutique.count(),
  ]);

  // signups by channel
  const signups = new Map<string, number>();
  for (const g of signupGroups) signups.set(g.signupChannel ?? "direct", g._count._all);

  // booking funnel
  const statusCount = new Map<string, number>();
  for (const g of funnelGroups) statusCount.set(g.status, g._count._all);
  const totalBookings = [...statusCount.values()].reduce((a, b) => a + b, 0);
  const confirmed = statusCount.get("confirmed") ?? 0;
  const lost =
    (statusCount.get("rejected") ?? 0) +
    (statusCount.get("cancelled") ?? 0) +
    (statusCount.get("payment_expired") ?? 0);
  const confirmRate = totalBookings ? Math.round((confirmed / totalBookings) * 10000) / 100 : null;

  // subscription revenue + adoption
  const subByPlan = new Map<string, { active: number; mrr: number }>();
  const paidBoutiques = new Set<string>();
  for (const s of activeSubs) {
    const cur = subByPlan.get(s.plan) ?? { active: 0, mrr: 0 };
    cur.active += 1;
    cur.mrr += s.billingCycle === "yearly" ? Math.round(s.amount / 12) : s.amount;
    subByPlan.set(s.plan, cur);
    if (s.plan !== "free" && s.boutiqueId) paidBoutiques.add(s.boutiqueId);
  }
  const adoptionRate = totalBoutiques
    ? Math.round((paidBoutiques.size / totalBoutiques) * 10000) / 100
    : null;

  return {
    totalUsers,
    newUsers,
    activeUsers,
    signups,
    traffic,
    provinces,
    daily,
    byOccasion,
    funnel: { total: totalBookings, confirmed, lost, confirmRate },
    subByPlan,
    subscriptionRevenue: [...subByPlan.values()].reduce((a, b) => a + b.mrr, 0),
    adoption: { paid: paidBoutiques.size, total: totalBoutiques, rate: adoptionRate },
  };
}

/* ------------------------------- page -------------------------------- */

export default async function AdminMetricsPage() {
  let m: Awaited<ReturnType<typeof getMetrics>> | null = null;
  let err: string | null = null;
  try {
    m = await getMetrics();
  } catch (e) {
    err = (e as Error).message;
  }

  if (!m) {
    return (
      <div>
        <H1>Business Metrics</H1>
        <Notice>
          ยังดึงข้อมูลไม่ได้ — ตรวจว่าได้รัน Prisma migration (ตาราง page_views / bookings /
          seller_subscriptions) แล้ว
          {err ? <div style={{ marginTop: 8, fontSize: 12, color: "var(--ink-3)" }}>{err}</div> : null}
        </Notice>
      </div>
    );
  }

  const totalViews = m.traffic.reduce((a, r) => a + r.views, 0);
  const totalSessions = m.traffic.reduce((a, r) => a + r.sessions, 0);
  const totalBookings = m.daily.reduce((a, r) => a + r.bookings, 0);
  const totalConfirmed = m.daily.reduce((a, r) => a + r.confirmed, 0);
  const commissionRev = m.daily.reduce((a, r) => a + r.commission, 0);
  const gmvConfirmed = m.daily.reduce((a, r) => a + r.gmv_confirmed, 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
      <div>
        <H1>Business Metrics</H1>
        <p style={{ color: "var(--ink-2)", fontSize: 13, marginTop: 4 }}>
          ช่วง {RANGE_DAYS} วันล่าสุด · สำหรับรายงานผู้บริหาร / นักลงทุน
        </p>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
          gap: 12,
        }}
      >
        <Kpi label="ผู้เข้าชม (sessions)" value={num(totalSessions)} sub={`${num(totalViews)} pageviews`} />
        <Kpi label="ผู้ใช้ทั้งหมด" value={num(m.totalUsers)} sub={`+${num(m.newUsers)} สมัครใหม่`} />
        <Kpi label="Active users" value={num(m.activeUsers)} sub={`${RANGE_DAYS} วัน`} />
        <Kpi label="การจอง" value={num(totalBookings)} sub={`ยืนยัน ${num(totalConfirmed)}`} />
        <Kpi
          label="Conversion จอง→ยืนยัน"
          value={m.funnel.confirmRate != null ? `${m.funnel.confirmRate}%` : "—"}
          sub={`จากทั้งหมด ${num(m.funnel.total)}`}
        />
        <Kpi label="Commission (ยืนยันแล้ว)" value={baht(commissionRev)} sub={`GMV ${baht(gmvConfirmed)}`} accent />
        <Kpi label="MRR (subscription)" value={baht(m.subscriptionRevenue)} sub="รายเดือน" accent />
        <Kpi
          label="Subscription adoption"
          value={m.adoption.rate != null ? `${m.adoption.rate}%` : "—"}
          sub={`${num(m.adoption.paid)}/${num(m.adoption.total)} ร้าน`}
        />
      </div>

      <Section title="แหล่งที่มาผู้เข้าชม (channel)">
        {m.traffic.length ? (
          <Table
            head={["ช่องทาง", "Sessions", "Pageviews", "สมัคร"]}
            rows={m.traffic.map((r) => [
              CHANNEL_TH[r.channel] ?? r.channel,
              num(r.sessions),
              num(r.views),
              num(m.signups.get(r.channel) ?? 0),
            ])}
          />
        ) : (
          <Empty>ยังไม่มีข้อมูล traffic — เริ่มเก็บเมื่อมีผู้เข้าชมหลัง deploy</Empty>
        )}
      </Section>

      <Section title="พื้นที่ผู้เข้าชม (โดยประมาณ)">
        {m.provinces.length ? (
          <Table
            head={["พื้นที่", "Sessions", "Pageviews"]}
            rows={m.provinces.map((r) => [r.province, num(r.sessions), num(r.views)])}
          />
        ) : (
          <Empty>ต้องเปิด edge geo headers (Vercel) จึงจะเห็นพื้นที่</Empty>
        )}
      </Section>

      <Section title="การจองตามประเภทชุด (occasion)">
        {m.byOccasion.length ? (
          <Table
            head={["ประเภท", "จอง", "ยืนยัน", "Commission"]}
            rows={m.byOccasion.map((r) => [
              OCCASION_TH[r.occasion] ?? r.occasion,
              num(r.bookings),
              num(r.confirmed),
              baht(r.commission),
            ])}
          />
        ) : (
          <Empty>ยังไม่มีการจอง</Empty>
        )}
      </Section>

      <Section title="Subscription → Revenue">
        {m.subByPlan.size ? (
          <Table
            head={["แพ็กเกจ", "Active subs", "MRR"]}
            rows={[...m.subByPlan.entries()].map(([plan, v]) => [plan, num(v.active), baht(v.mrr)])}
          />
        ) : (
          <Empty>ยังไม่มี subscription (ตาราง seller_subscriptions ว่าง)</Empty>
        )}
      </Section>

      <Section title="การจองรายวัน">
        {m.daily.length ? (
          <Table
            head={["วันที่", "จอง", "ยืนยัน", "GMV ยืนยัน", "Commission"]}
            rows={m.daily
              .slice(-14)
              .reverse()
              .map((r) => [r.day, num(r.bookings), num(r.confirmed), baht(r.gmv_confirmed), baht(r.commission)])}
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
