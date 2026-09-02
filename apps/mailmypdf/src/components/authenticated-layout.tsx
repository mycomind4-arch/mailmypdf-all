/**
 * Authenticated Layout
 *
 * Wrapper component for authenticated pages.
 * Provides consistent sidebar + content area layout.
 */

import { ReactNode } from "react";
import { AuthenticatedSidebar } from "./authenticated-sidebar";

interface AuthenticatedLayoutProps {
  children: ReactNode;
  user: { email?: string; user_metadata?: any } | null;
  userRole?: "admin" | "member" | "viewer" | "owner";
  organizationName?: string;
}

export function AuthenticatedLayout({
  children,
  user,
  userRole = "member",
  organizationName = "MailMyPDF",
}: AuthenticatedLayoutProps) {
  return (
    <div className="min-h-screen bg-paper flex">
      {/* Sidebar */}
      <AuthenticatedSidebar
        user={user}
        userRole={userRole}
        organizationName={organizationName}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col">{children}</div>
    </div>
  );
}

export default AuthenticatedLayout;
