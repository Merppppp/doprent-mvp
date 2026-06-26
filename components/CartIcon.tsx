"use client";

import Link from "next/link";
import { useCart } from "@/lib/cart";

export default function CartIcon() {
  const { items } = useCart();
  const totalQty = items.reduce((s, i) => s + i.qty, 0);

  return (
    <Link
      href="/cart"
      aria-label="ตะกร้าสินค้า"
      title="ตะกร้าสินค้า"
      className="hdr-icon-btn relative inline-flex items-center justify-center w-9 h-9 rounded-lg text-[rgba(255,255,255,0.85)]"
    >
      {/* Shopping cart icon */}
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="9" cy="21" r="1" />
        <circle cx="20" cy="21" r="1" />
        <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
      </svg>
      {totalQty > 0 && (
        <span
          className="absolute top-0.5 right-0.5 min-w-[16px] h-4 rounded-full bg-danger text-[color:var(--on-dark)] text-[10px] font-bold grid place-items-center px-1 leading-none"
        >
          {totalQty > 9 ? "9+" : totalQty}
        </span>
      )}
    </Link>
  );
}
