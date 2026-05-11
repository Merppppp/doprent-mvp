import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "เข้าสู่ระบบ — DopRent",
  robots: { index: false },
};

async function signInAction(formData: FormData) {
  "use server";
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/");

  const sb = createClient();
  const { error } = await sb.auth.signInWithPassword({ email, password });
  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}&next=${encodeURIComponent(next)}`);
  }
  redirect(next);
}

export default function LoginPage({
  searchParams,
}: {
  searchParams: { error?: string; next?: string };
}) {
  const next = searchParams.next ?? "/";
  return (
    <div
      className="shell"
      style={{
        maxWidth: 460,
        margin: "0 auto",
        padding: "60px 24px 80px",
      }}
    >
      <h1 style={{ fontSize: 28, fontWeight: 600, marginBottom: 6 }}>เข้าสู่ระบบ</h1>
      <p style={{ color: "var(--ink-2)", fontSize: 14, marginBottom: 28 }}>
        ยินดีต้อนรับกลับ
      </p>

      {searchParams.error ? (
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
          {searchParams.error}
        </div>
      ) : null}

      <form action={signInAction}>
        <input type="hidden" name="next" value={next} />
        <FormField label="อีเมล" name="email" type="email" required />
        <FormField label="รหัสผ่าน" name="password" type="password" required />
        <button type="submit" className="btn btn-dark btn-block btn-lg" style={{ marginTop: 12 }}>
          เข้าสู่ระบบ
        </button>
      </form>

      <div
        style={{
          textAlign: "center",
          fontSize: 13,
          color: "var(--ink-2)",
          marginTop: 16,
        }}
      >
        ยังไม่มีบัญชี?{" "}
        <Link href={`/signup?next=${encodeURIComponent(next)}`} style={{ color: "var(--info)", fontWeight: 500 }}>
          สมัครสมาชิก
        </Link>
      </div>
    </div>
  );
}

function FormField({
  label,
  name,
  type,
  required,
}: {
  label: string;
  name: string;
  type: string;
  required?: boolean;
}) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: "block", fontSize: 13, fontWeight: 500, marginBottom: 6 }}>
        {label}
      </label>
      <input
        type={type}
        name={name}
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
