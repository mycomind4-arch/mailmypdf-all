/**
 * G7 — Immigration Workflow Foundry
 *
 * Classifies all workflows into stages:
 *   CATALOG → CONTRACT → EXECUTABLE → GOLD-CERTIFIED
 *
 * Uses the reasoner to select workflows based on evidence.
 * Supports compound cases requiring multiple workflows.
 * Detects incompatible workflow combinations.
 * Preserves domain-specific rules.
 *
 * Do NOT confuse catalog presence with execution.
 * A workflow is Gold only when executable evidence exists.
 */

import type { CaseReasoning, CandidateWorkflow } from './case-reasoning';

// ─── Workflow Stages ──────────────────────────────────────────────────────────

export type WorkflowStage = 'ALIAS' | 'CATALOG' | 'CONTRACT' | 'EXECUTABLE' | 'GOLD-CERTIFIED';

export const STAGE_ORDER: WorkflowStage[] = ['ALIAS', 'CATALOG', 'CONTRACT', 'EXECUTABLE', 'GOLD-CERTIFIED'];

// ─── Workflow Registry Entry ─────────────────────────────────────────────────

export interface WorkflowRegistryEntry {
  slug: string;
  title: string;
  description: string;
  stage: WorkflowStage;
  /** Which issue types this workflow handles. */
  handlesIssueTypes: string[];
  /** Which agencies this workflow is relevant for. */
  agencies: string[];
  /** Whether this workflow requires a deadline. */
  requiresDeadline?: boolean;
  /** Whether this workflow can be composed with others. */
  composable: boolean;
  /** Incompatible workflow slugs (cannot be used together). */
  incompatibleWith?: string[];
  /** Domain-specific rules. */
  rules?: string[];
}

// ─── Workflow Registry ────────────────────────────────────────────────────────
// The canonical registry of all immigration workflows and their stages.

export const WORKFLOW_REGISTRY: WorkflowRegistryEntry[] = [
  // ── Registered executable workflows ──
  {
    slug: 'respond-to-notice',
    title: 'Respond to a Notice',
    description: 'Organize an immigration notice, confirm details, prepare a response, and mail it.',
    stage: 'EXECUTABLE',
    handlesIssueTypes: ['rfe', 'noid', 'deadline', 'evidence_gap'],
    agencies: ['USCIS', 'DOS', 'EOIR', 'CBP', 'ICE'],
    requiresDeadline: true,
    composable: true,
    incompatibleWith: ['immigration-appeal-letter'],
    rules: ['Must verify notice type before selecting.', 'Deadline must be confirmed before mailing.'],
  },
  {
    slug: 'supporting-documents',
    title: 'Submit Supporting Documents',
    description: 'Prepare a cover letter and organize supporting documentation for mailing.',
    stage: 'EXECUTABLE',
    handlesIssueTypes: ['rfe', 'evidence_gap', 'missing_evidence'],
    agencies: ['USCIS', 'DOS'],
    composable: true,
    rules: ['Specific documents depend on what the notice requests.'],
  },
  {
    slug: 'explanation-letter',
    title: 'Prepare an Explanation Letter',
    description: 'Turn facts and objective into a professional, editable correspondence draft.',
    stage: 'EXECUTABLE',
    handlesIssueTypes: ['status_problem', 'address_problem', 'fee_issue', 'unknown'],
    agencies: ['USCIS', 'DOS', 'EOIR'],
    composable: true,
  },
  // ── Catalog workflows (not yet executable) ──
  {
    slug: 'rfe-response',
    title: 'Respond to a USCIS RFE',
    description: 'Turn a USCIS RFE into a structured response with evidence and cover letter.',
    stage: 'GOLD-CERTIFIED',
    handlesIssueTypes: ['rfe'],
    agencies: ['USCIS'],
    requiresDeadline: true,
    composable: true,
    rules: ['Keep every requested item traceable to supporting evidence.'],
  },
  {
    slug: 'noid-response',
    title: 'Respond to a USCIS NOID',
    description: 'Organize a NOID, preserve concerns, gather evidence, and prepare a response.',
    stage: 'GOLD-CERTIFIED',
    handlesIssueTypes: ['noid'],
    agencies: ['USCIS'],
    requiresDeadline: true,
    composable: true,
  },
  {
    slug: 'uscis-denial-rejection',
    title: 'Respond to a USCIS Denial or Rejection',
    description: 'Organize a denial/rejection, identify the decision and review path.',
    stage: 'GOLD-CERTIFIED',
    handlesIssueTypes: ['denial', 'rejection'],
    agencies: ['USCIS'],
    composable: true,
    incompatibleWith: ['rfe-response', 'noid-response'],
    rules: ['A denial, rejection, motion, and appeal are different procedural paths.'],
  },
  {
    slug: 'uscis-foia',
    title: 'Request USCIS Records by FOIA',
    description: 'Prepare a USCIS FOIA request for immigration records.',
    stage: 'GOLD-CERTIFIED',
    handlesIssueTypes: ['unknown'],
    agencies: ['USCIS'],
    composable: false,
  },
  {
    slug: 'eoir-foia',
    title: 'Request EOIR Records by FOIA',
    description: 'Prepare an EOIR FOIA request for immigration court records.',
    stage: 'ALIAS',
    handlesIssueTypes: ['unknown'],
    agencies: ['EOIR'],
    composable: false,
  },
  {
    slug: 'ice-foia',
    title: 'Request ICE Records by FOIA',
    description: 'Prepare an ICE FOIA request for immigration enforcement records.',
    stage: 'ALIAS',
    handlesIssueTypes: ['unknown'],
    agencies: ['ICE'],
    composable: false,
  },
  {
    slug: 'g-639-records',
    title: 'Request Records with Form G-639',
    description: 'Prepare a Form G-639 immigration records request.',
    stage: 'ALIAS',
    handlesIssueTypes: ['unknown'],
    agencies: ['USCIS'],
    composable: false,
  },
  {
    slug: 'i-130-response',
    title: 'Respond to an I-130 Request',
    description: 'Prepare a response for an I-130 family petition related notice.',
    stage: 'GOLD-CERTIFIED',
    handlesIssueTypes: ['rfe', 'noid'],
    agencies: ['USCIS'],
    requiresDeadline: true,
    composable: true,
  },
  // ─── Form-Specific Variants (ALIASES — not separate workflows) ───────────────
  // These are keyword aliases that route to the canonical RFE/NOID engines
  // via form-specific adapters. They do NOT have their own workflow engines.
  // See: src/domain/form-adapters.ts — FORM_VARIANT_REGISTRY
  {
    slug: 'i-140-rfe-response',
    title: 'Respond to an I-140 RFE',
    description: 'Form-specific alias for the canonical RFE engine. Routes to rfe-response with I-140 adapter.',
    stage: 'ALIAS',
    handlesIssueTypes: ['rfe'],
    agencies: ['USCIS'],
    requiresDeadline: true,
    composable: true,
    canonicalWorkflow: 'rfe-response',
    formAdapter: 'I-140',
  },
  {
    slug: 'i-485-rfe-response',
    title: 'Respond to an I-485 RFE',
    description: 'Form-specific alias for the canonical RFE engine. Routes to rfe-response with I-485 adapter.',
    stage: 'ALIAS',
    handlesIssueTypes: ['rfe'],
    agencies: ['USCIS'],
    requiresDeadline: true,
    composable: true,
    canonicalWorkflow: 'rfe-response',
    formAdapter: 'I-485',
  },
  {
    slug: 'n-400-rfe-response',
    title: 'Respond to an N-400 RFE',
    description: 'Form-specific alias for the canonical RFE engine. Routes to rfe-response with N-400 adapter.',
    stage: 'ALIAS',
    handlesIssueTypes: ['rfe'],
    agencies: ['USCIS'],
    requiresDeadline: true,
    composable: true,
    canonicalWorkflow: 'rfe-response',
    formAdapter: 'N-400',
  },
  {
    slug: 'i-751-noid',
    title: 'Respond to an I-751 NOID',
    description: 'Form-specific alias for the canonical NOID engine. Routes to noid-response with I-751 adapter.',
    stage: 'ALIAS',
    handlesIssueTypes: ['noid'],
    agencies: ['USCIS'],
    requiresDeadline: true,
    composable: true,
    canonicalWorkflow: 'noid-response',
    formAdapter: 'I-751',
  },
  {
    slug: 'i-130-rfe-response',
    title: 'Respond to an I-130 RFE',
    description: 'Form-specific alias for the canonical RFE engine. Routes to rfe-response with I-130 adapter.',
    stage: 'ALIAS',
    handlesIssueTypes: ['rfe'],
    agencies: ['USCIS'],
    requiresDeadline: true,
    composable: true,
    canonicalWorkflow: 'rfe-response',
    formAdapter: 'I-130',
  },
  {
    slug: 'i-751-rfe-response',
    title: 'Respond to an I-751 RFE',
    description: 'Form-specific alias for the canonical RFE engine. Routes to rfe-response with I-751 adapter.',
    stage: 'ALIAS',
    handlesIssueTypes: ['rfe'],
    agencies: ['USCIS'],
    requiresDeadline: true,
    composable: true,
    canonicalWorkflow: 'rfe-response',
    formAdapter: 'I-751',
  },
  {
    slug: 'h-1b-rfe-response',
    title: 'Respond to an H-1B RFE',
    description: 'Form-specific alias for the canonical RFE engine. Routes to rfe-response with I-129 (H-1B) adapter.',
    stage: 'ALIAS',
    handlesIssueTypes: ['rfe'],
    agencies: ['USCIS'],
    requiresDeadline: true,
    composable: true,
    canonicalWorkflow: 'rfe-response',
    formAdapter: 'I-129',
  },
  {
    slug: 'i-485-noid',
    title: 'Respond to an I-485 NOID',
    description: 'Form-specific alias for the canonical NOID engine. Routes to noid-response with I-485 adapter.',
    stage: 'ALIAS',
    handlesIssueTypes: ['noid'],
    agencies: ['USCIS'],
    requiresDeadline: true,
    composable: true,
    canonicalWorkflow: 'noid-response',
    formAdapter: 'I-485',
  },
  {
    slug: 'i-130-noid',
    title: 'Respond to an I-130 NOID',
    description: 'Form-specific alias for the canonical NOID engine. Routes to noid-response with I-130 adapter.',
    stage: 'ALIAS',
    handlesIssueTypes: ['noid'],
    agencies: ['USCIS'],
    requiresDeadline: true,
    composable: true,
    canonicalWorkflow: 'noid-response',
    formAdapter: 'I-130',
  },
  {
    slug: 'i-140-noid',
    title: 'Respond to an I-140 NOID',
    description: 'Form-specific alias for the canonical NOID engine. Routes to noid-response with I-140 adapter.',
    stage: 'ALIAS',
    handlesIssueTypes: ['noid'],
    agencies: ['USCIS'],
    requiresDeadline: true,
    composable: true,
    canonicalWorkflow: 'noid-response',
    formAdapter: 'I-140',
  },
  {
    slug: 'n-400-noid',
    title: 'Respond to an N-400 NOID',
    description: 'Form-specific alias for the canonical NOID engine. Routes to noid-response with N-400 adapter.',
    stage: 'ALIAS',
    handlesIssueTypes: ['noid'],
    agencies: ['USCIS'],
    requiresDeadline: true,
    composable: true,
    canonicalWorkflow: 'noid-response',
    formAdapter: 'N-400',
  },
  {
    slug: 'visa-refusal-response',
    title: 'Respond to a Visa Refusal',
    description: 'Prepare a response for a visa refusal under Section 221(g).',
    stage: 'GOLD-CERTIFIED',
    handlesIssueTypes: ['denial', 'rejection'],
    agencies: ['DOS'],
    composable: true,
  },
  {
    slug: 'immigration-appeal-letter',
    title: 'Prepare an Immigration Appeal Letter',
    description: 'Prepare an appeal letter for a denied immigration application.',
    stage: 'GOLD-CERTIFIED',
    handlesIssueTypes: ['denial', 'procedural_posture'],
    agencies: ['USCIS', 'EOIR', 'DOS'],
    requiresDeadline: true,
    composable: false,
    incompatibleWith: ['respond-to-notice'],
    rules: ['Appeal requires a final denial decision.'],
  },
  {
    slug: 'supporting-evidence-letter',
    title: 'Prepare a Supporting Evidence Letter',
    description: 'Organize and submit supporting evidence with a cover letter.',
    stage: 'ALIAS',
    handlesIssueTypes: ['missing_evidence', 'evidence_gap'],
    agencies: ['USCIS', 'DOS'],
    composable: true,
  },
  {
    slug: 'i-797-notice',
    title: 'Understand an I-797 / I-797C Notice',
    description: 'Understand a USCIS Notice of Action and route to the appropriate workflow.',
    stage: 'GOLD-CERTIFIED',
    handlesIssueTypes: ['unknown', 'status_problem'],
    agencies: ['USCIS'],
    composable: true,
  },
  {
    slug: 'case-inquiry',
    title: 'Submit a USCIS Case Inquiry',
    description: 'Inquire about a delayed or pending immigration case — service request, expedite request, or status inquiry.',
    stage: 'GOLD-CERTIFIED',
    handlesIssueTypes: ['status_problem', 'delay', 'expedite'],
    agencies: ['USCIS'],
    composable: true,
    rules: ['User-initiated — no notice received.', 'Verify outside normal processing time before service request.', 'Expedite requests must cite qualifying criteria.'],
  },
  {
    slug: 'biometrics-scheduling',
    title: 'Resolve a Biometrics Appointment Issue',
    description: 'Reschedule, remedy a missed appointment, transfer ASC location, or correct a biometrics notice — with mailing and proof.',
    stage: 'GOLD-CERTIFIED',
    handlesIssueTypes: ['biometrics', 'scheduling', 'asc_problem'],
    agencies: ['USCIS'],
    composable: true,
    rules: ['Triggered by ASC appointment notice or scheduling problem.', 'Reschedule requests must be submitted before appointment date.', 'Missed appointments require immediate remedy to avoid denial.', 'ASC transfer requests require evidence of hardship.'],
  },
  {
    slug: 'naturalization-citizenship',
    title: 'Resolve a Naturalization / Citizenship Issue',
    description: 'Prepare for N-400 interview, study for civics/English test, reschedule interview, remedy missed interview, address oath ceremony problems, or respond to post-interview RFE — with mailing and proof.',
    stage: 'GOLD-CERTIFIED',
    handlesIssueTypes: ['interview', 'civics_test', 'oath_ceremony', 'delayed_decision', 'post_interview_rfe'],
    agencies: ['USCIS'],
    composable: true,
    rules: ['Triggered by N-400 interview notice, oath ceremony notice, or post-interview evidence request.', 'Interview reschedule requests must be submitted before the interview date.', 'Missed interviews require immediate remedy to avoid N-400 denial.', 'Delayed decisions over 120 days may warrant writ of mandamus under INA § 336(b).'],
  },




  {
    slug: 'i131-travel-document',
    title: 'Advance Parole / Travel Document (I-131)',
    description: 'File I-131 for advance parole, re-entry permit, refugee travel document, or emergency advance parole — detect document type, analyze travel risk (I-485 abandonment, dual-intent exception, country of persecution), check expiration, verify underlying status, manage evidence, biometrics, and handle RFE/NOID and case-inquiry routing.',
    stage: 'GOLD-CERTIFIED',
    handlesIssueTypes: ['travel_document', 'advance_parole', 'reentry_permit', 'refugee_travel', 'emergency_travel', 'replacement'],
    agencies: ['USCIS'],
    composable: true,
    rules: ['Four document types: advance parole, re-entry permit, refugee travel document, TPS travel authorization.', 'Travel without advance parole while I-485 is pending results in abandonment (H-1B/L-1 dual-intent exception applies).', 'Emergency advance parole requires evidence of emergency at local USCIS field office.', 'Re-entry permits valid up to 2 years; refugee travel documents valid 1 year; advance parole ~1 year.', 'RFE/NOID for I-131 route to existing RFE/NOID engines.'],
  },

  {
    slug: 'i90-green-card-renewal',
    title: 'Green Card Renewal / Replacement (I-90)',
    description: 'File I-90 to renew an expiring 10-year green card, replace a lost/stolen/damaged card, correct USCIS errors or name changes, or handle special cases (commuter status, turning 14). Detects card type (10-year vs 2-year conditional), analyzes filing window (180 days), recommends N-400 naturalization alternative, and handles RFE/NOID/case-inquiry/biometrics routing.',
    stage: 'GOLD-CERTIFIED',
    handlesIssueTypes: ['green_card_renewal', 'green_card_replacement', 'green_card_correction', 'uscis_error', 'name_change', 'lost_green_card', 'stolen_green_card'],
    agencies: ['USCIS'],
    composable: true,
    rules: ['I-90 is for 10-year permanent resident cards only — 2-year conditional residents must file I-751 instead.', 'Filing window opens 180 days before card expiration.', 'USCIS error filings are free ($0).', '36-month automatic extension of green card validity upon filing I-90 (since Sep 2024).', 'Filing fee: $415 online, $465 paper. Biometrics included.'],
  },
  {
    slug: 'i765-employment-authorization',
    title: 'Employment Authorization Document (I-765 EAD / Work Permit)',
    description: 'File I-765 for initial, renewal, or replacement EAD — detect eligibility category, analyze expiration, check auto-extension eligibility, verify underlying case, manage evidence, fee, and biometrics, and handle RFE/NOID and case-inquiry routing.',
    stage: 'GOLD-CERTIFIED',
    handlesIssueTypes: ['employment_authorization', 'ead', 'work_permit', 'renewal', 'replacement', 'expiration'],
    agencies: ['USCIS'],
    composable: true,
    rules: ['Triggered by EAD filing need, renewal urgency, replacement request, or I-765-related notice.', 'Eligibility category (e.g., (c)(9), (c)(8), (a)(5)) determines evidence requirements and filing procedures.', 'Automatic extension rules changed on Oct. 30, 2025 — renewals filed on/after that date get 0 days.', 'USCIS recommends filing renewals 90-180 days before EAD expiration.', 'RFE/NOID for I-765 route to existing RFE/NOID engines with I-765 form adapter.'],
  },
  {
    slug: 'i601-waiver',
    title: 'Inadmissibility Waiver (I-601 / I-601A)',
    description: 'File I-601 or I-601A waiver of inadmissibility — detect ground, determine pathway, assess extreme hardship to qualifying relative, manage evidence, and handle RFE/NOID, denial, and consular sequencing.',
    stage: 'GOLD-CERTIFIED',
    handlesIssueTypes: ['inadmissibility', 'waiver', 'extreme_hardship', 'unlawful_presence', 'fraud_misrepresentation'],
    agencies: ['USCIS'],
    composable: true,
    rules: ['Triggered by inadmissibility finding, waiver preparation need, or I-601/I-601A-related notice.', 'I-601A only waives unlawful presence and requires applicant to be physically present in the US.', 'I-601 covers broader grounds including fraud, criminal, health, and smuggling.', 'Extreme hardship to a qualifying relative is required for most waivers.', 'I-601A approval requires departure for consular visa interview after adjudication.'],
  },
  {
    slug: 'i751-removal-conditions',
    title: 'Remove Conditions on Residence (I-751)',
    description: 'File I-751 jointly or with a waiver, manage the 90-day filing window, prepare for interview, handle missed interviews, evidence deficiencies, delays, and denials — with mailing and proof.',
    stage: 'GOLD-CERTIFIED',
    handlesIssueTypes: ['conditional_residence', 'filing_window', 'waiver', 'interview', 'evidence_gap', 'denial'],
    agencies: ['USCIS'],
    composable: true,
    rules: ['Triggered by conditional residence expiration, I-751 filing need, or I-751-related notice.', 'Joint filing requires both spouses to sign.', 'Waiver filing requires documentation of the waiver ground (good faith marriage, hardship, abuse, or death).', 'Filing window opens 90 days before conditional residence expires.', 'Missed interview requires immediate action to prevent denial and NTA referral.'],
  },
  {
    slug: 'consular-processing',
    title: 'Resolve a Consular Processing Issue',
    description: 'Manage the immigrant visa lifecycle at NVC and US embassies — DS-260, fee payment, civil documents, consular interview preparation, rescheduling, missed interviews, priority date retrogression, medical exams, and visa expiration urgency — with mailing and proof.',
    stage: 'GOLD-CERTIFIED',
    handlesIssueTypes: ['nvc_processing', 'consular_interview', 'civil_documents', 'priority_date', 'medical_exam', 'visa_expiration'],
    agencies: ['DOS'],
    composable: true,
    rules: ['Triggered by NVC correspondence, embassy interview notice, or consular processing issue.', 'Interview reschedule requests must be submitted before the interview date.', 'Missed interviews require immediate remedy to avoid case termination under 22 CFR 42.63.', 'Priority date retrogression requires monitoring the Visa Bulletin — no action until PD is current.', 'Visa issuance has a 6-month validity window — must enter the US before expiration.'],
  },
];

// ─── Stage classification ─────────────────────────────────────────────────────

export function classifyStage(slug: string): WorkflowStage {
  const entry = WORKFLOW_REGISTRY.find(w => w.slug === slug);
  return entry?.stage ?? 'CATALOG';
}

export function isExecutable(slug: string): boolean {
  const stage = classifyStage(slug);
  return stage === 'EXECUTABLE' || stage === 'GOLD-CERTIFIED';
}

export function isGoldCertified(slug: string): boolean {
  return classifyStage(slug) === 'GOLD-CERTIFIED';
}

// ─── Stage counts ──────────────────────────────────────────────────────────────

export function getStageCounts(): Record<WorkflowStage, number> {
  const counts: Record<WorkflowStage, number> = {
    ALIAS: 0,
    CATALOG: 0,
    CONTRACT: 0,
    EXECUTABLE: 0,
    'GOLD-CERTIFIED': 0,
  };
  for (const entry of WORKFLOW_REGISTRY) {
    counts[entry.stage]++;
  }
  return counts;
}

// ─── Workflow Selection from Reasoner Output ──────────────────────────────────
// Uses the reasoner's candidate workflows to find matching registry entries.

export interface WorkflowSelectionResult {
  selected: WorkflowRegistryEntry[];
  rejected: { entry: WorkflowRegistryEntry; reason: string }[];
  incompatible: { workflowA: string; workflowB: string; reason: string }[];
  compound: boolean;
  stageGaps: { slug: string; currentStage: WorkflowStage; targetStage: WorkflowStage }[];
}

export function selectWorkflowsFromReasoning(reasoning: CaseReasoning): WorkflowSelectionResult {
  const selected: WorkflowRegistryEntry[] = [];
  const rejected: { entry: WorkflowRegistryEntry; reason: string }[] = [];
  const detectedIssueTypes = new Set(reasoning.detectedIssues.map(i => i.issueType));

  // Match candidate workflows from the reasoner to registry entries
  for (const candidate of reasoning.candidateWorkflows) {
    // Find registry entries that match the candidate's user-facing title
    const matching = WORKFLOW_REGISTRY.filter(entry =>
      entry.title.toLowerCase().includes(candidate.userFacingTitle.toLowerCase().split(' ')[0]) ||
      candidate.userFacingTitle.toLowerCase().includes(entry.title.toLowerCase().split(' ')[0])
    );

    if (matching.length === 0) {
      // Try matching by issue type
      const byIssueType = WORKFLOW_REGISTRY.filter(entry =>
        entry.handlesIssueTypes.some(t => [...detectedIssueTypes].includes(t))
      );
      for (const entry of byIssueType) {
        if (!selected.find(s => s.slug === entry.slug)) {
          selected.push(entry);
        }
      }
    } else {
      for (const entry of matching) {
        if (!selected.find(s => s.slug === entry.slug)) {
          selected.push(entry);
        }
      }
    }
  }

  // Also add workflows that handle detected issues but weren't in candidates
  for (const entry of WORKFLOW_REGISTRY) {
    if (entry.stage === 'CATALOG') continue; // Skip catalog-only for now
    if (selected.find(s => s.slug === entry.slug)) continue;
    if (entry.handlesIssueTypes.some(t => [...detectedIssueTypes].includes(t))) {
      selected.push(entry);
    }
  }

  // Reject workflows from reasoner's incompatible list
  for (const rejectedWf of reasoning.incompatibleWorkflows) {
    const matching = WORKFLOW_REGISTRY.filter(entry =>
      entry.title.toLowerCase().includes(rejectedWf.userFacingTitle.toLowerCase().split(' ')[0]) ||
      rejectedWf.userFacingTitle.toLowerCase().includes(entry.title.toLowerCase().split(' ')[0])
    );
    for (const entry of matching) {
      if (!rejected.find(r => r.entry.slug === entry.slug)) {
        rejected.push({ entry, reason: rejectedWf.reason });
      }
    }
  }

  // Check incompatibility between selected workflows
  const incompatible: { workflowA: string; workflowB: string; reason: string }[] = [];
  for (let i = 0; i < selected.length; i++) {
    for (let j = i + 1; j < selected.length; j++) {
      const a = selected[i];
      const b = selected[j];
      if (a.incompatibleWith?.includes(b.slug) || b.incompatibleWith?.includes(a.slug)) {
        incompatible.push({
          workflowA: a.slug,
          workflowB: b.slug,
          reason: `${a.title} and ${b.title} cannot be used together.`,
        });
      }
    }
  }

  // Identify stage gaps (catalog workflows that should be promoted)
  const stageGaps: { slug: string; currentStage: WorkflowStage; targetStage: WorkflowStage }[] = [];
  for (const entry of WORKFLOW_REGISTRY) {
    if (entry.stage === 'CATALOG') {
      // If this catalog workflow handles detected issues, it should be executable
      if (entry.handlesIssueTypes.some(t => [...detectedIssueTypes].includes(t))) {
        stageGaps.push({
          slug: entry.slug,
          currentStage: 'CATALOG',
          targetStage: 'EXECUTABLE',
        });
      }
    }
  }

  // Remove incompatible workflows from selected (keep the first one)
  const incompatibleSlugs = new Set(incompatible.map(i => i.workflowB));
  const filteredSelected = selected.filter(s => !incompatibleSlugs.has(s.slug));

  return {
    selected: filteredSelected,
    rejected,
    incompatible,
    compound: filteredSelected.length > 1,
    stageGaps,
  };
}

// ─── Workflow composition validation ────────────────────────────────────────

export function validateComposition(workflowSlugs: string[]): {
  valid: boolean;
  incompatible: { a: string; b: string }[];
  reason: string;
} {
  const incompatible: { a: string; b: string }[] = [];

  for (let i = 0; i < workflowSlugs.length; i++) {
    for (let j = i + 1; j < workflowSlugs.length; j++) {
      const a = WORKFLOW_REGISTRY.find(w => w.slug === workflowSlugs[i]);
      const b = WORKFLOW_REGISTRY.find(w => w.slug === workflowSlugs[j]);
      if (a?.incompatibleWith?.includes(workflowSlugs[j]) ||
          b?.incompatibleWith?.includes(workflowSlugs[i])) {
        incompatible.push({ a: workflowSlugs[i], b: workflowSlugs[j] });
      }
    }
  }

  return {
    valid: incompatible.length === 0,
    incompatible,
    reason: incompatible.length > 0
      ? `Incompatible workflows detected: ${incompatible.map(i => `${i.a} + ${i.b}`).join(', ')}`
      : 'All workflows are compatible.',
  };
}
