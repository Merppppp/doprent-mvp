import type { Role } from "@prisma/client";
import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
      image?: string | null;
      role: Role | "staff";
      // Staff-only fields (present when role === "staff")
      shopId?: string;
      staffId?: string;
      canManageBookings?: boolean;
      canManageProducts?: boolean;
    };
  }

  interface User {
    role?: Role | "staff";
    shopId?: string;
    staffId?: string;
    canManageBookings?: boolean;
    canManageProducts?: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: Role | "staff";
    shopId?: string;
    staffId?: string;
    canManageBookings?: boolean;
    canManageProducts?: boolean;
  }
}
