import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../src/integrations/supabase/types";
import {
  AssignEntitlementSchema,
  AuditLogFilterSchema,
  GetQuotaUsageSchema,
  assertEntitlementReadAccess,
  validateEntitlementAssignment,
  countMonthlyAcceptedQuotes,
  fetchActiveEntitlements,
  getAuditActorScope,
  getQuotaMonthWindow,
} from "../src/lib/entitlements-management";

const USER = "11111111-1111-4111-8111-111111111111";
const OTHER = "22222222-2222-4222-8222-222222222222";
const POLICY = "33333333-3333-4333-8333-333333333333";

function clientWithFetch(fetch: typeof globalThis.fetch) {
  return createClient<Database>("https://synthetic.invalid", "synthetic-test-key", {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch },
  });
}

describe("entitlement input boundaries", () => {
  test("requires one assignment target so an organization grant cannot hide a user grant", () => {
    for (const targets of [{}, { targetUserId: USER, targetOrgId: OTHER }]) {
      assert.equal(AssignEntitlementSchema.safeParse({ ...targets, policyId: POLICY }).success, false);
    }
    assert.equal(AssignEntitlementSchema.safeParse({ targetUserId: USER, policyId: POLICY }).success, true);
    assert.equal(AssignEntitlementSchema.safeParse({ targetOrgId: OTHER, policyId: POLICY }).success, true);
  });

  test("rejects impossible quota months before they can roll into another year", () => {
    for (const month of ["2026-00", "2026-13", "0000-01", "2026-1", "2026-09-01"]) {
      assert.equal(GetQuotaUsageSchema.safeParse({ userId: USER, month }).success, false, month);
    }
  });

  test("bounds audit queries and free-text input", () => {
    for (const filter of [{ limit: 101 }, { offset: 10001 }, { action: "unknown" }]) {
      assert.equal(AuditLogFilterSchema.safeParse(filter).success, false);
    }
    assert.equal(AssignEntitlementSchema.safeParse({
      targetUserId: USER, policyId: POLICY, reason: "x".repeat(2001),
    }).success, false);
  });

  test("does not grant policies to the administrator or create an already-expired grant", () => {
    const now = new Date("2026-09-05T00:00:00.000Z");
    assert.throws(() => validateEntitlementAssignment({ targetUserId: USER, policyId: POLICY }, USER, now), /yourself/);
    for (const expiresAt of ["2026-09-04T00:00:00.000Z", now.toISOString()]) {
      assert.throws(() => validateEntitlementAssignment({ targetUserId: OTHER, policyId: POLICY, expiresAt }, USER, now), /future/);
    }
    assert.doesNotThrow(() => validateEntitlementAssignment({
      targetUserId: OTHER, policyId: POLICY, expiresAt: "2026-09-06T00:00:00.000Z",
    }, USER, now));
  });
});

describe("entitlement read authorization", () => {
  test("allows a verified user's own reads without granting access to another user's records", async () => {
    const verifyAdmin = async () => { throw new Error("Forbidden"); };
    await assert.doesNotReject(() => assertEntitlementReadAccess({ id: USER }, USER, verifyAdmin));
    await assert.rejects(() => assertEntitlementReadAccess({ id: USER }, OTHER, verifyAdmin), /Forbidden/);
    await assert.rejects(() => assertEntitlementReadAccess(null, USER, verifyAdmin), /Unauthorized/);
  });

  test("cross-user access verifies the requester, regardless of the target's role", async () => {
    const verifyAdmin = async (id: string) => {
      if (id !== USER) throw new Error("Forbidden");
    };
    await assert.doesNotReject(() => assertEntitlementReadAccess({ id: USER }, OTHER, verifyAdmin));
    await assert.rejects(() => assertEntitlementReadAccess({ id: OTHER }, USER, verifyAdmin), /Forbidden/);
  });
});

describe("audit actor authorization", () => {
  const admin = { id: USER, app_metadata: { role: "admin" } };
  const superAdmin = { id: USER, app_metadata: { role: "super_admin" } };

  test("ordinary administrators remain scoped to themselves when omitting the filter", () => {
    assert.equal(getAuditActorScope(admin), USER);
    assert.equal(getAuditActorScope(admin, USER), USER);
    assert.throws(() => getAuditActorScope(admin, OTHER), /Forbidden/);
  });

  test("only super administrators can read all actors or choose another actor", () => {
    assert.equal(getAuditActorScope(superAdmin), undefined);
    assert.equal(getAuditActorScope(superAdmin, OTHER), OTHER);
    assert.throws(() => getAuditActorScope({ id: USER, app_metadata: { role: "user" } }), /Forbidden/);
  });
});

describe("quota month boundaries", () => {
  test("uses UTC across local daylight-saving changes and the year boundary", () => {
    const previousTimezone = process.env.TZ;
    process.env.TZ = "America/Los_Angeles";
    try {
      assert.deepEqual(getQuotaMonthWindow("2026-03"), {
        start: "2026-03-01T00:00:00.000Z", end: "2026-04-01T00:00:00.000Z",
      });
      assert.deepEqual(getQuotaMonthWindow("2026-12"), {
        start: "2026-12-01T00:00:00.000Z", end: "2027-01-01T00:00:00.000Z",
      });
      assert.deepEqual(getQuotaMonthWindow("0099-12"), {
        start: "0099-12-01T00:00:00.000Z", end: "0100-01-01T00:00:00.000Z",
      });
    } finally {
      if (previousTimezone === undefined) delete process.env.TZ;
      else process.env.TZ = previousTimezone;
    }
  });

  test("rejects invalid month windows at the query boundary", () => {
    assert.throws(() => getQuotaMonthWindow("2026-13"));
  });

  test("counts all accepted quotes even beyond the API row limit, without downloading records", async () => {
    const client = clientWithFetch(async (url, init) => {
      const query = new URL(String(url)).searchParams;
      assert.equal(query.get("user_id"), `eq.${USER}`);
      assert.equal(query.get("status"), "eq.accepted");
      assert.deepEqual(query.getAll("accepted_at"), [
        "gte.2026-09-01T00:00:00.000Z", "lt.2026-10-01T00:00:00.000Z",
      ]);
      assert.equal(query.has("created_at"), false, "consumption belongs to the month of acceptance");
      assert.equal(init?.method, "HEAD");
      assert.match(new Headers(init?.headers).get("prefer") || "", /count=exact/);
      return new Response(null, { headers: { "content-range": "*/1501" } });
    });
    assert.equal(await countMonthlyAcceptedQuotes(client, USER, "2026-09"), 1501);
  });

  test("does not turn missing count data or database failure into an unused allowance", async () => {
    const missing = clientWithFetch(async () => new Response(null));
    await assert.rejects(() => countMonthlyAcceptedQuotes(missing, USER, "2026-09"));
    const failure = clientWithFetch(async () => new Response(null, { status: 403 }));
    await assert.rejects(() => countMonthlyAcceptedQuotes(failure, USER, "2026-09"));
  });
});

describe("active entitlement queries", () => {
  test("includes permanent and future assignments, excluding expired and boundary assignments", async () => {
    const now = new Date("2026-09-05T00:00:00.000Z");
    const fixtures = [
      { id: "permanent", expires_at: null },
      { id: "future", expires_at: "2026-09-06T00:00:00.000Z" },
      { id: "expired", expires_at: "2026-09-04T00:00:00.000Z" },
      { id: "boundary", expires_at: now.toISOString() },
    ];
    const client = clientWithFetch(async (url) => {
      const query = new URL(String(url)).searchParams;
      const or = query.get("or");
      assert.equal(query.has("expires_at"), false, "a separate IS NULL excludes expiring grants");
      assert.equal(or, `(expires_at.is.null,expires_at.gt.${now.toISOString()})`);
      const active = fixtures.filter((row) => row.expires_at === null || row.expires_at > now.toISOString());
      return Response.json(active);
    });
    const assignments = await fetchActiveEntitlements(client, { limit: 50, offset: 0 }, now);
    assert.deepEqual(assignments.map((assignment) => assignment.id), ["permanent", "future"]);
  });
});
