import {
  SECURED_TRANSACTION_ELIGIBILITY_GATES,
  evaluateSecuredTransactionEligibility,
  type SecuredTransactionEligibilityGateId as GateId,
} from "./eligibility";
import { toEngineInput, type EligibilityIntakeInput } from "../runtime-policy";

export interface IntakeField {
  label: string;
  hint: string;
  placeholder?: string;
  multiline?: boolean;
  options?: readonly { value: string; label: string }[];
}

const unknown = { value: "unknown", label: "I don’t know yet" };
const disputed = { value: "disputed", label: "There is a disagreement" };

// Workflow-owned questions; layout and controls live in workflow-ui.
export const ELIGIBILITY_FIELDS = {
  transactionStage: {
    label: "Where are you in the process?",
    hint: "A proposed deal is okay. We will keep plans separate from things that have already happened.",
    options: [
      { value: "proposed", label: "Planning a new transaction" },
      { value: "existing", label: "Reviewing an existing transaction" },
      { value: "disputed", label: "Trying to understand a dispute" }, unknown,
    ],
  },
  yourRole: {
    label: "How are you involved?",
    hint: "This describes your role. It does not establish permission to act for someone else.",
    options: [
      { value: "offering", label: "I’m borrowing or offering property" },
      { value: "receiving", label: "I’m lending or receiving security" },
      { value: "representative", label: "I’m helping or representing someone" }, unknown,
    ],
  },
  transactionStory: {
    label: "Tell us what is happening",
    hint: "Who is doing what, what is being exchanged, and what do you want help understanding? A few sentences are enough.",
    placeholder: "For example: My business wants to borrow $20,000 to buy a machine. The lender wants the machine as security. Nothing has been signed yet.",
    multiline: true,
  },
  obligorName: {
    label: "Who owes the money or must perform the promise?",
    hint: "Use the name shown in the agreement, if you have it. This person or business may be different from the property owner.",
    placeholder: "Person or business name",
  },
  debtorName: {
    label: "Who is offering the property as security?",
    hint: "Often called the debtor. Enter the property provider’s name, even if it is the same as the person who owes the money.",
    placeholder: "Person or business offering the property",
  },
  debtorType: {
    label: "What kind of property provider is this?",
    hint: "Use what you know today. Workflow 2 will look more closely at names and capacity.",
    options: [
      { value: "person", label: "An individual" },
      { value: "business", label: "A company or organization" },
      { value: "trust-estate", label: "A trust or estate" }, unknown,
    ],
  },
  securedPartyName: {
    label: "Who would receive the security interest?",
    hint: "Usually the lender or other person owed performance. Often called the secured party.",
    placeholder: "Lender or beneficiary name",
  },
  signerName: {
    label: "Who signed, or would sign, for the property provider?",
    hint: "For a business, include the person’s name and job title if known. A title alone does not prove authority.",
    placeholder: "For example: Jordan Lee, manager",
  },
  obligationStatus: {
    label: "Is there already a debt or promise to perform?",
    hint: "Describe the obligation itself, not a filing number or a hoped-for claim.",
    options: [
      { value: "existing", label: "Yes, an existing obligation" },
      { value: "proposed", label: "It is only proposed" },
      { value: "none", label: "No obligation identified" }, disputed, unknown,
    ],
  },
  obligationDetails: {
    label: "What is owed or promised, and to whom?",
    hint: "Include repayment terms or the promised performance if you know them. Leave uncertain terms uncertain.",
    placeholder: "For example: Example Shop LLC would repay a loan to Example Lender over 24 months.",
    multiline: true,
  },
  amount: {
    label: "Amount and currency, if known",
    hint: "Use an estimate only if you label it as one. Leave blank for an unknown or non-money obligation.",
    placeholder: "For example: proposed $20,000 USD",
  },
  valueStatus: {
    label: "What has the lender or other party provided?",
    hint: "Money already paid, a commitment to lend, and a future plan are different. This answer is not a legal determination of value.",
    options: [
      { value: "provided", label: "Money, goods, or credit already provided" },
      { value: "committed", label: "A commitment has been made" },
      { value: "planned", label: "Only planned so far" },
      { value: "none", label: "Nothing identified" }, disputed, unknown,
    ],
  },
  valueDetails: {
    label: "Describe what was provided or committed",
    hint: "Who provided it, to whom, when, and how? This may differ from the amount still owed.",
    placeholder: "For example: A $5,000 transfer on June 3, with the rest still proposed.",
    multiline: true,
  },
  collateralType: {
    label: "What kind of property is being offered?",
    hint: "Collateral means the property offered as security. Different property types need different later review.",
    options: [
      { value: "equipment", label: "Equipment or business inventory" },
      { value: "vehicle", label: "A vehicle or other titled property" },
      { value: "accounts", label: "Accounts, payments, or other rights" },
      { value: "land", label: "Land or buildings" },
      { value: "other", label: "Something else" }, unknown,
    ],
  },
  collateralDetails: {
    label: "Describe the specific property",
    hint: "What is it, and how could someone identify it? Do not enter full account numbers, Social Security numbers, or other sensitive identifiers.",
    placeholder: "For example: One commercial printing machine, model PX-100, kept at the shop.",
    multiline: true,
  },
  rightsStatus: {
    label: "What connection does the property provider have to it?",
    hint: "Ownership, permission, and possession are not the same. Tell us what you know; you do not need to decide the legal effect.",
    options: [
      { value: "owns", label: "They say they own it" },
      { value: "permission", label: "Someone else owns it; permission is claimed" },
      { value: "none", label: "No ownership or permission identified" }, disputed, unknown,
    ],
  },
  rightsDetails: {
    label: "What supports that connection?",
    hint: "Describe a purchase, title, lease, permission, or the reason ownership is disputed.",
    placeholder: "For example: The invoice names the business, but the machine is leased.",
    multiline: true,
  },
  debtorLocation: {
    label: "Where is the property provider based?",
    hint: "For a person: state/country of residence. For an organization: place of formation and main business location, if known. We are collecting facts, not choosing filing law.",
    placeholder: "For example: Oregon LLC; business in Washington",
  },
  propertyLocation: {
    label: "Where is the property located?",
    hint: "State and country are enough here. Say if it moves between locations or has no physical location.",
    placeholder: "For example: Washington, United States",
  },
  agreementStatus: {
    label: "What agreement exists about using the property as security?",
    hint: "A loan agreement and an agreement granting security may be different documents. We have not reviewed either here.",
    options: [
      { value: "signed", label: "A signed record describes the security arrangement" },
      { value: "draft", label: "There is an unsigned draft" },
      { value: "other", label: "A verbal or other arrangement" },
      { value: "none", label: "No agreement identified" }, disputed, unknown,
    ],
  },
  agreementDetails: {
    label: "What does the agreement say about the property?",
    hint: "Describe the relevant section and who signed it, or explain the other arrangement. Do not guess whether it is legally sufficient.",
    placeholder: "For example: Section 4 lists the machine. The business manager signed on June 2.",
    multiline: true,
  },
  authorizationStatus: {
    label: "Has permission to offer this property been established?",
    hint: "Consider the owner’s permission and any authority needed to sign for them. This is not authorization to file anything.",
    options: [
      { value: "yes", label: "Permission or authority is claimed" },
      { value: "none", label: "No permission or authority identified" }, disputed, unknown,
    ],
  },
  authorizationDetails: {
    label: "Who gave permission, and how?",
    hint: "Describe the record or conversation. If someone is acting for a business, trust, estate, or another person, explain their role.",
    placeholder: "For example: A manager signed, but I still need to check their authority.",
    multiline: true,
  },
} as const satisfies Record<string, IntakeField>;

export type EligibilityAnswerId = keyof typeof ELIGIBILITY_FIELDS;
export const ELIGIBILITY_STEPS: readonly {
  id: string; label: string; title: string; description: string; fields: readonly EligibilityAnswerId[];
}[] = [
  { id: "situation", label: "Your situation", title: "Start with the story", description: "You do not need legal terminology. Tell us what you know, and leave anything uncertain for review.", fields: ["transactionStage", "yourRole", "transactionStory"] },
  { id: "people", label: "People", title: "Who is involved?", description: "The person who owes money, the property owner, and the person signing may be different. Keep their roles separate.", fields: ["obligorName", "debtorName", "debtorType", "securedPartyName", "signerName"] },
  { id: "exchange", label: "The exchange", title: "What is owed, and what was given?", description: "Separate the obligation from what the other party provided. Plans are welcome, but they stay labeled as plans.", fields: ["obligationStatus", "obligationDetails", "amount", "valueStatus", "valueDetails"] },
  { id: "property", label: "Property", title: "What property is involved?", description: "Describe the property and the provider’s connection to it. We will not infer ownership or select a filing office from these answers.", fields: ["collateralType", "collateralDetails", "rightsStatus", "rightsDetails", "debtorLocation", "propertyLocation"] },
  { id: "records", label: "Agreements", title: "What was agreed, and what records exist?", description: "Unsigned drafts, missing records, and disagreements are all useful information. Nothing entered here is automatically treated as verified.", fields: ["agreementStatus", "agreementDetails", "authorizationStatus", "authorizationDetails"] },
  { id: "review", label: "Review", title: "Your transaction, organized for review", description: "This is an intake summary and a list of open questions—not a finding that a security interest exists or that a filing is authorized.", fields: [] },
];

export interface EligibilityDraft {
  schemaVersion: 1;
  workflowId: "secured-transaction-eligibility";
  answers: Partial<Record<EligibilityAnswerId, string>>;
  sources: Partial<Record<GateId, string>>;
}

export function createEligibilityDraft(): EligibilityDraft {
  return { schemaVersion: 1, workflowId: "secured-transaction-eligibility", answers: {}, sources: {} };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** A draft file contains reports only. Imported verdicts/unknown fields are refused. */
export function parseEligibilityDraft(text: string): EligibilityDraft {
  if (text.length > 128000) throw new Error("This draft contains too much text. Choose a JSON draft downloaded from workflow 1.");
  let raw: unknown;
  try { raw = JSON.parse(text); } catch { throw new Error("This is not a readable JSON draft. Choose a file downloaded from this workflow."); }
  if (!isRecord(raw) || raw.schemaVersion !== 1 || raw.workflowId !== "secured-transaction-eligibility"
    || Object.keys(raw).some((key) => !["schemaVersion", "workflowId", "answers", "sources"].includes(key))
    || !isRecord(raw.answers) || !isRecord(raw.sources)) {
    throw new Error("This file is not a supported workflow 1 draft. Your current answers have not been changed.");
  }
  const draft = createEligibilityDraft();
  for (const [key, value] of Object.entries(raw.answers)) {
    if (!Object.hasOwn(ELIGIBILITY_FIELDS, key) || typeof value !== "string" || value.length > 2500) {
      throw new Error("The draft contains an unsupported answer or a field longer than 2,500 characters.");
    }
    const field: IntakeField = ELIGIBILITY_FIELDS[key as EligibilityAnswerId];
    if (field.options && value !== "" && !field.options.some((option) => option.value === value)) {
      throw new Error("The draft contains an unrecognized answer. Your current answers have not been changed.");
    }
    draft.answers[key as EligibilityAnswerId] = value;
  }
  for (const [key, value] of Object.entries(raw.sources)) {
    if (!SECURED_TRANSACTION_ELIGIBILITY_GATES.includes(key as GateId) || typeof value !== "string" || value.length > 2500) {
      throw new Error("The draft contains an unsupported record reference.");
    }
    draft.sources[key as GateId] = value;
  }
  return draft;
}

export const ELIGIBILITY_REVIEW_LABELS: Record<GateId, string> = {
  "identifiable-debtor": "Property provider’s identity",
  "identifiable-secured-party": "Lender or beneficiary’s identity",
  "actual-obligation": "Debt or promised performance",
  "actual-value": "What was given or committed",
  "debtor-rights-in-collateral": "Rights in the property",
  "authenticated-security-agreement-or-valid-alternative": "Agreement about the security",
  "specific-collateral": "Identifiable property",
  authorization: "Permission and signing authority",
  "correct-jurisdiction": "Locations and governing rules",
};

export function assessEligibilityDraft(draft: EligibilityDraft) {
  const a = draft.answers;
  const has = (key: EligibilityAnswerId) => Boolean(a[key]?.trim());
  const reports: Record<GateId, { present: boolean; dispute?: boolean; next: string }> = {
    "identifiable-debtor": { present: has("debtorName"), next: "Confirm the property provider’s exact name and legal form against source records in workflow 2." },
    "identifiable-secured-party": { present: has("securedPartyName"), next: "Confirm the lender or beneficiary’s exact name and role against source records in workflow 2." },
    "actual-obligation": { present: a.obligationStatus === "existing" && has("obligationDetails"), dispute: a.obligationStatus === "disputed", next: "Gather the agreement showing who owes what, to whom, and on what terms. Keep a proposed obligation labeled as proposed." },
    "actual-value": { present: ["provided", "committed"].includes(a.valueStatus ?? "") && has("valueDetails"), dispute: a.valueStatus === "disputed", next: "Gather transfer, delivery, credit, or commitment records. Later review must determine whether they support value; the amount owed is not proof of what was given." },
    "debtor-rights-in-collateral": { present: ["owns", "permission"].includes(a.rightsStatus ?? "") && has("rightsDetails"), dispute: a.rightsStatus === "disputed", next: "Gather ownership and permission records. Identify leases, other owners, or disagreements before relying on the property." },
    "authenticated-security-agreement-or-valid-alternative": { present: a.agreementStatus === "signed" && has("agreementDetails"), dispute: a.agreementStatus === "disputed", next: "Have the security agreement or other claimed basis reviewed with its signatures and property description. A named document is not proof of sufficiency." },
    "specific-collateral": { present: has("collateralDetails"), next: "Check the property description against the source records. This intake does not classify property or choose a perfection method." },
    authorization: { present: a.authorizationStatus === "yes" && has("authorizationDetails"), dispute: a.authorizationStatus === "disputed", next: "Review the owner’s permission and the signer’s authority. Permission reported here does not authorize a filing." },
    "correct-jurisdiction": { present: has("debtorLocation") && has("propertyLocation"), next: "Review residence or formation, property location, property type, and applicable rules. No governing jurisdiction or filing office has been selected." },
  };
  const intake: EligibilityIntakeInput = {};
  const items = SECURED_TRANSACTION_ELIGIBILITY_GATES.map((id) => {
    const report = reports[id];
    const source = draft.sources[id]?.trim();
    const status = report.dispute ? "disputed" as const : report.present ? "reported" as const : "missing" as const;
    intake[id] = {
      status: report.dispute ? "contradicted" : "unverified",
      // Even when a document is named, the only provenance here is the user's report.
      sources: source ? [{ kind: "user-confirmed", id: `intake-reference:${id}`, label: source }] : [],
      note: report.dispute ? "The user reports a disagreement. Evidence has not been independently reviewed." : "User-entered intake only. No supporting evidence has been independently verified.",
    };
    return { id, label: ELIGIBILITY_REVIEW_LABELS[id], status, next: report.next, source };
  });
  return { items, intake, engine: evaluateSecuredTransactionEligibility(toEngineInput(intake)) };
}

export function answerLabel(id: EligibilityAnswerId, value: string | undefined): string {
  if (!value?.trim()) return "Not provided";
  const field: IntakeField = ELIGIBILITY_FIELDS[id];
  return field.options?.find((option) => option.value === value)?.label ?? value.trim();
}

export function eligibilitySummaryText(draft: EligibilityDraft): string {
  const sections = ELIGIBILITY_STEPS.filter((step) => step.fields.length).map((step) =>
    `${step.title}\n${step.fields.map((id) => `${ELIGIBILITY_FIELDS[id].label}\n${answerLabel(id, draft.answers[id])}`).join("\n\n")}`,
  );
  const review = assessEligibilityDraft(draft).items.map((item) =>
    `${item.label}: ${item.status}\n${item.next}\nRecord reference: ${item.source || "None listed"}`,
  );
  return ["SECURED TRANSACTIONS — WORKFLOW 1 INTAKE", "User-reported information; not independently verified. Not a legal eligibility decision, filing authorization, or determination of attachment, perfection, or priority. This draft is not saved to your account.", ...sections, "OPEN QUESTIONS AND RECORDS", ...review, "NEXT: Confirm names, roles, and signing authority in workflow 2. Answers are not automatically transferred to that workflow yet."].join("\n\n");
}
