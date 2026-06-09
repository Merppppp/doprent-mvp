"use client";

import { useRef } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Autoplay, Pagination } from "swiper/modules";
import Link from "next/link";
import type { Boutique, Color } from "@/lib/types";

import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";

/* ------------------------------------------------------------------
   Gradient palette per boutique cover_color
   Each pair: [from, to] in oklch — warm, editorial feel
------------------------------------------------------------------- */
const COLOR_GRAD: Record<Color, [string, string]> = {
  rose: ["oklch(0.65 0.09 10)", "oklch(0.38 0.08 355)"],
  ivory: ["oklch(0.82 0.07 78)", "oklch(0.52 0.08 55)"],
  green: ["oklch(0.52 0.09 158)", "oklch(0.30 0.07 168)"],
  black: ["oklch(0.30 0.016 70)", "oklch(0.16 0.012 60)"],
  navy: ["oklch(0.36 0.08 245)", "oklch(0.22 0.06 250)"],
  red: ["oklch(0.54 0.17 27)", "oklch(0.34 0.14 20)"],
  blue: ["oklch(0.60 0.08 228)", "oklch(0.38 0.07 238)"],
  purple: ["oklch(0.55 0.09 292)", "oklch(0.34 0.08 298)"],
};

type Props = {
  boutiques: Boutique[];
};

export default function BannerCarousel({ boutiques }: Props) {
  const prevRef = useRef<HTMLButtonElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);

  if (boutiques.length === 0) return null;

  return (
    <div className="banner-carousel">
      <Swiper
        modules={[Navigation, Autoplay, Pagination]}
        loop={boutiques.length >= 2}
        speed={700}
        autoplay={{ delay: 5500, disableOnInteraction: false, pauseOnMouseEnter: true }}
        pagination={{ clickable: true, el: ".bc-dots" }}
        navigation={{ prevEl: prevRef.current, nextEl: nextRef.current }}
        onBeforeInit={(swiper) => {
          // wire refs before init so navigation works on first render
          if (typeof swiper.params.navigation !== "boolean" && swiper.params.navigation) {
            swiper.params.navigation.prevEl = prevRef.current;
            swiper.params.navigation.nextEl = nextRef.current;
          }
        }}
        className="bc-swiper"
      >
        {boutiques.map((b) => {
          const [from, to] = COLOR_GRAD[b.cover_color] ?? COLOR_GRAD.green;
          const bgStyle = b.cover_image
            ? {
                backgroundImage: `linear-gradient(rgba(0,0,0,0.25), rgba(0,0,0,0.55)), url(${b.cover_image})`,
                backgroundSize: "cover" as const,
                backgroundPosition: "center" as const,
              }
            : { background: `linear-gradient(135deg, ${from} 0%, ${to} 100%)` };

          return (
            <SwiperSlide key={b.id}>
              <div className="bc-slide" style={bgStyle}>
                {/* Noise texture overlay — adds editorial grain without images */}
                <div className="bc-noise" aria-hidden />
                {/* Content */}
                <div className="bc-content">
                  {/* Kicker label */}
                  <span className="bc-kicker">ร้านค้าแนะนำ</span>

                  <div className="bc-badges">
                    {b.verified && (
                      <span className="bc-badge bc-badge--verified">
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5"><polyline points="4,12 10,18 20,6" /></svg>
                        Verified
                      </span>
                    )}
                    <span className="bc-badge bc-badge--area">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 21s-7-6.5-7-11a7 7 0 0 1 14 0c0 4.5-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/></svg>
                      {b.area_label}
                    </span>
                  </div>

                  <h2 className="bc-name">{b.name}</h2>

                  {b.tag && (
                    <p className="bc-tag">{b.tag}</p>
                  )}

                  <Link href={`/boutique/${b.slug}`} className="bc-cta">
                    ดูร้านค้า
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
                  </Link>
                </div>

                {/* Decorative shapes — only shown when no cover image */}
                {!b.cover_image && (
                  <>
                    <div className="bc-deco bc-deco--1" aria-hidden />
                    <div className="bc-deco bc-deco--2" aria-hidden />
                  </>
                )}
              </div>
            </SwiperSlide>
          );
        })}
      </Swiper>

      {boutiques.length >= 2 && (
        <>
          {/* Custom nav arrows */}
          <button ref={prevRef} className="bc-arrow bc-arrow--prev" aria-label="ร้านก่อนหน้า">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M15 18l-6-6 6-6"/></svg>
          </button>
          <button ref={nextRef} className="bc-arrow bc-arrow--next" aria-label="ร้านถัดไป">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 18l6-6-6-6"/></svg>
          </button>

          {/* Custom pagination dots */}
          <div className="bc-dots" />
        </>
      )}

      <style dangerouslySetInnerHTML={{ __html: BC_CSS }} />
    </div>
  );
}

const BC_CSS = `
/* --- BannerCarousel wrapper --- */
.banner-carousel{position:relative;width:100%;overflow:hidden;border-radius:0}

/* --- Swiper resets --- */
.bc-swiper{width:100%;height:100%}
.bc-swiper .swiper-wrapper{align-items:stretch}

/* --- Slide --- */
.bc-slide{
  position:relative;min-height:420px;display:flex;align-items:flex-end;overflow:hidden;
  padding:0;
}
@media(min-width:768px){.bc-slide{min-height:480px}}
@media(min-width:1200px){.bc-slide{min-height:520px}}

/* Noise overlay — SVG turbulence for grain without a PNG */
.bc-noise{
  position:absolute;inset:0;z-index:1;opacity:.06;pointer-events:none;
  background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='300' height='300' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E");
  background-size:300px 300px;
}

/* Decorative blobs */
.bc-deco{position:absolute;border-radius:50%;pointer-events:none;z-index:1;opacity:.12}
.bc-deco--1{width:360px;height:360px;top:-80px;right:-60px;background:rgba(255,255,255,0.5);filter:blur(48px)}
.bc-deco--2{width:200px;height:200px;bottom:-60px;left:40%;background:rgba(255,255,255,0.35);filter:blur(32px)}

/* Content block */
.bc-content{
  position:relative;z-index:2;
  width:100%;max-width:1160px;margin:0 auto;
  padding:36px 24px 60px;
  display:flex;flex-direction:column;align-items:flex-start;gap:14px;
}
@media(min-width:768px){.bc-content{padding:48px 40px 72px}}
@media(min-width:1200px){.bc-content{padding:56px 48px 80px}}

/* Kicker label */
.bc-kicker{font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;color:rgba(255,255,255,0.7);margin-bottom:2px}

/* Badges row */
.bc-badges{display:flex;gap:8px;flex-wrap:wrap}
.bc-badge{
  display:inline-flex;align-items:center;gap:5px;
  font-size:12px;font-weight:600;
  padding:5px 11px;border-radius:999px;letter-spacing:.01em;
  backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);
  border:1px solid rgba(255,255,255,0.3);
}
.bc-badge--verified{
  background:rgba(255,255,255,0.22);
  color:#fff;
}
.bc-badge--area{
  background:rgba(0,0,0,0.18);
  color:rgba(255,255,255,0.9);
}

/* Shop name */
.bc-name{
  font-size:clamp(26px,4.5vw,52px);font-weight:700;
  color:#fff;letter-spacing:-0.02em;line-height:1.1;margin:0;
  text-shadow:0 2px 16px rgba(0,0,0,0.18);
}

/* Tagline */
.bc-tag{
  font-size:clamp(14px,1.8vw,17px);color:rgba(255,255,255,0.82);
  max-width:52ch;margin:0;line-height:1.55;
  text-shadow:0 1px 8px rgba(0,0,0,0.15);
}

/* CTA button — solid white */
.bc-cta{
  display:inline-flex;align-items:center;gap:7px;
  padding:12px 22px;border-radius:999px;
  background:#fff;
  border:none;
  color:#1a1815;font-size:14.5px;font-weight:600;
  text-decoration:none;letter-spacing:.01em;
  transition:background .2s ease,transform .2s ease;
  margin-top:4px;
}
.bc-cta:hover{
  background:rgba(255,255,255,0.9);
  transform:translateX(2px);
}

/* Nav arrows — hidden by default, show on carousel hover */
.bc-arrow{
  position:absolute;top:50%;transform:translateY(-50%);z-index:10;
  width:40px;height:40px;border-radius:50%;
  background:rgba(255,255,255,0.16);
  backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);
  border:1.5px solid rgba(255,255,255,0.3);
  color:#fff;cursor:pointer;
  display:grid;place-items:center;
  transition:opacity .2s ease,background .2s ease;
  opacity:0;
}
.banner-carousel:hover .bc-arrow{opacity:.8}
.bc-arrow:hover{opacity:1;background:rgba(255,255,255,0.28)}
.bc-arrow--prev{left:16px}
.bc-arrow--next{right:16px}
@media(max-width:480px){.bc-arrow{width:34px;height:34px}.bc-arrow--prev{left:10px}.bc-arrow--next{right:10px}}

/* Pagination dots */
.bc-dots{
  position:absolute;bottom:22px;left:50%;transform:translateX(-50%);z-index:10;
  display:flex;gap:6px;align-items:center;
}
.bc-dots .swiper-pagination-bullet{
  width:6px;height:6px;border-radius:999px;
  background:rgba(255,255,255,0.55);opacity:1;margin:0;
  transition:width .3s ease,background .3s ease;
}
.bc-dots .swiper-pagination-bullet-active{
  width:20px;
  background:#fff;
}

/* Reduce motion */
@media(prefers-reduced-motion:reduce){
  .bc-swiper .swiper-wrapper{transition-duration:0ms!important}
  .bc-cta{transition:none}
  .bc-arrow{transition:none}
}
`;
