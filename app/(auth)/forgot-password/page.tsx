"use client";

import Link from "next/link";
import { useState } from "react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [oauthProviders, setOauthProviders] = useState<string[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) throw new Error("request failed");
      const data = await res.json();
      if (data.oauth) {
        setOauthProviders(data.providers ?? []);
      } else {
        setSent(true);
      }
    } catch {
      setError("ส่งอีเมลไม่สำเร็จ กรุณาลองใหม่");
    } finally {
      setLoading(false);
    }
  }

  const PROVIDER_NAMES: Record<string, string> = { google: "Google", line: "LINE", facebook: "Facebook" };

  if (oauthProviders) {
    const names = oauthProviders.map((p) => PROVIDER_NAMES[p] ?? p).join(", ");
    return (
      <div style={{ maxWidth: 460, margin: "0 auto", padding: "64px 20px 80px", width: "100%", textAlign: "center" }}>
        <div aria-hidden style={{ width: 64, height: 64, borderRadius: 999, background: "var(--warm)", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 28, marginBottom: 20 }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>
        </div>
        <h1 style={{ fontSize: 24, fontWeight: 600, marginBottom: 10 }}>บัญชีนี้ใช้ {names} เข้าสู่ระบบ</h1>
        <p style={{ fontSize: 15, color: "var(--ink-2)", lineHeight: 1.6, marginBottom: 24 }}>
          อีเมล <strong style={{ color: "var(--ink)" }}>{email}</strong> สมัครสมาชิกผ่าน {names}
          ไม่จำเป็นต้องตั้งรหัสผ่าน — กดปุ่มด้านล่างเพื่อเข้าสู่ระบบด้วย {names} ได้เลย
        </p>
        <Link href="/login" className="btn btn-dark btn-block btn-lg">
          เข้าสู่ระบบด้วย {names}
        </Link>
      </div>
    );
  }

  if (sent) {
    return (
      <div style={{ maxWidth: 460, margin: "0 auto", padding: "64px 20px 80px", width: "100%", textAlign: "center" }}>
        <div aria-hidden style={{ width: 64, height: 64, borderRadius: 999, background: "var(--warm)", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 28, marginBottom: 20 }}>
          ✉️
        </div>
        <h1 style={{ fontSize: 24, fontWeight: 600, marginBottom: 10 }}>ตรวจสอบอีเมลของคุณ</h1>
        <p style={{ fontSize: 15, color: "var(--ink-2)", lineHeight: 1.6, marginBottom: 24 }}>
          หากอีเมล <strong style={{ color: "var(--ink)" }}>{email}</strong> มีบัญชีอยู่ในระบบ
          เราได้ส่งลิงก์ตั้งรหัสผ่านใหม่ไปให้แล้ว (ลิงก์หมดอายุใน 1 ชั่วโมง)
        </p>
        <Link href="/login" className="btn btn-outline btn-block">
          กลับไปหน้าเข้าสู่ระบบ
        </Link>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 460, margin: "0 auto", padding: "48px 20px 80px", width: "100%" }}>
      <h1 style={{ fontSize: 28, fontWeight: 600, marginBottom: 6 }}>ลืมรหัสผ่าน</h1>
      <p style={{ color: "var(--ink-2)", fontSize: 14, marginBottom: 28 }}>
        กรอกอีเมลที่ใช้สมัครสมาชิก เราจะส่งลิงก์สำหรับตั้งรหัสผ่านใหม่ไปให้
      </p>

      {error && (
        <div style={{ background: "oklch(0.92 0.04 25)", border: "1px solid oklch(0.78 0.12 25)", color: "oklch(0.4 0.13 25)", padding: "10px 14px", borderRadius: 6, fontSize: 13, marginBottom: 16 }}>
          {error}
        </div>
      )}

      <form onSubmit={onSubmit}>
        <div style={{ marginBottom: 14 }}>
          <label style={{ display: "block", fontSize: 13, fontWeight: 500, marginBottom: 6 }}>อีเมล</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="input"
          />
        </div>
        <button type="submit" disabled={loading} className="btn btn-dark btn-block btn-lg"
          style={{ marginTop: 12, opacity: loading ? 0.6 : 1 }}>
          {loading ? "กำลังส่ง..." : "ส่งลิงก์ตั้งรหัสผ่านใหม่"}
        </button>
      </form>

      <div style={{ textAlign: "center", fontSize: 13, color: "var(--ink-2)", marginTop: 16 }}>
        นึกรหัสผ่านออกแล้ว?{" "}
        <Link href="/login" style={{ color: "var(--accent)", fontWeight: 500 }}>
          เข้าสู่ระบบ
        </Link>
      </div>
    </div>
  );
}
