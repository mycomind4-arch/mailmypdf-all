import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { PGlite } from "@electric-sql/pglite";

/**
 * Execute the real, checked-in approval RPC in isolated PostgreSQL semantics.
 * This is deliberately not a hosted Supabase integration or an applied-migration
 * assertion. It makes the previously static CP2000 quote/ID contract executable.
 */
test("CP2000 approval RPC preserves exact ID and source-bound quote, rejects bad pages and disallows direct authenticated execution", async (t) => {
  const db = new PGlite();
  t.after(() => db.close());

  const [bridge, permissions] = await Promise.all([
    readFile(new URL("../supabase/migrations/20260920100000_workflow_runtime_bridge.sql", import.meta.url), "utf8"),
    readFile(new URL("../supabase/migrations/20260927020000_restore_server_only_workflow_approval.sql", import.meta.url), "utf8"),
  ]);
  const functionDdl = bridge.match(/create or replace function public\.approve_case_packet\([\s\S]*?\n\$\$;/i)?.[0];
  assert.ok(functionDdl, "test must execute the actual nine-argument production RPC definition");
  const permissionDdl = permissions.match(/revoke all on function public\.approve_case_packet\([\s\S]*?to service_role;/i)?.[0];
  assert.ok(permissionDdl, "test must execute the server-only correction, not a hand-written approximation");

  // Minimal dependencies for the checked-in function; all rows and identities
  // are synthetic and stay inside this process-local PGlite instance.
  await db.exec(`
    CREATE ROLE anon;
    CREATE ROLE authenticated;
    CREATE ROLE service_role;
    CREATE SCHEMA auth;
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS
      'SELECT NULL::uuid';
    CREATE TABLE public.workflow_cases (
      id uuid PRIMARY KEY, owner_id uuid NOT NULL, status text NOT NULL
    );
    CREATE TABLE public.case_documents (
      case_id uuid NOT NULL, included boolean NOT NULL, page_count integer
    );
    CREATE TABLE public.case_approvals (
      id uuid PRIMARY KEY, case_id uuid NOT NULL, owner_id uuid NOT NULL,
      packet_sha256 text NOT NULL, manifest jsonb NOT NULL,
      response_pages integer NOT NULL, supporting_pages integer NOT NULL,
      recipient jsonb NOT NULL, mail_class text NOT NULL, quote jsonb NOT NULL,
      approved_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE TABLE public.security_events (
      owner_id uuid NOT NULL, event_type text NOT NULL, metadata jsonb NOT NULL
    );
    CREATE FUNCTION public.case_packet_documents(p_case_id uuid)
      RETURNS TABLE(document_id uuid) LANGUAGE sql AS
      'SELECT NULL::uuid WHERE FALSE';
  `);
  await db.exec(functionDdl);
  await db.exec(permissionDdl);

  const access = await db.query<{ role: string; allowed: boolean }>(`
    SELECT 'authenticated' AS role,
      has_function_privilege('authenticated',
        'public.approve_case_packet(uuid,text,jsonb,integer,integer,jsonb,text,jsonb,uuid)', 'EXECUTE') AS allowed
    UNION ALL
    SELECT 'service_role',
      has_function_privilege('service_role',
        'public.approve_case_packet(uuid,text,jsonb,integer,integer,jsonb,text,jsonb,uuid)', 'EXECUTE')
  `);
  assert.deepEqual(Object.fromEntries(access.rows.map((row) => [row.role, row.allowed])), {
    authenticated: false,
    service_role: true,
  }, "browser-authenticated sessions must not mint approvals through the Data API");

  const caseId = "11111111-1111-4111-8111-111111111111";
  const ownerId = "22222222-2222-4222-8222-222222222222";
  const approvalId = "33333333-3333-4333-8333-333333333333";
  await db.query("INSERT INTO public.workflow_cases(id,owner_id,status) VALUES ($1,$2,'drafted')", [caseId, ownerId]);
  await db.query("INSERT INTO public.case_documents(case_id,included,page_count) VALUES ($1,true,2)", [caseId]);

  const recipient = {
    name: "Internal Revenue Service", line1: "PO Box 123",
    city: "Austin", state: "TX", postal: "78701",
  };
  const confirmation = {
    sourceDocumentId: "notice-synthetic-1",
    analysisVersion: 2,
    sourceFingerprint: JSON.stringify({
      documentId: "notice-synthetic-1",
      responseAddress: recipient,
      referenceNumber: "SYNTHETIC-REF",
    }),
  };
  const quote = { totalCents: 1499, cp2000RecipientConfirmation: confirmation };
  const callSql = `
    SELECT id, case_id, owner_id, packet_sha256, supporting_pages,
           recipient, quote
      FROM public.approve_case_packet(
        $1::uuid, $2::text, $3::jsonb, $4::integer, $5::integer,
        $6::jsonb, $7::text, $8::jsonb, $9::uuid
      )
  `;
  const args: unknown[] = [
    caseId, "a".repeat(64), JSON.stringify([]), 1, 2,
    JSON.stringify(recipient), "certified", JSON.stringify(quote), approvalId,
  ];

  // A service-only RPC must still reject a foreign authenticated identity.
  // Exercise the actual checked-in SQL guard rather than trusting a mock owner filter.
  await db.exec(`
    CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS
      'SELECT ''44444444-4444-4444-8444-444444444444''::uuid';
  `);
  await assert.rejects(
    db.query(callSql, args),
    /case not found/,
    "a different authenticated owner must not approve another customer's case",
  );
  const foreignAttempt = await db.query<{
    approvals: number; events: number; status: string;
  }>(`
    SELECT (SELECT count(*)::integer FROM public.case_approvals) AS approvals,
           (SELECT count(*)::integer FROM public.security_events) AS events,
           (SELECT status FROM public.workflow_cases WHERE id = $1) AS status
  `, [caseId]);
  assert.deepEqual(foreignAttempt.rows[0], {
    approvals: 0, events: 0, status: "drafted",
  }, "a rejected cross-owner RPC must leave approval, audit, and case state unchanged");

  // A matching authenticated identity must retain the existing successful path.
  await db.exec(`
    CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS
      'SELECT ''22222222-2222-4222-8222-222222222222''::uuid';
  `);

  // The checked-in approval RPC must not bypass the packet-document security
  // gate. Simulate a rejected source attachment at the gate boundary and
  // require transaction rollback before an approval or audit entry is stored.
  // This is NOT a test of the real scanner or a hosted database migration.
  await db.exec(`
    CREATE OR REPLACE FUNCTION public.case_packet_documents(p_case_id uuid)
      RETURNS TABLE(document_id uuid) LANGUAGE plpgsql AS $scan$
    BEGIN
      RAISE EXCEPTION 'synthetic_unsafe_packet_document';
    END;
    $scan$;
  `);
  await assert.rejects(
    db.query(callSql, args),
    /synthetic_unsafe_packet_document/,
    "a failed packet security gate must block the approval RPC",
  );
  const blockedPacket = await db.query<{
    approvals: number; events: number; status: string;
  }>(`
    SELECT (SELECT count(*)::integer FROM public.case_approvals) AS approvals,
           (SELECT count(*)::integer FROM public.security_events) AS events,
           (SELECT status FROM public.workflow_cases WHERE id = $1) AS status
  `, [caseId]);
  assert.deepEqual(blockedPacket.rows[0], {
    approvals: 0, events: 0, status: "drafted",
  }, "rejected packet security checks must leave approval, audit and case state untouched");
  await db.exec(`
    CREATE OR REPLACE FUNCTION public.case_packet_documents(p_case_id uuid)
      RETURNS TABLE(document_id uuid) LANGUAGE sql AS
      'SELECT NULL::uuid WHERE FALSE';
  `);

  // A stale/incorrect page count cannot create an approval or a security event.
  await assert.rejects(db.query(callSql, [...args.slice(0, 4), 1, ...args.slice(5)]));
  const before = await db.query<{ count: number }>("SELECT count(*)::integer AS count FROM public.case_approvals");
  assert.equal(before.rows[0]?.count, 0);

  // Approval, case status, and the security audit are one transaction. If
  // the audit write fails after the approval insert, no partial approval may
  // remain available for checkout. This uses the checked-in RPC, not a mock.
  await db.exec(`
    CREATE FUNCTION public.reject_approval_audit() RETURNS trigger
      LANGUAGE plpgsql AS $audit$
    BEGIN
      IF NEW.event_type = 'case.packet_approved' THEN
        RAISE EXCEPTION 'synthetic_approval_audit_failure';
      END IF;
      RETURN NEW;
    END;
    $audit$;
    CREATE TRIGGER reject_approval_audit
      BEFORE INSERT ON public.security_events
      FOR EACH ROW EXECUTE FUNCTION public.reject_approval_audit();
  `);
  await assert.rejects(
    db.query(callSql, args),
    /synthetic_approval_audit_failure/,
    "a failed approval audit write must roll back the entire approval transaction",
  );
  const failedAudit = await db.query<{
    approvals: number; events: number; status: string;
  }>(`
    SELECT (SELECT count(*)::integer FROM public.case_approvals) AS approvals,
           (SELECT count(*)::integer FROM public.security_events) AS events,
           (SELECT status FROM public.workflow_cases WHERE id = $1) AS status
  `, [caseId]);
  assert.deepEqual(failedAudit.rows[0], {
    approvals: 0, events: 0, status: "drafted",
  }, "audit failure must not leave an approved packet, audit row, or approved case");
  await db.exec(`
    DROP TRIGGER reject_approval_audit ON public.security_events;
    DROP FUNCTION public.reject_approval_audit();
  `);

  const inserted = await db.query<{
    id: string; case_id: string; owner_id: string; packet_sha256: string;
    supporting_pages: number; recipient: typeof recipient; quote: typeof quote;
  }>(callSql, args);
  assert.equal(inserted.rows.length, 1);
  assert.equal(inserted.rows[0]?.id, approvalId, "approval must retain the server-minted ID");
  assert.equal(inserted.rows[0]?.case_id, caseId);
  assert.equal(inserted.rows[0]?.owner_id, ownerId);
  assert.equal(inserted.rows[0]?.packet_sha256, "a".repeat(64));
  assert.equal(inserted.rows[0]?.supporting_pages, 2);
  assert.deepEqual(inserted.rows[0]?.recipient, recipient);
  assert.deepEqual(inserted.rows[0]?.quote, quote,
    "JSONB roundtrip must preserve the complete CP2000 source confirmation");

  const stored = await db.query<{ quote: typeof quote }>(
    "SELECT quote FROM public.case_approvals WHERE id = $1", [approvalId],
  );
  assert.deepEqual(stored.rows[0]?.quote.cp2000RecipientConfirmation, confirmation);
  const status = await db.query<{ status: string }>(
    "SELECT status FROM public.workflow_cases WHERE id = $1", [caseId],
  );
  assert.equal(status.rows[0]?.status, "approved");

  await assert.rejects(db.query(callSql, args),
    "reusing the exact approval ID must not silently overwrite immutable evidence");
  const after = await db.query<{ count: number }>("SELECT count(*)::integer AS count FROM public.case_approvals");
  assert.equal(after.rows[0]?.count, 1);
});
