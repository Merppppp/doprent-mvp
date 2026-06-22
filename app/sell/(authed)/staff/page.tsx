import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { auth } from "@/auth";
import { STAFF_PAGE_SIZE as PAGE_SIZE } from "@/lib/config";
import {
  getStaffLoginInfo,
  listShopStaff,
  createStaff,
  resetStaffPin,
  toggleStaffActive,
  updateStaffPermissions,
  removeStaff,
} from "@/app/actions/staff";
import StaffQRSection from "./StaffQRSection";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "จัดการพนักงาน",
  robots: { index: false, follow: false },
};

const thStyle: React.CSSProperties = {
  textAlign: "left",
  padding: "10px 12px",
  fontSize: 12,
  fontWeight: 600,
  color: "var(--ink-3)",
  whiteSpace: "nowrap",
  borderBottom: "1px solid var(--line)",
};

const tdStyle: React.CSSProperties = {
  padding: "12px",
  fontSize: 13,
  verticalAlign: "top",
  borderBottom: "1px solid var(--line)",
};

export default async function StaffManagementPage({
  searchParams,
}: {
  searchParams?: { page?: string };
}) {
  const session = await auth();
  // Only owners (seller/admin) can access this page
  if (!session?.user?.id || session.user.role === "staff") {
    redirect("/sell/dashboard");
  }

  const result = await listShopStaff();
  const staffList = result.ok ? (result.data ?? []) : [];
  const loginInfo = await getStaffLoginInfo();

  const total = staffList.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const requestedPage = Number(searchParams?.page ?? "1");
  const page = Number.isFinite(requestedPage) ? Math.min(Math.max(1, Math.trunc(requestedPage)), totalPages) : 1;
  const pageStaff = staffList.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const fmtDate = (d: Date | null) => {
    if (!d) return "ยังไม่เคย";
    return new Date(d).toLocaleString("th-TH", { dateStyle: "short", timeStyle: "short" });
  };

  // Void-returning inline server action wrappers (required for <form action={...}>)
  async function doCreateStaff(formData: FormData): Promise<void> {
    "use server";
    await createStaff(formData);
  }

  return (
    <div style={{ paddingBottom: 60, maxWidth: 920 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <h1 style={{ fontSize: 22, fontWeight: 600 }}>จัดการพนักงาน ({total} คน)</h1>
      </div>

      {/* QR Code Login Section */}
      {loginInfo.ok && <StaffQRSection code={loginInfo.code} url={loginInfo.url} shopName={loginInfo.shopName} />}

      {/* Create Staff Form */}
      <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 10, padding: 20, marginBottom: 28, maxWidth: 700 }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>เพิ่มพนักงานใหม่</h2>
        <form action={doCreateStaff}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 500, marginBottom: 5 }}>ชื่อที่แสดง</label>
              <input
                name="display_name"
                required
                placeholder="เช่น สมหญิง"
                className="input"
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 500, marginBottom: 5 }}>Username</label>
              <input
                name="username"
                required
                placeholder="เช่น staff01"
                pattern="[a-z0-9._\-]{3,32}"
                title="ตัวอักษรภาษาอังกฤษ/ตัวเลข 3-32 ตัว"
                className="input"
              />
            </div>
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: "block", fontSize: 13, fontWeight: 500, marginBottom: 5 }}>PIN (6-8 หลัก)</label>
            <input
              name="pin"
              type="password"
              required
              minLength={6}
              maxLength={8}
              inputMode="numeric"
              placeholder="••••••"
              className="input"
            />
          </div>
          <div style={{ display: "flex", gap: 20, marginBottom: 14 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, cursor: "pointer" }}>
              <input type="checkbox" name="can_manage_bookings" value="true" defaultChecked />
              จัดการการจอง
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, cursor: "pointer" }}>
              <input type="checkbox" name="can_manage_products" value="true" />
              จัดการสินค้า
            </label>
          </div>
          <button type="submit" className="btn btn-dark" style={{ padding: "8px 18px", fontSize: 13 }}>
            + เพิ่มพนักงาน
          </button>
        </form>
      </div>

      {/* Staff List */}
      {staffList.length === 0 ? (
        <div style={{ textAlign: "center", padding: "40px 20px", color: "var(--ink-3)", background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 10 }}>
          ยังไม่มีพนักงาน กรอกฟอร์มด้านบนเพื่อเพิ่มพนักงานคนแรก
        </div>
      ) : (
        <>
          <div style={{ border: "1px solid var(--line)", borderRadius: 10, overflowX: "auto", background: "var(--surface)" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 720 }}>
              <thead>
                <tr>
                  <th style={thStyle}>พนักงาน</th>
                  <th style={thStyle}>สิทธิ์</th>
                  <th style={thStyle}>เข้าสู่ระบบล่าสุด</th>
                  <th style={thStyle}>สถานะ</th>
                  <th style={{ ...thStyle, textAlign: "right" }}>จัดการ</th>
                </tr>
              </thead>
              <tbody>
                {pageStaff.map((s) => {
                  // Inline void-returning server actions scoped to this staff member
                  async function doToggleActive(): Promise<void> {
                    "use server";
                    await toggleStaffActive(s.id);
                  }
                  async function doRemove(): Promise<void> {
                    "use server";
                    await removeStaff(s.id);
                  }
                  async function doResetPin(formData: FormData): Promise<void> {
                    "use server";
                    await resetStaffPin(s.id, formData);
                  }
                  async function doUpdatePerms(formData: FormData): Promise<void> {
                    "use server";
                    await updateStaffPermissions(s.id, formData);
                  }

                  return (
                    <tr key={s.id}>
                      <td style={tdStyle}>
                        <div style={{ fontWeight: 600, fontSize: 14 }}>{s.displayName}</div>
                        <div style={{ fontSize: 12, color: "var(--ink-3)" }}>@{s.username}</div>
                      </td>
                      <td style={tdStyle}>
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                          <span
                            style={{
                              fontSize: 11.5,
                              background: s.canManageBookings ? "var(--success-soft)" : "var(--surface)",
                              color: s.canManageBookings ? "var(--success)" : "var(--ink-3)",
                              padding: "2px 8px",
                              borderRadius: 4,
                              border: "1px solid var(--line)",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {s.canManageBookings ? "✓" : "✗"} จัดการการจอง
                          </span>
                          <span
                            style={{
                              fontSize: 11.5,
                              background: s.canManageProducts ? "var(--success-soft)" : "var(--surface)",
                              color: s.canManageProducts ? "var(--success)" : "var(--ink-3)",
                              padding: "2px 8px",
                              borderRadius: 4,
                              border: "1px solid var(--line)",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {s.canManageProducts ? "✓" : "✗"} จัดการสินค้า
                          </span>
                        </div>
                      </td>
                      <td style={{ ...tdStyle, fontSize: 12, color: "var(--ink-3)", whiteSpace: "nowrap" }}>
                        {fmtDate(s.lastLoginAt)}
                      </td>
                      <td style={tdStyle}>
                        {s.isActive ? (
                          <span style={{ fontSize: 11.5, background: "var(--success-soft)", color: "var(--success)", padding: "2px 8px", borderRadius: 99, whiteSpace: "nowrap" }}>
                            เปิดใช้งาน
                          </span>
                        ) : (
                          <span style={{ fontSize: 11.5, background: "var(--danger-soft)", color: "var(--danger)", padding: "2px 8px", borderRadius: 99, whiteSpace: "nowrap" }}>
                            ปิดใช้งาน
                          </span>
                        )}
                      </td>
                      <td style={{ ...tdStyle, textAlign: "right" }}>
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "flex-end" }}>
                          <form action={doToggleActive}>
                            <button
                              type="submit"
                              className="btn btn-outline"
                              style={{ fontSize: 12, padding: "5px 10px", color: s.isActive ? "var(--warn)" : "var(--success)" }}
                            >
                              {s.isActive ? "ปิดใช้งาน" : "เปิดใช้งาน"}
                            </button>
                          </form>
                          <form action={doRemove}>
                            <button
                              type="submit"
                              className="btn btn-outline"
                              style={{ fontSize: 12, padding: "5px 10px", color: "var(--danger)" }}
                            >
                              ลบ
                            </button>
                          </form>
                        </div>

                        {/* Reset PIN */}
                        <details style={{ marginTop: 10, textAlign: "left" }}>
                          <summary style={{ fontSize: 12.5, color: "var(--accent)", cursor: "pointer", userSelect: "none", textAlign: "right" }}>
                            รีเซ็ต PIN
                          </summary>
                          <form action={doResetPin} style={{ marginTop: 10, display: "flex", gap: 8, alignItems: "flex-end" }}>
                            <div style={{ flex: 1 }}>
                              <label style={{ display: "block", fontSize: 12, fontWeight: 500, marginBottom: 4 }}>PIN ใหม่ (6-8 หลัก)</label>
                              <input
                                name="pin"
                                type="password"
                                required
                                minLength={6}
                                maxLength={8}
                                inputMode="numeric"
                                placeholder="••••••"
                                className="input"
                              />
                            </div>
                            <button type="submit" className="btn btn-dark" style={{ padding: "7px 14px", fontSize: 12 }}>
                              ยืนยัน
                            </button>
                          </form>
                        </details>

                        {/* Edit permissions */}
                        <details style={{ marginTop: 8, textAlign: "left" }}>
                          <summary style={{ fontSize: 12.5, color: "var(--accent)", cursor: "pointer", userSelect: "none", textAlign: "right" }}>
                            แก้ไขสิทธิ์
                          </summary>
                          <form action={doUpdatePerms} style={{ marginTop: 10 }}>
                            <div style={{ display: "flex", gap: 20, marginBottom: 10 }}>
                              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, cursor: "pointer" }}>
                                <input type="checkbox" name="can_manage_bookings" value="true" defaultChecked={s.canManageBookings} />
                                จัดการการจอง
                              </label>
                              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, cursor: "pointer" }}>
                                <input type="checkbox" name="can_manage_products" value="true" defaultChecked={s.canManageProducts} />
                                จัดการสินค้า
                              </label>
                            </div>
                            <button type="submit" className="btn btn-dark" style={{ padding: "6px 14px", fontSize: 12 }}>
                              บันทึกสิทธิ์
                            </button>
                          </form>
                        </details>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {totalPages > 1 ? (
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginTop: 16,
                gap: 12,
                flexWrap: "wrap",
              }}
            >
              <span style={{ fontSize: 13, color: "var(--ink-3)" }}>
                หน้า {page} จาก {totalPages}
              </span>
              <div style={{ display: "flex", gap: 8 }}>
                {page > 1 ? (
                  <Link href={`/sell/staff?page=${page - 1}`} className="btn btn-outline" style={{ padding: "6px 14px", fontSize: 13 }}>
                    ← ก่อนหน้า
                  </Link>
                ) : (
                  <span className="btn btn-outline" style={{ padding: "6px 14px", fontSize: 13, opacity: 0.4, pointerEvents: "none" }}>
                    ← ก่อนหน้า
                  </span>
                )}
                {page < totalPages ? (
                  <Link href={`/sell/staff?page=${page + 1}`} className="btn btn-outline" style={{ padding: "6px 14px", fontSize: 13 }}>
                    ถัดไป →
                  </Link>
                ) : (
                  <span className="btn btn-outline" style={{ padding: "6px 14px", fontSize: 13, opacity: 0.4, pointerEvents: "none" }}>
                    ถัดไป →
                  </span>
                )}
              </div>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
