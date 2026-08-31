/* ═══════════════════════════════════════════════════════════
   BENCHMARK SUITE — representative test data for evaluating
   extraction, classification, deadline detection,
   contradiction detection, and response quality.
   
   Every major intelligence change should be tested against
   this dataset.
   ═══════════════════════════════════════════════════════════ */

export interface BenchmarkCase {
  id: string;
  label: string;
  text: string;
  expected: {
    noticeType?: string;
    agency?: string;
    referenceNumber?: string;
    noticeDate?: string;
    deadlineDate?: string;
    deadlineCertainty?: string;
    amountOwed?: string;
    hasAppealRights?: boolean;
    minFactCount?: number;
    minConfidence?: number;
  };
}

export const BENCHMARK_CASES: BenchmarkCase[] = [
  {
    id: "bench-irs-cp2000",
    label: "IRS CP2000 — Underreported Income",
    text: `Internal Revenue Service
CP2000 Notice of Underreported Income
Notice Number: CP2000-2024-12345-A
Date: July 15, 2026

Dear Taxpayer,

We are proposing changes to your 2024 tax return based on information received from third parties.

The income reported on your tax return does not match the income reported to us by employers and other payers.

Amount due: $3,847.00
You must respond by September 15, 2026.

If you agree with the changes, sign and return the response form with your payment.
If you disagree, provide a written explanation with supporting documentation.

You have the right to appeal this determination.

Sincerely,
IRS Automated Underreporter Operations`,
    expected: {
      noticeType: "irs_cp2000",
      agency: /IRS|Internal Revenue/i,
      referenceNumber: "CP2000-2024-12345-A",
      noticeDate: "2026-07-15",
      deadlineDate: "2026-09-15",
      deadlineCertainty: "explicit",
      amountOwed: "$3,847.00",
      hasAppealRights: true,
      minFactCount: 4,
      minConfidence: 0.5,
    },
  },
  {
    id: "bench-irs-cp14",
    label: "IRS CP14 — Balance Due",
    text: `Department of the Treasury
Internal Revenue Service
CP14 — Balance Due Notice
Notice Number: CP14-2025-67890
Date: January 20, 2026

Dear Taxpayer,

We are writing to let you know that you have an unpaid balance on your account.

Amount due: $1,250.75
You must pay by March 21, 2026.

If you have already paid, please disregard this notice.

Sincerely,
IRS`,
    expected: {
      noticeType: "irs_cp14",
      agency: /IRS|Internal Revenue/i,
      referenceNumber: "CP14-2025-67890",
      noticeDate: "2026-01-20",
      deadlineDate: "2026-03-21",
      deadlineCertainty: "explicit",
      amountOwed: "$1,250.75",
      hasAppealRights: false,
      minFactCount: 3,
      minConfidence: 0.5,
    },
  },
  {
    id: "bench-court-summons",
    label: "Court Summons",
    text: `Superior Court of California, County of Los Angeles
Summons and Complaint
Case Number: CV-2026-12345

You are hereby summoned to appear and file a written response within 30 days of service.

Date of service: August 1, 2026.

Failure to respond may result in a default judgment being entered against you.`,
    expected: {
      noticeType: "court_summons",
      agency: /Superior Court/i,
      referenceNumber: "CV-2026-12345",
      minFactCount: 2,
      minConfidence: 0.3,
    },
  },
  {
    id: "bench-state-tax",
    label: "State Tax Assessment",
    text: `California Franchise Tax Board
Notice of Proposed Assessment
Notice Number: NPA-2026-98765
Date: June 10, 2026

You owe $5,200.00 in additional state taxes.

You must respond within 60 days of the date of this letter.

If you disagree, you may file a protest with the Franchise Tax Board.`,
    expected: {
      noticeType: "state_tax_assessment",
      agency: /Franchise Tax Board/i,
      referenceNumber: "NPA-2026-98765",
      noticeDate: "2026-06-10",
      amountOwed: "$5,200.00",
      hasAppealRights: true,
      minFactCount: 3,
      minConfidence: 0.3,
    },
  },
  {
    id: "bench-license-suspension",
    label: "License Suspension Notice",
    text: `State Board of Professional Licensing
Notice of Proposed License Suspension
License Number: LIC-789456
Date: May 5, 2026

Your professional license is proposed for suspension due to alleged violation of Section 12.3 of the Professional Code.

You have the right to a hearing. You must request a hearing within 30 days.

If you fail to request a hearing, the suspension will take effect automatically.`,
    expected: {
      noticeType: "license_suspension",
      agency: /Board of Professional/i,
      referenceNumber: "LIC-789456",
      noticeDate: "2026-05-05",
      hasAppealRights: true,
      minFactCount: 3,
      minConfidence: 0.3,
    },
  },
  {
    id: "bench-benefits-denial",
    label: "Social Security Denial",
    text: `Social Security Administration
Notice of Disapproved Claim
Claim Number: 123-45-6789-A
Date: April 12, 2026

We have determined that your claim for benefits is disapproved.

You have the right to appeal this decision. You must request an appeal within 60 days of receiving this notice.

If you have questions, contact us at 1-800-772-1213.`,
    expected: {
      noticeType: "benefits_denial",
      agency: /Social Security/i,
      noticeDate: "2026-04-12",
      hasAppealRights: true,
      minFactCount: 2,
      minConfidence: 0.3,
    },
  },
];

/* ── Benchmark runner ── */

export interface BenchmarkResult {
  caseId: string;
  label: string;
  passed: boolean;
  checks: { name: string; passed: boolean; expected: string; actual: string }[];
}

export function runBenchmark(
  extractFn: (text: string) => any,
  classifyFn: (text: string) => { type: string; confidence: number },
): BenchmarkResult[] {
  const results: BenchmarkResult[] = [];

  for (const benchCase of BENCHMARK_CASES) {
    const extraction = extractFn(benchCase.text);
    const classification = classifyFn(benchCase.text);
    const checks: BenchmarkResult["checks"] = [];

    if (benchCase.expected.noticeType) {
      const passed = classification.type === benchCase.expected.noticeType;
      checks.push({
        name: "notice_type",
        passed,
        expected: benchCase.expected.noticeType,
        actual: classification.type,
      });
    }

    if (benchCase.expected.agency) {
      const agency = extraction.agency || "";
      const passed = benchCase.expected.agency instanceof RegExp
        ? benchCase.expected.agency.test(agency)
        : agency === benchCase.expected.agency;
      checks.push({ name: "agency", passed, expected: String(benchCase.expected.agency), actual: agency });
    }

    if (benchCase.expected.referenceNumber) {
      const ref = extraction.referenceNumber || "";
      checks.push({
        name: "reference_number",
        passed: ref === benchCase.expected.referenceNumber,
        expected: benchCase.expected.referenceNumber,
        actual: ref,
      });
    }

    if (benchCase.expected.noticeDate) {
      const date = extraction.noticeDate || "";
      checks.push({
        name: "notice_date",
        passed: date === benchCase.expected.noticeDate,
        expected: benchCase.expected.noticeDate,
        actual: date,
      });
    }

    if (benchCase.expected.amountOwed) {
      const amount = extraction.amountOwed || "";
      checks.push({
        name: "amount_owed",
        passed: amount === benchCase.expected.amountOwed,
        expected: benchCase.expected.amountOwed,
        actual: amount,
      });
    }

    if (benchCase.expected.minFactCount) {
      const count = extraction.facts?.length || 0;
      checks.push({
        name: "fact_count",
        passed: count >= benchCase.expected.minFactCount,
        expected: `>= ${benchCase.expected.minFactCount}`,
        actual: String(count),
      });
    }

    if (benchCase.expected.hasAppealRights !== undefined) {
      const hasRights = !!extraction.appealRights;
      checks.push({
        name: "appeal_rights",
        passed: hasRights === benchCase.expected.hasAppealRights,
        expected: String(benchCase.expected.hasAppealRights),
        actual: String(hasRights),
      });
    }

    results.push({
      caseId: benchCase.id,
      label: benchCase.label,
      passed: checks.every((c) => c.passed),
      checks,
    });
  }

  return results;
}

export function benchmarkSummary(results: BenchmarkResult[]): {
  total: number;
  passed: number;
  failed: number;
  passRate: number;
  failures: { label: string; failedChecks: string[] }[];
} {
  const passed = results.filter((r) => r.passed).length;
  return {
    total: results.length,
    passed,
    failed: results.length - passed,
    passRate: Math.round((passed / results.length) * 100),
    failures: results
      .filter((r) => !r.passed)
      .map((r) => ({
        label: r.label,
        failedChecks: r.checks.filter((c) => !c.passed).map((c) => c.name),
      })),
  };
}
