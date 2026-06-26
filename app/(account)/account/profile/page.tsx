import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import ProfileForm, { type ProfileValues } from "./ProfileForm";

export const metadata: Metadata = {
  title: "โปรไฟล์ของฉัน",
  robots: { index: false },
};

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect(`/login?next=${encodeURIComponent("/account/profile")}`);
  }

  const dbUser = await db.user.findUnique({
    where: { id: user.id },
    select: {
      email: true,
      fullName: true,
      lineId: true,
      phone: true,
      birthDate: true,
      image: true,
    },
  });

  const initial: ProfileValues = {
    email: dbUser?.email ?? null,
    fullName: dbUser?.fullName ?? null,
    lineId: dbUser?.lineId ?? null,
    phone: dbUser?.phone ?? null,
    birthDate: dbUser?.birthDate ? dbUser.birthDate.toISOString().slice(0, 10) : null,
    image: dbUser?.image ?? null,
  };

  return (
    <div className="max-w-[560px]">
      <div className="mb-6 max-[900px]:pr-12">
        <p className="mb-1 text-xs font-medium uppercase tracking-[0.12em] text-accent">บัญชีของฉัน</p>
        <h1 className="text-[22px] font-semibold tracking-[-0.01em]">โปรไฟล์ของฉัน</h1>
        <p className="mt-2 text-sm leading-6 text-ink-3">
          จัดการข้อมูลส่วนตัวของคุณ ข้อมูลทุกช่องสามารถเว้นว่างไว้ได้
        </p>
      </div>

      <section className="overflow-hidden rounded-xl border border-line bg-surface">
        <div className="flex items-start gap-3 border-b border-line px-5 py-4">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent">
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </div>
          <div>
            <h2 className="text-sm font-semibold text-ink">ข้อมูลส่วนตัว</h2>
            <p className="mt-0.5 text-xs leading-5 text-ink-3">ชื่อ รูปโปรไฟล์ และช่องทางติดต่อ</p>
          </div>
        </div>
        <ProfileForm initial={initial} />
      </section>
    </div>
  );
}
