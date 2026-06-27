import type { Metadata } from "next";
import CartPageClient from "@/components/CartPageClient";

export const metadata: Metadata = {
  title: "ตะกร้าสินค้า",
  robots: { index: false, follow: false },
};

export default function CartPage() {
  return <CartPageClient />;
}
