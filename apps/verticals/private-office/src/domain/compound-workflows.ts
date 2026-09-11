export type CompoundWorkflowId =
  | "government-accusation-defense"
  | "property-estate-reconstruction"
  | "government-accountability-investigation"
  | "personal-legal-autonomy-asset-control";

export type CompoundWorkflowGateType =
  | "evidence"
  | "authority"
  | "deadline"
  | "human-review"
  | "counsel-escalation"
  | "consequential-action";

export type CompoundWorkflowPhase = {
  id: string;
  title: string;
  objective: string;
  capabilities: readonly string[];
  dependsOn: readonly string[];
  outputs: readonly string[];
  gates: readonly CompoundWorkflowGateType[];
};

export type CompoundWorkflowDefinition = {
  id: CompoundWorkflowId;
  title: string;
  family: string;
  primaryKeyword: string;
  summary: string;
  majorOutcome: string;
  entryDocuments: readonly string[];
  phases: readonly CompoundWorkflowPhase[];
  terminalOutputs: readonly string[];
  attorneyEscalationTriggers: readonly string[];
  guardrails: readonly string[];
  requiresHumanReview: true;
  allowsAutomaticConsequentialAction: false;
  lifecycle: "executable";
};

const COMMON_GUARDRAILS = [
  "Do not invent facts, legal authority, deadlines, service requirements, or jurisdiction.",
  "Distinguish user statements, extracted facts, inferences, and verified authority in provenance.",
  "No filing, mailing, service, waiver, settlement, admission, payment, transfer, or other consequential action without explicit human approval.",
  "Surface attorney-escalation triggers when liberty, title, significant assets, emergency relief, or irreversible rights may be affected.",
  "Treat public notice as distinct from legally sufficient service unless the governing authority expressly permits the selected method.",
] as const;

export const compoundWorkflowList: readonly CompoundWorkflowDefinition[] = [
  {
    id: "government-accusation-defense",
    title: "Government Accusation Defense",
    family: "Defense & Procedure",
    primaryKeyword: "government accusation defense preparation",
    summary:
      "Build a structured defense record from an accusation, summons, citation, agency charge, or enforcement notice by combining authority analysis, evidence acquisition, contradiction mapping, deadlines, notices, hearing preparation, and attorney handoff.",
    majorOutcome:
      "A court- or hearing-ready defense command file showing what is alleged, what must be proven, what evidence exists, what is missing, which deadlines control, which procedural issues require review, and what actions are safe to take next.",
    entryDocuments: [
      "summons, citation, complaint, charging document, or agency accusation",
      "court or hearing notice",
      "police or agency reports already available",
      "prior correspondence and notices",
      "user-held evidence and witness information",
    ],
    phases: [
      {
        id: "triage-authority",
        title: "Accusation triage and authority map",
        objective:
          "Identify the accusation, forum, asserted authority, hearing posture, known deadlines, possible consequences, and representation risk before any response is drafted.",
        capabilities: [
          "accusation triage",
          "jurisdiction and authority audit",
          "rights and obligations map",
          "deadline extraction",
          "consequence classification",
        ],
        dependsOn: [],
        outputs: ["accusation map", "authority map", "deadline ledger", "risk tier"],
        gates: ["authority", "deadline", "counsel-escalation"],
      },
      {
        id: "proof-elements",
        title: "Elements and proof matrix",
        objective:
          "Break each allegation into required elements or decision criteria and map known supporting, contradicting, missing, and disputed evidence.",
        capabilities: [
          "elements analyzer",
          "findings",
          "evidence matrix",
          "provenance",
          "missing proof detection",
        ],
        dependsOn: ["triage-authority"],
        outputs: ["element-to-evidence matrix", "missing-proof list", "disputed-fact list"],
        gates: ["evidence"],
      },
      {
        id: "records-preservation",
        title: "Discovery, records, and preservation",
        objective:
          "Identify records that should be requested or preserved and prepare the appropriate non-filing request, preservation package, or counsel checklist.",
        capabilities: [
          "discovery planning",
          "public records request",
          "evidence preservation",
          "bodycam and dispatch record targeting",
          "third-party evidence planner",
        ],
        dependsOn: ["triage-authority"],
        outputs: ["records acquisition plan", "preservation notices", "outstanding evidence tracker"],
        gates: ["authority", "human-review"],
      },
      {
        id: "timeline-contradictions",
        title: "Timeline and contradiction reconstruction",
        objective:
          "Normalize dates, statements, witnesses, documents, recordings, and physical evidence into a source-linked chronology and contradiction matrix.",
        capabilities: [
          "timeline reconstruction",
          "statement comparison",
          "contradiction analyzer",
          "witness map",
          "provenance",
        ],
        dependsOn: ["proof-elements", "records-preservation"],
        outputs: ["master chronology", "contradiction matrix", "witness comparison table"],
        gates: ["evidence"],
      },
      {
        id: "procedure-rights",
        title: "Procedure and rights issue spotting",
        objective:
          "Identify procedure-sensitive issues for review, including notice, service, search or seizure, statements, warrants, due process, and preservation of objections.",
        capabilities: [
          "due process audit",
          "search and seizure issue spotting",
          "warrant analyzer",
          "statement and interrogation analyzer",
          "service and notice audit",
        ],
        dependsOn: ["timeline-contradictions"],
        outputs: ["procedure issue map", "rights issue list", "questions for counsel"],
        gates: ["authority", "counsel-escalation"],
      },
      {
        id: "hearing-readiness",
        title: "Court and hearing readiness",
        objective:
          "Prepare a concise courtroom briefing, exhibit/evidence index, unresolved issue list, and counsel handoff without generating unreviewed admissions or filings.",
        capabilities: [
          "first appearance preparation",
          "hearing preparation",
          "exhibit organizer",
          "attorney handoff packet",
          "proof packet",
        ],
        dependsOn: ["procedure-rights"],
        outputs: ["courtroom briefing", "evidence index", "attorney handoff packet", "next-action plan"],
        gates: ["human-review", "counsel-escalation", "consequential-action"],
      },
    ],
    terminalOutputs: [
      "defense command file",
      "master chronology",
      "elements and evidence matrix",
      "contradiction matrix",
      "deadline ledger",
      "courtroom briefing",
      "attorney handoff packet",
    ],
    attorneyEscalationTriggers: [
      "criminal charge or potential incarceration",
      "active warrant or imminent search",
      "hearing or filing deadline that may affect liberty or waiver",
      "proposed plea, admission, waiver, or settlement",
      "suppression, dismissal, constitutional, or complex jurisdiction issue",
    ],
    guardrails: COMMON_GUARDRAILS,
    requiresHumanReview: true,
    allowsAutomaticConsequentialAction: false,
    lifecycle: "executable",
  },
  {
    id: "property-estate-reconstruction",
    title: "Property & Estate Reconstruction",
    family: "Property, Trust & Estate",
    primaryKeyword: "inheritance property ownership reconstruction",
    summary:
      "Reconstruct family relationships, probate history, powers of attorney, deeds, liens, trusts, and transfers to explain how property should have passed and where title or authority may have diverged.",
    majorOutcome:
      "A source-backed ownership and succession graph showing people, estates, trusts, instruments, recorded transfers, unresolved gaps, adverse claims, and the evidence needed for probate, title, or attorney review.",
    entryDocuments: [
      "birth, marriage, and death records",
      "wills, trusts, amendments, and powers of attorney",
      "probate case documents",
      "deeds, liens, easements, and title reports",
      "tax, assessment, and ownership records",
    ],
    phases: [
      {
        id: "identity-lineage",
        title: "Identity and lineage reconstruction",
        objective:
          "Establish source-backed identities, name changes, parent-child relationships, marriages, deaths, and beneficiary relationships.",
        capabilities: [
          "birth record intelligence",
          "family relationship graph",
          "identity provenance graph",
          "vital record reconciliation",
        ],
        dependsOn: [],
        outputs: ["identity graph", "lineage graph", "record discrepancy list"],
        gates: ["evidence"],
      },
      {
        id: "estate-authority",
        title: "Estate, trust, and authority map",
        objective:
          "Identify decedents, estates, fiduciaries, trustees, agents, powers of attorney, probate proceedings, and claimed authority over assets.",
        capabilities: [
          "probate reconstruction",
          "trust governance audit",
          "power-of-attorney audit",
          "agency relationship audit",
        ],
        dependsOn: ["identity-lineage"],
        outputs: ["authority timeline", "estate map", "fiduciary map"],
        gates: ["authority", "counsel-escalation"],
      },
      {
        id: "title-history",
        title: "Property and title history",
        objective:
          "Reconstruct deeds, liens, encumbrances, assessments, entity ownership, and recorded transfers in chronological order.",
        capabilities: [
          "property ownership audit",
          "chain of title",
          "lien investigation",
          "entity ownership mapping",
          "recorded instrument analysis",
        ],
        dependsOn: ["estate-authority"],
        outputs: ["chain of title", "encumbrance ledger", "transfer chronology"],
        gates: ["evidence"],
      },
      {
        id: "transfer-anomalies",
        title: "Transfer and authority anomaly analysis",
        objective:
          "Compare each material transfer against the authority that existed at the time and identify missing instruments, inconsistent signatures, unexplained transfers, or unresolved ownership claims.",
        capabilities: [
          "transaction chronology",
          "document provenance",
          "power-of-attorney abuse issue spotting",
          "adverse claim analysis",
          "contradiction detection",
        ],
        dependsOn: ["title-history"],
        outputs: ["anomaly matrix", "authority-versus-transfer table", "evidence gap list"],
        gates: ["evidence", "counsel-escalation"],
      },
      {
        id: "notice-record-correction",
        title: "Correction, notice, and records plan",
        objective:
          "Determine which discrepancies can be corrected administratively, which parties require notice, and which issues may require probate, title, or judicial action.",
        capabilities: [
          "record correction",
          "notice requirement analyzer",
          "certified-mail proof",
          "beneficiary notice",
          "claim preservation",
        ],
        dependsOn: ["transfer-anomalies"],
        outputs: ["correction plan", "notice matrix", "claim-preservation plan"],
        gates: ["authority", "human-review", "consequential-action"],
      },
      {
        id: "estate-handoff",
        title: "Probate, title, and counsel handoff",
        objective:
          "Package the reconstructed history, disputed transfers, source records, and unresolved legal questions into a professional review packet.",
        capabilities: [
          "probate evidence packet",
          "title evidence packet",
          "attorney handoff",
          "proof audit",
        ],
        dependsOn: ["notice-record-correction"],
        outputs: ["property and estate reconstruction report", "exhibit index", "attorney handoff packet"],
        gates: ["human-review", "counsel-escalation"],
      },
    ],
    terminalOutputs: [
      "ownership and succession graph",
      "chain of title",
      "authority timeline",
      "transfer anomaly matrix",
      "record correction and notice plan",
      "probate/title attorney packet",
    ],
    attorneyEscalationTriggers: [
      "disputed deed, forged instrument, or conflicting ownership claim",
      "suspected fiduciary or power-of-attorney abuse",
      "open or contested probate proceeding",
      "quiet-title, partition, rescission, or other court remedy may be required",
      "limitation period, notice period, or rights of third parties may be affected",
    ],
    guardrails: COMMON_GUARDRAILS,
    requiresHumanReview: true,
    allowsAutomaticConsequentialAction: false,
    lifecycle: "executable",
  },
  {
    id: "government-accountability-investigation",
    title: "Government Accountability Investigation",
    family: "Government & Records",
    primaryKeyword: "government accountability records investigation",
    summary:
      "Build an evidence-first accountability matter by mapping agency authority, obtaining records and policies, preserving evidence, reconstructing events, testing official narratives, and preparing administrative or legal escalation.",
    majorOutcome:
      "A documented accountability record showing who acted, under what claimed authority, what the official record says, where evidence conflicts, what procedures applied, and which review or claim paths remain available.",
    entryDocuments: [
      "agency notices, reports, citations, orders, and correspondence",
      "names of agencies and personnel involved",
      "dates and locations of key events",
      "photos, video, messages, witness information, and user-held records",
      "prior records requests or complaints",
    ],
    phases: [
      {
        id: "agency-authority",
        title: "Agency and authority map",
        objective:
          "Identify each agency, actor, claimed authority, governing procedure, decision-maker, review path, and known deadline.",
        capabilities: [
          "authority audit",
          "policy identification",
          "jurisdiction map",
          "deadline ledger",
          "administrative exhaustion map",
        ],
        dependsOn: [],
        outputs: ["agency map", "authority map", "review path", "deadline ledger"],
        gates: ["authority", "deadline"],
      },
      {
        id: "records-strategy",
        title: "Records and policy acquisition strategy",
        objective:
          "Target the source records needed to reconstruct the matter, including reports, logs, recordings, policies, manuals, correspondence, and decision records.",
        capabilities: [
          "public records request",
          "records scope builder",
          "policy/manual acquisition",
          "records response tracker",
        ],
        dependsOn: ["agency-authority"],
        outputs: ["records request matrix", "request drafts", "records tracker"],
        gates: ["authority", "human-review"],
      },
      {
        id: "preserve-evidence",
        title: "Evidence preservation",
        objective:
          "Identify time-sensitive evidence and prepare targeted preservation actions before video, logs, messages, or physical evidence can be lost.",
        capabilities: [
          "preservation notice",
          "litigation hold planner",
          "evidence inventory",
          "chain of custody",
        ],
        dependsOn: ["agency-authority"],
        outputs: ["preservation plan", "evidence inventory", "chain-of-custody ledger"],
        gates: ["evidence", "human-review"],
      },
      {
        id: "reconstruct-events",
        title: "Event and narrative reconstruction",
        objective:
          "Create a source-linked timeline and compare reports, recordings, witness statements, policies, and later agency explanations.",
        capabilities: [
          "timeline reconstruction",
          "official narrative analyzer",
          "contradiction matrix",
          "witness comparison",
          "missing record detection",
        ],
        dependsOn: ["records-strategy", "preserve-evidence"],
        outputs: ["master chronology", "contradiction matrix", "missing record list"],
        gates: ["evidence"],
      },
      {
        id: "due-process-accountability",
        title: "Procedure, due process, and accountability map",
        objective:
          "Compare what happened against required notice, hearing, service, policy, recordkeeping, complaint, appeal, and claim procedures.",
        capabilities: [
          "due process audit",
          "procedure compliance matrix",
          "notice and service audit",
          "administrative appeal planner",
          "government claim notice analyzer",
        ],
        dependsOn: ["reconstruct-events"],
        outputs: ["procedure compliance matrix", "available review paths", "claim preservation issues"],
        gates: ["authority", "deadline", "counsel-escalation"],
      },
      {
        id: "accountability-escalation",
        title: "Accountability escalation packet",
        objective:
          "Prepare the strongest appropriate non-automatic next-step package: correction request, complaint, appeal, claim notice, hearing packet, or counsel handoff.",
        capabilities: [
          "notice builder",
          "administrative complaint",
          "appeal packet",
          "claim preservation",
          "attorney handoff",
          "proof of notice",
        ],
        dependsOn: ["due-process-accountability"],
        outputs: ["accountability packet", "notice/service proof plan", "attorney handoff packet"],
        gates: ["human-review", "counsel-escalation", "consequential-action"],
      },
    ],
    terminalOutputs: [
      "government accountability case file",
      "agency and authority map",
      "records and policy archive",
      "master chronology",
      "contradiction matrix",
      "procedure compliance matrix",
      "escalation or attorney packet",
    ],
    attorneyEscalationTriggers: [
      "government claim or tort notice deadline may apply",
      "constitutional, civil-rights, search, seizure, detention, or retaliation issue",
      "active enforcement, prosecution, warrant, or imminent hearing",
      "substantial damages or irreversible property interests",
      "records suggest deliberate falsification, destruction, or serious misconduct",
    ],
    guardrails: COMMON_GUARDRAILS,
    requiresHumanReview: true,
    allowsAutomaticConsequentialAction: false,
    lifecycle: "executable",
  },
  {
    id: "personal-legal-autonomy-asset-control",
    title: "Personal Legal Autonomy & Asset Control",
    family: "Private Governance",
    primaryKeyword: "personal legal asset control system",
    summary:
      "Create a lawful private-governance map of identity, property, entities, trusts, contracts, delegated authority, notices, records, privacy exposure, succession, and proof without relying on pseudo-legal status theories.",
    majorOutcome:
      "A continuously maintainable control map showing what the person owns, controls, has delegated, must maintain, should revoke or correct, and how important actions are documented and proven.",
    entryDocuments: [
      "identity and vital records",
      "deeds, titles, account ownership records, and asset schedules",
      "trusts, wills, powers of attorney, and beneficiary designations",
      "entity formation and governance records",
      "material contracts, insurance, licenses, and government records",
    ],
    phases: [
      {
        id: "identity-records",
        title: "Identity and official-record audit",
        objective:
          "Map foundational identity records, name history, official identifiers, and discrepancies across government and financial systems.",
        capabilities: [
          "birth record intelligence",
          "identity provenance graph",
          "status and record correction",
          "official record inventory",
        ],
        dependsOn: [],
        outputs: ["identity provenance graph", "record discrepancy list", "correction queue"],
        gates: ["evidence"],
      },
      {
        id: "ownership-control",
        title: "Ownership and control map",
        objective:
          "Inventory material assets and identify legal owner, beneficial interest, title status, encumbrances, authorized signers, and controlling documents.",
        capabilities: [
          "asset inventory",
          "property title audit",
          "entity ownership",
          "trust asset schedule",
          "lien and encumbrance investigation",
        ],
        dependsOn: ["identity-records"],
        outputs: ["asset control map", "ownership gaps", "encumbrance ledger"],
        gates: ["evidence"],
      },
      {
        id: "delegated-authority",
        title: "Delegated authority and agency audit",
        objective:
          "Identify powers of attorney, trustees, managers, officers, agents, signers, consents, and other delegated authority, including stale or revocable authority.",
        capabilities: [
          "power-of-attorney control",
          "agency relationship audit",
          "consent tracker",
          "representation boundary map",
        ],
        dependsOn: ["ownership-control"],
        outputs: ["authority map", "revocation candidates", "notice recipients"],
        gates: ["authority", "counsel-escalation"],
      },
      {
        id: "contracts-obligations",
        title: "Contract and obligation control",
        objective:
          "Inventory important contracts, secured obligations, insurance, licenses, recurring duties, notices, renewal dates, defaults, and dispute procedures.",
        capabilities: [
          "contract inventory",
          "rights and obligations map",
          "secured transaction legitimacy check",
          "insurance and license tracker",
          "deadline monitor",
        ],
        dependsOn: ["delegated-authority"],
        outputs: ["contract register", "obligation calendar", "risk and renewal queue"],
        gates: ["deadline"],
      },
      {
        id: "privacy-succession",
        title: "Privacy and succession resilience",
        objective:
          "Reduce unnecessary exposure and verify that incapacity, death, trustee succession, beneficiaries, and business continuity are documented consistently.",
        capabilities: [
          "privacy exposure audit",
          "estate succession control",
          "beneficiary reconciliation",
          "trust governance",
          "business continuity map",
        ],
        dependsOn: ["contracts-obligations"],
        outputs: ["privacy action list", "succession map", "beneficiary discrepancy list"],
        gates: ["evidence", "counsel-escalation"],
      },
      {
        id: "control-vault",
        title: "Control vault and notice system",
        objective:
          "Create the governed record for approvals, revocations, notices, corrections, mailing proof, and future review cycles.",
        capabilities: [
          "legal notice engine",
          "certified-mail proof",
          "document vault",
          "authorization log",
          "annual review checklist",
        ],
        dependsOn: ["privacy-succession"],
        outputs: ["personal legal control file", "notice matrix", "authorization ledger", "annual review plan"],
        gates: ["human-review", "consequential-action"],
      },
    ],
    terminalOutputs: [
      "personal legal control map",
      "identity and official-record graph",
      "asset ownership and authority map",
      "contract and obligation register",
      "privacy and succession plan",
      "authorization and notice ledger",
    ],
    attorneyEscalationTriggers: [
      "transfer of real property, trust assets, or substantial business interests",
      "creation, revocation, or interpretation of fiduciary powers with material consequences",
      "disputed ownership, creditor rights, tax consequences, or securities issues",
      "estate plan changes requiring jurisdiction-specific legal instruments",
      "user requests a theory that claims private status eliminates taxes, court jurisdiction, or generally applicable law",
    ],
    guardrails: [
      ...COMMON_GUARDRAILS,
      "Do not represent a UCC filing, birth certificate, self-created bond, status declaration, or private contract as a mechanism that unilaterally defeats generally applicable law or court jurisdiction.",
    ],
    requiresHumanReview: true,
    allowsAutomaticConsequentialAction: false,
    lifecycle: "executable",
  },
] as const;

export const compoundWorkflows: Readonly<Record<CompoundWorkflowId, CompoundWorkflowDefinition>> =
  Object.fromEntries(compoundWorkflowList.map((workflow) => [workflow.id, workflow])) as Readonly<
    Record<CompoundWorkflowId, CompoundWorkflowDefinition>
  >;

export function validateCompoundWorkflow(workflow: CompoundWorkflowDefinition): string[] {
  const errors: string[] = [];
  const seen = new Set<string>();

  if (!workflow.requiresHumanReview) errors.push("compound workflows must require human review");
  if (workflow.allowsAutomaticConsequentialAction) {
    errors.push("compound workflows cannot permit automatic consequential action");
  }
  if (workflow.phases.length < 2) errors.push("compound workflows must contain multiple phases");

  for (const phase of workflow.phases) {
    if (seen.has(phase.id)) errors.push(`duplicate phase id: ${phase.id}`);
    for (const dependency of phase.dependsOn) {
      if (!seen.has(dependency)) {
        errors.push(`phase ${phase.id} depends on unknown or future phase ${dependency}`);
      }
    }
    seen.add(phase.id);
  }

  const finalPhase = workflow.phases[workflow.phases.length - 1];
  if (!finalPhase?.gates.includes("human-review")) {
    errors.push("final phase must require human review");
  }
  if (!finalPhase?.gates.includes("consequential-action")) {
    errors.push("final phase must contain a consequential-action gate");
  }

  return errors;
}

export function readyCompoundPhases(
  workflow: CompoundWorkflowDefinition,
  completedPhaseIds: readonly string[],
): readonly CompoundWorkflowPhase[] {
  const completed = new Set(completedPhaseIds);
  return workflow.phases.filter(
    (phase) =>
      !completed.has(phase.id) &&
      phase.dependsOn.every((dependency) => completed.has(dependency)),
  );
}
