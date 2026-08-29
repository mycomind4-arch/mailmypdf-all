import { describe, it } from "node:test";
import { strict as assert } from "node:assert";
import {
  createAuditEntry,
  AuditLog,
  redactForLog,
} from "../src/domain/audit.ts";

describe("Audit Log", () => {
  it("creates audit entries", () => {
    const entry = createAuditEntry({
      actor: "user-123",
      action: "case_created",
      objectType: "case",
      description: "New case created",
    });
    assert.equal(entry.actor, "user-123");
    assert.equal(entry.action, "case_created");
    assert.equal(entry.result, "success");
    assert.ok(entry.id);
    assert.ok(entry.timestamp);
  });

  it("records entries in the log", () => {
    const log = new AuditLog();
    log.record({
      actor: "user-1",
      action: "document_uploaded",
      objectType: "document",
      description: "Uploaded notice.pdf",
    });
    assert.equal(log.size(), 1);
  });

  it("retrieves entries by case", () => {
    const log = new AuditLog();
    log.record({ actor: "u1", action: "case_created", objectType: "case", description: "Created", caseId: "c1" });
    log.record({ actor: "u1", action: "fact_extracted", objectType: "fact", description: "Extracted", caseId: "c1" });
    log.record({ actor: "u2", action: "case_created", objectType: "case", description: "Created", caseId: "c2" });
    const entries = log.getByCase("c1");
    assert.equal(entries.length, 2);
  });

  it("retrieves security events", () => {
    const log = new AuditLog();
    log.record({ actor: "attacker", action: "auth_failure", objectType: "auth", description: "Failed login", isSecurityEvent: true });
    log.record({ actor: "user", action: "case_created", objectType: "case", description: "Created" });
    const events = log.getSecurityEvents();
    assert.equal(events.length, 1);
    assert.equal(events[0].action, "auth_failure");
  });

  it("retrieves by action type", () => {
    const log = new AuditLog();
    log.record({ actor: "u", action: "response_generated", objectType: "response", description: "Generated" });
    log.record({ actor: "u", action: "response_generated", objectType: "response", description: "Generated again" });
    log.record({ actor: "u", action: "case_created", objectType: "case", description: "Created" });
    assert.equal(log.getByAction("response_generated").length, 2);
  });

  it("enforces max entries", () => {
    const log = new AuditLog(5);
    for (let i = 0; i < 10; i++) {
      log.record({ actor: "u", action: "case_created", objectType: "case", description: `Case ${i}` });
    }
    assert.equal(log.size(), 5);
  });

  it("redacts sensitive data from logs", () => {
    const redacted = redactForLog("My email is john@example.com and my SSN is 123-45-6789. Call me at 555-123-4567.");
    assert.match(redacted, /REDACTED_EMAIL/);
    assert.match(redacted, /REDACTED_SSN/);
    assert.match(redacted, /REDACTED_PHONE/);
    assert.doesNotMatch(redacted, /john@example.com/);
    assert.doesNotMatch(redacted, /123-45-6789/);
    assert.doesNotMatch(redacted, /555-123-4567/);
  });

  it("redacts API keys", () => {
    const redacted = redactForLog("API key: sk-abcdefghijklmnopqrstuvwxyz123456789");
    assert.match(redacted, /REDACTED_KEY/);
  });

  it("flags security events", () => {
    const entry = createAuditEntry({
      actor: "unknown",
      action: "authz_failure",
      objectType: "case",
      description: "Unauthorized access attempt to case c123",
      isSecurityEvent: true,
      result: "failure",
    });
    assert.equal(entry.isSecurityEvent, true);
    assert.equal(entry.result, "failure");
  });

  it("truncates long descriptions when redacting", () => {
    const entry = createAuditEntry({
      actor: "u",
      action: "document_processed",
      objectType: "document",
      description: "x".repeat(600),
    });
    const redacted = new AuditLog().redact(entry);
    assert.ok(redacted.description.length < 600);
    assert.match(redacted.description, /redacted/);
  });
});
