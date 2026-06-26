"use client";

import { useRef, useState, useTransition } from "react";
import { updateUserProfile } from "@/app/actions/account";

export type ProfileValues = {
  email: string | null;
  fullName: string | null;
  lineId: string | null;
  phone: string | null;
  birthDate: string | null; // YYYY-MM-DD
  image: string | null;
};

const inputClassName =
  "w-full rounded-lg border border-line bg-bg px-3 py-2.5 text-[15px] text-ink outline-none transition placeholder:text-ink-3 focus:border-accent focus:ring-2 focus:ring-accent-soft";

export default function ProfileForm({ initial }: { initial: ProfileValues }) {
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  const [image, setImage] = useState<string | null>(initial.image);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function onPickImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setMessage(null);
    if (file.size > 2 * 1024 * 1024) {
      setMessage({ ok: false, text: "ไฟล์ใหญ่เกิน 2MB" });
      e.target.value = "";
      return;
    }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.set("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) {
        setMessage({ ok: false, text: data.error ?? "อัปโหลดรูปไม่สำเร็จ" });
        return;
      }
      setImage(data.urls?.thumb ?? data.url);
    } catch {
      setMessage({ ok: false, text: "อัปโหลดรูปไม่สำเร็จ ลองใหม่อีกครั้ง" });
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);

    const phone = String(fd.get("phone") ?? "").trim();
    if (phone && !/^0[0-9]{8,9}$/.test(phone)) {
      setMessage({ ok: false, text: "เบอร์โทรไม่ถูกต้อง (ตัวเลข 9–10 หลัก ขึ้นต้นด้วย 0)" });
      return;
    }
    if (image) fd.set("image", image);

    setMessage(null);
    startTransition(async () => {
      const res = await updateUserProfile(fd);
      if (res.ok) {
        setMessage({ ok: true, text: "บันทึกข้อมูลเรียบร้อยแล้ว" });
      } else {
        setMessage({ ok: false, text: res.error ?? "เกิดข้อผิดพลาด ลองใหม่อีกครั้ง" });
      }
    });
  }

  const initials = (initial.fullName || initial.email || "?")
    .trim()
    .split(/\s+/)
    .map((s) => s[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <form onSubmit={handleSubmit} noValidate className="px-5 py-5">
      {message && (
        <div
          role="status"
          className={`mb-5 rounded-lg border px-3.5 py-2.5 text-sm ${
            message.ok ? "border-success bg-success-soft text-success" : "border-danger bg-danger-soft text-danger"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Avatar */}
      <div className="mb-6 flex items-center gap-4">
        <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full bg-ink text-2xl font-semibold text-on-dark">
          {image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={image} alt="รูปโปรไฟล์" className="h-full w-full object-cover" />
          ) : (
            <span>{initials}</span>
          )}
        </div>
        <div>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="inline-flex items-center justify-center rounded-lg border border-line bg-bg px-3.5 py-2 text-sm font-medium text-ink transition hover:border-accent hover:text-accent disabled:cursor-wait disabled:opacity-60"
          >
            {uploading ? "กำลังอัปโหลด…" : "เปลี่ยนรูป"}
          </button>
          {image && (
            <button
              type="button"
              onClick={() => setImage(null)}
              className="ml-2 text-sm text-ink-3 transition hover:text-danger"
            >
              ลบรูป
            </button>
          )}
          <p className="mt-1.5 text-xs text-ink-3">JPG, PNG หรือ WebP · ไม่เกิน 2MB</p>
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={onPickImage} className="hidden" />
        </div>
      </div>

      <div className="space-y-5">
        <div>
          <label htmlFor="full_name" className="mb-1.5 block text-[13px] font-medium text-ink-2">
            ชื่อ-นามสกุล
          </label>
          <input
            id="full_name"
            name="full_name"
            type="text"
            defaultValue={initial.fullName ?? ""}
            placeholder="เช่น สมหญิง ใจดี"
            className={inputClassName}
            autoComplete="name"
          />
        </div>

        <div>
          <label htmlFor="email" className="mb-1.5 block text-[13px] font-medium text-ink-2">
            อีเมล <span className="font-normal text-ink-3">(แก้ไขไม่ได้)</span>
          </label>
          <input
            id="email"
            type="email"
            value={initial.email ?? ""}
            disabled
            className={`${inputClassName} cursor-not-allowed text-ink-3 opacity-70`}
          />
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="phone" className="mb-1.5 block text-[13px] font-medium text-ink-2">
              เบอร์โทร
            </label>
            <input
              id="phone"
              name="phone"
              type="tel"
              defaultValue={initial.phone ?? ""}
              placeholder="เช่น 0812345678"
              inputMode="numeric"
              maxLength={10}
              className={inputClassName}
              autoComplete="tel"
            />
          </div>

          <div>
            <label htmlFor="line_id" className="mb-1.5 block text-[13px] font-medium text-ink-2">
              LINE ID
            </label>
            <input
              id="line_id"
              name="line_id"
              type="text"
              defaultValue={initial.lineId ?? ""}
              placeholder="เช่น @somying"
              className={inputClassName}
              autoComplete="off"
            />
          </div>
        </div>

        <div>
          <label htmlFor="birth_date" className="mb-1.5 block text-[13px] font-medium text-ink-2">
            วันเกิด
          </label>
          <input
            id="birth_date"
            name="birth_date"
            type="date"
            defaultValue={initial.birthDate ?? ""}
            max={new Date().toISOString().slice(0, 10)}
            className={`${inputClassName} sm:max-w-[220px]`}
          />
        </div>
      </div>

      <div className="mt-6 flex items-center justify-between gap-3 border-t border-line pt-4">
        <p className="text-xs text-ink-3">คุณสามารถแก้ไขข้อมูลนี้ได้ทุกเมื่อ</p>
        <button
          type="submit"
          disabled={isPending || uploading}
          className="inline-flex min-w-[120px] items-center justify-center rounded-lg bg-ink px-4 py-2.5 text-sm font-medium text-on-dark transition hover:-translate-y-px hover:bg-[oklch(0.32_0.014_85)] hover:shadow-[var(--shadow-2)] disabled:cursor-wait disabled:opacity-60"
        >
          {isPending ? "กำลังบันทึก…" : "บันทึกข้อมูล"}
        </button>
      </div>
    </form>
  );
}
