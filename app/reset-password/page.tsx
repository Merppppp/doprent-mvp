"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordForm />
    </Suspense>
  );
}

function ResetPasswordForm() {
  const router = useRouter();
  const sp = useSearchParams();
  const token = sp.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!token) {
    return (
      <div style={{ maxWidth: 460, margin: "0 auto", padding: "64px 20px 80px", width: "100%", textAlign: "center" }}>
        <h1 style={{ fontSize: 24, fontWeight: 600, marginBottom: 10 }}>ลิงก์ไม่ถูกต้อง</h1>
        <p style={{ fontSize: 15, color: "var(--ink-2)", lineHeight: 1.6, marginBottom: 24 }}>
          ลิงก์ตั้งรหัสผ่านใหม่ไม่ถูกต้องหรือหมดอายุ กรุณาขอลิงก์ใหม่อีกครั้ง
        </p>
        <Link href="/forgot-password" className="btn btn-dark btn-block btn-lg">
          ขอลิงก์ใหม่
        </Link>
      </div>
    );
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError("รหัสผ่านต้องอย่างน้อย 6 ตัวอักษร");
      return;
    }
    if (password !== confirm) {
      setError("รหัสผ่านทั้งสองช่องไม่ตรงกัน");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "ตั้งรหัสผ่านใหม่ไม่สำเร็จ กรุณาลองใหม่");
        setLoading(false);
        return;
      }
      router.push("/login?reset=1");
    } catch {
      setError("ตั้งรหัสผ่านใหม่ไม่สำเร็จ กรุณาลองใหม่");
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 460, margin: "0 auto", padding: "48px 20px 80px", width: "100%" }}>
      <h1 style={{ fontSize: 28, fontWeight: 600, marginBottom: 6 }}>ตั้งรหัสผ่านใหม่</h1>
      <p style={{ color: "var(--ink-2)", fontSize: 14, marginBottom: 28 }}>
        กรอกรหัสผ่านใหม่ที่ต้องการใช้ (อย่างน้อย 6 ตัวอักษร)
      </p>

      {error && (
        <div style={{ background: "oklch(0.92 0.04 25)", border: "1px solid oklch(0.78 0.12 25)", color: "oklch(0.4 0.13 25)", padding: "10px 14px", borderRadius: 6, fontSize: 13, marginBottom: 16 }}>
          {error}
        </div>
      )}

      <form onSubmit={onSubmit}>
        <PasswordField label="รหัสผ่านใหม่" value={password} onChange={setPassword}
          showPassword={showPassword} onToggle={() => setShowPassword((p) => !p)} />
        <PasswordField label="ยืนยันรหัสผ่านใหม่" value={confirm} onChange={setConfirm}
          showPassword={showPassword} onToggle={() => setShowPassword((p) => !p)} />
        <button type="submit" disabled={loading} className="btn btn-dark btn-block btn-lg"
          style={{ marginTop: 12, opacity: loading ? 0.6 : 1 }}>
          {loading ? "กำลังบันทึก..." : "ตั้งรหัสผ่านใหม่"}
        </button>
      </form>

      <div style={{ textAlign: "center", fontSize: 13, color: "var(--ink-2)", marginTop: 16 }}>
        <Link href="/login" style={{ color: "var(--accent)", fontWeight: 500 }}>
          กลับไปหน้าเข้าสู่ระบบ
        </Link>
      </div>
    </div>
  );
}

function PasswordField({ label, value, onChange, showPassword, onToggle }: {
  label: string; value: string; onChange: (v: string) => void;
  showPassword: boolean; onToggle: () => void;
}) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: "block", fontSize: 13, fontWeight: 500, marginBottom: 6 }}>{label}</label>
      <div style={{ position: "relative" }}>
        <input type={showPassword ? "text" : "password"} value={value}
          onChange={(e) => onChange(e.target.value)} required minLength={6}
          style={{ width: "100%", padding: "11px 44px 11px 14px", border: "1px solid var(--line)", borderRadius: 6, fontSize: 14 }} />
        <button type="button" onClick={onToggle}
          style={{ position: "absolute", top: "50%", right: 10, transform: "translateY(-50%)", background: "none", border: "none", color: "var(--ink-3)", fontSize: 13, cursor: "pointer", padding: 0 }}>
          {showPassword ? "ซ่อน" : "แสดง"}
        </button>
      </div>
    </div>
  );
}
