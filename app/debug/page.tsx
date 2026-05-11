import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function DebugPage() {
  const allCookies = cookies().getAll();
  const sbCookies = allCookies.filter((c) => c.name.startsWith("sb-"));

  let userData: any = null;
  let userError: string | null = null;
  try {
    const sb = createClient();
    const { data, error } = await sb.auth.getUser();
    userData = data;
    if (error) userError = error.message;
  } catch (err) {
    userError = String(err);
  }

  let profileData: any = null;
  if (userData?.user) {
    const sb = createClient();
    const { data: profile } = await sb
      .from("profiles")
      .select("*")
      .eq("id", userData.user.id)
      .maybeSingle();
    profileData = profile;
  }

  return (
    <div className="shell" style={{ padding: "40px 24px 80px", fontFamily: "monospace" }}>
      <h1 style={{ fontSize: 22, fontWeight: 600, marginBottom: 20 }}>Auth Debug</h1>

      <Section title={`Supabase Cookies (${sbCookies.length})`}>
        {sbCookies.length === 0 ? (
          <p style={{ color: "var(--danger)" }}>
            ❌ ไม่มี sb-* cookies! Browser ไม่ได้ส่ง auth cookies มา
          </p>
        ) : (
          <ul>
            {sbCookies.map((c) => (
              <li key={c.name}>
                <b>{c.name}</b>: {c.value.slice(0, 40)}...
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="getUser() result">
        <pre style={{ fontSize: 12, overflow: "auto" }}>{JSON.stringify(userData, null, 2)}</pre>
        {userError ? <p style={{ color: "var(--danger)" }}>Error: {userError}</p> : null}
      </Section>

      <Section title="Profile (from DB)">
        <pre style={{ fontSize: 12, overflow: "auto" }}>
          {profileData ? JSON.stringify(profileData, null, 2) : "(no profile)"}
        </pre>
      </Section>

      <Section title="All cookies (non-sb)">
        <ul style={{ fontSize: 11, color: "var(--ink-3)" }}>
          {allCookies
            .filter((c) => !c.name.startsWith("sb-"))
            .map((c) => (
              <li key={c.name}>{c.name}</li>
            ))}
        </ul>
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        background: "var(--surface)",
        border: "1px solid var(--line)",
        borderRadius: 8,
        padding: 18,
        marginBottom: 14,
      }}
    >
      <h2 style={{ fontSize: 14, fontWeight: 600, marginBottom: 10 }}>{title}</h2>
      {children}
    </div>
  );
}
