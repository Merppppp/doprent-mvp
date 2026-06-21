"use client";

import { useState, useEffect } from "react";

export default function PasswordPage() {
  const [hasPassword, setHasPassword] = useState<boolean | null>(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    fetch("/api/account/password-status")
      .then((r) => r.json())
      .then((d) => setHasPassword(d.hasPassword))
      .catch(() => setHasPassword(false));
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (newPassword.length < 6) {
      setError("รหัสผ่านใหม่ต้องอย่างน้อย 6 ตัวอักษร");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("รหัสผ่านใหม่ไม่ตรงกัน");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/account/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: hasPassword ? currentPassword : undefined,
          newPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "เกิดข้อผิดพลาด กรุณาลองใหม่");
        return;
      }
      setSuccess(true);
      setHasPassword(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch {
      setError("เกิดข้อผิดพลาด กรุณาลองใหม่");
    } finally {
      setLoading(false);
    }
  }

  const title = hasPassword ? "เปลี่ยนรหัสผ่าน" : "ตั้งรหัสผ่าน";
  const subtitle = hasPassword
    ? "กรอกรหัสผ่านปัจจุบันและรหัสผ่านใหม่"
    : "บัญชีของคุณเข้าสู่ระบบผ่าน Google — ตั้งรหัสผ่านเพื่อเข้าได้ทั้ง Google และอีเมล+รหัสผ่าน";

  return (
    <>
      <h1 style={{ fontSize: 22, fontWeight: 600, letterSpacing: "-0.01em", marginBottom: 4 }}>
        {title}
      </h1>
      <p style={{ color: "var(--ink-3)", fontSize: 14, marginBottom: 16 }}>
        {subtitle}
      </p>

      <div style={{ maxWidth: 420 }}>
        {success && (
          <div style={{ background: "oklch(0.93 0.04 145)", border: "1px solid oklch(0.78 0.12 145)", color: "oklch(0.35 0.12 145)", padding: "10px 14px", borderRadius: 6, fontSize: 13, marginBottom: 16 }}>
            {hasPassword ? "เปลี่ยนรหัสผ่านสำเร็จ" : "ตั้งรหัสผ่านสำเร็จ — ตอนนี้คุณสามารถเข้าสู่ระบบด้วยอีเมลและรหัสผ่านได้แล้ว"}
          </div>
        )}

        {error && (
          <div style={{ background: "oklch(0.92 0.04 25)", border: "1px solid oklch(0.78 0.12 25)", color: "oklch(0.4 0.13 25)", padding: "10px 14px", borderRadius: 6, fontSize: 13, marginBottom: 16 }}>
            {error}
          </div>
        )}

        {hasPassword === null ? (
          <p style={{ color: "var(--ink-3)", fontSize: 14 }}>กำลังโหลด...</p>
        ) : (
          <form onSubmit={onSubmit}>
            {hasPassword && (
              <div style={{ marginBottom: 14 }}>
                <label style={labelStyle}>รหัสผ่านปัจจุบัน</label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                  className="input"
                  autoComplete="current-password"
                />
              </div>
            )}

            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>รหัสผ่านใหม่</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={6}
                className="input"
                autoComplete="new-password"
              />
              <span style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 4, display: "block" }}>
                อย่างน้อย 6 ตัวอักษร
              </span>
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>ยืนยันรหัสผ่านใหม่</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
                className="input"
                autoComplete="new-password"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn btn-dark btn-block btn-lg"
              style={{ marginTop: 12, opacity: loading ? 0.6 : 1 }}
            >
              {loading ? "กำลังบันทึก..." : title}
            </button>
          </form>
        )}
      </div>
    </>
  );
}

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 13,
  fontWeight: 500,
  marginBottom: 6,
};
