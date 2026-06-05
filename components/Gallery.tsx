"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Dress gallery with a fullscreen lightbox.
 *
 * - Click the main image (or any thumb) to open a fullscreen viewer.
 * - In the lightbox: ← / → or swipe to move between images, Esc / tap-outside
 *   to close. Body scroll is locked while open.
 * - Falls back to a "no image" tile when `images` is empty so the page never
 *   renders a broken <img>.
 */
export default function Gallery({ images, alt }: { images: string[]; alt: string }) {
  const safe = images?.length ? images : [];
  const [active, setActive] = useState(0);
  const [errored, setErrored] = useState<Record<number, boolean>>({});
  const [lightbox, setLightbox] = useState(false);

  const count = safe.length;
  const go = useCallback(
    (dir: 1 | -1) => setActive((i) => (i + dir + count) % count),
    [count],
  );

  // Keyboard nav + body-scroll lock while the lightbox is open.
  useEffect(() => {
    if (!lightbox) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightbox(false);
      else if (e.key === "ArrowRight") go(1);
      else if (e.key === "ArrowLeft") go(-1);
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [lightbox, go]);

  // Touch swipe (lightbox).
  const touchX = useRef<number | null>(null);
  const onTouchStart = (e: React.TouchEvent) => {
    touchX.current = e.touches[0]?.clientX ?? null;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchX.current == null) return;
    const dx = (e.changedTouches[0]?.clientX ?? touchX.current) - touchX.current;
    if (Math.abs(dx) > 44 && count > 1) go(dx < 0 ? 1 : -1);
    touchX.current = null;
  };

  if (!count) {
    return (
      <div
        style={{
          aspectRatio: "4/5",
          borderRadius: 8,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "var(--bg)",
          color: "var(--ink-3)",
          fontSize: 14,
        }}
      >
        ยังไม่มีรูป
      </div>
    );
  }

  return (
    <div className="dr-gal">
      {/* main image — click to enlarge */}
      <button
        type="button"
        className="dr-gal-main"
        onClick={() => setLightbox(true)}
        aria-label="ดูรูปขนาดเต็ม"
      >
        {errored[active] ? (
          <span className="dr-gal-broken">โหลดรูปไม่สำเร็จ</span>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={safe[active]}
            alt={alt}
            onError={() => setErrored((p) => ({ ...p, [active]: true }))}
          />
        )}
        <span className="dr-gal-zoom" aria-hidden>
          <svg viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="7" />
            <line x1="16.5" y1="16.5" x2="21" y2="21" />
            <line x1="11" y1="8" x2="11" y2="14" />
            <line x1="8" y1="11" x2="14" y2="11" />
          </svg>
        </span>
        {count > 1 ? <span className="dr-gal-badge">1 / {count}</span> : null}
      </button>

      {/* thumbnails */}
      {count > 1 ? (
        <div className="dr-gal-thumbs" role="tablist" aria-label={`รูปทั้งหมดของ ${alt}`}>
          {safe.map((src, i) => (
            <button
              key={src + i}
              type="button"
              role="tab"
              aria-selected={i === active}
              aria-label={`รูปที่ ${i + 1}`}
              className={`dr-gal-thumb${i === active ? " is-active" : ""}`}
              onClick={() => setActive(i)}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={src}
                alt=""
                loading="lazy"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.opacity = "0.3";
                }}
              />
            </button>
          ))}
        </div>
      ) : null}

      {/* lightbox */}
      {lightbox ? (
        <div
          className="dr-lb"
          role="dialog"
          aria-modal="true"
          aria-label={alt}
          onClick={() => setLightbox(false)}
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
        >
          <button type="button" className="dr-lb-close" aria-label="ปิด" onClick={() => setLightbox(false)}>
            <svg viewBox="0 0 24 24"><line x1="6" y1="6" x2="18" y2="18" /><line x1="18" y1="6" x2="6" y2="18" /></svg>
          </button>

          {count > 1 ? (
            <button
              type="button"
              className="dr-lb-nav dr-lb-prev"
              aria-label="รูปก่อนหน้า"
              onClick={(e) => { e.stopPropagation(); go(-1); }}
            >
              <svg viewBox="0 0 24 24"><polyline points="15,5 8,12 15,19" /></svg>
            </button>
          ) : null}

          {/* stop propagation so clicking the image doesn't close */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className="dr-lb-img"
            src={safe[active]}
            alt={alt}
            onClick={(e) => e.stopPropagation()}
          />

          {count > 1 ? (
            <button
              type="button"
              className="dr-lb-nav dr-lb-next"
              aria-label="รูปถัดไป"
              onClick={(e) => { e.stopPropagation(); go(1); }}
            >
              <svg viewBox="0 0 24 24"><polyline points="9,5 16,12 9,19" /></svg>
            </button>
          ) : null}

          {count > 1 ? <span className="dr-lb-count">{active + 1} / {count}</span> : null}
        </div>
      ) : null}

      <style
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: GAL_CSS }}
      />
    </div>
  );
}

const GAL_CSS = `
.dr-gal{display:flex;flex-direction:column;gap:10px}
.dr-gal-main{position:relative;display:block;width:100%;aspect-ratio:4/5;border-radius:8px;overflow:hidden;background:var(--bg);border:0;padding:0;cursor:zoom-in}
.dr-gal-main img{width:100%;height:100%;object-fit:cover;transition:transform .5s cubic-bezier(0.22,1,0.36,1)}
.dr-gal-main:hover img{transform:scale(1.03)}
.dr-gal-broken{display:flex;width:100%;height:100%;align-items:center;justify-content:center;color:var(--ink-3);font-size:14px}
.dr-gal-zoom{position:absolute;right:12px;bottom:12px;width:34px;height:34px;border-radius:999px;display:grid;place-items:center;background:color-mix(in oklch,var(--ink) 78%,transparent);opacity:0;transform:translateY(4px);transition:opacity .35s var(--ease,ease),transform .35s var(--ease,ease)}
.dr-gal-main:hover .dr-gal-zoom{opacity:1;transform:translateY(0)}
.dr-gal-zoom svg{width:17px;height:17px;stroke:var(--on-dark,#fff);stroke-width:2;fill:none;stroke-linecap:round}
.dr-gal-badge{position:absolute;left:12px;top:12px;background:color-mix(in oklch,var(--ink) 70%,transparent);color:var(--on-dark,#fff);font-size:12px;font-weight:500;padding:3px 9px;border-radius:999px;font-variant-numeric:tabular-nums}
.dr-gal-thumbs{display:grid;grid-template-columns:repeat(5,1fr);gap:8px}
.dr-gal-thumb{aspect-ratio:3/4;border-radius:6px;overflow:hidden;border:2px solid transparent;padding:0;cursor:pointer;background:var(--bg);transition:border-color .25s var(--ease,ease)}
.dr-gal-thumb img{width:100%;height:100%;object-fit:cover}
.dr-gal-thumb:hover{border-color:color-mix(in oklch,var(--ink) 30%,transparent)}
.dr-gal-thumb.is-active{border-color:var(--ink)}
.dr-lb{position:fixed;inset:0;z-index:1000;display:flex;align-items:center;justify-content:center;background:color-mix(in oklch,var(--ink) 90%,#000);padding:48px 16px;animation:drlbin .22s var(--ease,ease)}
@keyframes drlbin{from{opacity:0}to{opacity:1}}
.dr-lb-img{max-width:min(92vw,820px);max-height:88vh;object-fit:contain;border-radius:8px;box-shadow:0 30px 80px -20px rgba(0,0,0,.6);cursor:default;animation:drimgin .28s cubic-bezier(0.22,1,0.36,1)}
@keyframes drimgin{from{opacity:0;transform:scale(.97)}to{opacity:1;transform:scale(1)}}
.dr-lb-close{position:absolute;top:18px;right:18px;width:44px;height:44px;border-radius:999px;border:0;display:grid;place-items:center;cursor:pointer;background:color-mix(in oklch,var(--on-dark,#fff) 16%,transparent);color:var(--on-dark,#fff)}
.dr-lb-close:hover{background:color-mix(in oklch,var(--on-dark,#fff) 26%,transparent)}
.dr-lb-close svg{width:20px;height:20px;stroke:currentColor;stroke-width:2;fill:none;stroke-linecap:round}
.dr-lb-nav{position:absolute;top:50%;transform:translateY(-50%);width:46px;height:46px;border-radius:999px;border:0;display:grid;place-items:center;cursor:pointer;background:color-mix(in oklch,var(--on-dark,#fff) 14%,transparent);color:var(--on-dark,#fff);transition:background .25s ease}
.dr-lb-nav:hover{background:color-mix(in oklch,var(--on-dark,#fff) 26%,transparent)}
.dr-lb-nav svg{width:22px;height:22px;stroke:currentColor;stroke-width:2;fill:none;stroke-linecap:round;stroke-linejoin:round}
.dr-lb-prev{left:14px}
.dr-lb-next{right:14px}
.dr-lb-count{position:absolute;bottom:20px;left:50%;transform:translateX(-50%);color:var(--on-dark,#fff);font-size:13px;font-weight:500;background:color-mix(in oklch,var(--on-dark,#fff) 12%,transparent);padding:5px 13px;border-radius:999px;font-variant-numeric:tabular-nums}
@media (max-width:600px){
  .dr-gal-thumbs{grid-template-columns:repeat(4,1fr)}
  .dr-lb-nav{width:40px;height:40px}
  .dr-lb{padding:64px 8px}
}
@media (prefers-reduced-motion:reduce){
  .dr-gal-main img,.dr-lb,.dr-lb-img,.dr-gal-zoom{animation:none;transition:none}
  .dr-gal-main:hover img{transform:none}
}
`;
