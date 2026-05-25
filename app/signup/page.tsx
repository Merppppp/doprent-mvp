"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/browser";
import GoogleSignInButton from "@/components/GoogleSignInButton";

export default function SignupPage() {
  const sp = useSearchParams();
  const next = sp.get("next") || "/";

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  // After successful signup when email confirmation is ON, we show a
  // "check your email" pending state instead of redirecting. Keeps the user
  // on this page and gives them clear next steps (verify, resend, etc.).
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);
  const [resendStatus, setResendStatus] = useState<"idle" | "sending" | "sent">(
    "idle",
  );

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = e.currentTarget;
    if (!form.reportValidity()) {
      setError("กรุณาตรวจสอบข้อมูลให้ครบถ้วน");
      return;
    }
    if (password.length < 6) {
      setError("รหัสผ่านต้องอย่างน้อย 6 ตัวอักษร");
      return;
    }
    setLoading(true);
    const sb = createClient();
    const siteUrl =
      (typeof window !== "undefined" && window.location.origin) ||
      "https://doprent.com";
    const { data, error } = await sb.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        // Where Supabase should redirect after the user clicks the email link.
        emailRedirectTo: `${siteUrl}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }
    // When email confirmation is ON in Supabase:
    //   data.user exists, data.session is null → show pending screen.
    // When email confirmation is OFF (legacy pilot config):
    //   data.session exists → just navigate, user is logged in.
    if (data.session) {
      window.location.href = next;
      return;
    }
    setPendingEmail(email);
    setLoading(false);
  }

  async function resendVerification() {
    if (!pendingEmail) return;
    setResendStatus("sending");
    const sb = createClient();
    const siteUrl =
      (typeof window !== "undefined" && window.location.origin) ||
      "https://doprent.com";
    const { error } = await sb.auth.resend({
      type: "signup",
      email: pendingEmail,
      options: {
        emailRedirectTo: `${siteUrl}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });
    if (error) {
      setError(error.message);
      setResendStatus("idle");
      return;
    }
    setResendStatus("sent");
  }

  // ----- Pending verification screen -----
  if (pendingEmail) {
    return (
      <div
        style={{
          maxWidth: 460,
          margin: "0 auto",
          padding: "64px 20px 80px",
          width: "100%",
          textAlign: "center",
        }}
      >
        <div
          aria-hidden
          style={{
            width: 64,
            height: 64,
            borderRadius: 999,
            background: "var(--warm)",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 28,
            marginBottom: 20,
          }}
        >
          ✉️
        </div>
        <h1 style={{ fontSize: 24, fontWeight: 600, marginBottom: 10 }}>
          เช็คอีเมลของคุณ
        </h1>
        <p
          style={{
            fontSize: 15,
            color: "var(--ink-2)",
            lineHeight: 1.6,
            marginBottom: 24,
          }}
        >
          ส่งลิงก์ยืนยันไปที่{" "}
          <strong style={{ color: "var(--ink)" }}>{pendingEmail}</strong> แล้ว
          กดลิงก์ในอีเมลเพื่อยืนยันบัญชีก่อนเข้าใช้งาน
        </p>

        <div
          style={{
            padding: 14,
            background: "var(--warm)",
            borderRadius: 8,
            fontSize: 13,
            color: "var(--ink-2)",
            lineHeight: 1.55,
            marginBottom: 24,
            textAlign: "left",
          }}
        >
          <strong style={{ color: "var(--ink)", display: "block", marginBottom: 4 }}>
            ไม่เห็นอีเมล?
          </strong>
          เช็คใน Spam / Promotions หรือรอสักครู่ ถ้ายังไม่ได้กดปุ่มข้างล่างเพื่อส่งใหม่
        </div>

        <button
          type="button"
          onClick={resendVerification}
          disabled={resendStatus !== "idle"}
          className="btn btn-outline btn-block"
          style={{ marginBottom: 10 }}
        >
          {resendStatus === "sending"
            ? "กำลังส่ง..."
            : resendStatus === "sent"
              ? "✓ ส่งอีเมลใหม่แล้ว"
              : "ส่งอีเมลยืนยันใหม่"}
        </button>

        <Link
          href={`/login?next=${encodeURIComponent(next)}`}
          className="btn btn-dark btn-block"
        >
          กลับไปเข้าสู่ระบบ
        </Link>

        {error ? (
          <div
            style={{
              marginTop: 14,
              color: "var(--danger)",
              fontSize: 13,
            }}
          >
            {error}
          </div>
        ) : null}
      </div>
    );
  }

  // ----- Signup form -----
  return (
    <div style={{ maxWidth: 460, margin: "0 auto", padding: "48px 20px 80px", width: "100%" }}>
      <h1 style={{ fontSize: 28, fontWeight: 600, marginBottom: 6 }}>สมัครสมาชิก</h1>
      <p style={{ color: "var(--ink-2)", fontSize: 14, marginBottom: 28 }}>
        บันทึกชุดที่ชอบ ติดตามการจอง
      </p>

      {error ? (
        <div
          style={{
            background: "oklch(0.92 0.04 25)",
            border: "1px solid oklch(0.78 0.12 25)",
            color: "oklch(0.4 0.13 25)",
            padding: "10px 14px",
            borderRadius: 6,
            fontSize: 13,
            marginBottom: 16,
          }}
        >
          {error}
        </div>
      ) : null}

      {/* Google sign-up — primary path, lowers friction for Thai users with
          existing Google accounts. Same OAuth flow as login. */}
      <GoogleSignInButton next={next} label="สมัครด้วย Google" onError={setError} />

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          margin: "18px 0",
          color: "var(--ink-3)",
          fontSize: 12,
        }}
      >
        <span style={{ flex: 1, height: 1, background: "var(--line)" }} />
        <span>หรือใช้อีเมล</span>
        <span style={{ flex: 1, height: 1, background: "var(--line)" }} />
      </div>

      <form onSubmit={onSubmit}>
        <Field label="ชื่อ" type="text" value={fullName} onChange={setFullName} required />
        <Field label="อีเมล" type="email" value={email} onChange={setEmail} required />
        <Field
          label="รหัสผ่าน (อย่างน้อย 6 ตัวอักษร)"
          type="password"
          value={password}
          onChange={setPassword}
          required
          minLength={6}
        />
        <button
          type="submit"
          disabled={loading}
          className="btn btn-dark btn-block btn-lg"
          style={{ marginTop: 12, opacity: loading ? 0.6 : 1 }}
        >
          {loading ? "กำลังสร้างบัญชี..." : "สร้างบัญชี"}
        </button>
      </form>

      <div style={{ textAlign: "center", fontSize: 13, color: "var(--ink-2)", marginTop: 16 }}>
        มีบัญชีอยู่แล้ว?{" "}
        <Link
          href={`/login?next=${encodeURIComponent(next)}`}
          style={{ color: "var(--accent)", fontWeight: 500 }}
        >
          เข้าสู่ระบบ
        </Link>
      </div>
    </div>
  );
}

function Field({
  label,
  type,
  value,
  onChange,
  required,
  minLength,
}: {
  label: string;
  type: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  minLength?: number;
}) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: "block", fontSize: 13, fontWeight: 500, marginBottom: 6 }}>
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        minLength={minLength}
        style={{
          width: "100%",
          padding: "11px 14px",
          border: "1px solid var(--line)",
          borderRadius: 6,
          fontSize: 14,
        }}
      />
    </div>
  );
}
