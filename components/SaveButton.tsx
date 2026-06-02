"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toggleSavedDress } from "@/app/actions/saved";

type Props = {
  dressId: string;
  initialSaved?: boolean;
  isLoggedIn?: boolean;
  variant?: "card" | "detail";
};

export default function SaveButton({
  dressId,
  initialSaved = false,
  isLoggedIn = false,
  variant = "card",
}: Props) {
  const router = useRouter();
  const [saved, setSaved] = useState(initialSaved);
  const [bump, setBump] = useState(false);
  const [isPending, startTransition] = useTransition();

  function onClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();

    if (!isLoggedIn) {
      router.push(`/login?next=${encodeURIComponent(window.location.pathname)}`);
      return;
    }

    // optimistic
    setSaved((s) => {
      if (!s) setBump(true); // pop only when newly saved
      return !s;
    });
    startTransition(async () => {
      const res = await toggleSavedDress(dressId);
      if (!res.ok) {
        setSaved((s) => !s); // revert
      } else {
        setSaved(res.saved);
        // Refresh server components so Header saved-count badge updates
        router.refresh();
      }
    });
  }

  if (variant === "detail") {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-label={saved ? "นำออกจากรายการบันทึก" : "บันทึกชุดนี้"}
        disabled={isPending}
        style={{
          width: 48,
          padding: 0,
          border: `1px solid ${saved ? "var(--cobalt)" : "var(--line)"}`,
          background: "var(--surface)",
          borderRadius: 8,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: saved ? "var(--cobalt)" : "var(--ink-2)",
          cursor: isPending ? "wait" : "pointer",
          transition:
            "color var(--dur-1) var(--ease), border-color var(--dur-1) var(--ease)",
        }}
      >
        <span
          className={bump ? "pop" : undefined}
          onAnimationEnd={() => setBump(false)}
          style={{ display: "inline-flex" }}
        >
          <HeartIcon filled={saved} size={18} />
        </span>
      </button>
    );
  }

  // card variant — overlay
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={saved ? "นำออก" : "บันทึก"}
      disabled={isPending}
      style={{
        position: "absolute",
        top: 10,
        right: 10,
        width: 32,
        height: 32,
        borderRadius: 999,
        background: "oklch(0.99 0.007 88 / 0.93)",
        backdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: saved ? "var(--cobalt)" : "var(--ink-2)",
        cursor: isPending ? "wait" : "pointer",
        zIndex: 2,
        transition: "color var(--dur-1) var(--ease)",
      }}
    >
      <span
        className={bump ? "pop" : undefined}
        onAnimationEnd={() => setBump(false)}
        style={{ display: "inline-flex" }}
      >
        <HeartIcon filled={saved} size={16} />
      </span>
    </button>
  );
}

function HeartIcon({ filled, size }: { filled: boolean; size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={1.8}
    >
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  );
}
