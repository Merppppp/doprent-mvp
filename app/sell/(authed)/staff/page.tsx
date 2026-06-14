import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { auth } from "@/auth";
import {
  listShopStaff,
  createStaff,
  resetStaffPin,
  toggleStaffActive,
  updateStaffPermissions,
  removeStaff,
} from "@/app/actions/staff";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "จัดการพนักงาน",
  robots: { index: false, follow: false },
};

export default async function StaffManagementPage() {
  const session = await auth();
  // Only owners (seller/admin) can access this page
  if (!session?.user?.id || session.user.role === "staff") {
    redirect("/sell/dashboard");
  }

  const result = await listShopStaff();
  const staffList = result.ok ? (result.data ?? []) : [];

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
    <div style={{ paddingBottom: 60, maxWidth: 700 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <h1 style={{ fontSize: 22, fontWeight: 600 }}>จัดการพนักงาน</h1>
      </div>

      {/* Create Staff Form */}
      <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 10, padding: 20, marginBottom: 28 }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>เพิ่มพนักงานใหม่</h2>
        <form action={doCreateStaff}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 500, marginBottom: 5 }}>ชื่อที่แสดง</label>
              <input
                name="display_name"
                required
                placeholder="เช่น สมหญิง"
                style={{ width: "100%", padding: "9px 12px", border: "1px solid var(--line)", borderRadius: 6, fontSize: 14 }}
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
                style={{ width: "100%", padding: "9px 12px", border: "1px solid var(--line)", borderRadius: 6, fontSize: 14 }}
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
              style={{ width: "100%", padding: "9px 12px", border: "1px solid var(--line)", borderRadius: 6, fontSize: 14 }}
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
        <div style={{ display: "grid", gap: 12 }}>
          {staffList.map((s) => {
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
              <div key={s.id} style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 10, padding: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                      <span style={{ fontWeight: 600, fontSize: 15 }}>{s.displayName}</span>
                      <span style={{ fontSize: 12, color: "var(--ink-3)" }}>@{s.username}</span>
                      {!s.isActive && (
                        <span style={{ fontSize: 11, background: "var(--danger-soft)", color: "var(--danger)", padding: "1px 7px", borderRadius: 99 }}>
                          ปิดใช้งาน
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 12, color: "var(--ink-3)", marginBottom: 8 }}>
                      เข้าสู่ระบบล่าสุด: {fmtDate(s.lastLoginAt)}
                    </div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <span
                        style={{
                          fontSize: 12,
                          background: s.canManageBookings ? "var(--success-soft)" : "var(--surface)",
                          color: s.canManageBookings ? "var(--success)" : "var(--ink-3)",
                          padding: "2px 8px",
                          borderRadius: 4,
                          border: "1px solid var(--line)",
                        }}
                      >
                        {s.canManageBookings ? "✓" : "✗"} จัดการการจอง
                      </span>
                      <span
                        style={{
                          fontSize: 12,
                          background: s.canManageProducts ? "var(--success-soft)" : "var(--surface)",
                          color: s.canManageProducts ? "var(--success)" : "var(--ink-3)",
                          padding: "2px 8px",
                          borderRadius: 4,
                          border: "1px solid var(--line)",
                        }}
                      >
                        {s.canManageProducts ? "✓" : "✗"} จัดการสินค้า
                      </span>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
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
                </div>

                {/* Reset PIN */}
                <details style={{ marginTop: 12 }}>
                  <summary style={{ fontSize: 13, color: "var(--accent)", cursor: "pointer", userSelect: "none" }}>
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
                        style={{ width: "100%", padding: "7px 10px", border: "1px solid var(--line)", borderRadius: 6, fontSize: 13 }}
                      />
                    </div>
                    <button type="submit" className="btn btn-dark" style={{ padding: "7px 14px", fontSize: 12 }}>
                      ยืนยัน
                    </button>
                  </form>
                </details>

                {/* Edit permissions */}
                <details style={{ marginTop: 8 }}>
                  <summary style={{ fontSize: 13, color: "var(--accent)", cursor: "pointer", userSelect: "none" }}>
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
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
