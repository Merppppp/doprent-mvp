"use client";

import { Swiper, SwiperSlide } from "swiper/react";
import { EffectCards, Autoplay } from "swiper/modules";
import Link from "next/link";
import { DressArt } from "@/components/DressArt";

import "swiper/css";
import "swiper/css/effect-cards";

type SlideData = {
  id: string;
  slug: string;
  name: string;
  price_per_day: number;
  image: string | null;
  color: string;
};

const FALLBACK: SlideData[] = (
  ["rose", "navy", "green", "purple", "ivory"] as const
).map((c, i) => ({
  id: c,
  slug: "",
  name: "Coming Soon",
  price_per_day: 0,
  image: null,
  color: c,
}));

export default function HeroSwiper({ slides }: { slides: SlideData[] }) {
  const items = slides.length > 0 ? slides : FALLBACK;

  return (
    <div className="hero-swiper-wrap">
      <Swiper
        modules={[EffectCards, Autoplay]}
        effect="cards"
        grabCursor
        speed={600}
        autoplay={{ delay: 3500, disableOnInteraction: true }}
        cardsEffect={{
          perSlideOffset: 10,
          perSlideRotate: 3,
          rotate: true,
          slideShadows: true,
        }}
        className="hero-cards-swiper"
      >
        {items.map((d, i) => (
          <SwiperSlide key={d.id} className="hero-card-slide">
            {d.slug ? (
              <Link href={`/dress/${d.slug}`} className="hero-card-inner">
                <div className="hero-card-img">
                  {d.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={d.image}
                      alt={d.name}
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                      }}
                    />
                  ) : (
                    <DressArt color={d.color as any} variant={i} />
                  )}
                </div>
                <div className="hero-card-label">
                  <span className="hero-card-name">{d.name}</span>
                  {d.price_per_day > 0 && (
                    <span className="hero-card-price">
                      ฿{d.price_per_day.toLocaleString()}/วัน
                    </span>
                  )}
                </div>
              </Link>
            ) : (
              <div className="hero-card-inner">
                <div className="hero-card-img">
                  <DressArt color={d.color as any} variant={i} />
                </div>
                <div className="hero-card-label">
                  <span
                    className="hero-card-name"
                    style={{ color: "var(--ink-3)" }}
                  >
                    {d.name}
                  </span>
                </div>
              </div>
            )}
          </SwiperSlide>
        ))}
      </Swiper>
    </div>
  );
}
