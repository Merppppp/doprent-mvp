import NextAuth, { CredentialsSignin } from "next-auth";
import type { JWT } from "next-auth/jwt";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { base, db } from "@/lib/db";
import type { Role } from "@prisma/client";
import { TERMS_VERSION } from "@/lib/consent";

/**
 * Returns the admin email whitelist.
 * Reads from ADMIN_EMAILS env var (comma-separated, trimmed, lowercased).
 * Falls back to the original three addresses when the var is unset so that
 * environments without the new variable keep working unchanged.
 */
function getAdminEmails(): string[] {
  const raw = process.env.ADMIN_EMAILS;
  if (!raw?.trim()) {
    return ["admin@doprent.com", "prem@doprent.com", "hgcovuf@gmail.com"];
  }
  return raw
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

class InvalidCredentialsError extends CredentialsSignin {
  code = "invalid_credentials";
}

class EmailNotVerifiedError extends CredentialsSignin {
  code = "email_not_verified";
}

class StaffAuthError extends CredentialsSignin {
  code = "staff_auth_error";
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
    Credentials({
      id: "staff",
      credentials: {
        loginCode: { label: "Shop", type: "text" },
        username: { label: "Username", type: "text" },
        pin: { label: "PIN", type: "password" },
      },
      async authorize(credentials) {
        const loginCode = (credentials?.loginCode as string | undefined)?.toUpperCase().trim();
        const username = (credentials?.username as string | undefined)?.toLowerCase().trim();
        const pin = credentials?.pin as string | undefined;
        if (!loginCode || !username || !pin) throw new StaffAuthError();

        // Resolve shop from opaque login code
        const shop = await db.shop.findUnique({ where: { staffLoginCode: loginCode } });
        if (!shop) throw new StaffAuthError();

        const staff = await db.shopStaff.findUnique({ where: { shopId_username: { shopId: shop.id, username } } });
        // Generic error — don't leak which field is wrong
        if (!staff || !staff.isActive) throw new StaffAuthError();

        // Brute-force lockout check
        if (staff.lockedUntil && staff.lockedUntil > new Date()) {
          throw new StaffAuthError();
        }

        const valid = await bcrypt.compare(pin, staff.pinHash);
        if (!valid) {
          const newAttempts = staff.failedAttempts + 1;
          if (newAttempts >= 5) {
            // Lock for 15 minutes
            await db.shopStaff.update({
              where: { id: staff.id },
              data: {
                failedAttempts: 0,
                lockedUntil: new Date(Date.now() + 15 * 60 * 1000),
              },
            });
          } else {
            await db.shopStaff.update({
              where: { id: staff.id },
              data: { failedAttempts: newAttempts },
            });
          }
          throw new StaffAuthError();
        }

        // Success — reset lockout state + update lastLoginAt
        await db.shopStaff.update({
          where: { id: staff.id },
          data: {
            failedAttempts: 0,
            lockedUntil: null,
            lastLoginAt: new Date(),
          },
        });

        return {
          id: `staff:${staff.id}`,
          role: "staff" as const,
          shopId: staff.shopId,
          staffId: staff.id,
          name: staff.displayName,
          canManageBookings: staff.canManageBookings,
          canManageProducts: staff.canManageProducts,
        };
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "google" && user.email) {
        const isAdmin = getAdminEmails().includes(user.email.toLowerCase());
        if (isAdmin) {
          try {
            await db.user.update({
              where: { email: user.email },
              data: { role: "admin" },
            });
          } catch (err) {
            // Non-fatal — DB write failure should not block sign-in
            console.error("[auth] Failed to promote admin role:", err);
          }
        }
      }
      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        const u = user as {
          role?: Role | "staff";
          shopId?: string;
          staffId?: string;
          canManageBookings?: boolean;
          canManageProducts?: boolean;
        };
        token.role = u.role ?? "customer";
        if (u.role === "staff") {
          token.shopId = u.shopId;
          token.staffId = u.staffId;
          token.canManageBookings = u.canManageBookings;
          token.canManageProducts = u.canManageProducts;
        }
      }
      return token;
    },
    async session({ session, token }) {
      const t = token as JWT & {
        id?: string;
        role?: Role | "staff";
        shopId?: string;
        staffId?: string;
        canManageBookings?: boolean;
        canManageProducts?: boolean;
      };
      if (t.id) session.user.id = t.id;
      if (t.role) session.user.role = t.role;
      if (t.role === "staff") {
        session.user.shopId = t.shopId;
        session.user.staffId = t.staffId;
        session.user.canManageBookings = t.canManageBookings;
        session.user.canManageProducts = t.canManageProducts;
      }
      return session;
    },
  },
  events: {
    async createUser({ user }) {
      // Persist PDPA consent for new Google OAuth users (email signup sets it in the API route).
      if (user.id) {
        try {
          await db.user.update({
            where: { id: user.id },
            data: { termsAcceptedAt: new Date(), termsVersion: TERMS_VERSION },
          });
        } catch {
          // Non-fatal — do not block sign-in if this update fails.
        }
      }
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
});
