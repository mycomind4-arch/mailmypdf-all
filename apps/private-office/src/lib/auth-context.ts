import { createContext } from "react";
import type { Session, User } from "@supabase/supabase-js";

export type UserRole = "customer" | "admin" | "super_admin";

export interface PrivateOfficeUser {
  id: string;
  email: string;
  fullName?: string;
  role: UserRole;
}

export interface AuthContextValue {
  user: PrivateOfficeUser | null;
  session: Session | null;
  accessToken: string | null;
  loading: boolean;
  isConfigured: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (
    email: string,
    password: string,
  ) => Promise<{ error: string | null; needsConfirmation?: boolean }>;
  signInWithMagicLink: (email: string) => Promise<{ error: string | null }>;
  resetPassword: (email: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<{ error: string | null }>;
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function mapUser(user: User): PrivateOfficeUser {
  const meta = user.user_metadata || {};
  const role: UserRole =
    meta.role === "super_admin"
      ? "super_admin"
      : meta.role === "admin" || meta.is_admin === true
        ? "admin"
        : "customer";
  return { id: user.id, email: user.email || "", fullName: meta.full_name, role };
}
