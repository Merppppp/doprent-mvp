"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { addAdminByEmail } from "@/app/actions/admin";

export default function AddAdminForm() {
  const router = useRouter();
  const [working, setWorking] = useState(false);
  const [email, setEmail] = useState("");
  const [result, setResult] = useState<{ type: "error" | "success" | "notice"; msg: string } | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setWorking(true);
    setResult(null);

    const fd = new FormData();
    fd.set("email", email);
    const res = await addAdminByEmail(fd);
    setWorking(false);

    if (!res.ok) {
      setResult({ type: "error", msg: res.error ?? "เกิดข้อผิดพลาด" });
      return;
    }
    if (res.notice) {
      setResult({ type: "notice", msg: res.notice });
      return;
    }
    setResult({ type: "success", msg: `เพิ่ม ${email} เป็น admin เรียบร้อยแล้ว` });
    setEmail("");
    router.refresh();
  }

  const msgColor =
    result?.type === "error"
      ? "var(--danger)"
      : result?.type === "notice"
        ? "var(--warn, #b45309)"
        : "var(--success, #16a34a)";

  return (
    <div
      style={{
        background: "var(--surface)",
        border: "1px solid var(--line)",
        borderRadius: 10,
        padding: 20,
        maxWidth: 520,
      }}
    >
      <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 14 }}>เพิ่ม Admin ใหม่</h2>

      <form onSubmit={handleSubmit} style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <input
          type="email"
          name="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="อีเมลผู้ใช้ที่ต้องการเลื่อนสิทธิ์"
          required
          className="input"
          style={{ flex: 1, minWidth: 220 }}
        />
        <button
          type="submit"
          disabled={working}
          className="btn btn-dark"
          style={{ padding: "9px 18px", fontSize: 14 }}
        >
          {working ? "กำลังบันทึก…" : "เพิ่ม Admin"}
        </button>
      </form>

      {result && (
        <p style={{ marginTop: 10, fontSize: 13, color: msgColor }}>{result.msg}</p>
      )}

      <p style={{ marginTop: 12, fontSize: 12, color: "var(--ink-3)" }}>
        * ระบบจะเลื่อนสิทธิ์ผู้ใช้จาก role ปัจจุบันเป็น admin เท่านั้น — ไม่สามารถถอด admin ผ่านหน้านี้ได้
      </p>
    </div>
  );
}
