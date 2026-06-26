"use client";

import { useState, useTransition } from "react";
import type { Role } from "@prisma/client";
import { changeUserRole, setUserSuspension } from "@/app/actions/admin-users";

const ROLE_LABEL: Record<Role, string> = {
  customer: "ลูกค้า",
  seller: "ร้านค้า",
  admin: "แอดมิน",
};

export default function AdminUserActions({
  userId,
  role,
  suspended,
  isSelf,
}: {
  userId: string;
  role: Role;
  suspended: boolean;
  /** The current admin's own row — actions are disabled to prevent self-lockout. */
  isSelf: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (isSelf) {
    return <span className="text-[12px] text-ink-3">บัญชีของคุณ</span>;
  }

  const onRole = (next: Role) => {
    if (next === role) return;
    setError(null);
    startTransition(async () => {
      const res = await changeUserRole(userId, next);
      if (!res.ok) setError(res.error ?? "เปลี่ยน role ไม่สำเร็จ");
    });
  };

  const onSuspend = () => {
    setError(null);
    let reason: string | undefined;
    if (!suspended) {
      const input = window.prompt("เหตุผลในการระงับบัญชี (ไม่บังคับ):", "");
      if (input === null) return; // cancelled
      reason = input;
    }
    startTransition(async () => {
      const res = await setUserSuspension(userId, !suspended, reason);
      if (!res.ok) setError(res.error ?? "ดำเนินการไม่สำเร็จ");
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        value={role}
        disabled={isPending}
        onChange={(e) => onRole(e.target.value as Role)}
        className="rounded-md border border-line bg-surface px-2 py-1 text-[12px] text-ink outline-none disabled:opacity-60"
      >
        {(Object.keys(ROLE_LABEL) as Role[]).map((r) => (
          <option key={r} value={r}>{ROLE_LABEL[r]}</option>
        ))}
      </select>

      <button
        type="button"
        onClick={onSuspend}
        disabled={isPending}
        className={`rounded-md border px-2.5 py-1 text-[12px] font-medium disabled:opacity-60 ${
          suspended
            ? "border-success text-success hover:bg-success-soft"
            : "border-danger text-danger hover:bg-danger-soft"
        }`}
      >
        {suspended ? "ปลดระงับ" : "ระงับ"}
      </button>

      {error ? <span className="w-full text-[11px] font-medium text-danger">{error}</span> : null}
    </div>
  );
}
