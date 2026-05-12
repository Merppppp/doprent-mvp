"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/browser";

export default function LoginPage() {
  const router = useRouter();
  const sp = useSearchParams();
  const next = sp.get("next") || "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const sb = createClient();
    const { error } = await sb.auth.signInWithPassword({ email, password });
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }
    // hard navigation so server components re-render with new session
    window.location.href = next;
  }

  return (
    <div
      style={{ maxWidth: 460, margin: "0 auto", padding: "48px 20px 80px", width: "100%" }}
    >
      <h1 style={{ fontSize: 28, fontWeight: 600, marginBottom: 6 }}>เข้าสู่ระบบ</h1>
      <p style={{ color: "var(--ink-2)", fontSize: 14, marginBottom: 28 }}>ยินดีต้อนรับกลับ</p>

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
          style={{ color: "var(--info)", fontWeight: 500 }}
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
