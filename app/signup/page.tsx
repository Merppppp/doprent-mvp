"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/browser";

export default function SignupPage() {
  const router = useRouter();
  const sp = useSearchParams();
  const next = sp.get("next") || "/";

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 6) {
      setError("รหัสผ่านต้องอย่างน้อย 6 ตัวอักษร");
      return;
    }
    setLoading(true);
    const sb = createClient();
    const { data, error } = await sb.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }
    // If email confirmation disabled, Supabase returns a session right away.
    // If still off in Supabase config (no session), try a manual sign-in.
    if (!data.session) {
      const { error: signInErr } = await sb.auth.signInWithPassword({ email, password });
      if (signInErr) {
        setError(signInErr.message);
        setLoading(false);
        return;
      }
    }
    window.location.href = next;
  }

  return (
    <div className="shell" style={{ maxWidth: 460, margin: "0 auto", padding: "60px 24px 80px" }}>
      <h1 style={{ fontSize: 28, fontWeight: 600, marginBottom: 6 }}>สมัครสมาชิก</h1>
      <p style={{ color: "var(--ink-2)", fontSize: 14, marginBottom: 28 }}>
        บันทึกชุดที่ชอบ ติดตามการจอง
      </p>

      {error ? (
        <div
          style={{
            background: "#FEE2E2",
            border: "1px solid #FCA5A5",
            color: "#991B1B",
            padding: "10px 14px",
            borderRadius: 6,
            fontSize: 13,
            marginBottom: 16,
          }}
        >
          {error}
        </div>
      ) : null}

      <form onSubmit={onSubmit}>
        <Field label="ชื่อ" type="text" value={fullName} onChange={setFullName} required />
        <Field label="อีเมล" type="email" value={email} onChange={setEmail} required />
        <Field
          label="รหัสผ่าน (อย่างน้อย 6 ตัวอักษร)"
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
          {loading ? "กำลังสร้างบัญชี..." : "สร้างบัญชี"}
        </button>
      </form>

      <div style={{ textAlign: "center", fontSize: 13, color: "var(--ink-2)", marginTop: 16 }}>
        มีบัญชีอยู่แล้ว?{" "}
        <Link
          href={`/login?next=${encodeURIComponent(next)}`}
          style={{ color: "var(--info)", fontWeight: 500 }}
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
