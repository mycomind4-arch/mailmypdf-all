/**
 * Authenticated Sidebar
 *
 * Persistent navigation sidebar for logged-in users.
 * Shows account context, navigation, and settings.
 * Responsive: Sticky on desktop, collapsible on mobile/tablet.
 */

import { useState } from "react";
import { Link, useLocation } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import {
  Menu,
  X,
  Home,
  Workflow,
  Settings,
  LogOut,
  HelpCircle,
  ChevronDown,
  Building2,
  Users,
  Shield,
} from "lucide-react";

interface AuthenticatedSidebarProps {
  user: { email?: string; user_metadata?: any } | null;
  userRole?: "admin" | "member" | "viewer";
  organizationName?: string;
}

export function AuthenticatedSidebar({
  user,
  userRole = "member",
  organizationName = "My Workspace",
}: AuthenticatedSidebarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const location = useLocation();

  const isActive = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(path + "/");
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  return (
    <>
      {/* Mobile Menu Toggle */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed top-4 left-4 z-40 md:hidden rounded-lg p-2 hover:bg-card transition-colors"
      >
        {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
      </button>

      {/* Sidebar Overlay (Mobile) */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 h-screen w-64 bg-paper border-r border-rule/60 z-40 flex flex-col transition-transform md:relative md:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="border-b border-rule/60 p-4 space-y-4">
          {/* Workspace Context */}
          <div>
            <p className="text-xs font-semibold text-ink-soft uppercase tracking-wider">
              Workspace
            </p>
            <p className="text-sm font-medium mt-1">{organizationName}</p>
          </div>

          {/* Close Button (Mobile) */}
          <button
            onClick={() => setIsOpen(false)}
            className="md:hidden absolute top-4 right-4 rounded-lg p-2 hover:bg-card"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* User Profile Section */}
        <div className="border-b border-rule/60 p-4">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="w-full rounded-lg border border-rule/60 bg-card p-3 text-left hover:bg-card-hover transition-colors"
          >
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-ink-soft uppercase">
                  Account
                </p>
                <p className="text-sm font-medium truncate mt-1">
                  {user?.email || "User"}
                </p>
                <p className="text-xs text-ink-soft mt-0.5 capitalize">
                  {userRole}
                </p>
              </div>
              <ChevronDown
                className={`h-4 w-4 text-ink-soft transition-transform ${
                  showUserMenu ? "rotate-180" : ""
                }`}
              />
            </div>
          </button>

          {/* User Menu Dropdown */}
          {showUserMenu && (
            <div className="mt-2 space-y-1">
              <Link
                to="/account"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-card transition-colors"
              >
                <Settings className="h-4 w-4" />
                Account Settings
              </Link>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-card transition-colors text-rose-700"
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </button>
            </div>
          )}
        </div>

        {/* Main Navigation */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-1">
          <div className="space-y-1 mb-6">
            <p className="text-xs font-semibold text-ink-soft uppercase tracking-wider px-3 mb-2">
              Main
            </p>

            <NavLink
              to="/"
              icon={Home}
              label="Home"
              isActive={isActive("/")}
              onClick={() => setIsOpen(false)}
            />

            <NavLink
              to="/workspace"
              icon={Home}
              label="Dashboard"
              isActive={isActive("/workspace")}
              onClick={() => setIsOpen(false)}
            />

            <NavLink
              to="/workflows"
              icon={Workflow}
              label="Workflows"
              isActive={isActive("/workflows")}
              onClick={() => setIsOpen(false)}
            />
          </div>

          {/* Admin Section */}
          {(userRole === "admin" || userRole === "owner") && (
            <div className="space-y-1">
              <p className="text-xs font-semibold text-ink-soft uppercase tracking-wider px-3 mb-2">
                Admin
              </p>

              <NavLink
                to="/admin/entitlements"
                icon={Shield}
                label="Entitlements"
                isActive={isActive("/admin/entitlements")}
                onClick={() => setIsOpen(false)}
              />

              <NavLink
                to="/admin/policies"
                icon={Shield}
                label="Policies"
                isActive={isActive("/admin/policies")}
                onClick={() => setIsOpen(false)}
              />

              <NavLink
                to="/admin/users"
                icon={Users}
                label="Team Members"
                isActive={isActive("/admin/users")}
                onClick={() => setIsOpen(false)}
              />
            </div>
          )}
        </nav>

        {/* Footer Navigation */}
        <div className="border-t border-rule/60 p-4 space-y-1">
          <NavLink
            to="/help"
            icon={HelpCircle}
            label="Help & Support"
            isActive={isActive("/help")}
            onClick={() => setIsOpen(false)}
          />

          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-ink hover:bg-card transition-colors text-rose-700"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </button>
        </div>

        {/* Version/Build Info */}
        <div className="border-t border-rule/60 p-4">
          <p className="text-xs text-ink-soft text-center">
            MailMyPDF {process.env.PUBLIC_APP_VERSION || "1.0"}
          </p>
        </div>
      </aside>
    </>
  );
}

/* ─────────────────────────────────────────────────────────────────────────── */
/* NAV LINK COMPONENT                                                          */
/* ─────────────────────────────────────────────────────────────────────────── */

interface NavLinkProps {
  to: string;
  icon: any;
  label: string;
  isActive: boolean;
  onClick?: () => void;
  badge?: number | string;
}

function NavLink({ to, icon: Icon, label, isActive, onClick, badge }: NavLinkProps) {
  return (
    <Link
      to={to}
      onClick={onClick}
      className={`flex items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
        isActive
          ? "bg-cobalt text-white"
          : "text-ink hover:bg-card"
      }`}
    >
      <div className="flex items-center gap-3 flex-1">
        <Icon className="h-4 w-4 flex-shrink-0" />
        <span>{label}</span>
      </div>
      {badge && (
        <span className="inline-flex items-center justify-center rounded-full bg-rose-500 px-2 py-0.5 text-xs font-semibold text-white">
          {badge}
        </span>
      )}
    </Link>
  );
}

export default AuthenticatedSidebar;
