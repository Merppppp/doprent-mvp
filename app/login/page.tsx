"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/browser";
import GoogleSignInButton from "@/components/auth/GoogleSignInButton";

export default function LoginPage() {
  const sp = useSearchParams();
  const next = sp.get("next") || "/";
  const urlErr = sp.get("err");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  // Set true when Supabase responds with "Email not confirmed" — UI then
  // shows a "ส่งอีเมลยืนยันใหม่" CTA instead of a useless password error.
  const [needsVerify, setNeedsVerify] = useState<string | null>(null);
  const [resendStatus, setResendStatus] = useState<"idle" | "sending" | "sent">(
    "idle",
  );

  useEffect(() => {
    if (urlErr) {
      // Map common Supabase callback errors to Thai-friendly copy.
      if (urlErr === "missing_auth_params") {
        setError("ลิงก์ยืนยันไม่ถูกต้องหรือหมดอายุ ลองสมัครใหม่หรือขอลิงก์ใหม่");
      } else {
        setError(decodeURIComponent(urlErr));
      }
    }
  }, [urlErr]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNeedsVerify(null);
    setLoading(true);
    const sb = createClient();
    const { error } = await sb.auth.signInWithPassword({ email, password });
    if (error) {
      // Supabase returns "Email not confirmed" verbatim for unverified users.
      // Catch this case and show a verify-resend UI instead of a generic error.
      if (/email\s*not\s*confirmed/i.test(error.message)) {
        setNeedsVerify(email);
      } else {
        setError(error.message);
      }
      setLoading(false);
      return;
    }
    // Hard navigation so server components re-render with new session
    window.location.href = next;
  }

  async function resendVerification() {
    if (!needsVerify) return;
    setResendStatus("sending");
    const sb = createClient();
    const siteUrl =
      (typeof window !== "undefined" && window.location.origin) ||
      "https://doprent.com";
    const { error } = await sb.auth.resend({
      type: "signup",
      email: needsVerify,
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

  // ----- Needs-verify screen -----
  if (needsVerify) {
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
          ยืนยันอีเมลก่อนเข้าใช้งาน
        </h1>
        <p
          style={{
            fontSize: 15,
            color: "var(--ink-2)",
            lineHeight: 1.6,
            marginBottom: 24,
          }}
        >
          บัญชี <strong style={{ color: "var(--ink)" }}>{needsVerify}</strong>{" "}
          ยังไม่ได้ยืนยันอีเมล กดปุ่มข้างล่างเพื่อส่งลิงก์ยืนยันใหม่
        </p>

        <button
          type="button"
          onClick={resendVerification}
          disabled={resendStatus !== "idle"}
          className="btn btn-dark btn-block btn-lg"
          style={{ marginBottom: 10 }}
        >
          {resendStatus === "sending"
            ? "กำลังส่ง..."
            : resendStatus === "sent"
              ? "✓ ส่งอีเมลใหม่แล้ว"
              : "ส่งลิงก์ยืนยันใหม่"}
        </button>

        <button
          type="button"
          onClick={() => {
            setNeedsVerify(null);
            setResendStatus("idle");
          }}
          className="btn btn-outline btn-block"
        >
          ย้อนกลับ
        </button>

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

  // ----- Login form -----
  return (
    <div
      style={{ maxWidth: 460, margin: "0 auto", padding: "48px 20px 80px", width: "100%" }}
    >
      <h1 style={{ fontSize: 28, fontWeight: 600, marginBottom: 6 }}>เข้าสู่ระบบ</h1>
      <p style={{ color: "var(--ink-2)", fontSize: 14, marginBottom: 28 }}>ยินดีต้อนรับกลับ</p>

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

      {/* Google sign-in — primary path. Most Thai users have a Google account
          already, so put it above the email/password form to lower friction. */}
      <GoogleSignInButton
        next={next}
        label="เข้าสู่ระบบด้วย Google"
        onError={setError}
      />

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
        <Field
          label="อีเมล"
          type="email"
          value={email}
          onChange={setEmail}
          required
        />
        <Field
          label="รหัสผ่าน"
          type="password"
          value={password}
          onChange={setPassword}
          required
        />
        <button
          type="submit"
          disabled={loading}
          className="btn btn-dark btn-block btn-lg"
          style={{ marginTop: 12, opacity: loading ? 0.6 : 1 }}
        >
          {loading ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
        </button>
      </form>

      <div style={{ textAlign: "center", fontSize: 13, color: "var(--ink-2)", marginTop: 16 }}>
        ยังไม่มีบัญชี?{" "}
        <Link
          href={`/signup?next=${encodeURIComponent(next)}`}
          style={{ color: "var(--accent)", fontWeight: 500 }}
        >
          สมัครสมาชิก
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
}: {
  label: string;
  type: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
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
