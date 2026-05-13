"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

type Props = {
  user: {
    fullName: string;
    email: string;
    isAdmin: boolean;
    isSeller: boolean;
    initials: string;
    savedCount: number;
  } | null;
};

export default function MobileMenu({ user }: Props) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Close drawer on route change
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Lock body scroll when drawer open
  useEffect(() => {
    if (open) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [open]);

  return (
    <>
      <button
        type="button"
        aria-label="เปิดเมนู"
        aria-expanded={open}
        onClick={() => setOpen(true)}
        className="mobile-menu-toggle"
        style={{
          width: 40,
          height: 40,
          border: "1px solid var(--line)",
          borderRadius: 8,
          background: "var(--surface)",
          alignItems: "center",
          justifyContent: "center",
          padding: 0,
        }}
      >
        <span
          aria-hidden
          style={{
            display: "inline-block",
            width: 18,
            height: 12,
            position: "relative",
          }}
        >
          <span style={hamburgerLine(0)} />
          <span style={hamburgerLine(5)} />
          <span style={hamburgerLine(10)} />
        </span>
      </button>

      {open ? (
        <>
          <div
            className="mobile-drawer-backdrop"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <aside
            className="mobile-drawer-panel"
            role="dialog"
            aria-modal="true"
            aria-label="เมนู"
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 22,
              }}
            >
              <Link
                href="/"
                onClick={() => setOpen(false)}
                style={{ fontWeight: 700, fontSize: 20 }}
              >
                DopRent
              </Link>
              <button
                type="button"
                aria-label="ปิดเมนู"
                onClick={() => setOpen(false)}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 8,
                  border: "1px solid var(--line)",
                  background: "var(--surface)",
                  fontSize: 18,
                  lineHeight: 1,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                ×
              </button>
            </div>

            {user ? (
              <div
                style={{
                  display: "flex",
                  gap: 10,
                  alignItems: "center",
                  padding: "12px 0 16px",
                  borderBottom: "1px solid var(--line)",
                  marginBottom: 14,
                }}
              >
                <span
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 999,
                    background: "var(--ink)",
                    color: "#fff",
                    fontSize: 13,
                    fontWeight: 600,
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  {user.initials || "?"}
                </span>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div
                    style={{
                      fontWeight: 600,
                      fontSize: 14,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {user.fullName}
                    {user.isAdmin ? (
                      <span
                        style={{
                          background: "var(--info)",
                          color: "#fff",
                          fontSize: 10,
                          padding: "2px 6px",
                          borderRadius: 3,
                          marginLeft: 6,
                          letterSpacing: "0.04em",
                          textTransform: "uppercase",
                        }}
                      >
                        Admin
                      </span>
                    ) : null}
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: "var(--ink-3)",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {user.email}
                  </div>
                </div>
              </div>
            ) : null}

            <nav style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <Link href="/browse" style={drawerItem}>
                เลือกชุด
              </Link>
              <Link href="/boutiques" style={drawerItem}>
                ร้านเช่า
              </Link>
              {user ? (
                <>
                  <Link
                    href="/account"
                    style={{ ...drawerItem, display: "flex", alignItems: "center", gap: 8 }}
                  >
                    <span style={{ display: "inline-flex", alignItems: "center" }}>
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill={user.savedCount > 0 ? "#E11D48" : "none"}
                        stroke={user.savedCount > 0 ? "#E11D48" : "var(--ink)"}
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden
                      >
                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                      </svg>
                    </span>
                    ชุดที่ถูกใจ
                    {user.savedCount > 0 ? (
                      <span
                        style={{
                          marginLeft: "auto",
                          minWidth: 22,
                          padding: "0 7px",
                          height: 20,
                          borderRadius: 999,
                          background: "var(--ink)",
                          color: "#fff",
                          fontSize: 11,
                          fontWeight: 600,
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        {user.savedCount > 99 ? "99+" : user.savedCount}
                      </span>
                    ) : null}
                  </Link>
                  <Link href="/account" style={drawerItem}>
                    บัญชีของฉัน
                  </Link>
                  {user.isSeller ? (
                    <Link href="/sell/dashboard" style={drawerItem}>
                      Dashboard ร้านของฉัน
                    </Link>
                  ) : (
                    <Link href="/sell" style={drawerItem}>
                      เปิดร้านบน DopRent
                    </Link>
                  )}
                  {user.isAdmin ? (
                    <Link href="/admin" style={{ ...drawerItem, color: "var(--info)" }}>
                      Admin Dashboard
                    </Link>
                  ) : null}
                </>
              ) : null}
            </nav>

            <div
              style={{
                marginTop: 18,
                paddingTop: 18,
                borderTop: "1px solid var(--line)",
                display: "flex",
                flexDirection: "column",
                gap: 8,
              }}
            >
              {user ? (
                <form action="/auth/signout" method="POST">
                  <button
                    type="submit"
                    className="btn btn-outline btn-block"
                  >
                    ออกจากระบบ
                  </button>
                </form>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="btn btn-outline btn-block"
                    onClick={() => setOpen(false)}
                  >
                    เข้าสู่ระบบ
                  </Link>
                  <Link
                    href="/signup"
                    className="btn btn-dark btn-block"
                    onClick={() => setOpen(false)}
                  >
                    สมัครสมาชิก
                  </Link>
                </>
              )}
            </div>
          </aside>
        </>
      ) : null}
    </>
  );
}

const drawerItem: React.CSSProperties = {
  display: "block",
  padding: "12px 4px",
  fontSize: 15,
  color: "var(--ink)",
  borderRadius: 6,
};

function hamburgerLine(top: number): React.CSSProperties {
  return {
    position: "absolute",
    left: 0,
    right: 0,
    top,
    height: 2,
    background: "var(--ink)",
    borderRadius: 2,
  };
}
