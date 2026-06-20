"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { signIn } from "next-auth/react";
import { Spinner } from "@/components/Loading";

export default function LoginPage() {
  const sp = useSearchParams();
  const next = sp.get("next") || "/";
  const urlErr = sp.get("err");
  const verified = sp.get("verified");
  const reset = sp.get("reset");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [needsVerify, setNeedsVerify] = useState<string | null>(null);
  const [resendStatus, setResendStatus] = useState<"idle" | "sending" | "sent">("idle");

  useEffect(() => {
    if (verified === "1") setInfo("ยืนยันอีเมลสำเร็จแล้ว สามารถเข้าสู่ระบบได้เลย");
    if (reset === "1") setInfo("ตั้งรหัสผ่านใหม่สำเร็จแล้ว เข้าสู่ระบบด้วยรหัสผ่านใหม่ได้เลย");
    if (urlErr === "token_expired") setError("ลิงก์ยืนยันหมดอายุ กรุณาขอลิงก์ใหม่");
    if (urlErr === "invalid_token") setError("ลิงก์ยืนยันไม่ถูกต้อง");
  }, [urlErr, verified, reset]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const result = await signIn("credentials", { redirect: false, email, password });

    if (!result?.error) {
      window.location.href = next;
      return;
    }

    if (result.error === "email_not_verified") {
      setNeedsVerify(email);
      setLoading(false);
      return;
    }

    // Fallback: distinguish "wrong password" from "unverified email"
    if (result.error === "CredentialsSignin") {
      const check = await fetch("/api/auth/check-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const { needsVerification } = await check.json();
      if (needsVerification) {
        setNeedsVerify(email);
        setLoading(false);
        return;
      }
    }

    setError("อีเมลหรือรหัสผ่านไม่ถูกต้อง");
    setLoading(false);
  }

  async function resendVerification() {
    if (!needsVerify) return;
    setResendStatus("sending");
    const res = await fetch("/api/auth/resend-verification", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: needsVerify }),
    });
    setResendStatus(res.ok ? "sent" : "idle");
    if (!res.ok) setError("ส่งอีเมลไม่สำเร็จ กรุณาลองใหม่");
  }

  // ----- Needs-verify screen -----
  if (needsVerify) {
    return (
      <div style={{ maxWidth: 460, margin: "0 auto", padding: "64px 20px 80px", width: "100%", textAlign: "center" }}>
        <div aria-hidden style={{ width: 64, height: 64, borderRadius: 999, background: "var(--warm)", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 28, marginBottom: 20 }}>
          ✉️
        </div>
        <h1 style={{ fontSize: 24, fontWeight: 600, marginBottom: 10 }}>ยืนยันอีเมลก่อนเข้าใช้งาน</h1>
        <p style={{ fontSize: 15, color: "var(--ink-2)", lineHeight: 1.6, marginBottom: 24 }}>
          บัญชี <strong style={{ color: "var(--ink)" }}>{needsVerify}</strong> ยังไม่ได้ยืนยันอีเมล
          กดปุ่มข้างล่างเพื่อส่งลิงก์ยืนยันใหม่
        </p>
        <button type="button" onClick={resendVerification} disabled={resendStatus !== "idle"}
          className="btn btn-dark btn-block btn-lg" style={{ marginBottom: 10, display: "flex", justifyContent: "center", alignItems: "center", gap: 8 }}>
          {resendStatus === "sending" ? <Spinner size={14} label="กำลังส่ง..." /> : resendStatus === "sent" ? "✓ ส่งอีเมลใหม่แล้ว" : "ส่งลิงก์ยืนยันใหม่"}
        </button>
        <button type="button" onClick={() => { setNeedsVerify(null); setResendStatus("idle"); }}
          className="btn btn-outline btn-block">
          ย้อนกลับ
        </button>
        {error && <div style={{ marginTop: 14, color: "var(--danger)", fontSize: 13 }}>{error}</div>}
      </div>
    );
  }

  // ----- Login form -----
  return (
    <div style={{ maxWidth: 460, margin: "0 auto", padding: "48px 20px 80px", width: "100%" }}>
      <h1 style={{ fontSize: 28, fontWeight: 600, marginBottom: 6 }}>เข้าสู่ระบบ</h1>
      <p style={{ color: "var(--ink-2)", fontSize: 14, marginBottom: 28 }}>ยินดีต้อนรับกลับ</p>

      {info && (
        <div style={{ background: "oklch(0.93 0.05 145)", border: "1px solid oklch(0.75 0.12 145)", color: "oklch(0.35 0.12 145)", padding: "10px 14px", borderRadius: 6, fontSize: 13, marginBottom: 16 }}>
          {info}
        </div>
      )}
      {error && (
        <div style={{ background: "oklch(0.92 0.04 25)", border: "1px solid oklch(0.78 0.12 25)", color: "oklch(0.4 0.13 25)", padding: "10px 14px", borderRadius: 6, fontSize: 13, marginBottom: 16 }}>
          {error}
        </div>
      )}

      <button type="button" onClick={() => signIn("google", { callbackUrl: next })}
        className="btn btn-outline btn-block btn-lg"
        style={{ marginBottom: 18, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
        <GoogleIcon />
        เข้าสู่ระบบด้วย Google
      </button>

      <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "0 0 18px", color: "var(--ink-3)", fontSize: 12 }}>
        <span style={{ flex: 1, height: 1, background: "var(--line)" }} />
        <span>หรือใช้อีเมล</span>
        <span style={{ flex: 1, height: 1, background: "var(--line)" }} />
      </div>

      <form onSubmit={onSubmit}>
        <Field label="อีเมล" type="email" value={email} onChange={setEmail} required />
        <Field label="รหัสผ่าน" type="password" value={password} onChange={setPassword} required
          showToggle showPassword={showPassword} onToggleShowPassword={() => setShowPassword(p => !p)} />
        <div style={{ textAlign: "right", marginTop: -6, marginBottom: 4 }}>
          <Link href="/forgot-password" style={{ color: "var(--accent)", fontSize: 13, fontWeight: 500 }}>
            ลืมรหัสผ่าน?
          </Link>
        </div>
        <button type="submit" disabled={loading} className="btn btn-dark btn-block btn-lg"
          style={{ marginTop: 12, opacity: loading ? 0.6 : 1 }}>
          {loading ? <Spinner size={16} label="กำลังเข้าสู่ระบบ..." /> : "เข้าสู่ระบบ"}
        </button>
      </form>

      <div style={{ textAlign: "center", fontSize: 13, color: "var(--ink-2)", marginTop: 16 }}>
        ยังไม่มีบัญชี?{" "}
        <Link href={`/signup?next=${encodeURIComponent(next)}`} style={{ color: "var(--accent)", fontWeight: 500 }}>
          สมัครสมาชิก
        </Link>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
      <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z"/>
      <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z"/>
      <path fill="#FBBC05" d="M3.964 10.706A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.038l3.007-2.332Z"/>
      <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.962L3.964 7.294C4.672 5.163 6.656 3.58 9 3.58Z"/>
    </svg>
  );
}

function Field({ label, type, value, onChange, required, showToggle, showPassword, onToggleShowPassword }: {
  label: string; type: string; value: string; onChange: (v: string) => void;
  required?: boolean; showToggle?: boolean; showPassword?: boolean; onToggleShowPassword?: () => void;
}) {
  const actualType = showToggle && type === "password" ? (showPassword ? "text" : "password") : type;
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: "block", fontSize: 13, fontWeight: 500, marginBottom: 6 }}>{label}</label>
      <div style={{ position: "relative" }}>
        <input type={actualType} value={value} onChange={e => onChange(e.target.value)} required={required}
          className="input"
          style={showToggle ? { padding: "11px 44px 11px 14px" } : undefined} />
        {showToggle && (
          <button type="button" onClick={onToggleShowPassword}
            style={{ position: "absolute", top: "50%", right: 10, transform: "translateY(-50%)", background: "none", border: "none", color: "var(--ink-3)", fontSize: 13, cursor: "pointer", padding: 0 }}>
            {showPassword ? "ซ่อน" : "แสดง"}
          </button>
        )}
      </div>
    </div>
  );
}
