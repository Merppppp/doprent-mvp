import NextAuth, { CredentialsSignin } from "next-auth";
import type { JWT } from "next-auth/jwt";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { base, db } from "@/lib/db";
import type { Role } from "@prisma/client";

const ADMIN_EMAILS = ["admin@doprent.com", "prem@doprent.com", "hgcovuf@gmail.com"];

class InvalidCredentialsError extends CredentialsSignin {
  code = "invalid_credentials";
}

class EmailNotVerifiedError extends CredentialsSignin {
  code = "email_not_verified";
}

// IMPORTANT: the adapter gets the UN-extended client. Passing the extended
// `db` would actor-stamp/audit adapter ops and serialize Account/Session/
// VerificationToken rows (OAuth + verification tokens) into audit_logs jsonb
// (DESIGN §8.4). The exclusion set in lib/db.ts is defense-in-depth only.
//
// Wrapper: system-wide vocabulary is `fullName` (Prisma User.fullName →
// column full_name), but NextAuth's AdapterUser shape hard-codes `name`.
// Map name→fullName on writes so OAuth profile names land in full_name.
const prismaAdapter = PrismaAdapter(base);
const adapter: typeof prismaAdapter = {
  ...prismaAdapter,
  createUser: (data: any) => {
    const { name, ...rest } = data ?? {};
    return (prismaAdapter.createUser as any)({ ...rest, fullName: name ?? null });
  },
  updateUser: (data: any) => {
    const { name, ...rest } = data ?? {};
    return (prismaAdapter.updateUser as any)(
      name === undefined ? rest : { ...rest, fullName: name },
    );
  },
};

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  adapter,
  // JWT strategy: session lives in a cookie — no DB call needed in middleware
  // Prisma adapter still handles OAuth accounts + user storage
  session: { strategy: "jwt" },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      allowDangerousEmailAccountLinking: true,
    }),
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email as string | undefined;
        const password = credentials?.password as string | undefined;
        if (!email || !password) throw new InvalidCredentialsError();

        const user = await db.user.findUnique({ where: { email } });
        if (!user || !user.passwordHash) throw new InvalidCredentialsError();
        if (!user.emailVerified) throw new EmailNotVerifiedError();

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) throw new InvalidCredentialsError();

        return user;
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "google" && user.email) {
        const isAdmin = ADMIN_EMAILS.includes(user.email.toLowerCase());
        if (isAdmin) {
          await db.user.update({
            where: { email: user.email },
            data: { role: "admin" },
          });
        }
      }
      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role?: Role }).role ?? "customer";
      }
      return token;
    },
    async session({ session, token }) {
      const t = token as JWT & { id?: string; role?: Role };
      if (t.id) session.user.id = t.id;
      if (t.role) session.user.role = t.role;
      return session;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
});
