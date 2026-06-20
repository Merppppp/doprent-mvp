import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { getBookingBadges } from "@/lib/booking-queries";
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

    // Fetch shop info for staff sidebar
    const staffShop = await db.shop.findFirst({
      where: { id: session.user.shopId },
      select: { id: true, name: true, verified: true, isOpen: true },
    });

    return (
      <div className="seller-dashboard">
        <SellSidebar
          isStaff
          canManageBookings={session.user.canManageBookings ?? false}
          canManageProducts={session.user.canManageProducts ?? false}
          shop={staffShop ? {
            id: staffShop.id,
            name: staffShop.name,
            verified: staffShop.verified,
            isOpen: staffShop.isOpen,
          } : undefined}
        />
        <main className="seller-main">{children}</main>
      </div>
    );
  }

  // Owner principal: must have a shop
  const shop = await db.shop.findFirst({
    where: { ownerId: userId },
    select: { id: true, name: true, verified: true, isOpen: true },
  });
  if (!shop) redirect("/sell/signup");

  const badges = await getBookingBadges().catch(() => ({ renter: 0, seller: 0 }));

  return (
    <div className="seller-dashboard">
      <SellSidebar
        shop={{
          id: shop.id,
          name: shop.name,
          verified: shop.verified,
          isOpen: shop.isOpen,
        }}
        bookingBadge={badges.seller}
      />
      <main className="seller-main">{children}</main>
    </div>
  );
}
