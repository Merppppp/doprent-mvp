"use client";

import { useRef, useState, useTransition } from "react";
import RequiredMark from "@/components/RequiredMark";
import { createBanner, updateBanner, deleteBanner, toggleBannerActive } from "@/app/actions/admin-banners";

type BannerData = {
  id: string;
  title: string;
  imageUrl: string;
  linkUrl: string;
  sortOrder: number;
  isActive: boolean;
  startsAt: string;
  endsAt: string;
};

type Props =
  | { mode: "create" }
  | { mode: "edit"; banner: BannerData };

export default function BannerForm(props: Props) {
  const formRef = useRef<HTMLFormElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [isDeleting, startDelete] = useTransition();
  const [isToggling, startToggle] = useTransition();

  const isEdit = props.mode === "edit";
  const banner = isEdit ? props.banner : null;

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = isEdit
        ? await updateBanner(banner!.id, fd)
        : await createBanner(fd);
      if (!res.ok) {
        setError(res.error ?? "เกิดข้อผิดพลาด");
      } else {
        setSuccess(true);
        if (!isEdit) formRef.current?.reset();
      }
    });
  }

  function handleDelete() {
    if (!isEdit) return;
    if (!confirm(`ยืนยันการลบแบนเนอร์ "${banner!.title}"?`)) return;
    startDelete(async () => {
      const res = await deleteBanner(banner!.id);
      if (!res.ok) setError(res.error ?? "ลบไม่สำเร็จ");
    });
  }

  function handleToggle() {
    if (!isEdit) return;
    startToggle(async () => {
      const res = await toggleBannerActive(banner!.id, !banner!.isActive);
      if (!res.ok) setError(res.error ?? "เปลี่ยนสถานะไม่สำเร็จ");
    });
  }

  const fieldStyle: React.CSSProperties = {
    display: "flex", flexDirection: "column", gap: 4, marginBottom: 12,
  };
  const labelStyle: React.CSSProperties = {
    fontSize: 13, fontWeight: 500, color: "var(--ink-2)",
  };
  const inputStyle: React.CSSProperties = {
    padding: "7px 10px", fontSize: 14, border: "1px solid var(--line)",
    borderRadius: 6, background: "var(--bg)", color: "var(--ink)", width: "100%",
    boxSizing: "border-box" as const,
  };
  const gridStyle: React.CSSProperties = {
    display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px",
  };

  return (
    <form ref={formRef} onSubmit={handleSubmit}>
      <div style={gridStyle}>
        {/* Title */}
        <div style={fieldStyle}>
          <label style={labelStyle}>
            ชื่อแบนเนอร์<RequiredMark />
          </label>
          <input
            name="title"
            required
            aria-required="true"
            defaultValue={banner?.title ?? ""}
            placeholder="เช่น โปรโมชั่นมิถุนายน"
            style={inputStyle}
          />
        </div>

        {/* Sort order */}
        <div style={fieldStyle}>
          <label style={labelStyle}>ลำดับการแสดงผล</label>
          <input
            name="sortOrder"
            type="number"
            min={0}
            defaultValue={banner?.sortOrder ?? 0}
            style={inputStyle}
          />
        </div>
      </div>

      {/* Image URL */}
      <div style={fieldStyle}>
        <label style={labelStyle}>
          URL รูปภาพ<RequiredMark />
        </label>
        <input
          name="imageUrl"
          required
          aria-required="true"
          type="url"
          defaultValue={banner?.imageUrl ?? ""}
          placeholder="https://example.com/banner.jpg"
          style={inputStyle}
        />
      </div>

      {/* Link URL */}
      <div style={fieldStyle}>
        <label style={labelStyle}>URL ปลายทาง (ไม่บังคับ)</label>
        <input
          name="linkUrl"
          type="url"
          defaultValue={banner?.linkUrl ?? ""}
          placeholder="https://example.com/promo"
          style={inputStyle}
        />
      </div>

      <div style={gridStyle}>
        {/* Starts at */}
        <div style={fieldStyle}>
          <label style={labelStyle}>เริ่มแสดง (ไม่บังคับ)</label>
          <input
            name="startsAt"
            type="datetime-local"
            defaultValue={banner?.startsAt ?? ""}
            style={inputStyle}
          />
        </div>

        {/* Ends at */}
        <div style={fieldStyle}>
          <label style={labelStyle}>สิ้นสุดการแสดง (ไม่บังคับ)</label>
          <input
            name="endsAt"
            type="datetime-local"
            defaultValue={banner?.endsAt ?? ""}
            style={inputStyle}
          />
        </div>
      </div>

      {/* isActive hidden field — controlled by toggle for edit, default true for create */}
      <input
        type="hidden"
        name="isActive"
        value={isEdit ? String(banner!.isActive) : "true"}
      />

      {error && (
        <p style={{ color: "var(--danger)", fontSize: 13, marginBottom: 8 }}>{error}</p>
      )}
      {success && (
        <p style={{ color: "var(--accent-dark, #065f46)", fontSize: 13, marginBottom: 8 }}>
          {isEdit ? "แก้ไขสำเร็จ" : "เพิ่มแบนเนอร์สำเร็จ"}
        </p>
      )}

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <button
          type="submit"
          disabled={isPending}
          style={{
            padding: "8px 18px", fontSize: 14, fontWeight: 600,
            background: "var(--ink)", color: "var(--on-dark)",
            border: "none", borderRadius: 7, cursor: isPending ? "not-allowed" : "pointer",
            opacity: isPending ? 0.7 : 1,
          }}
        >
          {isPending ? "กำลังบันทึก…" : isEdit ? "บันทึกการแก้ไข" : "เพิ่มแบนเนอร์"}
        </button>

        {isEdit && (
          <>
            <button
              type="button"
              disabled={isToggling}
              onClick={handleToggle}
              style={{
                padding: "8px 14px", fontSize: 13, fontWeight: 500,
                background: "var(--surface)", color: "var(--ink)",
                border: "1px solid var(--line)", borderRadius: 7,
                cursor: isToggling ? "not-allowed" : "pointer",
              }}
            >
              {banner!.isActive ? "ปิดใช้งาน" : "เปิดใช้งาน"}
            </button>

            <button
              type="button"
              disabled={isDeleting}
              onClick={handleDelete}
              style={{
                padding: "8px 14px", fontSize: 13, fontWeight: 500,
                background: "transparent", color: "var(--danger)",
                border: "1px solid var(--danger)", borderRadius: 7,
                cursor: isDeleting ? "not-allowed" : "pointer",
                marginLeft: "auto",
              }}
            >
              {isDeleting ? "กำลังลบ…" : "ลบ"}
            </button>
          </>
        )}
      </div>
    </form>
  );
}
