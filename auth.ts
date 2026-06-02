import NextAuth, { CredentialsSignin } from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";

const ADMIN_EMAILS = ["admin@doprent.com", "prem@doprent.com", "hgcovuf@gmail.com"];

class InvalidCredentialsError extends CredentialsSignin {
  code = "invalid_credentials";
}

class EmailNotVerifiedError extends CredentialsSignin {
  code = "email_not_verified";
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(db),
  session: { strategy: "database" },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
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
    async session({ session, user }) {
      session.user.id = user.id;
      // @ts-expect-error role is a custom field
      session.user.role = user.role;
      return session;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
});
