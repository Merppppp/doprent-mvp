import type { Metadata } from "next";
import type { Role } from "@prisma/client";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getTrustScores, type TrustTier } from "@/lib/trust-score";
import AdminUserActions from "@/components/AdminUserActions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Users · Admin",
  robots: { index: false, follow: false },
};

const PAGE_SIZE = 50;

const ROLE_FILTERS = [
  { key: "all", label: "ทั้งหมด" },
  { key: "customer", label: "ลูกค้า" },
  { key: "seller", label: "ร้านค้า" },
  { key: "admin", label: "แอดมิน" },
] as const;
type RoleFilter = (typeof ROLE_FILTERS)[number]["key"];

const TIER_STYLE: Record<TrustTier, { bg: string; color: string }> = {
  RELIABLE: { bg: "var(--success-soft)", color: "var(--success)" },
  NORMAL: { bg: "var(--surface)", color: "var(--ink-2)" },
  NEW: { bg: "var(--surface)", color: "var(--ink-3)" },
  CAUTION: { bg: "var(--warn-soft)", color: "var(--warn)" },
};

const fmtDate = (d: Date | null) =>
  d ? d.toLocaleDateString("th-TH", { dateStyle: "medium", timeZone: "Asia/Bangkok" }) : "—";

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams?: { role?: string; q?: string; page?: string };
}) {
  const me = await getCurrentUser();

  const roleFilter: RoleFilter = ROLE_FILTERS.some((f) => f.key === searchParams?.role)
    ? (searchParams!.role as RoleFilter)
    : "all";
  const search = (searchParams?.q ?? "").trim();

  const where: Record<string, unknown> = {};
  if (roleFilter !== "all") where.role = roleFilter as Role;
  if (search) {
    where.OR = [
      { fullName: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
    ];
  }

  // Per-role totals for the filter chips + headline count.
  const grouped = await db.user.groupBy({ by: ["role"], _count: { _all: true } });
  const roleCounts: Record<string, number> = {};
  let totalUsers = 0;
  for (const g of grouped) {
    roleCounts[g.role] = g._count._all;
    totalUsers += g._count._all;
  }

  const matched = await db.user.count({ where });
  const totalPages = Math.max(1, Math.ceil(matched / PAGE_SIZE));
  const requestedPage = Number(searchParams?.page ?? "1");
  const page = Number.isFinite(requestedPage) ? Math.min(Math.max(1, Math.trunc(requestedPage)), totalPages) : 1;

  const users = await db.user.findMany({
    where,
    orderBy: { createdAt: "desc" },
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
    select: {
      id: true,
      fullName: true,
      email: true,
      role: true,
      suspendedAt: true,
      lastActiveAt: true,
      createdAt: true,
      _count: { select: { bookings: true, reviews: true } },
    },
  });

  // Trust scores (reliability tier) for everyone on this page in one query.
  const trust = await getTrustScores(users.map((u) => u.id));

  return (
    <div>
      <h1 className="page-title" style={{ fontSize: 26, fontWeight: 600, marginBottom: 4 }}>
        ผู้ใช้ทั้งหมด {totalUsers.toLocaleString()} คน
      </h1>
      <p style={{ fontSize: 14, color: "var(--ink-3)", marginBottom: 18 }}>
        ลูกค้า {(roleCounts.customer ?? 0).toLocaleString()} · ร้านค้า {(roleCounts.seller ?? 0).toLocaleString()} · แอดมิน {(roleCounts.admin ?? 0).toLocaleString()}
      </p>

      {/* Filters + search */}
      <div style={{ display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap" }}>
        {ROLE_FILTERS.map((f) => {
          const active = roleFilter === f.key;
          const count = f.key === "all" ? totalUsers : roleCounts[f.key] ?? 0;
          return (
            <a
              key={f.key}
              href={`/admin/users?role=${f.key}${search ? `&q=${encodeURIComponent(search)}` : ""}`}
              style={{
                padding: "7px 14px",
                fontSize: 13,
                border: `1px solid ${active ? "var(--ink)" : "var(--line)"}`,
                borderRadius: 6,
                background: active ? "var(--ink)" : "var(--surface)",
                color: active ? "var(--on-dark)" : "var(--ink)",
                fontWeight: active ? 600 : 500,
              }}
            >
              {f.label} ({count.toLocaleString()})
            </a>
          );
        })}
      </div>

      <form method="GET" style={{ marginBottom: 18 }}>
        <input type="hidden" name="role" value={roleFilter} />
        <div style={{ display: "flex", gap: 8, maxWidth: 420 }}>
          <input
            type="text"
            name="q"
            defaultValue={search}
            placeholder="ค้นหาชื่อ หรือ อีเมล…"
            style={{
              flex: 1,
              padding: "9px 14px",
              borderRadius: 8,
              border: "1px solid var(--line)",
              background: "var(--surface)",
              fontSize: 13,
              color: "var(--ink)",
            }}
          />
          <button type="submit" className="btn btn-outline" style={{ padding: "9px 16px", fontSize: 13 }}>
            ค้นหา
          </button>
        </div>
      </form>

      {users.length === 0 ? (
        <div
          style={{
            padding: 40,
            textAlign: "center",
            background: "var(--surface)",
            border: "1px solid var(--line)",
            borderRadius: 8,
            color: "var(--ink-3)",
          }}
        >
          ไม่พบผู้ใช้ที่ตรงกับเงื่อนไข
        </div>
      ) : (
        <div style={{ overflowX: "auto", border: "1px solid var(--line)", borderRadius: 8 }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, background: "var(--surface)", minWidth: 880 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--line)", textAlign: "left" }}>
                <Th>ผู้ใช้</Th>
                <Th>ความน่าเชื่อถือ</Th>
                <Th>เช่าสำเร็จ / ยกเลิก</Th>
                <Th>จองทั้งหมด</Th>
                <Th>รีวิว</Th>
                <Th>ใช้งานล่าสุด</Th>
                <Th>จัดการ</Th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const score = trust.get(u.id);
                const tier = score?.tier ?? "NEW";
                const tierStyle = TIER_STYLE[tier];
                const isSuspended = !!u.suspendedAt;
                return (
                  <tr key={u.id} style={{ borderBottom: "1px solid var(--line)", opacity: isSuspended ? 0.6 : 1 }}>
                    <Td>
                      <div style={{ fontWeight: 600, display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                        {u.fullName ?? "(ไม่มีชื่อ)"}
                        {isSuspended ? (
                          <span style={{ padding: "1px 7px", borderRadius: 4, fontSize: 11, fontWeight: 700, background: "var(--danger-soft)", color: "var(--danger)" }}>
                            ระงับอยู่
                          </span>
                        ) : null}
                      </div>
                      <div style={{ color: "var(--ink-3)", fontSize: 12 }}>{u.email ?? "—"}</div>
                      <div style={{ color: "var(--ink-3)", fontSize: 11, marginTop: 2 }}>สมัคร {fmtDate(u.createdAt)}</div>
                    </Td>
                    <Td>
                      <span
                        title={score ? `เช่าสำเร็จ ${score.good} · ยกเลิก/ไม่จ่าย ${score.bad} · รวม ${score.total}` : undefined}
                        style={{
                          display: "inline-block",
                          padding: "2px 8px",
                          borderRadius: 999,
                          fontSize: 11,
                          fontWeight: 600,
                          whiteSpace: "nowrap",
                          border: "1px solid currentColor",
                          background: tierStyle.bg,
                          color: tierStyle.color,
                        }}
                      >
                        {score?.label ?? "ผู้เช่าใหม่"}
                      </span>
                    </Td>
                    <Td style={{ whiteSpace: "nowrap" }}>
                      <span style={{ color: "var(--success)", fontWeight: 600 }}>{score?.good ?? 0}</span>
                      <span style={{ color: "var(--ink-3)" }}> / </span>
                      <span style={{ color: "var(--danger)", fontWeight: 600 }}>{score?.bad ?? 0}</span>
                    </Td>
                    <Td>{u._count.bookings.toLocaleString()}</Td>
                    <Td>{u._count.reviews.toLocaleString()}</Td>
                    <Td style={{ whiteSpace: "nowrap", color: "var(--ink-3)" }}>{fmtDate(u.lastActiveAt)}</Td>
                    <Td>
                      <AdminUserActions
                        userId={u.id}
                        role={u.role}
                        suspended={isSuspended}
                        isSelf={u.id === me?.id}
                      />
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 ? (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 16, gap: 12, flexWrap: "wrap" }}>
          <span style={{ fontSize: 13, color: "var(--ink-3)" }}>หน้า {page} จาก {totalPages}</span>
          <div style={{ display: "flex", gap: 8 }}>
            <PageLink disabled={page <= 1} href={`/admin/users?role=${roleFilter}${search ? `&q=${encodeURIComponent(search)}` : ""}&page=${page - 1}`}>← ก่อนหน้า</PageLink>
            <PageLink disabled={page >= totalPages} href={`/admin/users?role=${roleFilter}${search ? `&q=${encodeURIComponent(search)}` : ""}&page=${page + 1}`}>ถัดไป →</PageLink>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th style={{ padding: "10px 12px", fontWeight: 600, fontSize: 12, color: "var(--ink-3)", whiteSpace: "nowrap" }}>
      {children}
    </th>
  );
}

function Td({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <td style={{ padding: "10px 12px", verticalAlign: "top", ...style }}>{children}</td>;
}

function PageLink({ href, disabled, children }: { href: string; disabled: boolean; children: React.ReactNode }) {
  if (disabled) {
    return (
      <span className="btn btn-outline" style={{ padding: "6px 14px", fontSize: 13, opacity: 0.4, pointerEvents: "none" }}>
        {children}
      </span>
    );
  }
  return (
    <a href={href} className="btn btn-outline" style={{ padding: "6px 14px", fontSize: 13 }}>
      {children}
    </a>
  );
}
