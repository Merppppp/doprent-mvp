import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import SellSidebar from "@/components/SellSidebar";

export const dynamic = "force-dynamic";

export default async function SellerLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) redirect("/login?next=/sell/dashboard");

  const boutique = await db.boutique.findFirst({
    where: { ownerId: user.id },
    select: { id: true },
  });
  if (!boutique) redirect("/sell/signup");

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
