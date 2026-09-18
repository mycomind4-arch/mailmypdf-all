import { defineWorkflowDomainSpec } from "@mailmypdf/workflows";

export const cp504DomainSpec = defineWorkflowDomainSpec({
  workflowId: "cp504-response",
  version: 1,
  authorityMaxAgeDays: 90,
  extractionSchemaIds: ["irs.cp504.v1"],
  authoritySources: [
    {
      id: "irs.cp504",
      title: "Understanding your CP504 notice",
      publisher: "Internal Revenue Service",
      url: "https://www.irs.gov/individuals/understanding-your-cp504-notice",
      sourceType: "official_agency",
      reviewedAt: "2026-09-17",
      jurisdiction: "United States",
    },
    {
      id: "irs.cdp-faq",
      title: "Collection due process (CDP) FAQs",
      publisher: "Internal Revenue Service",
      url: "https://www.irs.gov/appeals/collection-due-process-cdp-faqs",
      sourceType: "official_agency",
      reviewedAt: "2026-09-17",
      jurisdiction: "United States",
    },
  ],
  rules: [
    {
      id: "classify-cp504-exactly",
      label: "Confirm the controlling notice is CP504",
      kind: "requirement",
      description:
        "Use the actual CP504 notice as the source record and do not force another collection notice into this workflow.",
      severity: "blocking",
      authoritySourceIds: ["irs.cp504"],
    },
    {
      id: "preserve-printed-dates",
      label: "Use only dates printed on the controlling notice",
      kind: "deadline",
      description:
        "Extract and confirm an action or payment date only when the controlling notice actually prints it; never create a deadline by adding a generic number of days.",
      severity: "blocking",
      authoritySourceIds: ["irs.cp504", "irs.cdp-faq"],
    },
    {
      id: "separate-cap-from-cdp",
      label: "Keep CAP and CDP procedures distinct",
      kind: "requirement",
      description:
        "CP504 may describe Collection Appeals Program rights, while a later formal notice generally provides the Collection Due Process hearing opportunity for broader levy action. Do not turn CP504 correspondence into a CDP request.",
      severity: "blocking",
      authoritySourceIds: ["irs.cp504", "irs.cdp-faq"],
    },
    {
      id: "follow-notice-appeal-instructions",
      label: "Follow notice-specific appeal instructions",
      kind: "submission",
      description:
        "If the user chooses a formal appeal route, the workflow must preserve the form, address, phone, and timing instructions supplied by the controlling notice rather than substituting a generic response letter.",
      severity: "blocking",
      authoritySourceIds: ["irs.cp504"],
    },
    {
      id: "no-collection-stop-claim",
      label: "Do not claim ordinary correspondence stops collection",
      kind: "drafting",
      description:
        "A generic response letter must not claim that it files CAP, requests CDP, suspends collection, prevents levy, or guarantees an IRS outcome.",
      severity: "blocking",
      authoritySourceIds: ["irs.cp504", "irs.cdp-faq"],
    },
  ],
  evidenceRequirements: [
    {
      id: "controlling-notice",
      label: "Controlling CP504 notice",
      description:
        "The complete CP504 notice, including pages containing the balance, notice date, contact information, collection language, and any appeal or mailing instructions.",
      required: true,
      acceptedDocumentKinds: ["notice"],
      supportsRuleIds: [
        "classify-cp504-exactly",
        "preserve-printed-dates",
        "separate-cap-from-cdp",
        "follow-notice-appeal-instructions",
      ],
    },
    {
      id: "supporting-account-records",
      label: "Records supporting the user's account position",
      description:
        "Payment records, account transcripts, returns, prior IRS correspondence, bank records, or other documents actually relied on by the user.",
      required: false,
      acceptedDocumentKinds: ["evidence", "form", "receipt", "correspondence"],
      supportsRuleIds: ["no-collection-stop-claim"],
    },
  ],
  aiTasks: [
    {
      id: "classify-cp504",
      kind: "classify",
      promptVersion: "cp504.classify.v1",
      purpose: "Confirm that the controlling document is an IRS CP504 notice.",
      instruction:
        "Classify from the document itself. If it is not CP504, report the mismatch instead of forcing the workflow.",
      sourcePolicy: "document_only",
      requiresHumanConfirmation: true,
    },
    {
      id: "extract-cp504",
      kind: "extract",
      promptVersion: "cp504.extract.v1",
      purpose:
        "Extract the notice date, tax period, amount due, printed action date, identifiers, contact information, collection warnings, and appeal instructions.",
      instruction:
        "Extract only values actually supported by the notice and preserve page/excerpt provenance. Never calculate a deadline or infer CDP rights from CP504 alone.",
      sourcePolicy: "document_only",
      outputSchemaId: "irs.cp504.v1",
      requiresHumanConfirmation: true,
    },
    {
      id: "analyze-cp504",
      kind: "analyze",
      promptVersion: "cp504.analyze.v1",
      purpose:
        "Map the CP504 facts to the user's selected response path and supporting records without conflating ordinary correspondence, CAP, and CDP.",
      instruction:
        "Separate notice facts, user-confirmed facts, unresolved questions, supporting records, and any formal appeal instructions. Do not invent a filing method or deadline.",
      sourcePolicy: "matter_record",
      requiresHumanConfirmation: true,
    },
    {
      id: "research-cp504",
      kind: "research",
      promptVersion: "cp504.research.v1",
      purpose:
        "Ground workflow guidance in current IRS CP504 and CDP material.",
      instruction:
        "Use the approved IRS authority sources for general workflow guidance and the user's actual notice for case-specific dates, forms, contact information, and destinations.",
      sourcePolicy: "authority_grounded",
    },
    {
      id: "draft-cp504-response",
      kind: "draft",
      promptVersion: "cp504.draft.v1",
      purpose:
        "Prepare factual CP504 correspondence for the selected non-formal response path.",
      instruction:
        "Draft only from verified notice facts, confirmed user facts, and included records. Never state that the letter itself files CAP or CDP, stops collection, prevents levy, or guarantees an outcome.",
      sourcePolicy: "matter_record",
      requiresHumanConfirmation: true,
    },
    {
      id: "validate-cp504-response",
      kind: "validate",
      promptVersion: "cp504.validate.v1",
      purpose:
        "Block unsupported claims, invented deadlines, CAP/CDP conflation, stale evidence review, and unverified mailing destinations.",
      instruction:
        "Fail closed when material claims lack support, a date was calculated instead of extracted, a formal appeal is represented by generic correspondence, or the mailing destination is unverified.",
      sourcePolicy: "matter_record",
    },
  ],
  drafting: {
    purpose:
      "Prepare reviewable factual CP504 correspondence from the verified matter record without substituting for notice-controlled formal appeal procedures.",
    templateId: "official-response-letter.v1",
    tone: "professional, factual, concise",
    requiresSourceBackedClaims: true,
    prohibitedClaims: [
      "Do not calculate or invent a CP504 response, CAP, or CDP deadline.",
      "Do not state that CP504 itself automatically provides a CDP hearing deadline.",
      "Do not represent ordinary correspondence as Form 9423, Form 12153, CAP, or a CDP request.",
      "Do not claim that sending the letter suspends collection or prevents levy.",
      "Do not invent payments, tax figures, hardship facts, addresses, authorities, or outcomes.",
    ],
    requiredSections: [
      "notice-reference",
      "response-position",
      "factual-explanation",
      "supporting-records",
      "requested-action",
    ],
  },
});

export default cp504DomainSpec;
