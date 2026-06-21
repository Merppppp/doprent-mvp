import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import AccountSidebar from "@/components/AccountSidebar";

export const dynamic = "force-dynamic";

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent("/account")}`);

  return (
    <div className="container" style={{ padding: "28px 0 80px" }}>
      <div className="account-grid">
        <AccountSidebar user={{ fullName: user.fullName, email: user.email, role: user.role }} />
        <main>{children}</main>
      </div>
    </div>
  );
}
