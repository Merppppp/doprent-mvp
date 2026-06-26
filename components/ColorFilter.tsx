"use client";

import { useRouter, useSearchParams } from "next/navigation";

const SWATCH: Record<string, string> = {
  rose: "#c98a8a",
  ivory: "#efe6d6",
  black: "#1a1a1a",
  red: "#c0392b",
  blue: "#6a8caf",
  navy: "#1f2c4c",
  green: "#5b7a5b",
  purple: "#8a6fa5"
};

const LABEL_TH: Record<string, string> = {
  rose: "ชมพู",
  ivory: "ครีม",
  black: "ดำ",
  red: "แดง",
  blue: "ฟ้า",
  navy: "กรมท่า",
  green: "เขียว",
  purple: "ม่วง"
};

export default function ColorFilter({ colors }: { colors: string[] }) {
  const router = useRouter();
  const params = useSearchParams();
  const active = params.get("color") ?? "all";

  const set = (next: string) => {
    const sp = new URLSearchParams(params.toString());
    if (next === "all") sp.delete("color");
    else sp.set("color", next);
    router.push(`/${sp.toString() ? `?${sp}` : ""}`);
  };

  const opts = ["all", ...colors];

  return (
    <div
      role="radiogroup"
      aria-label="กรองตามสี"
      className="flex flex-wrap items-center gap-2"
    >
      {opts.map((c) => {
        const isActive = c === active;
        const label = c === "all" ? "ทั้งหมด" : LABEL_TH[c] ?? c;
        return (
          <button
            key={c}
            type="button"
            role="radio"
            aria-checked={isActive}
            aria-label={`กรองสี ${label}`}
            onClick={() => set(c)}
            className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition ${
              isActive
                ? "border-ink bg-ink text-cream"
                : "border-line bg-white text-ink hover:border-ink-3"
            }`}
          >
            {c !== "all" && (
              <span
                aria-hidden
                className="h-3 w-3 rounded-full ring-1 ring-black/10"
                style={{ background: SWATCH[c] ?? "#ccc" }}
              />
            )}
            {label}
          </button>
        );
      })}
    </div>
  );
}
