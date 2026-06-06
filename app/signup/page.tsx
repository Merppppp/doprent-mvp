"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { Spinner } from "@/components/Loading";

export default function SignupPage() {
  const sp = useSearchParams();
  const next = sp.get("next") || "/";

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [consentChecked, setConsentChecked] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);
  const [resendStatus, setResendStatus] = useState<"idle" | "sending" | "sent">("idle");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!consentChecked) { setError("กรุณายอมรับเงื่อนไขการใช้บริการและนโยบายความเป็นส่วนตัวก่อนสมัครสมาชิก"); return; }
    if (password.length < 6) { setError("รหัสผ่านต้องอย่างน้อย 6 ตัวอักษร"); return; }
    if (password !== confirmPassword) { setError("รหัสผ่านทั้งสองช่องไม่ตรงกัน"); return; }

    setLoading(true);
    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, fullName }),
    });
    const data = await res.json();

    if (!res.ok) {
      setError(data.error ?? "สมัครสมาชิกไม่สำเร็จ");
      setLoading(false);
      return;
    }

    setPendingEmail(email);
    setLoading(false);
  }

  async function resendVerification() {
    if (!pendingEmail) return;
    setResendStatus("sending");
    const res = await fetch("/api/auth/resend-verification", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: pendingEmail }),
    });
    setResendStatus(res.ok ? "sent" : "idle");
    if (!res.ok) setError("ส่งอีเมลไม่สำเร็จ กรุณาลองใหม่");
  }

  // ----- Pending verification screen -----
  if (pendingEmail) {
    return (
      <div style={{ maxWidth: 460, margin: "0 auto", padding: "64px 20px 80px", width: "100%", textAlign: "center" }}>
        <div aria-hidden style={{ width: 64, height: 64, borderRadius: 999, background: "var(--warm)", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 28, marginBottom: 20 }}>
          ✉️
        </div>
        <h1 style={{ fontSize: 24, fontWeight: 600, marginBottom: 10 }}>เช็คอีเมลของคุณ</h1>
        <p style={{ fontSize: 15, color: "var(--ink-2)", lineHeight: 1.6, marginBottom: 24 }}>
          ส่งลิงก์ยืนยันไปที่ <strong style={{ color: "var(--ink)" }}>{pendingEmail}</strong> แล้ว
          กดลิงก์ในอีเมลเพื่อยืนยันบัญชีก่อนเข้าใช้งาน
        </p>
        <button type="button" onClick={resendVerification} disabled={resendStatus !== "idle"}
          className="btn btn-outline btn-block" style={{ marginBottom: 10 }}>
          {resendStatus === "sending" ? <Spinner size={14} label="กำลังส่ง..." /> : resendStatus === "sent" ? "✓ ส่งอีเมลใหม่แล้ว" : "ส่งอีเมลยืนยันใหม่"}
        </button>
        <Link href={`/login?next=${encodeURIComponent(next)}`} className="btn btn-dark btn-block">
          กลับไปเข้าสู่ระบบ
        </Link>
        {error && <div style={{ marginTop: 14, color: "var(--danger)", fontSize: 13 }}>{error}</div>}
      </div>
    );
  }

  // ----- Signup form -----
  return (
    <div style={{ maxWidth: 460, margin: "0 auto", padding: "48px 20px 80px", width: "100%" }}>
      <h1 style={{ fontSize: 28, fontWeight: 600, marginBottom: 6 }}>สมัครสมาชิก</h1>
      <p style={{ color: "var(--ink-2)", fontSize: 14, marginBottom: 28 }}>บันทึกชุดที่ชอบ ติดตามการจอง</p>

      {error && (
        <div style={{ background: "oklch(0.92 0.04 25)", border: "1px solid oklch(0.78 0.12 25)", color: "oklch(0.4 0.13 25)", padding: "10px 14px", borderRadius: 6, fontSize: 13, marginBottom: 16 }}>
          {error}
        </div>
      )}

      <button type="button" onClick={() => signIn("google", { callbackUrl: next })}
        className="btn btn-outline btn-block btn-lg"
        style={{ marginBottom: 8, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
        <GoogleIcon />
        สมัครด้วย Google
      </button>
      <p style={{ fontSize: 12, color: "var(--ink-3)", marginBottom: 18, lineHeight: 1.55 }}>
        การสมัครด้วย Google ถือว่าท่านยอมรับ{" "}
        <a href="/terms" target="_blank" rel="noreferrer noopener" style={{ color: "var(--accent)", textDecoration: "underline" }}>เงื่อนไขการใช้บริการ</a>
        {" "}และ{" "}
        <a href="/privacy" target="_blank" rel="noreferrer noopener" style={{ color: "var(--accent)", textDecoration: "underline" }}>นโยบายความเป็นส่วนตัว</a>
        {" "}ของ DopRent
      </p>

      <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "0 0 18px", color: "var(--ink-3)", fontSize: 12 }}>
        <span style={{ flex: 1, height: 1, background: "var(--line)" }} />
        <span>หรือใช้อีเมล</span>
        <span style={{ flex: 1, height: 1, background: "var(--line)" }} />
      </div>

      <form onSubmit={onSubmit}>
        <Field label="ชื่อ" type="text" value={fullName} onChange={setFullName} required />
        <Field label="อีเมล" type="email" value={email} onChange={setEmail} required />
        <Field label="รหัสผ่าน (อย่างน้อย 6 ตัวอักษร)" type="password" value={password} onChange={setPassword}
          required showToggle showPassword={showPassword} onToggleShowPassword={() => setShowPassword(p => !p)} />
        <Field label="ยืนยันรหัสผ่าน" type="password" value={confirmPassword} onChange={setConfirmPassword}
          required showToggle showPassword={showPassword} onToggleShowPassword={() => setShowPassword(p => !p)} />

        {/* PDPA consent checkbox */}
        <label
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 10,
            marginTop: 4,
            marginBottom: 4,
            cursor: "pointer",
          }}
        >
          <input
            type="checkbox"
            checked={consentChecked}
            onChange={(e) => setConsentChecked(e.target.checked)}
            required
            style={{ marginTop: 3, flexShrink: 0, width: 16, height: 16, accentColor: "var(--ink)" }}
          />
          <span style={{ fontSize: 13, lineHeight: 1.6, color: "var(--ink-2)" }}>
            ฉันได้อ่านและยอมรับ{" "}
            <a href="/terms" target="_blank" rel="noreferrer noopener" style={{ color: "var(--accent)", textDecoration: "underline" }}>
              เงื่อนไขการใช้บริการ
            </a>
            {" "}และ{" "}
            <a href="/privacy" target="_blank" rel="noreferrer noopener" style={{ color: "var(--accent)", textDecoration: "underline" }}>
              นโยบายความเป็นส่วนตัว
            </a>
            {" "}ของ DopRent <span style={{ color: "var(--danger)" }}>*</span>
          </span>
        </label>

        <button type="submit" disabled={loading || !consentChecked} className="btn btn-dark btn-block btn-lg"
          style={{ marginTop: 12, opacity: (loading || !consentChecked) ? 0.6 : 1 }}>
          {loading ? "กำลังสร้างบัญชี..." : "สร้างบัญชี"}
        </button>
      </form>

      <div style={{ textAlign: "center", fontSize: 13, color: "var(--ink-2)", marginTop: 16 }}>
        มีบัญชีอยู่แล้ว?{" "}
        <Link href={`/login?next=${encodeURIComponent(next)}`} style={{ color: "var(--accent)", fontWeight: 500 }}>
          เข้าสู่ระบบ
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
          style={{ width: "100%", padding: showToggle ? "11px 44px 11px 14px" : "11px 14px", border: "1px solid var(--line)", borderRadius: 6, fontSize: 14 }} />
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
