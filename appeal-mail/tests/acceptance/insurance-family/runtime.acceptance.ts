import { describe, expect, it } from "vitest";
import {
  createMatterRuntimeAcceptanceHarness,
} from "@mailmypdf/workflow-acceptance";
import {
  getInsuranceAppealRuntimePolicy,
  INSURANCE_APPEAL_RUNTIME_WORKFLOW_IDS,
} from "@mailmypdf/workflows";

function jsonBody(value: Record<string, unknown>): RequestInit {
  return {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(value),
  };
}

async function upload(
  harness: ReturnType<typeof createMatterRuntimeAcceptanceHarness>,
  workflowId: string,
  filename: string,
  purpose: string,
): Promise<string> {
  const form = new FormData();
  form.append("file", new File(["%PDF-acceptance"], filename, { type: "application/pdf" }));
  form.append("workflowId", workflowId);
  form.append("purpose", purpose);
  form.append("consent", "true");
  const response = await harness.handle(
    harness.request("/documents", { method: "POST", body: form }),
  );
  expect(response.status).toBe(201);
  const payload = await harness.json<any>(response);
  return payload.document.id as string;
}

const recipient = {
  name: "Claims Appeals Department",
  line1: "100 Review Way",
  city: "Sacramento",
  state: "CA",
  postal: "95814",
};

const sender = {
  name: "Acceptance User",
  line1: "1 Main Street",
  city: "Arcata",
  state: "CA",
  postal: "95521",
};

describe("Insurance appeal shared matter runtime", () => {
  expect(INSURANCE_APPEAL_RUNTIME_WORKFLOW_IDS.length).toBeGreaterThanOrEqual(11);

  for (const workflowId of INSURANCE_APPEAL_RUNTIME_WORKFLOW_IDS) {
    it(`${workflowId} completes the shared runtime and fails closed on stale evidence review`, async () => {
      const harness = createMatterRuntimeAcceptanceHarness({
        policyFor: getInsuranceAppealRuntimePolicy,
      });

      let response = await harness.handle(
        harness.request(
          "/matters",
          jsonBody({ workflowId, verticalId: "appeal-mail" }),
        ),
      );
      expect(response.status).toBe(201);
      const matterId = (await harness.json<any>(response)).matter.id as string;

      const sourceId = await upload(
        harness,
        workflowId,
        "insurance-decision.pdf",
        "claim_denial_notice",
      );
      response = await harness.handle(
        harness.request(
          `/matters/${matterId}/documents`,
          jsonBody({
            documentId: sourceId,
            role: "subject_notice",
            position: 0,
          }),
        ),
      );
      expect(response.status).toBe(200);

      response = await harness.handle(
        harness.request(`/matters/${matterId}/analysis`, { method: "POST" }),
      );
      expect(response.status).toBe(200);

      const facts = {
        claimantName: "Acceptance User",
        claimantAddress: "1 Main Street, Arcata, CA 95521",
        phone: "707-555-0100",
        claimNumber: "ACC-1001",
        organizationName: "Acceptance Insurer",
        reasonsForDisagreement:
          "The decision does not address the supporting record included with this appeal.",
        requestedOutcome: "Reconsider the decision using the complete claim record.",
        additionalFacts: "All statements in this acceptance fixture are synthetic.",
      };

      response = await harness.handle(
        harness.request(
          `/matters/${matterId}/input`,
          jsonBody({ ...facts, evidenceReviewComplete: false }),
        ),
      );
      expect(response.status).toBe(200);

      response = await harness.handle(
        harness.request(`/matters/${matterId}/draft/generate`, { method: "POST" }),
      );
      expect(response.status).toBe(409);
      let payload = await harness.json<any>(response);
      expect(payload.code).toBe("EVIDENCE_REVIEW_REQUIRED");

      const evidenceId = await upload(
        harness,
        workflowId,
        "supporting-record.pdf",
        "supporting_record",
      );
      response = await harness.handle(
        harness.request(
          `/matters/${matterId}/documents`,
          jsonBody({
            documentId: evidenceId,
            role: "evidence",
            evidenceKind: "supporting_record",
            position: 1,
          }),
        ),
      );
      expect(response.status).toBe(200);

      response = await harness.handle(
        harness.request(
          `/matters/${matterId}/input`,
          jsonBody({ ...facts, evidenceReviewComplete: true }),
        ),
      );
      expect(response.status).toBe(200);

      response = await harness.handle(
        harness.request(`/matters/${matterId}/input`),
      );
      payload = await harness.json<any>(response);
      expect(payload.input.input.evidenceReviewComplete).toBe(true);
      expect(payload.input.input.evidenceReviewFingerprint).toEqual(expect.any(String));
      expect(payload.input.input.evidenceReviewFingerprint.length).toBeGreaterThan(20);

      const lateEvidenceId = await upload(
        harness,
        workflowId,
        "late-support.pdf",
        "supporting_record",
      );
      response = await harness.handle(
        harness.request(
          `/matters/${matterId}/documents`,
          jsonBody({
            documentId: lateEvidenceId,
            role: "evidence",
            evidenceKind: "supporting_record",
            position: 2,
          }),
        ),
      );
      expect(response.status).toBe(200);

      response = await harness.handle(
        harness.request(`/matters/${matterId}/draft/generate`, { method: "POST" }),
      );
      expect(response.status).toBe(409);
      payload = await harness.json<any>(response);
      expect(payload.code).toBe("EVIDENCE_REVIEW_STALE");

      response = await harness.handle(
        harness.request(
          `/matters/${matterId}/input`,
          jsonBody({ ...facts, evidenceReviewComplete: true }),
        ),
      );
      expect(response.status).toBe(200);

      response = await harness.handle(
        harness.request(`/matters/${matterId}/draft/generate`, { method: "POST" }),
      );
      expect(response.status).toBe(200);
      const generated = await harness.json<any>(response);
      expect(generated.bodyText).toContain(workflowId);

      response = await harness.handle(
        harness.request(
          `/matters/${matterId}/draft`,
          jsonBody({ bodyText: generated.bodyText }),
        ),
      );
      expect(response.status).toBe(200);

      response = await harness.handle(
        harness.request(
          `/matters/${matterId}/packet`,
          jsonBody({ mailClass: "certified" }),
        ),
      );
      expect(response.status).toBe(200);
      const preview = (await harness.json<any>(response)).packet;
      expect(preview.packetSha256).toMatch(/^[0-9a-f]{64}$/);
      expect(preview.manifest).toHaveLength(2);

      response = await harness.handle(
        harness.request(
          `/matters/${matterId}/approval`,
          jsonBody({
            expectedPacketSha256: preview.packetSha256,
            expectedTotalCents: preview.quote.totalCents,
            mailClass: "certified",
            recipient,
          }),
        ),
      );
      expect(response.status).toBe(200);
      const approvalId = (await harness.json<any>(response)).approvalId as string;

      response = await harness.handle(
        harness.request(
          `/matters/${matterId}/checkout`,
          jsonBody({ approvalId, sender }),
        ),
      );
      expect(response.status).toBe(200);
      payload = await harness.json<any>(response);
      expect(payload.orderId).toBe("acceptance-order-1");
      expect(payload.packetSha256).toBe(preview.packetSha256);
      expect(harness.checkoutCalls.count).toBe(1);
    });
  }
});
