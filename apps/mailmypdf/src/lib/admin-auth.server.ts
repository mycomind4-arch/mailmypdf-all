/**
 * Admin Authentication
 *
 * Simple admin login system for workflow creator access
 * Credentials: admin@mailmypdf.ai / 666mdr222
 */

import { createServerFn } from "@tanstack/start";
import { getRequest } from "vinxi/http";
import { logger, validateInput, withErrorHandling } from "@/lib/security";
import { z } from "zod";

/* ─────────────────────────────────────────────────────────────────────────── */
/* ADMIN CREDENTIALS                                                           */
/* ─────────────────────────────────────────────────────────────────────────── */

const ADMIN_CREDENTIALS = {
  email: "admin@mailmypdf.ai",
  password: "666mdr222",
};

/* ─────────────────────────────────────────────────────────────────────────── */
/* SESSION MANAGEMENT                                                          */
/* ─────────────────────────────────────────────────────────────────────────── */

interface AdminSession {
  isAdmin: boolean;
  email?: string;
  loginTime?: Date;
  sessionToken?: string;
}

// In-memory session store (in production, use database)
const activeSessions = new Map<string, AdminSession>();

/**
 * Generate session token
 */
function generateSessionToken(): string {
  return `admin-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Admin login
 */
export const adminLogin = createServerFn(
  { method: "POST" },
  async (credentials: unknown) => {
    // Validate input
    const schema = z.object({
      email: z.string().email(),
      password: z.string().min(1),
    });

    const validated = validateInput(credentials, schema);
    if (!validated.success) {
      logger.warn("Invalid admin login attempt - bad format", {
        error: validated.error,
      });
      throw new Error("Invalid credentials");
    }

    return withErrorHandling(
      async () => {
        const { email, password } = validated.data;

        // Check credentials
        if (
          email !== ADMIN_CREDENTIALS.email ||
          password !== ADMIN_CREDENTIALS.password
        ) {
          logger.warn("Failed admin login attempt", {
            email,
            ip: getClientIP(),
          });
          throw new Error("Invalid email or password");
        }

        // Generate session token
        const sessionToken = generateSessionToken();

        // Store session
        activeSessions.set(sessionToken, {
          isAdmin: true,
          email,
          loginTime: new Date(),
          sessionToken,
        });

        logger.info("Admin login successful", {
          email,
          ip: getClientIP(),
        });

        // Return token (would be set in HTTP-only cookie in production)
        return {
          success: true,
          sessionToken,
          email,
          message: "Login successful",
        };
      },
      { path: "/api/admin/login", method: "POST" }
    );
  }
);

/**
 * Verify admin session
 */
export const verifyAdminSession = createServerFn(
  { method: "POST" },
  async (sessionToken: unknown) => {
    // Validate token
    const validated = validateInput(sessionToken, z.string().min(1));
    if (!validated.success) {
      return { isAdmin: false };
    }

    const session = activeSessions.get(validated.data);

    if (!session || !session.isAdmin) {
      return { isAdmin: false };
    }

    return {
      isAdmin: true,
      email: session.email,
      loginTime: session.loginTime,
    };
  }
);

/**
 * Admin logout
 */
export const adminLogout = createServerFn(
  { method: "POST" },
  async (sessionToken: unknown) => {
    const validated = validateInput(sessionToken, z.string().min(1));
    if (validated.success) {
      activeSessions.delete(validated.data);
    }

    return { success: true };
  }
);

/* ─────────────────────────────────────────────────────────────────────────── */
/* VALIDATION HELPERS                                                          */
/* ─────────────────────────────────────────────────────────────────────────── */

/**
 * Validate admin session token (for API routes)
 */
export function validateAdminSession(sessionToken: string | undefined): boolean {
  if (!sessionToken) {
    return false;
  }

  const session = activeSessions.get(sessionToken);
  return session !== undefined && session.isAdmin === true;
}

/* ─────────────────────────────────────────────────────────────────────────── */
/* HELPERS                                                                     */
/* ─────────────────────────────────────────────────────────────────────────── */

function getClientIP(): string {
  const request = getRequest();
  return request?.headers.get("X-Forwarded-For") || "unknown";
}
