"use client";

import { useState, useEffect } from "react";

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
  const [open, setOpen] = useState(false);

  if (failed) {
    return (
      <div className="flex flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-[var(--line)] bg-[var(--bg)] px-4 py-8 text-center">
        <span className="text-sm font-medium text-[var(--ink-2)]">ไม่สามารถโหลดรูปได้</span>
        <span className="text-xs text-[var(--ink-3)]">ไฟล์อาจถูกลบหรือหมดอายุ ลองรีเฟรชหน้าอีกครั้ง</span>
      </div>
    );
  }

  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        onError={() => setFailed(true)}
        onClick={() => setOpen(true)}
        className={`cursor-zoom-in ${
          contain
            ? "max-h-[400px] w-full rounded-lg border border-[var(--line)] bg-[var(--bg)] object-contain"
            : "w-full rounded-lg border border-[var(--line)]"
        }`}
      />
      {open && <Lightbox src={src} alt={alt} onClose={() => setOpen(false)} />}
    </>
  );
}

function Lightbox({ src, alt, onClose }: { src: string; alt: string; onClose: () => void }) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/85 p-4"
      style={{ cursor: "zoom-out" }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        className="max-h-[92vh] max-w-[95vw] rounded-lg object-contain"
      />
      <button
        type="button"
        onClick={onClose}
        aria-label="ปิด"
        className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full border-none bg-white/15 text-xl text-white"
        style={{ cursor: "pointer" }}
      >
        &#x2715;
      </button>
    </div>
  );
}
