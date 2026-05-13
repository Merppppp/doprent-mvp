import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

const NAV = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/kyc", label: "KYC Review" },
  { href: "/admin/boutiques", label: "Boutiques" },
  { href: "/admin/dresses", label: "Dresses" },
  { href: "/admin/clicks", label: "LINE Clicks" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) redirect("/login?next=/admin");
  if (user.profile.role !== "admin") redirect("/");

  return (
    <div className="shell" style={{ paddingTop: 24, paddingBottom: 60 }}>
      <div
        style={{
          display: "flex",
          gap: 10,
          padding: "10px 0",
          marginBottom: 24,
          borderBottom: "1px solid var(--line)",
          overflowX: "auto",
          flexWrap: "wrap",
        }}
      >
        <span
          style={{
            background: "var(--info)",
            color: "#fff",
            fontSize: 10,
            padding: "3px 8px",
            borderRadius: 3,
            letterSpacing: "0.05em",
            textTransform: "uppercase",
            fontWeight: 600,
            alignSelf: "center",
            marginRight: 6,
          }}
        >
          Admin
        </span>
        {NAV.map((n) => (
          <Link
            key={n.href}
            href={n.href}
            style={{
              padding: "8px 14px",
              fontSize: 13,
              fontWeight: 500,
              color: "var(--ink-2)",
              borderRadius: 6,
              whiteSpace: "nowrap",
            }}
          >
            {n.label}
          </Link>
        ))}
      </div>
      {children}
    </div>
  );
}
