/**
 * Root Layout with Admin Login Integration
 *
 * This adds admin login capability to the main site.
 * Users can login from the header and access the admin dashboard.
 */

import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";

export function AdminLoginWidget() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminEmail, setAdminEmail] = useState<string | null>(null);

  useEffect(() => {
    // Check if user is logged in as admin
    const token = localStorage.getItem("admin-session-token");
    const email = localStorage.getItem("admin-email");

    if (token && email) {
      setIsAdmin(true);
      setAdminEmail(email);
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("admin-session-token");
    localStorage.removeItem("admin-email");
    setIsAdmin(false);
    setAdminEmail(null);
    window.location.href = "/";
  };

  if (isAdmin && adminEmail) {
    return (
      <div className="flex items-center gap-3">
        <div className="text-right">
          <div className="text-sm font-medium text-gray-900">{adminEmail}</div>
          <div className="text-xs text-green-600">✓ Admin</div>
        </div>
        <button
          onClick={handleLogout}
          className="px-3 py-1.5 text-xs font-medium text-white bg-red-600 hover:bg-red-700 rounded"
        >
          Logout
        </button>
      </div>
    );
  }

  return (
    <Link
      to="/admin/login"
      className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded transition"
    >
      🔐 Admin Login
    </Link>
  );
}

/**
 * Usage in your site header:
 *
 * import { AdminLoginWidget } from "@/routes/__root.admin";
 *
 * // In your header/nav component:
 * <AdminLoginWidget />
 *
 * This will show:
 * - "🔐 Admin Login" button when not logged in
 * - Admin email + Logout button when logged in
 */
