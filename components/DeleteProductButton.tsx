"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteProduct } from "@/app/actions/seller";

export default function DeleteProductButton({
  productId,
  productName,
}: {
  productId: string;
  productName: string;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleDelete() {
    setError(null);
    startTransition(async () => {
      const res = await deleteProduct(productId);
      if (res.ok) {
        setConfirming(false);
        router.refresh();
      } else {
        setError(res.error ?? "ลบไม่สำเร็จ");
      }
    });
  }

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="btn btn-outline px-2.5 py-[5px] text-[12px] text-danger border-danger"
      >
        ลบ
      </button>
    );
  }

  return (
    <div className="inline-flex flex-col items-end gap-1">
      <div className="inline-flex items-center gap-1.5">
        <span className="text-[12px] text-ink-2">ลบ “{productName}”?</span>
        <button
          type="button"
          onClick={handleDelete}
          disabled={pending}
          className="btn btn-primary px-2.5 py-[5px] text-[12px] danger-soft text-danger"
        >
          {pending ? "กำลังลบ…" : "ยืนยันลบ"}
        </button>
        <button
          type="button"
          onClick={() => {
            setConfirming(false);
            setError(null);
          }}
          disabled={pending}
          className="btn btn-outline px-2.5 py-[5px] text-[12px]"
        >
          ยกเลิก
        </button>
      </div>
      {error ? <span className="text-[11px] text-danger max-w-[260px] text-right">{error}</span> : null}
    </div>
  );
}
