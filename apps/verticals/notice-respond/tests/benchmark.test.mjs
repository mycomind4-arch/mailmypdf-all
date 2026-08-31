import { describe, it } from "node:test";
import { strict as assert } from "node:assert";
import { runBenchmark, benchmarkSummary, BENCHMARK_CASES } from "./benchmark.ts";
import { extractFromText } from "../src/platform/notice-extraction.ts";
import { classifyNoticeType } from "../src/domain/notice-type.ts";

describe("Benchmark Suite", () => {
  it("has at least 5 benchmark cases", () => {
    assert.ok(BENCHMARK_CASES.length >= 5);
  });

  it("all benchmark cases have required fields", () => {
    for (const c of BENCHMARK_CASES) {
      assert.ok(c.id, `Case ${c.label} missing id`);
      assert.ok(c.label, `Case ${c.id} missing label`);
      assert.ok(c.text, `Case ${c.id} missing text`);
      assert.ok(c.expected, `Case ${c.id} missing expected`);
    }
  });

  it("covers multiple notice types", () => {
    const types = new Set(BENCHMARK_CASES.map((c) => c.expected.noticeType).filter(Boolean));
    assert.ok(types.size >= 4, `Should cover at least 4 notice types, got ${types.size}`);
  });

  it("runs benchmarks against extraction engine", () => {
    const results = runBenchmark(extractFromText, classifyNoticeType);
    assert.equal(results.length, BENCHMARK_CASES.length);
    for (const r of results) {
      assert.ok(r.caseId);
      assert.ok(r.label);
      assert.ok(r.checks.length > 0);
    }
  });

  it("generates summary statistics", () => {
    const results = runBenchmark(extractFromText, classifyNoticeType);
    const summary = benchmarkSummary(results);
    assert.ok(summary.total > 0);
    assert.ok(summary.passRate >= 0 && summary.passRate <= 100);
    assert.equal(summary.passed + summary.failed, summary.total);
  });

  it("IRS CP2000 benchmark should classify correctly", () => {
    const results = runBenchmark(extractFromText, classifyNoticeType);
    const cp2000 = results.find((r) => r.caseId === "bench-irs-cp2000");
    assert.ok(cp2000);
    const typeCheck = cp2000.checks.find((c) => c.name === "notice_type");
    assert.ok(typeCheck);
    assert.equal(typeCheck.passed, true);
  });

  it("benchmark text includes realistic notice content", () => {
    for (const c of BENCHMARK_CASES) {
      assert.ok(c.text.length > 100, `Case ${c.id} text too short`);
    }
  });
});
