/**
 * Activity Server Functions
 *
 * Functions for fetching user's recent activity:
 * - Active workflows across all verticals
 * - Recent mailings and orders
 *
 * This data sources from multiple systems and consolidates it
 * for the unified workspace dashboard.
 */

import { createServerFn } from "@tanstack/start";
import { withAdmin } from "./supabase-admin.server";

/**
 * Get user's recent activity including active workflows and mailings.
 */
export const getUserRecentActivity = createServerFn({
  method: "POST",
  async handler(ctx) {
    const userId = ctx.request?.headers.get("x-user-id");
    const userEmail = ctx.request?.headers.get("x-user-email");

    if (!userId || !userEmail) {
      throw new Error("Unauthorized");
    }

    const [activeWorkflows, recentMailings] = await Promise.all([
      getActiveWorkflows(userId, userEmail),
      getRecentMailings(userEmail),
    ]);

    return {
      activeWorkflows,
      recentMailings,
    };
  },
});

/**
 * Get active workflows across all verticals.
 *
 * NOTE: This is a placeholder. In production, this would:
 * 1. Query each vertical's workflow_runs table
 * 2. Filter by user_id and status IN ('draft', 'in_progress', 'submitted', 'waiting_approval')
 * 3. Consolidate results with vertical/workflow metadata
 *
 * For now, returns empty array to show structure.
 * Implement after workflow persistence is ready.
 */
async function getActiveWorkflows(userId: string, userEmail: string) {
  // TODO: Query workflow_runs table in each vertical database
  // For now, return empty
  return [];
}

/**
 * Get recent mailings for user.
 *
 * Queries the orders table and retrieves:
 * - Document name
 * - Recipient
 * - Mailing service used
 * - Current status
 * - Creation date
 */
async function getRecentMailings(userEmail: string) {
  const data = await withAdmin(async (db) => {
    const { data: orders, error } = await db
      .from("orders")
      .select("*")
      .eq("email", userEmail)
      .order("created_at", { ascending: false })
      .limit(10);

    if (error || !orders) {
      return [];
    }

    return orders.map((order) => ({
      id: order.id,
      workflowName: order.metadata?.workflow_name || "Document",
      status: order.status,
      mailingService: order.metadata?.mailing_service || "first_class",
      recipientName: order.recipient_name,
      priceCents: order.price_cents,
      mailedAt: order.mailed_at,
      createdAt: order.created_at,
    }));
  });

  return data;
}

/**
 * Get recent orders for a user (for "Mail Again" feature).
 */
export const getUserRecentOrders = createServerFn({
  method: "POST",
  async handler(ctx) {
    const userEmail = ctx.request?.headers.get("x-user-email");

    if (!userEmail) {
      throw new Error("Unauthorized");
    }

    const data = await withAdmin(async (db) => {
      const { data: orders } = await db
        .from("orders")
        .select("id, recipient_name, recipient_line1, recipient_city, recipient_state, recipient_postal, sender_name, sender_line1, sender_city, sender_state, sender_postal")
        .eq("email", userEmail)
        .eq("status", "delivered")
        .order("created_at", { ascending: false })
        .limit(5);

      if (!orders) return [];

      // Deduplicate by recipient
      const seen = new Set<string>();
      return orders.filter((order) => {
        const key = `${order.recipient_name}|${order.recipient_line1}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    });

    return data;
  },
});

/**
 * Get activity statistics for dashboard.
 */
export const getUserActivityStats = createServerFn({
  method: "POST",
  async handler(ctx) {
    const userEmail = ctx.request?.headers.get("x-user-email");

    if (!userEmail) {
      throw new Error("Unauthorized");
    }

    const data = await withAdmin(async (db) => {
      // Get order counts
      const { data: orders } = await db
        .from("orders")
        .select("status")
        .eq("email", userEmail);

      if (!orders) {
        return {
          totalOrders: 0,
          deliveredOrders: 0,
          totalSpent: 0,
          averageOrderValue: 0,
        };
      }

      const deliveredCount = orders.filter((o) => o.status === "delivered").length;
      const totalSpent = orders.reduce((sum, o) => sum + (o.price_cents || 0), 0);

      return {
        totalOrders: orders.length,
        deliveredOrders: deliveredCount,
        totalSpent,
        averageOrderValue: orders.length > 0 ? Math.floor(totalSpent / orders.length) : 0,
      };
    });

    return data;
  },
});
