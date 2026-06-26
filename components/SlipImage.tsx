"use client";

import { useState } from "react";

export default function SlipImage({
  src,
  alt = "สลิป",
  contain = false,
}: {
  src: string;
  alt?: string;
  contain?: boolean;
}) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div className="flex flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-[var(--line)] bg-[var(--bg)] px-4 py-8 text-center">
        <span className="text-sm font-medium text-[var(--ink-2)]">ไม่สามารถโหลดรูปสลิปได้</span>
        <span className="text-xs text-[var(--ink-3)]">ไฟล์อาจถูกลบหรือหมดอายุ ลองรีเฟรชหน้าอีกครั้ง</span>
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      onError={() => setFailed(true)}
      className={
        contain
          ? "max-h-[400px] w-full rounded-lg border border-[var(--line)] bg-[var(--bg)] object-contain"
          : "w-full rounded-lg border border-[var(--line)]"
      }
    />
  );
}
