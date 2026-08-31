/**
 * LLM Provenance Repository Tests
 *
 * Tests the no-op repository (Supabase not configured in test env)
 * and verifies the repository interface contract.
 */

import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import {
  NoopLLMProvenanceRepository,
  _setLLMProvenanceRepository,
  getLLMProvenanceRepository,
  type LLMProvenanceRepository,
} from "./supabase-llm-provenance-repository";
import type { LLMFullProvenance } from "@/platform/llm-types";

function mockProvenance(overrides: Partial<LLMFullProvenance> = {}): LLMFullProvenance {
  return {
    provider: "gemini",
    model: "gemini-2.0-flash",
    generatedAt: "2026-01-01T00:00:00.000Z",
    inputHash: "abc123",
    outputHash: "def456",
    promptVersion: "1.0.0",
    operation: "analyze",
    workflowId: "contractor-dispute",
    matterId: "matter-123",
    fallbackUsed: false,
    fallbackChain: [],
    durationMs: 1500,
    ...overrides,
  };
}

describe("llm-provenance: noop repository", () => {
  let repo: NoopLLMProvenanceRepository;

  beforeEach(() => {
    repo = new NoopLLMProvenanceRepository();
  });

  it("record() is a no-op that resolves without error", async () => {
    const provenance = mockProvenance();
    await expect(repo.record(provenance, "user-123", "accepted")).resolves.toBeUndefined();
  });

  it("listByMatter() returns empty array", async () => {
    const result = await repo.listByMatter("matter-123", "user-123");
    expect(result).toEqual([]);
  });
});

describe("llm-provenance: repository contract", () => {
  let mockRepo: LLMProvenanceRepository;

  beforeEach(() => {
    mockRepo = {
      record: vi.fn().mockResolvedValue(undefined),
      listByMatter: vi.fn().mockResolvedValue([]),
    };
    _setLLMProvenanceRepository(mockRepo);
  });

  afterEach(() => {
    _setLLMProvenanceRepository(null);
  });

  it("getLLMProvenanceRepository returns the injected instance", () => {
    expect(getLLMProvenanceRepository()).toBe(mockRepo);
  });

  it("record() accepts accepted status", async () => {
    const provenance = mockProvenance();
    await getLLMProvenanceRepository().record(provenance, "user-123", "accepted");
    expect(mockRepo.record).toHaveBeenCalledWith(provenance, "user-123", "accepted");
  });

  it("record() accepts rejected status with error", async () => {
    const provenance = mockProvenance();
    await getLLMProvenanceRepository().record(provenance, "user-123", "rejected", "Schema validation failed");
    expect(mockRepo.record).toHaveBeenCalledWith(provenance, "user-123", "rejected", "Schema validation failed");
  });

  it("record() accepts failed status with error", async () => {
    const provenance = mockProvenance({ fallbackUsed: true, fallbackChain: ["gemini", "openai"] });
    await getLLMProvenanceRepository().record(provenance, "user-123", "failed", "All providers failed");
    expect(mockRepo.record).toHaveBeenCalledWith(provenance, "user-123", "failed", "All providers failed");
  });

  it("listByMatter() calls through to injected repo", async () => {
    await getLLMProvenanceRepository().listByMatter("matter-456", "user-123");
    expect(mockRepo.listByMatter).toHaveBeenCalledWith("matter-456", "user-123");
  });
});

describe("llm-provenance: provenance fields", () => {
  it("records full provenance chain for fallback", async () => {
    const provenance = mockProvenance({
      provider: "openai",
      fallbackUsed: true,
      fallbackChain: ["gemini", "openai"],
      durationMs: 3000,
    });

    const mockRepo = {
      record: vi.fn().mockResolvedValue(undefined),
      listByMatter: vi.fn().mockResolvedValue([]),
    };
    _setLLMProvenanceRepository(mockRepo);

    await getLLMProvenanceRepository().record(provenance, "user-123", "accepted");

    expect(mockRepo.record).toHaveBeenCalledTimes(1);
    const [recordedProvenance, , status] = mockRepo.record.mock.calls[0];
    expect(recordedProvenance.provider).toBe("openai");
    expect(recordedProvenance.fallbackUsed).toBe(true);
    expect(recordedProvenance.fallbackChain).toEqual(["gemini", "openai"]);
    expect(status).toBe("accepted");

    _setLLMProvenanceRepository(null);
  });
});
