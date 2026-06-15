import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import SellSidebar from "@/components/SellSidebar";

export const dynamic = "force-dynamic";

export default async function SellerLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const role = session?.user?.role;
  const userId = session?.user?.id;

  if (!userId) redirect("/login?next=/sell/dashboard");

  // Staff principal: their shopId is in the session, no DB lookup needed
  if (role === "staff") {
    if (!session?.user?.shopId) redirect("/staff/login");
    return (
      <div className="container" style={{ paddingTop: 24, paddingBottom: 60 }}>
        <div className="dash-shell">
          <aside className="dash-sidebar">
            <SellSidebar isStaff canManageBookings={session.user.canManageBookings ?? false} canManageProducts={session.user.canManageProducts ?? false} />
          </aside>
          <main className="dash-main">{children}</main>
        </div>
      </div>
    );
  }

  // Owner principal: must have a shop
  const shop = await db.shop.findFirst({
    where: { ownerId: userId },
    select: { id: true },
  });
  if (!shop) redirect("/sell/signup");

  return (
    <div className="container" style={{ paddingTop: 24, paddingBottom: 60 }}>
      <div className="dash-shell">
        <aside className="dash-sidebar">
          <SellSidebar />
        </aside>
        <main className="dash-main">{children}</main>
      </div>
    </div>
  );
}
