/**
 * CP2000 State Machine Tests
 *
 * Tests legal/illegal transitions, error recovery, and audit events.
 */

import { describe, it, expect } from "vitest";
import {
  canTransition,
  transition,
  STATE_METADATA,
  AUDIT_EVENTS,
  createAuditEvent,
  type WorkflowState,
} from "../cp2000-state-machine";

describe("CP2000 State Machine", () => {
  describe("canTransition", () => {
    it("allows legal forward transitions", () => {
      expect(canTransition("created", "document_uploaded")).toBe(true);
      expect(canTransition("document_uploaded", "document_processed")).toBe(true);
      expect(canTransition("document_processed", "classified")).toBe(true);
      expect(canTransition("classified", "analyzed")).toBe(true);
      expect(canTransition("analyzed", "facts_confirmed")).toBe(true);
      expect(canTransition("facts_confirmed", "evidence_review")).toBe(true);
      expect(canTransition("evidence_review", "draft_ready")).toBe(true);
      expect(canTransition("draft_ready", "draft_review")).toBe(true);
      expect(canTransition("draft_review", "approved")).toBe(true);
      expect(canTransition("approved", "payment_pending")).toBe(true);
      expect(canTransition("payment_pending", "paid")).toBe(true);
      expect(canTransition("paid", "fulfillment_pending")).toBe(true);
      expect(canTransition("fulfillment_pending", "mailed")).toBe(true);
      expect(canTransition("mailed", "tracking")).toBe(true);
      expect(canTransition("tracking", "delivered")).toBe(true);
      expect(canTransition("delivered", "proof_finalized")).toBe(true);
    });

    it("rejects illegal forward transitions", () => {
      expect(canTransition("created", "mailed")).toBe(false);
      expect(canTransition("created", "approved")).toBe(false);
      expect(canTransition("draft_ready", "mailed")).toBe(false);
      expect(canTransition("analyzed", "mailed")).toBe(false);
      expect(canTransition("document_uploaded", "paid")).toBe(false);
      expect(canTransition("created", "fulfillment_pending")).toBe(false);
    });

    it("rejects illegal backward transitions", () => {
      expect(canTransition("mailed", "approved")).toBe(false);
      expect(canTransition("paid", "draft_review")).toBe(false);
      expect(canTransition("approved", "draft_ready")).toBe(false);
      expect(canTransition("delivered", "tracking")).toBe(false);
      expect(canTransition("proof_finalized", "delivered")).toBe(false);
    });

    it("allows error recovery transitions", () => {
      expect(canTransition("extraction_failed", "document_uploaded")).toBe(true);
      expect(canTransition("extraction_failed", "created")).toBe(true);
      expect(canTransition("payment_failed", "payment_pending")).toBe(true);
      expect(canTransition("payment_failed", "approved")).toBe(true);
      expect(canTransition("fulfillment_failed", "fulfillment_pending")).toBe(true);
      expect(canTransition("fulfillment_failed", "paid")).toBe(true);
      expect(canTransition("classification_uncertain", "classified")).toBe(true);
      expect(canTransition("classification_uncertain", "document_uploaded")).toBe(true);
    });

    it("rejects transitions from terminal state", () => {
      expect(canTransition("proof_finalized", "created")).toBe(false);
      expect(canTransition("proof_finalized", "mailed")).toBe(false);
    });
  });

  describe("transition", () => {
    it("returns new state on legal transition", () => {
      const result = transition("created", "document_uploaded", "user");
      expect(result.state).toBe("document_uploaded");
      expect(result.transition).not.toBeNull();
      expect(result.transition?.from).toBe("created");
      expect(result.transition?.to).toBe("document_uploaded");
      expect(result.transition?.actor).toBe("user");
      expect(result.error).toBeUndefined();
    });

    it("returns error on illegal transition", () => {
      const result = transition("created", "mailed", "system");
      expect(result.state).toBe("created");
      expect(result.transition).toBeNull();
      expect(result.error).toContain("Illegal transition");
    });

    it("includes timestamp in transition", () => {
      const result = transition("created", "document_uploaded", "user");
      expect(result.transition?.timestamp).toBeTruthy();
      // Should be valid ISO date
      expect(new Date(result.transition!.timestamp).toISOString()).toBe(result.transition!.timestamp);
    });

    it("includes optional reason", () => {
      const result = transition("approved", "payment_pending", "user", "User clicked checkout");
      expect(result.transition?.reason).toBe("User clicked checkout");
    });
  });

  describe("STATE_METADATA", () => {
    it("has metadata for every state", () => {
      const states: WorkflowState[] = [
        "created", "document_uploaded", "document_processed", "classified",
        "classification_uncertain", "analyzed", "facts_confirmed", "evidence_review",
        "draft_ready", "draft_review", "approved", "payment_pending", "paid",
        "payment_failed", "fulfillment_pending", "fulfillment_failed", "mailed",
        "tracking", "delivered", "proof_finalized", "extraction_failed",
      ];

      for (const s of states) {
        expect(STATE_METADATA[s]).toBeDefined();
        expect(STATE_METADATA[s].label).toBeTruthy();
        expect(STATE_METADATA[s].description).toBeTruthy();
      }
    });

    it("marks terminal state correctly", () => {
      expect(STATE_METADATA.proof_finalized.isTerminal).toBe(true);
      expect(STATE_METADATA.mailed.isTerminal).toBe(false);
    });

    it("marks error states correctly", () => {
      expect(STATE_METADATA.extraction_failed.isError).toBe(true);
      expect(STATE_METADATA.payment_failed.isError).toBe(true);
      expect(STATE_METADATA.fulfillment_failed.isError).toBe(true);
      expect(STATE_METADATA.classification_uncertain.isError).toBe(true);
      expect(STATE_METADATA.created.isError).toBe(false);
      expect(STATE_METADATA.approved.isError).toBe(false);
    });
  });

  describe("createAuditEvent", () => {
    it("creates audit event with timestamp", () => {
      const event = createAuditEvent(AUDIT_EVENTS.DOCUMENT_UPLOADED, "document_uploaded");
      expect(event.event).toBe(AUDIT_EVENTS.DOCUMENT_UPLOADED);
      expect(event.state).toBe("document_uploaded");
      expect(event.timestamp).toBeTruthy();
      expect(new Date(event.timestamp).toISOString()).toBe(event.timestamp);
    });

    it("includes optional data", () => {
      const event = createAuditEvent(AUDIT_EVENTS.DRAFT_APPROVED, "approved", { hash: "abc123" });
      expect(event.data?.hash).toBe("abc123");
    });
  });

  describe("Full lifecycle transitions", () => {
    it("happy path: created → proof_finalized", () => {
      const path: WorkflowState[] = [
        "created", "document_uploaded", "document_processed", "classified",
        "analyzed", "facts_confirmed", "evidence_review", "draft_ready",
        "draft_review", "approved", "payment_pending", "paid",
        "fulfillment_pending", "mailed", "tracking", "delivered", "proof_finalized",
      ];

      let current: WorkflowState = path[0];
      for (let i = 1; i < path.length; i++) {
        const result = transition(current, path[i], "system");
        expect(result.error, `Transition ${current} → ${path[i]} should be legal`).toBeUndefined();
        current = result.state;
      }
      expect(current).toBe("proof_finalized");
    });

    it("error recovery: extraction fails then retries", () => {
      let state: WorkflowState = "created";
      state = transition(state, "document_uploaded", "user").state;
      state = transition(state, "extraction_failed", "system", "PDF corrupted").state;
      expect(state).toBe("extraction_failed");
      state = transition(state, "document_uploaded", "user", "Retry upload").state;
      expect(state).toBe("document_uploaded");
      state = transition(state, "document_processed", "system").state;
      expect(state).toBe("document_processed");
    });

    it("error recovery: payment fails then retries", () => {
      let state: WorkflowState = "approved";
      state = transition(state, "payment_pending", "user").state;
      state = transition(state, "payment_failed", "system", "Card declined").state;
      expect(state).toBe("payment_failed");
      state = transition(state, "payment_pending", "user", "Retry with new card").state;
      expect(state).toBe("payment_pending");
      state = transition(state, "paid", "system").state;
      expect(state).toBe("paid");
    });
  });
});
