"use client";

import { useRef, useState, useEffect } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, Pagination } from "swiper/modules";
import type { Swiper as SwiperType } from "swiper";
import Link from "next/link";
import type { Shop, Color } from "@/lib/types";

import "swiper/css";
import "swiper/css/pagination";
import { t, type Locale } from "@/lib/i18n";

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

export type BannerSlide = {
  id: string;
  title: string;
  imageUrl: string;
  linkUrl: string | null;
};

type Props = {
  shops: Shop[];
  slides?: BannerSlide[];
  locale?: Locale;
};

/* ------------------------------------------------------------------
   Banner images are served from object storage (MinIO dev / R2 prod).
   NEXT_PUBLIC_ASSET_BASE_URL e.g. https://s3.doprent.com/doprent-dev
------------------------------------------------------------------- */
const ASSET_BASE = process.env.NEXT_PUBLIC_ASSET_BASE_URL ?? "";

/* ------------------------------------------------------------------
   Sample fallback data — shown when shops prop has < 3 entries
------------------------------------------------------------------- */
const SAMPLE_SHOPS: Shop[] = [
  {
    id: "sample-1",
    slug: "maison-de-reve",
    name: "Maison de Rêve",
    owner_id: null,
    owner_name: null,
    area_key: "siam",
    area_label: "สยาม",
    address: null,
    house_no: null,
    street: null,
    subdistrict: null,
    district: null,
    province: "กรุงเทพมหานคร",
    postal_code: null,
    lat: null,
    lng: null,
    hours: null,
    line_url: "#",
    instagram: null,
    facebook: null,
    twitter: null,
    tiktok: null,
    since_year: 2020,
    cover_color: "rose",
    cover_image: `${ASSET_BASE}/banners/banner-1.png`,
    tag: "ชุดราตรีระดับ haute couture สำหรับทุกโอกาสพิเศษ",
    story: null,
    delivery_info: null,
    featured: true,
    verified: true,
    ads_tier: "featured",
    status: "live",
    reject_reason: null,
    kyc_status: "verified",
    rating_avg: null,
    rating_count: 0,
    is_open: true,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  },
  {
    id: "sample-2",
    slug: "blanc-atelier",
    name: "Blanc Atelier",
    owner_id: null,
    owner_name: null,
    area_key: "thonglor",
    area_label: "ทองหล่อ",
    address: null,
    house_no: null,
    street: null,
    subdistrict: null,
    district: null,
    province: "กรุงเทพมหานคร",
    postal_code: null,
    lat: null,
    lng: null,
    hours: null,
    line_url: "#",
    instagram: null,
    facebook: null,
    twitter: null,
    tiktok: null,
    since_year: 2019,
    cover_color: "ivory",
    cover_image: `${ASSET_BASE}/banners/banner-2.png`,
    tag: "ความงามแบบมินิมอล สง่างามในทุกรายละเอียด",
    story: null,
    delivery_info: null,
    featured: true,
    verified: true,
    ads_tier: "featured",
    status: "live",
    reject_reason: null,
    kyc_status: "verified",
    rating_avg: null,
    rating_count: 0,
    is_open: true,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  },
  {
    id: "sample-3",
    slug: "noir-studio",
    name: "Noir Studio",
    owner_id: null,
    owner_name: null,
    area_key: "silom",
    area_label: "สีลม",
    address: null,
    house_no: null,
    street: null,
    subdistrict: null,
    district: null,
    province: "กรุงเทพมหานคร",
    postal_code: null,
    lat: null,
    lng: null,
    hours: null,
    line_url: "#",
    instagram: null,
    facebook: null,
    twitter: null,
    tiktok: null,
    since_year: 2021,
    cover_color: "black",
    cover_image: `${ASSET_BASE}/banners/banner-3.png`,
    tag: "ชุดดำคลาสสิก กล้าหาญ และทรงพลัง",
    story: null,
    delivery_info: null,
    featured: false,
    verified: true,
    ads_tier: "boost",
    status: "live",
    reject_reason: null,
    kyc_status: "verified",
    rating_avg: null,
    rating_count: 0,
    is_open: true,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  },
  {
    id: "sample-4",
    slug: "ocean-blue-couture",
    name: "Ocean Blue Couture",
    owner_id: null,
    owner_name: null,
    area_key: "ari",
    area_label: "อารีย์",
    address: null,
    house_no: null,
    street: null,
    subdistrict: null,
    district: null,
    province: "กรุงเทพมหานคร",
    postal_code: null,
    lat: null,
    lng: null,
    hours: null,
    line_url: "#",
    instagram: null,
    facebook: null,
    twitter: null,
    tiktok: null,
    since_year: 2022,
    cover_color: "navy",
    cover_image: `${ASSET_BASE}/banners/banner-4.png`,
    tag: "สีน้ำทะเลลึก หรูหราอย่างมีจิตวิญญาณ",
    story: null,
    delivery_info: null,
    featured: false,
    verified: false,
    ads_tier: "free",
    status: "live",
    reject_reason: null,
    kyc_status: "verified",
    rating_avg: null,
    rating_count: 0,
    is_open: true,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  },
  {
    id: "sample-5",
    slug: "jardin-vert",
    name: "Jardin Vert",
    owner_id: null,
    owner_name: null,
    area_key: "charoenkriung",
    area_label: "เจริญกรุง",
    address: null,
    house_no: null,
    street: null,
    subdistrict: null,
    district: null,
    province: "กรุงเทพมหานคร",
    postal_code: null,
    lat: null,
    lng: null,
    hours: null,
    line_url: "#",
    instagram: null,
    facebook: null,
    twitter: null,
    tiktok: null,
    since_year: 2023,
    cover_color: "green",
    cover_image: `${ASSET_BASE}/banners/banner-5.png`,
    tag: "ธรรมชาติพบความหรูหรา ชุดสีเขียวที่ทำให้คุณเปล่งประกาย",
    story: null,
    delivery_info: null,
    featured: false,
    verified: true,
    ads_tier: "boost",
    status: "live",
    reject_reason: null,
    kyc_status: "verified",
    rating_avg: null,
    rating_count: 0,
    is_open: true,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  },
  {
    id: "sample-6",
    slug: "velvet-house",
    name: "Velvet House",
    owner_id: null,
    owner_name: null,
    area_key: "sukhumvit",
    area_label: "สุขุมวิท",
    address: null,
    house_no: null,
    street: null,
    subdistrict: null,
    district: null,
    province: "กรุงเทพมหานคร",
    postal_code: null,
    lat: null,
    lng: null,
    hours: null,
    line_url: "#",
    instagram: null,
    facebook: null,
    twitter: null,
    tiktok: null,
    since_year: 2018,
    cover_color: "purple",
    cover_image: `${ASSET_BASE}/banners/banner-6.png`,
    tag: "กำมะหยี่ สีม่วงเข้ม ความหรูหราที่จับต้องได้",
    story: null,
    delivery_info: null,
    featured: true,
    verified: true,
    ads_tier: "featured",
    status: "live",
    reject_reason: null,
    kyc_status: "verified",
    rating_avg: null,
    rating_count: 0,
    is_open: true,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  },
];

export default function BannerCarousel({ shops, slides, locale = "th" }: Props) {
  const swiperRef = useRef<SwiperType | null>(null);
  const paginationRef = useRef<HTMLDivElement>(null);
  const [swiperReady, setSwiperReady] = useState(false);

  // DB banners take priority; fall back to shop-derived slides
  const useDbBanners = slides && slides.length > 0;
  const displayShops = useDbBanners ? [] : (shops.length < 3 ? SAMPLE_SHOPS : shops);

  useEffect(() => {
    const swiper = swiperRef.current;
    if (!swiper || !paginationRef.current) return;
    const pag = swiper.params.pagination;
    if (pag && typeof pag !== "boolean") {
      pag.el = paginationRef.current;
    }
    swiper.pagination.destroy();
    swiper.pagination.init();
    swiper.pagination.update();
  }, [swiperReady]);

  const totalSlides = useDbBanners ? slides!.length : displayShops.length;
  if (totalSlides === 0) return null;

  return (
    <div className="banner-carousel">
      <Swiper
        modules={[Autoplay, Pagination]}
        loop={totalSlides >= 2}
        speed={700}
        autoplay={{ delay: 5500, disableOnInteraction: false, pauseOnMouseEnter: true }}
        pagination={{ clickable: true }}
        onSwiper={(swiper) => {
          swiperRef.current = swiper;
          setSwiperReady(true);
        }}
        className="bc-swiper"
      >
        {useDbBanners
          ? slides!.map((s) => {
              const bgStyle: React.CSSProperties = {
                backgroundImage: `linear-gradient(rgba(0,0,0,0.3), rgba(0,0,0,0.6)), url(${s.imageUrl})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              };
              const href = s.linkUrl ?? "#";
              return (
                <SwiperSlide key={s.id}>
                  <div className="bc-slide" style={bgStyle}>
                    <div className="bc-noise" aria-hidden />
                    <div className="bc-content">
                      <span className="bc-kicker">{t("banner.kicker", locale)}</span>
                      <h2 className="bc-name">{s.title}</h2>
                      {href !== "#" && (
                        <a href={href} className="bc-cta">
                          {t("banner.cta", locale)}
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
                        </a>
                      )}
                    </div>
                  </div>
                </SwiperSlide>
              );
            })
          : displayShops.map((b) => {
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
                    <div className="bc-noise" aria-hidden />
                    <div className="bc-content">
                      <span className="bc-kicker">{t("banner.kicker", locale)}</span>
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
                      {b.tag && <p className="bc-tag">{b.tag}</p>}
                      <Link href={`/shop/${b.slug}`} className="bc-cta">
                        {t("banner.cta", locale)}
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
                      </Link>
                    </div>
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

      {totalSlides >= 2 && (
        <>
          <button
            className="bc-arrow bc-arrow--prev"
            aria-label={t("banner.prevAria", locale)}
            onClick={() => swiperRef.current?.slidePrev()}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M15 18l-6-6 6-6"/></svg>
          </button>
          <button
            className="bc-arrow bc-arrow--next"
            aria-label={t("banner.nextAria", locale)}
            onClick={() => swiperRef.current?.slideNext()}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 18l6-6-6-6"/></svg>
          </button>
          <div ref={paginationRef} className="bc-dots" />
        </>
      )}

      <style dangerouslySetInnerHTML={{ __html: BC_CSS }} />
    </div>
  );
}

const BC_CSS = `
/* --- BannerCarousel wrapper --- */
.banner-carousel{position:relative;width:100%;overflow:hidden;border-radius:25px}

/* --- Swiper resets --- */
.bc-swiper{width:100%;height:100%}
.bc-swiper .swiper-wrapper{align-items:stretch}

/* --- Slide (single-column default) --- */
.bc-slide{
  position:relative;min-height:420px;display:flex;align-items:flex-end;overflow:hidden;
  border-radius:25px;padding:0;
}
@media(min-width:768px){.bc-slide{min-height:480px}}
@media(min-width:1200px){.bc-slide{min-height:520px}}

/* Noise overlay */
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
@media(min-width:768px){
  .bc-content{padding:48px 40px 72px}
}
@media(min-width:1200px){
  .bc-content{padding:56px 48px 80px}
}

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
  background:rgba(74,107,90,0.5); /* sage green, translucent over blur */
  color:#fff;
  border-color:rgba(154,196,173,0.45);
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

/* CTA button */
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

/* Nav arrows */
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
.bc-arrow:hover{opacity:1;background:rgba(46,156,101,0.85)}
.bc-arrow--prev{left:16px}
.bc-arrow--next{right:16px}
@media(max-width:480px){.bc-arrow{width:34px;height:34px}.bc-arrow--prev{left:10px}.bc-arrow--next{right:10px}}

/* Pagination dots */
.bc-dots{
  position:absolute;bottom:22px;left:50%;transform:translateX(-50%);z-index:10;
  display:flex;gap:6px;align-items:center;
}
.bc-dots .swiper-pagination-bullet{
  width:10px;height:10px;border-radius:999px;
  background:rgba(255,255,255,0.5);opacity:1;margin:0;
  border:2px solid rgba(255,255,255,0.7);
  transition:width .3s ease,background .3s ease,border-color .3s ease;
  cursor:pointer;
}
.bc-dots .swiper-pagination-bullet:hover{
  background:rgba(255,255,255,0.8);
}
.bc-dots .swiper-pagination-bullet-active{
  width:28px;
  background:rgba(46,156,101,0.9);
  border-color:rgba(46,156,101,1);
}

/* Reduce motion */
@media(prefers-reduced-motion:reduce){
  .bc-swiper .swiper-wrapper{transition-duration:0ms!important}
  .bc-cta{transition:none}
  .bc-arrow{transition:none}
}
`;
