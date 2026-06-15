import type { Metadata } from "next";
import { db } from "@/lib/db";
import AddAdminForm from "./AddAdminForm";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Admin · จัดการ Admin",
  robots: { index: false, follow: false },
};

export default async function AdminAdminsPage() {
  const admins = await db.user.findMany({
    where: { role: "admin" },
    select: { id: true, email: true, fullName: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div>
      <h1 style={{ fontSize: 26, fontWeight: 600, marginBottom: 4 }}>จัดการ Admin</h1>
      <p style={{ fontSize: 14, color: "var(--ink-3)", marginBottom: 28 }}>
        รายชื่อ admin ทั้งหมดและการเพิ่ม admin ใหม่
      </p>

      <AddAdminForm />

      <h2 style={{ fontSize: 18, fontWeight: 600, margin: "32px 0 14px" }}>
        Admin ปัจจุบัน ({admins.length})
      </h2>

      {admins.length === 0 ? (
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
          ยังไม่มี admin
        </div>
      ) : (
        <div
          style={{
            background: "var(--surface)",
            border: "1px solid var(--line)",
            borderRadius: 10,
            overflow: "hidden",
          }}
        >
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--line)", background: "var(--bg)" }}>
                <th style={{ padding: "10px 16px", textAlign: "left", fontWeight: 600, color: "var(--ink-2)" }}>
                  ชื่อ
                </th>
                <th style={{ padding: "10px 16px", textAlign: "left", fontWeight: 600, color: "var(--ink-2)" }}>
                  อีเมล
                </th>
                <th
                  style={{
                    padding: "10px 16px",
                    textAlign: "left",
                    fontWeight: 600,
                    color: "var(--ink-2)",
                    whiteSpace: "nowrap",
                  }}
                >
                  เข้าร่วมเมื่อ
                </th>
              </tr>
            </thead>
            <tbody>
              {admins.map((a, idx) => (
                <tr
                  key={a.id}
                  style={{ borderTop: idx === 0 ? undefined : "1px solid var(--line)" }}
                >
                  <td style={{ padding: "12px 16px", fontWeight: 500 }}>
                    {a.fullName ?? <span style={{ color: "var(--ink-3)" }}>—</span>}
                  </td>
                  <td style={{ padding: "12px 16px", color: "var(--ink-2)" }}>{a.email}</td>
                  <td style={{ padding: "12px 16px", color: "var(--ink-3)", fontSize: 13 }}>
                    {a.createdAt.toLocaleDateString("th-TH")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
