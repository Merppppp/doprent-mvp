import { cookies } from "next/headers";
import { auth } from "@/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function DebugPage() {
  const session = await auth();
  const allCookies = cookies().getAll();
  const authCookies = allCookies.filter((c) => c.name.startsWith("authjs.") || c.name.startsWith("next-auth."));

  let dbUser = null;
  let favoriteCount = 0;
  if (session?.user?.id) {
    [dbUser, favoriteCount] = await Promise.all([
      db.user.findUnique({
        where: { id: session.user.id },
        select: { id: true, email: true, name: true, role: true, emailVerified: true },
      }),
      db.favorite.count({ where: { userId: session.user.id } }),
    ]);
  }

  return (
    <div className="container" style={{ padding: "40px 24px 80px", fontFamily: "monospace" }}>
      <h1 style={{ fontSize: 22, fontWeight: 600, marginBottom: 20 }}>Auth Debug (NextAuth)</h1>

      <Section title={`Auth Cookies (${authCookies.length})`}>
        {authCookies.length === 0 ? (
          <p style={{ color: "var(--danger)" }}>❌ ไม่มี auth cookies</p>
        ) : (
          <ul>
            {authCookies.map((c) => (
              <li key={c.name}><b>{c.name}</b>: {c.value.slice(0, 40)}...</li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="NextAuth Session">
        <pre style={{ fontSize: 12, overflow: "auto" }}>{JSON.stringify(session, null, 2)}</pre>
      </Section>

      <Section title="User (from DB)">
        <pre style={{ fontSize: 12, overflow: "auto" }}>
          {dbUser ? JSON.stringify({ ...dbUser, favoriteCount }, null, 2) : "(no user in DB)"}
        </pre>
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 8, padding: 18, marginBottom: 14 }}>
      <h2 style={{ fontSize: 14, fontWeight: 600, marginBottom: 10 }}>{title}</h2>
      {children}
    </div>
  );
}
