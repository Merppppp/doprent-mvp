"use client";

import { useState } from "react";

export default function Gallery({ images, alt }: { images: string[]; alt: string }) {
  const [active, setActive] = useState(0);
  const [errored, setErrored] = useState<Record<number, boolean>>({});
  const safe = images?.length ? images : [];

  if (!safe.length) {
    return (
      <div className="flex aspect-[4/5] w-full items-center justify-center rounded-2xl bg-sand text-ink/40">
        ยังไม่มีรูป
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-2xl bg-sand">
        {errored[active] ? (
          <div className="flex aspect-[4/5] w-full items-center justify-center bg-sand text-ink/40">
            โหลดรูปไม่สำเร็จ
          </div>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={safe[active]}
            alt={alt}
            onError={() => setErrored((p) => ({ ...p, [active]: true }))}
            className="aspect-[4/5] w-full object-cover"
          />
        )}
      </div>
      {safe.length > 1 && (
        <div
          role="tablist"
          aria-label={`รูปทั้งหมดของ ${alt}`}
          className="grid grid-cols-4 gap-2 sm:grid-cols-5"
        >
          {safe.map((src, i) => {
            const isActive = i === active;
            return (
              <button
                key={src + i}
                type="button"
                role="tab"
                aria-selected={isActive}
                aria-label={`รูปที่ ${i + 1}`}
                onClick={() => setActive(i)}
                className={`overflow-hidden rounded-lg ring-1 transition ${
                  isActive ? "ring-ink" : "ring-sand hover:ring-ink/40"
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={src}
                  alt=""
                  loading="lazy"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).style.opacity = "0.3";
                  }}
                  className="aspect-square w-full object-cover"
                />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
