"use client";

import Link from "next/link";
import { useState } from "react";
import { signIn } from "next-auth/react";

export default function StaffLoginPage() {
  const [username, setUsername] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const result = await signIn("staff", {
      redirect: false,
      username: username.trim().toLowerCase(),
      pin,
    });

    if (!result?.error) {
      window.location.href = "/sell/dashboard";
      return;
    }

    if (result.error === "staff_auth_error" || result.error === "CredentialsSignin") {
      setError("ชื่อผู้ใช้หรือ PIN ไม่ถูกต้อง หรือบัญชีถูกล็อกชั่วคราว");
    } else {
      setError("เกิดข้อผิดพลาด กรุณาลองใหม่");
    }
    setLoading(false);
  }

  return (
    <div style={{ maxWidth: 400, margin: "0 auto", padding: "48px 20px 80px", width: "100%" }}>
      <div style={{ textAlign: "center", marginBottom: 28 }}>
        <div
          aria-hidden
          style={{
            width: 52,
            height: 52,
            borderRadius: 14,
            background: "var(--accent-soft)",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 24,
            marginBottom: 14,
          }}
        >
          👤
        </div>
        <h1 style={{ fontSize: 24, fontWeight: 600, marginBottom: 4 }}>เข้าสู่ระบบพนักงาน</h1>
        <p style={{ fontSize: 14, color: "var(--ink-2)" }}>ใช้ username และ PIN ที่ได้รับจากเจ้าของร้าน</p>
      </div>

      {error && (
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
      )}

      <form onSubmit={onSubmit}>
        <div style={{ marginBottom: 14 }}>
          <label style={{ display: "block", fontSize: 13, fontWeight: 500, marginBottom: 6 }}>
            ชื่อผู้ใช้ (Username)
          </label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            autoComplete="username"
            style={{ width: "100%", padding: "11px 14px", border: "1px solid var(--line)", borderRadius: 6, fontSize: 14 }}
          />
        </div>
        <div style={{ marginBottom: 14 }}>
          <label style={{ display: "block", fontSize: 13, fontWeight: 500, marginBottom: 6 }}>
            PIN (6 หลัก)
          </label>
          <input
            type="password"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            required
            minLength={6}
            maxLength={8}
            inputMode="numeric"
            autoComplete="current-password"
            style={{ width: "100%", padding: "11px 14px", border: "1px solid var(--line)", borderRadius: 6, fontSize: 14, letterSpacing: "0.3em" }}
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="btn btn-dark btn-block btn-lg"
          style={{ marginTop: 4, opacity: loading ? 0.6 : 1 }}
        >
          {loading ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
        </button>
      </form>

      <div style={{ textAlign: "center", marginTop: 20 }}>
        <Link href="/login" style={{ fontSize: 13, color: "var(--ink-3)" }}>
          ← กลับหน้าเข้าสู่ระบบปกติ
        </Link>
      </div>
    </div>
  );
}
