import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { getMyAddresses } from "@/lib/booking-queries";
import { db } from "@/lib/db";
import { parseBusinessHours } from "@/lib/hours";
import CartCheckoutForm from "@/components/CartCheckoutForm";
import { getUserIdCards } from "@/app/actions/id-cards";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "ยืนยันการจอง",
  robots: { index: false, follow: false },
};

type SP = { group?: string };

export default async function CartCheckoutPage({ searchParams }: { searchParams: SP }) {
  const groupKey = searchParams.group ?? "";

  // groupKey = `${shopId}|${startDate}|${endDate}` (URL-encoded by CartPageClient)
  const [shopId] = groupKey.split("|");

  const backHref = `/checkout/cart?group=${encodeURIComponent(groupKey)}`;
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(backHref)}`);

  if (!groupKey || !shopId) {
    return <Fallback msg="ลิงก์การจองไม่สมบูรณ์ กรุณากลับไปที่ตะกร้า" href="/cart" />;
  }

  const [addresses, shopRow, idCards] = await Promise.all([
    getMyAddresses(),
    db.shop.findUnique({
      where: { id: shopId },
      select: { name: true, hours: true, isOpen: true },
    }),
    getUserIdCards(),
  ]);

  const shopHours = shopRow ? parseBusinessHours(shopRow.hours) : null;
  const shopIsOpen = shopRow?.isOpen ?? true;

  return (
    <div className="container pt-10 pb-20 max-w-[640px]">
      <Link href="/cart" className="text-[14px] text-ink-3">
        ← กลับไปตะกร้า
      </Link>
      <h1 className="page-title text-[26px] font-semibold tracking-tight mt-3 mb-5">
        ยืนยันการจอง
      </h1>

      {shopRow ? (
        <div className="flex gap-3 items-center px-4 py-3 rounded-xl border border-line bg-surface mb-6 text-[14px]">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-ink-2"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
          <div>
            <div className="font-semibold text-ink">{shopRow.name}</div>
          </div>
        </div>
      ) : null}

      {/* CartCheckoutForm reads cart from localStorage via useCart, then filters by groupKey */}
      <CartCheckoutForm
        groupKey={groupKey}
        addresses={addresses}
        shopHours={shopHours}
        shopIsOpen={shopIsOpen}
        idCards={idCards}
      />
    </div>
  );
}

function Fallback({ msg, href }: { msg: string; href: string }) {
  return (
    <div className="container pt-20 pb-[100px] max-w-[520px] text-center">
      <p className="text-[16px] text-ink-2 mb-6">{msg}</p>
      <Link href={href} className="btn btn-dark py-3 px-[22px]">
        กลับไปตะกร้า
      </Link>
    </div>
  );
}
