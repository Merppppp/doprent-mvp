"use client";

import { useRef, useState, useTransition } from "react";
import RequiredMark from "@/components/RequiredMark";
import {
  createShopBanner,
  updateShopBanner,
  deleteShopBanner,
} from "@/app/actions/seller-banners";
import { useConfirm } from "@/components/ConfirmProvider";

type BannerData = {
  id: string;
  title: string;
  imageUrl: string;
  linkUrl: string;
  isActive: boolean;
  startsAt: string;
  endsAt: string;
  status: string;
};

type Props =
  | { mode: "create"; defaultLinkUrl?: string }
  | { mode: "edit"; banner: BannerData };

const fieldStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 4,
  marginBottom: 12,
};
const labelStyle: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 500,
  color: "var(--ink-2)",
};
const gridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "0 16px",
};

const STATUS_LABEL: Record<string, { text: string; color: string; bg: string }> = {
  pending:  { text: "รออนุมัติ",  color: "var(--warn)",    bg: "var(--warn-soft)" },
  approved: { text: "อนุมัติแล้ว", color: "var(--success)", bg: "var(--success-soft, #d1fae5)" },
  rejected: { text: "ปฏิเสธ",    color: "var(--danger)",  bg: "var(--danger-soft)" },
};

export default function ShopBannerForm(props: Props) {
  const confirm = useConfirm();
  const formRef = useRef<HTMLFormElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [isDeleting, startDelete] = useTransition();

  const isEdit = props.mode === "edit";
  const banner = isEdit ? props.banner : null;

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = isEdit
        ? await updateShopBanner(banner!.id, fd)
        : await createShopBanner(fd);
      if (!res.ok) {
        setError(res.error ?? "เกิดข้อผิดพลาด");
      } else {
        setSuccess(true);
        if (!isEdit) formRef.current?.reset();
      }
    });
  }

  async function handleDelete() {
    if (!isEdit) return;
    if (!(await confirm({ message: `ยืนยันการลบแบนเนอร์ "${banner!.title}"?`, variant: "danger", confirmLabel: "ลบ" }))) return;
    startDelete(async () => {
      const res = await deleteShopBanner(banner!.id);
      if (!res.ok) setError(res.error ?? "ลบไม่สำเร็จ");
    });
  }

  const statusMeta = banner ? (STATUS_LABEL[banner.status] ?? STATUS_LABEL.pending) : null;

  return (
    <form ref={formRef} onSubmit={handleSubmit}>
      {/* Status badge for edit mode */}
      {isEdit && statusMeta && (
        <div style={{ marginBottom: 12 }}>
          <span
            style={{
              fontSize: 12,
              padding: "3px 10px",
              borderRadius: 999,
              background: statusMeta.bg,
              color: statusMeta.color,
              fontWeight: 600,
            }}
          >
            สถานะ: {statusMeta.text}
          </span>
          {banner!.status === "pending" && (
            <span style={{ fontSize: 12, color: "var(--ink-3)", marginLeft: 8 }}>
              รอทีม DopRent อนุมัติก่อนแบนเนอร์จะแสดงบนหน้าหลัก
            </span>
          )}
          {banner!.status === "rejected" && (
            <span style={{ fontSize: 12, color: "var(--danger)", marginLeft: 8 }}>
              แบนเนอร์ถูกปฏิเสธ — แก้ไขแล้วส่งใหม่ได้เลย
            </span>
          )}
        </div>
      )}

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
          placeholder="เช่น โปรโมชั่นเดือนมิถุนายน"
          className="input"
        />
      </div>

      {/* Image URL */}
      <div style={fieldStyle}>
        <label style={labelStyle}>
          URL รูปภาพแบนเนอร์<RequiredMark />
        </label>
        <input
          name="imageUrl"
          required
          aria-required="true"
          type="url"
          defaultValue={banner?.imageUrl ?? ""}
          placeholder="https://example.com/banner.jpg"
          className="input"
        />
      </div>

      {/* Link URL */}
      <div style={fieldStyle}>
        <label style={labelStyle}>URL ปลายทาง (ไม่บังคับ — ค่าเริ่มต้นคือหน้าร้าน)</label>
        <input
          name="linkUrl"
          type="url"
          defaultValue={
            banner?.linkUrl ??
            (props.mode === "create" ? (props.defaultLinkUrl ?? "") : "")
          }
          placeholder="https://doprent.com/shop/my-shop"
          className="input"
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
            className="input"
          />
        </div>
        {/* Ends at */}
        <div style={fieldStyle}>
          <label style={labelStyle}>สิ้นสุดการแสดง (ไม่บังคับ)</label>
          <input
            name="endsAt"
            type="datetime-local"
            defaultValue={banner?.endsAt ?? ""}
            className="input"
          />
        </div>
      </div>

      {/* isActive hidden field */}
      <input
        type="hidden"
        name="isActive"
        value={isEdit ? String(banner!.isActive) : "true"}
      />

      {error && (
        <p style={{ color: "var(--danger)", fontSize: 13, marginBottom: 8 }}>
          {error}
        </p>
      )}
      {success && (
        <p
          style={{
            color: "var(--success, #065f46)",
            fontSize: 13,
            marginBottom: 8,
          }}
        >
          {isEdit
            ? "บันทึกสำเร็จ — แบนเนอร์รออนุมัติใหม่"
            : "สร้างแบนเนอร์สำเร็จ — รอทีม DopRent อนุมัติ"}
        </p>
      )}

      <div
        style={{
          display: "flex",
          gap: 8,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <button
          type="submit"
          disabled={isPending}
          style={{
            padding: "8px 18px",
            fontSize: 14,
            fontWeight: 600,
            background: "var(--ink)",
            color: "var(--on-dark)",
            border: "none",
            borderRadius: 7,
            cursor: isPending ? "not-allowed" : "pointer",
            opacity: isPending ? 0.7 : 1,
          }}
        >
          {isPending
            ? "กำลังบันทึก…"
            : isEdit
            ? "บันทึกการแก้ไข"
            : "สร้างแบนเนอร์"}
        </button>

        {isEdit && (
          <button
            type="button"
            disabled={isDeleting}
            onClick={handleDelete}
            style={{
              padding: "8px 14px",
              fontSize: 13,
              fontWeight: 500,
              background: "transparent",
              color: "var(--danger)",
              border: "1px solid var(--danger)",
              borderRadius: 7,
              cursor: isDeleting ? "not-allowed" : "pointer",
              marginLeft: "auto",
            }}
          >
            {isDeleting ? "กำลังลบ…" : "ลบแบนเนอร์"}
          </button>
        )}
      </div>
    </form>
  );
}
