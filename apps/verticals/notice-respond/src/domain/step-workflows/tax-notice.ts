import type { ChecklistItemState, StepMatterState, StepWorkflowDefinition } from "@mailmypdf/step-workflow";
import { getWorkflowPricingProfile, PRICES } from "@mailmypdf/pricing";
import { classifyNoticeType, type NoticeType } from "@/domain/notice-type";

/**
 * Tax Notice is Notice Respond's GENERIC "I got a notice from a tax
 * authority and don't know which specific tool to use" workflow — it is
 * deliberately NOT a reimplementation of the CP14/CP2000/CP504/CP523 domain
 * packs (`src/domain/cp14*.ts`, `cp2000*.ts`, `cp523*.ts`, `cp504.ts`), which
 * already contain deep, IRS-verified extraction/strategy/validation logic
 * specific to those four notice numbers and are wired to their own routes
 * (`/workflows/cp14-response`, `/workflows/cp2000-response`,
 * `/workflows/cp504-response`, `/workflows/cp523-response`).
 *
 * Before this conversion, NOTHING in the app connected the generic
 * "tax-notice" entry point to those dedicated packs — a visitor who typed
 * "CP2000" into the old free-text tax-notice wizard got the same generic
 * template as someone with an unidentifiable state notice, even though a far
 * more accurate, purpose-built tool already existed for them. The "identify"
 * step below closes that gap: it runs the same deterministic
 * `classifyNoticeType` classifier the CP523/CP504 packs already use
 * (`@/domain/notice-type`) against whatever notice text/number the user
 * enters, and — when it recognizes CP2000, CP14, CP504, or CP523 with
 * reasonable confidence — surfaces a prominent "use the dedicated workflow
 * instead" recommendation with a direct link, rather than silently
 * processing a notice type this generic pack has no special-cased knowledge
 * of. The user can still continue in this generic flow if they prefer (e.g.
 * their state notice looks similar but isn't actually IRS, or they've
 * already started here) — this is a recommendation, not a redirect, exactly
 * like `domain-packs.ts`'s registry model where a specific pack is an
 * opt-in specialization layered on shared infrastructure, not a mandatory
 * gate.
 *
 * Steps (7, not the credit-bureau trio's 6): a tax notice's response is not
 * one FCRA reinvestigation request — which of five materially different
 * legal actions applies (dispute with evidence, pay, request a payment
 * plan/Offer in Compromise, request a Collection Due Process hearing,
 * petition Tax Court) depends entirely on which notice this is and what
 * stage of the collection/assessment process it represents, and getting
 * that wrong has real financial and legal consequences (a missed 30-day CDP
 * window or 90-day Tax Court deadline cannot be undone). That is real
 * branching decision logic a single "Analyze" step can't carry, so it's
 * split into "Identify" (what kind of notice is this, and does a dedicated
 * workflow already exist for it) and "Strategy" (given that notice type,
 * which response path fits, with the deadline and legal citation for that
 * path) as two distinct steps before Draft.
 */
export const taxNoticeStepWorkflow: StepWorkflowDefinition = {
  id: "tax-notice",
  title: "Tax Notice",
  steps: [
    { id: "identify", label: "Identify" },
    { id: "intake", label: "Intake" },
    { id: "documents", label: "Documents" },
    { id: "strategy", label: "Strategy" },
    { id: "draft", label: "Draft" },
    { id: "review", label: "Review" },
    { id: "mail", label: "Mail" },
  ],
  requiresApprovalBeforeStep: "mail",
};

// ── Notice categories ────────────────────────────────────────────────────

/**
 * The four legally distinct response paths a tax notice can put a taxpayer
 * on, plus "other" for anything that doesn't fit. These are not arbitrary UI
 * buckets — each has a different deadline law and a different set of rights,
 * verified against irs.gov (see per-option citations below):
 *  - math_error: IRC 6213(b)(2)(A) — 60 days to request abatement, and the
 *    IRS must reverse the correction on request (no proof required at this
 *    stage); no levy during the 60 days.
 *  - proposed_assessment: either an informal proposal (e.g. CP2000, "reply
 *    by the date listed") or a formal Notice of Deficiency / "90-day
 *    letter" (IRC 6213(a) — 90 days, 150 if the address is outside the US,
 *    to petition Tax Court; this deadline is jurisdictional and cannot be
 *    extended).
 *  - collection: the balance-due/levy/lien series (CP14/CP501/CP503/CP504,
 *    then a Final Notice of Intent to Levy such as Letter 1058/LT11, or a
 *    Notice of Federal Tax Lien such as Letter 3172). Confirmed against
 *    irs.gov: CP504 itself does NOT carry Collection Due Process (CDP)
 *    rights — it offers Collection Appeals Program (CAP) rights instead
 *    (IRS Pub. 1660). The 30-day CDP hearing right (Form 12153, IRC 6330 /
 *    6320) is triggered specifically by a Final Notice of Intent to Levy or
 *    a Notice of Federal Tax Lien, not by CP504 or CP523. Getting this
 *    distinction right matters: a taxpayer who assumes CP504 already
 *    started their CDP clock could file late against the notice that
 *    actually controls it, or (worse) believe a right exists that this
 *    notice alone doesn't confer.
 *  - audit: correspondence/office/field examination — typically ~30 days to
 *    respond or request an Appeals conference after the audit report; a
 *    later Notice of Deficiency reverts to the 90-day Tax Court rule above.
 */
export type TaxNoticeCategory = "math_error" | "proposed_assessment" | "collection" | "audit" | "other";

export const NOTICE_CATEGORY_LABELS: Record<TaxNoticeCategory, string> = {
  math_error: "Math error / return correction",
  proposed_assessment: "Proposed change to your tax",
  collection: "Balance due, levy, or lien",
  audit: "Audit or examination",
  other: "Other / not sure",
};

/**
 * A dedicated, mature workflow this generic pack should recommend instead
 * of handling the notice itself.
 */
export type DedicatedWorkflowLink = { workflowId: string; label: string; path: string };

const CP2000_LINK: DedicatedWorkflowLink = { workflowId: "cp2000-response", label: "CP2000 Response workflow", path: "/workflows/cp2000-response" };
const CP14_LINK: DedicatedWorkflowLink = { workflowId: "cp14-response", label: "CP14 Response workflow", path: "/workflows/cp14-response" };
const CP504_LINK: DedicatedWorkflowLink = { workflowId: "cp504-response", label: "CP504 Response workflow", path: "/workflows/cp504-response" };
const CP523_LINK: DedicatedWorkflowLink = { workflowId: "cp523-response", label: "CP523 Response workflow", path: "/workflows/cp523-response" };

/** Maps the shared deterministic classifier's output onto this pack's dedicated-workflow recommendation. Only notice types with an actual mature pack in this app get a recommendation — everything else stays in this generic flow. */
const DEDICATED_WORKFLOW_BY_NOTICE_TYPE: Partial<Record<NoticeType, DedicatedWorkflowLink>> = {
  irs_cp2000: CP2000_LINK,
  irs_cp14: CP14_LINK,
  irs_cp504: CP504_LINK,
  irs_cp523: CP523_LINK,
};

/**
 * Runs the same deterministic classifier the CP504/CP523 packs already
 * trust (`classifyNoticeType`) against user-entered notice text/number, and
 * surfaces a dedicated-workflow recommendation only above a real confidence
 * bar — this is a suggestion the user can dismiss, not a gate, since a
 * mismatch here (e.g. a state notice that happens to mention "balance due")
 * should never trap someone who has a legitimate reason to stay generic.
 */
export function suggestDedicatedWorkflow(text: string): (DedicatedWorkflowLink & { confidence: number }) | null {
  if (!text || text.trim().length < 6) return null;
  const { type, confidence } = classifyNoticeType(text);
  const link = DEDICATED_WORKFLOW_BY_NOTICE_TYPE[type];
  if (!link || confidence < 0.6) return null;
  return { ...link, confidence };
}

/**
 * One selectable notice type within the "Identify" step. Deliberately more
 * specific than `TaxNoticeCategory` (e.g. separates the CP504-style
 * "final notice before levy" from the actual CDP-triggering "Final Notice
 * of Intent to Levy" letter) because the deadline and rights genuinely
 * differ between them, even though both map to the same broad
 * `collection` category for Strategy-step filtering.
 */
export type KnownNoticeOption = {
  value: string;
  label: string;
  agencyHint: "IRS" | "State or local" | "Unsure";
  category: TaxNoticeCategory;
  routeToDedicated?: DedicatedWorkflowLink;
  deadlineGuidance: string;
  rightsGuidance: string[];
  /** Keywords used by `suggestNoticeTypeOption` to pre-select this option from pasted notice text — kept separate from the shared classifier since these distinctions are finer-grained than that classifier's categories. */
  matchHints: RegExp[];
};

export const KNOWN_NOTICE_OPTIONS: KnownNoticeOption[] = [
  {
    value: "irs_math_error",
    label: "Math error or return correction notice (e.g., CP11, CP12, CP13)",
    agencyHint: "IRS",
    category: "math_error",
    deadlineGuidance:
      "You have 60 days from the notice date to request that the IRS reverse this specific correction. If you ask within 60 days, the IRS must abate it on request — no proof required at this stage (IRC § 6213(b)(2)(A)). No levy can happen during that 60-day window.",
    rightsGuidance: [
      "Request abatement in writing within 60 days — this is a right, not a discretionary favor; the IRS must reverse the correction if you ask in time.",
      "If the IRS still believes the correction is right, it must then issue a formal Notice of Deficiency before it can reassert the same adjustment — which restarts your dispute rights with a 90-day Tax Court deadline.",
      "Missing the 60-day window turns the correction into a final assessment. After that, your only path to dispute it is to pay and file a refund claim.",
    ],
    matchHints: [/math\s*error/i, /\bCP\s*1[123]\b/i, /return\s*correction/i],
  },
  {
    value: "irs_cp2000",
    label: "CP2000 — proposed changes based on income that doesn't match IRS records",
    agencyHint: "IRS",
    category: "proposed_assessment",
    routeToDedicated: CP2000_LINK,
    deadlineGuidance:
      "Respond by the exact date printed on your notice — the IRS's own instructions say to reply by that date. This is commonly around 30 days, but confirm the specific date on your notice rather than assuming.",
    rightsGuidance: [
      "You can agree, partially agree (file Form 1040-X for anything the notice doesn't cover), or disagree and explain why with documentation.",
      "A CP2000 is a proposal, not a bill — no formal Notice of Deficiency has been issued yet, so you have not yet lost any Tax Court rights.",
      "If you don't respond, the IRS can assess the proposed amount and then issue a Notice of Deficiency or a bill.",
    ],
    matchHints: [/CP\s*2000/i, /underreport/i, /income.{0,20}(doesn.?t|does not).{0,10}match/i],
  },
  {
    value: "irs_deficiency_90day",
    label: 'Notice of Deficiency ("90-day letter") — formal proposed assessment',
    agencyHint: "IRS",
    category: "proposed_assessment",
    deadlineGuidance:
      "You have 90 days from the date of this notice (150 days if your address is outside the United States) to file a petition with the U.S. Tax Court. This deadline is set by statute (IRC § 6213(a)) and cannot be extended for any reason, including a request to the IRS.",
    rightsGuidance: [
      "A timely Tax Court petition generally stops the IRS from assessing or collecting the disputed amount while your case is pending — and you do not have to pay first to file it.",
      "If you miss the 90/150-day window, the IRS can assess the tax immediately; you would then need to pay the amount and file a refund claim (and, if denied, a refund suit) to dispute it instead.",
      "The petition goes to the U.S. Tax Court, not to the IRS — mailing a letter to the IRS by itself does not preserve this deadline.",
    ],
    matchHints: [/notice\s*of\s*deficiency/i, /90.?day\s*letter/i, /statutory\s*notice/i, /petition.{0,20}tax\s*court/i],
  },
  {
    value: "irs_balance_due",
    label: "Balance due reminder (e.g., CP14, CP501, CP503)",
    agencyHint: "IRS",
    category: "collection",
    routeToDedicated: CP14_LINK,
    deadlineGuidance:
      "Pay or respond by the date on your notice to avoid additional penalties, interest, and further collection notices. These early reminder notices do not yet carry Collection Due Process (CDP) hearing rights.",
    rightsGuidance: [
      "You can pay in full, dispute the balance if you believe it's wrong, or request an installment agreement or Offer in Compromise.",
      "Ignoring these reminders leads to CP504 (a final notice before levy) and then, if still unresolved, a Final Notice of Intent to Levy — each stage narrows your options.",
    ],
    matchHints: [/\bCP\s*14\b/i, /\bCP\s*501\b/i, /\bCP\s*503\b/i, /balance\s*due/i, /unpaid\s*balance/i],
  },
  {
    value: "irs_cp504",
    label: "Final notice before levy (CP504)",
    agencyHint: "IRS",
    category: "collection",
    routeToDedicated: CP504_LINK,
    deadlineGuidance:
      "CP504 tells you to pay immediately to avoid the IRS levying a state tax refund. Verified against irs.gov: by itself, CP504 does NOT start the 30-day Collection Due Process (CDP) hearing clock — that is a separate, later notice (see below).",
    rightsGuidance: [
      "You can still request a Collection Appeals Program (CAP) conference before collection action — see the instructions on your notice or IRS Publication 1660.",
      "Pay, dispute the balance, or request an installment agreement or Offer in Compromise now, before the next notice.",
      "The formal 30-day CDP hearing right (Form 12153) is triggered by a Final Notice of Intent to Levy (e.g., Letter 1058 or LT11) or a Notice of Federal Tax Lien (Letter 3172) — not by CP504 itself. If you later receive one of those, see the option below.",
    ],
    matchHints: [/\bCP\s*504\b/i],
  },
  {
    value: "irs_final_levy_or_lien",
    label: "Final Notice of Intent to Levy or Notice of Federal Tax Lien (e.g., Letter 1058, LT11, Letter 3172)",
    agencyHint: "IRS",
    category: "collection",
    deadlineGuidance:
      "You have 30 days from the notice date to request a Collection Due Process (CDP) hearing using Form 12153 (IRC §§ 6330, 6320). A timely request generally pauses IRS collection action until the hearing is resolved.",
    rightsGuidance: [
      "Mail Form 12153 to the address on your notice within 30 days to preserve your CDP hearing right and the resulting pause on collection.",
      "After 30 days (up to 1 year from the notice), you can still request an Equivalent Hearing, but it does not pause collection and does not preserve the right to petition Tax Court afterward the way a timely CDP request does.",
      "You can request an installment agreement or Offer in Compromise instead of, or together with, a CDP hearing request.",
    ],
    matchHints: [/letter\s*1058/i, /\bLT\s*11\b/i, /letter\s*3172/i, /notice\s*of\s*federal\s*tax\s*lien/i, /collection\s*due\s*process/i, /\bCDP\b/i, /right\s*to\s*a?\s*hearing/i],
  },
  {
    value: "irs_installment_default",
    label: "Notice of default on an existing IRS installment agreement (e.g., CP523)",
    agencyHint: "IRS",
    category: "collection",
    routeToDedicated: CP523_LINK,
    deadlineGuidance:
      "Contact the IRS by the date on your notice — commonly about 30 days — to keep your installment agreement. After that, the IRS can terminate it and resume collection, including levy.",
    rightsGuidance: [
      "You can request an appeal or Collection Appeals Program (CAP) conference before the agreement terminates — see IRS Publication 1660.",
      "If the agreement is terminated, you can propose a new installment agreement or an Offer in Compromise.",
    ],
    matchHints: [/\bCP\s*523\b/i, /installment\s*agreement/i, /default.{0,20}agreement/i, /terminat.{0,20}agreement/i],
  },
  {
    value: "irs_audit",
    label: "Audit or examination notice / report",
    agencyHint: "IRS",
    category: "audit",
    deadlineGuidance:
      "Respond by the date on your notice — typically around 30 days to reply to a correspondence audit or to request an Appeals conference after an audit report. If the audit later results in a Notice of Deficiency, the strict 90-day Tax Court deadline applies instead of this one.",
    rightsGuidance: [
      "Provide only the specific records requested, organized clearly — you are not required to volunteer unrelated information.",
      "If you disagree with the audit findings, you can request a conference with the IRS Independent Office of Appeals before the case is closed.",
      "If Appeals doesn't resolve it, you can still petition Tax Court within 90 days of a Notice of Deficiency.",
    ],
    matchHints: [/audit/i, /examination/i, /field\s*exam/i, /correspondence\s*exam/i],
  },
  {
    value: "state_or_local_notice",
    label: "State or local tax authority notice (Department of Revenue, franchise tax board, county assessor, etc.)",
    agencyHint: "State or local",
    category: "other",
    deadlineGuidance:
      "State and local deadlines vary by jurisdiction — many use 30 days, but some allow 60 days or more. Use the deadline printed on your notice; if none is stated, contact the agency's number on the notice immediately to confirm.",
    rightsGuidance: [
      "You generally have the right to a written explanation of the assessment or notice.",
      "You generally have the right to dispute the notice with supporting documentation, often through an administrative appeal or protest process specific to that agency.",
      "Most states offer an installment payment plan for balances you can't pay in full.",
      "Confirm your state's specific appeal deadline and forum (state tax tribunal, board of equalization, or court) — these vary significantly and are not the same as the federal rules above.",
    ],
    matchHints: [/franchise\s*tax/i, /department\s*of\s*revenue/i, /state\s*tax/i, /county\s*assessor/i, /municipal/i],
  },
  {
    value: "unsure",
    label: "I'm not sure what type of notice this is",
    agencyHint: "Unsure",
    category: "other",
    deadlineGuidance:
      "Use the deadline printed on your notice. If you can't find one, call the phone number on the notice right away to confirm — never assume you have more time than you do.",
    rightsGuidance: [
      "You generally have the right to request a plain-language explanation of the notice.",
      "You generally have the right to dispute the notice with documentation.",
      "If you owe a balance you can't pay, ask about a payment plan.",
      "A tax professional (CPA, enrolled agent, or tax attorney) or the Taxpayer Advocate Service (for IRS matters) can help interpret an unfamiliar notice.",
    ],
    matchHints: [],
  },
];

export const KNOWN_NOTICE_OPTIONS_BY_VALUE: Record<string, KnownNoticeOption> = Object.fromEntries(
  KNOWN_NOTICE_OPTIONS.map((option) => [option.value, option]),
);

/** Pre-selects a `KnownNoticeOption` from pasted/typed notice text, most-specific match first. Purely a convenience suggestion — the user always confirms the final selection. */
export function suggestNoticeTypeOption(text: string): string | null {
  if (!text || text.trim().length < 4) return null;
  for (const option of KNOWN_NOTICE_OPTIONS) {
    if (option.matchHints.some((pattern) => pattern.test(text))) return option.value;
  }
  return null;
}

// ── Response paths ───────────────────────────────────────────────────────

export type ResponsePathOption = {
  value: string;
  label: string;
  description: string;
  appliesTo: TaxNoticeCategory[];
};

export const RESPONSE_PATH_OPTIONS: ResponsePathOption[] = [
  {
    value: "dispute_with_evidence",
    label: "Dispute the notice with documentation",
    description: "State what's wrong and back it up with records — statements, returns, prior correspondence, or other proof.",
    appliesTo: ["math_error", "proposed_assessment", "collection", "audit", "other"],
  },
  {
    value: "agree_and_pay",
    label: "Agree with the notice and pay (or arrange payment)",
    description: "You accept the notice is correct and are paying in full or setting up how you'll pay.",
    appliesTo: ["math_error", "proposed_assessment", "collection", "audit", "other"],
  },
  {
    value: "request_payment_plan",
    label: "Request an installment agreement or Offer in Compromise",
    description: "You owe the amount but can't pay it in full right now.",
    appliesTo: ["collection", "proposed_assessment", "math_error", "other"],
  },
  {
    value: "request_abatement_60day",
    label: "Request abatement of the correction (within 60 days)",
    description: "Ask the IRS to reverse a math-error correction under your 60-day right — see IRC § 6213(b)(2)(A).",
    appliesTo: ["math_error"],
  },
  {
    value: "petition_tax_court_90day",
    label: "Petition U.S. Tax Court (within 90/150 days)",
    description: "Only applies if you received a formal Notice of Deficiency (\"90-day letter\") — file with the Tax Court, not the IRS, by the deadline on your notice.",
    appliesTo: ["proposed_assessment"],
  },
  {
    value: "request_cdp_hearing_30day",
    label: "Request a Collection Due Process hearing (Form 12153, within 30 days)",
    description: "Only applies if your notice is a Final Notice of Intent to Levy or a Notice of Federal Tax Lien — not an earlier reminder like CP504.",
    appliesTo: ["collection"],
  },
  {
    value: "request_appeals_conference",
    label: "Request an IRS Independent Office of Appeals conference",
    description: "Ask for an independent review before the IRS takes further action — available at several stages of collection and audit.",
    appliesTo: ["collection", "audit", "proposed_assessment"],
  },
  {
    value: "other_action",
    label: "Something else",
    description: "Describe the outcome you're seeking in your own words.",
    appliesTo: ["math_error", "proposed_assessment", "collection", "audit", "other"],
  },
];

export function getResponsePathOptions(category: TaxNoticeCategory | undefined): ResponsePathOption[] {
  if (!category) return RESPONSE_PATH_OPTIONS;
  return RESPONSE_PATH_OPTIONS.filter((option) => option.appliesTo.includes(category));
}

// ── Intake shape ─────────────────────────────────────────────────────────

export type TaxNoticeIntake = {
  taxpayerName?: string;
  taxpayerAddress?: string;
  agencyName?: string;
  agencyAddress?: string;
  noticeCategory?: TaxNoticeCategory;
  noticeTypeOption?: string;
  noticeNumber?: string;
  noticeDate?: string;
  taxYear?: string;
  amountAtIssue?: string;
  responseDeadline?: string;
  responsePath?: string;
  issueDescription?: string;
  requestedOutcome?: string;
  additionalContext?: string;
  pastedNoticeText?: string;
};

export function getSelectedNoticeOption(matter: StepMatterState): KnownNoticeOption | undefined {
  const intake = (matter.steps.identify?.data ?? matter.steps.intake?.data ?? {}) as TaxNoticeIntake;
  return intake.noticeTypeOption ? KNOWN_NOTICE_OPTIONS_BY_VALUE[intake.noticeTypeOption] : undefined;
}

/**
 * Combines the "identify", "intake", and "strategy" step data into one
 * logical `TaxNoticeIntake` shape: "identify" captures facts about the
 * notice itself, "intake" adds the taxpayer's own facts, and "strategy"
 * adds the chosen `responsePath` — all three are read together by Draft,
 * Review, and Mail so none of them need to know which step originally wrote
 * a given field.
 */
export function getCombinedIntake(matter: StepMatterState): TaxNoticeIntake {
  const identify = (matter.steps.identify?.data ?? {}) as TaxNoticeIntake;
  const intake = (matter.steps.intake?.data ?? {}) as TaxNoticeIntake;
  const strategy = (matter.steps.strategy?.data ?? {}) as TaxNoticeIntake;
  return { ...identify, ...intake, ...strategy };
}

export function getTaxNoticeReadiness(matter: StepMatterState): ChecklistItemState[] {
  const data = getCombinedIntake(matter);
  const files = (matter.steps.documents?.data.files as { id: string; name: string; category?: string }[]) ?? [];
  const hasNoticeUpload = files.some((f) => /notice|letter/i.test(f.category ?? f.name));

  return [
    { id: "noticeType", label: "Notice type identified", done: Boolean(data.noticeTypeOption) },
    { id: "taxpayer", label: "Your name and mailing address", done: Boolean(data.taxpayerName && data.taxpayerAddress) },
    { id: "agency", label: "Agency name and mailing address", done: Boolean(data.agencyName && data.agencyAddress) },
    { id: "deadline", label: "Response deadline confirmed from the notice", done: Boolean(data.responseDeadline) },
    { id: "issue", label: "Facts explaining your situation", done: Boolean(data.issueDescription?.trim()) },
    { id: "noticeUpload", label: "Notice document uploaded", done: hasNoticeUpload },
    { id: "responsePath", label: "Response path selected", done: Boolean(data.responsePath) },
  ];
}

// ── Draft generation ─────────────────────────────────────────────────────

function responsePathParagraph(pathValue: string | undefined, data: TaxNoticeIntake): string {
  const option = RESPONSE_PATH_OPTIONS.find((o) => o.value === pathValue);
  switch (pathValue) {
    case "dispute_with_evidence":
      return "I disagree with this notice. " + (data.issueDescription?.trim() || "[Explain specifically what is incorrect and why.]") + " I have enclosed documentation supporting this position.";
    case "agree_and_pay":
      return "I agree with the determination in this notice and am arranging payment of the amount due as instructed.";
    case "request_payment_plan":
      return "I am unable to pay the amount due in full at this time. I am requesting an installment agreement (or, if I do not qualify for an installment agreement, an Offer in Compromise) to resolve this balance.";
    case "request_abatement_60day":
      return "Pursuant to IRC § 6213(b)(2)(A), I am requesting abatement of the correction described in this notice within the 60-day period provided by law. " + (data.issueDescription?.trim() || "[Explain why the correction is incorrect.]");
    case "petition_tax_court_90day":
      return "I intend to exercise my right under IRC § 6213(a) to petition the United States Tax Court regarding the proposed deficiency described in this notice. This letter is provided to the agency for the record; my petition will be filed separately with the Tax Court by the deadline stated on the notice.";
    case "request_cdp_hearing_30day":
      return "Pursuant to IRC §§ 6330 and 6320, I am requesting a Collection Due Process hearing regarding the collection action described in this notice. I have enclosed Form 12153, Request for a Collection Due Process or Equivalent Hearing.";
    case "request_appeals_conference":
      return "I am requesting a conference with the IRS Independent Office of Appeals to review the determination described in this notice before any further action is taken.";
    case "other_action":
      return data.requestedOutcome?.trim() || "[Describe the outcome you are requesting.]";
    default:
      return data.requestedOutcome?.trim() || (option ? option.description : "[Select a response path to generate this section.]");
  }
}

export function generateTaxNoticeDraft(matter: StepMatterState): string {
  const data = getCombinedIntake(matter);
  const option = getSelectedNoticeOption(matter);
  const date = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

  const lines: string[] = [
    date,
    "",
    data.taxpayerName || "[YOUR NAME]",
    data.taxpayerAddress || "[YOUR ADDRESS]",
    "",
    data.agencyName || "[AGENCY NAME]",
    data.agencyAddress || "[AGENCY MAILING ADDRESS — copy exactly from your notice]",
    "",
    "Re: Response to Notice" + (data.noticeNumber ? ` ${data.noticeNumber}` : ""),
    data.noticeDate ? `Notice Date: ${data.noticeDate}` : "",
    data.taxYear ? `Tax Year: ${data.taxYear}` : "",
    data.amountAtIssue ? `Amount at Issue: ${data.amountAtIssue}` : "",
    data.responseDeadline ? `Response Deadline: ${data.responseDeadline}` : "Response Deadline: [Verify the deadline printed on your notice]",
    "",
    "To Whom It May Concern:",
    "",
    "I am writing in response to the above-referenced notice" + (option ? ` regarding ${option.label.toLowerCase()}` : "") + ".",
    "",
    "Facts:",
    data.issueDescription?.trim() || "[Describe the facts relevant to this notice in your own words.]",
    "",
    "Requested Action:",
    responsePathParagraph(data.responsePath, data),
  ];

  if (data.additionalContext?.trim()) {
    lines.push("", "Additional Information:", data.additionalContext.trim());
  }

  lines.push(
    "",
    "Enclosed please find copies (not originals) of documents supporting this response.",
    "",
    "Please direct any questions or further correspondence to the address above.",
    "",
    "Sincerely,",
    "",
    data.taxpayerName || "[YOUR NAME]",
  );

  return lines.filter((line, index, all) => !(line === "" && all[index - 1] === "")).join("\n");
}

// ── Pricing ──────────────────────────────────────────────────────────────

/**
 * Real pricing profile ("tax-notice" under the "notice-respond" vertical in
 * @mailmypdf/pricing — STANDARD band, $29.99). This is deliberately the same
 * lower tier as the generic "irs-notice" workflow and NOT the $59.99 ADVANCED
 * tier the four dedicated CP packs use — pricing.ts's own rationale
 * ("Generic tax notice analysis") already reflects that this pack does less
 * specialized, notice-number-specific extraction work than those packs, so
 * no new pricing profile is needed or appropriate here.
 */
const _p = getWorkflowPricingProfile("tax-notice")!;

export const TAX_NOTICE_PRICING = {
  preparationFee: _p.basePriceCents / 100,
  includedResponsePages: _p.includedPages,
  responsePagePrice: (_p.extraPageRateCents || 0) / 100,
  supportingPagePrice: (_p.supportingPageRateCents || 0) / 100,
  standardMail: PRICES.standard / 100,
  certifiedMail: PRICES.certified / 100,
  registeredMail: PRICES.registered / 100,
} as const;

export const taxNoticeMailingPackage = [
  { label: "Response letter addressed to the issuing tax authority" },
  { label: "Notice-specific attachments (e.g., Form 12153 reference) when your response path requires them" },
  { label: "Supporting evidence (returns, statements, prior correspondence, payment records)" },
  { label: `Preparation fee ($${TAX_NOTICE_PRICING.preparationFee.toFixed(2)}, includes ${TAX_NOTICE_PRICING.includedResponsePages} response pages)` },
  { label: "Proof of delivery (certified mail recommended, especially near a legal deadline)" },
];
