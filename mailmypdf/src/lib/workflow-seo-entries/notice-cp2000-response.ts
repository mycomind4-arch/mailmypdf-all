import type { AuthoredWorkflowSeoEntry } from ".";

const REVIEWED = "2026-09-15";

/**
 * Authority content for the CP2000 proposed-underreporter response workflow.
 *
 * Ported 2026-09-22 from the /Users/macdizzle/dev/mailmypdf-all copy
 * (commit 89c0c14f), where it was authored against IRS.gov sources verified
 * live on 2026-09-15 and never existed in this copy. Related-workflow links
 * were narrowed to ids this copy's WORKFLOW_INVENTORY actually contains.
 *
 * Scope follows notice-respond/shared/NoticeResponseWorkflow.tsx running the
 * cp2000-response profile: it reads the uploaded notice, itemizes proposed
 * discrepancies, and prepares a reviewed response packet. It does not decide
 * who is correct, calculate tax, or file anything with the IRS.
 */
const entry: AuthoredWorkflowSeoEntry = {
  id: "notice/cp2000-response",
  content: {
    primaryKeyword: "CP2000 notice response",
    primaryIntent: "Someone who received an IRS CP2000 notice wants to understand which specific income items the IRS says do not match, and how to agree, dispute, or partially dispute each one before the response date.",
    secondaryKeywords: ["respond to CP2000 notice", "CP2000 proposed adjustment", "CP2000 disagree response", "IRS underreporter notice", "CP2000 response deadline"],
    seoTitle: "CP2000 Notice Response Guide: Items, Deadline & Options",
    h1: "Respond to an IRS CP2000 Proposed Adjustment Notice",
    metaDescription: "Review each item your CP2000 notice proposes, decide to agree, disagree, or partially agree, attach supporting records, and approve the response packet before mailing.",
    overview: "A CP2000 notice tells you that income or payment information the IRS received from employers, banks, or brokers does not match what you reported on your tax return, and it proposes a specific adjustment to your tax, penalties, and interest as a result. It is not a bill; it is a proposed change you can agree with, partially agree with, or dispute using your own records, within the window stated on the notice. This workflow reads the uploaded CP2000, itemizes each proposed change, and prepares a signed response addressing every item instead of a single generic statement of agreement or disagreement.",
    documentIdentification: [
      "The notice heading reads 'CP2000' and may include a series variant letter such as CP2000A on the first page.",
      "A 'Proposed Amount Due' or 'Summary of Proposed Changes' section lists each mismatched item side by side with what you reported and what the IRS received.",
      "A response form is generally enclosed for you to check agree, partially agree, or disagree with each item.",
      "The notice states a specific response date, typically 30 days from the notice date, distinct from the notice date itself.",
    ],
    issuerContext: "The IRS Automated Underreporter program generates a CP2000 by comparing third-party information returns, such as W-2s, 1099s, and K-1s, against the return you filed, and flags every line item where the two sources disagree.",
    whenToUse: [
      "You received a CP2000 proposing changes based on income or payment information you did or did not report.",
      "You want to respond to specific line items rather than accept every proposed change automatically.",
      "You have documentation, such as a corrected W-2 or 1099, that supports a different result than the notice proposes.",
    ],
    whenNotToUse: [
      "Your notice is a CP14 balance-due notice rather than a CP2000 proposed-adjustment notice; use the CP14 response workflow instead.",
      "You need to file a full amended return for reasons unrelated to the specific items the CP2000 raises.",
      "You are already working with a tax professional who is preparing your response directly with the IRS.",
    ],
    inspectOnDocument: [
      "Each individual proposed line item and the specific income or payment source it is based on.",
      "Whether the notice is a CP2000, CP2000A, or another letter in the same series, since instructions can differ slightly.",
      "The exact response date printed on the notice, separate from the notice date at the top.",
      "Whether a signed response form is enclosed, and what boxes it asks you to check for each item.",
      "The total proposed additional tax, penalty, and interest, broken out separately.",
    ],
    timingGuidance: [
      "The response date printed on the CP2000 generally allows about 30 days, and this workflow preserves that printed date instead of assuming a fixed number.",
      "Responding by the printed date with a complete, itemized answer generally avoids a follow-up Statutory Notice of Deficiency, while silence does not make the proposed changes go away.",
    ],
    informationChecklist: [
      "Taxpayer name, address, and the tax year the CP2000 references.",
      "Every individual line item the notice proposes to change.",
      "Whether you agree, partially agree, or disagree with each specific item.",
      "Any income or payment document that differs from what the IRS lists.",
      "Whether an amended return already addresses any part of the proposed change.",
      "Prior IRS correspondence about the same tax year, if any.",
    ],
    evidenceChecklist: [
      "Corrected or original W-2s, 1099s, or K-1s for any item you dispute.",
      "Broker or bank statements that support a different amount than the notice proposes.",
      "Your originally filed tax return for the year in question.",
      "An IRS account transcript showing what was actually assessed, if available.",
      "Any prior correspondence with the payer who issued the disputed information return.",
    ],
    processSteps: [
      { title: "Complete intake and notice details", guidance: "Enter the tax year, notice number, response deadline, and the figures your notice shows so the discrepancy engine has real facts to analyze." },
      { title: "Upload documents", guidance: "Provide the CP2000 notice and any supporting income documents so the workflow can quarantine and scan them before they factor into your response." },
      { title: "Review the discrepancy analysis", guidance: "Confirm or dispute each specific item the engine identifies, such as an amount mismatch, choosing your position on every item individually." },
      { title: "Choose your response position", guidance: "Select agree, disagree, or partially agree, and add any additional facts the strategy engine should reflect in the letter." },
      { title: "Review the generated draft", guidance: "Read the itemized draft addressing every discrepancy and edit it in your own words before it moves to validation." },
      { title: "Clear the validation findings", guidance: "Resolve every blocking finding the two-pass validator raises before the packet can be approved for mailing." },
    ],
    issuesChecked: [
      "Whether every proposed line item has an explicit agree, disagree, or partial response.",
      "Whether the response date printed on the notice has already passed.",
      "Whether required evidence for a disputed item is still missing.",
      "Whether the draft actually addresses the specific dollar figures the notice cites.",
    ],
    commonMistakes: [
      "Responding to only the largest proposed item and ignoring smaller ones on the same notice.",
      "Assuming the proposed amount is a final bill rather than a proposal you can dispute.",
      "Sending a general disagreement letter without addressing each line item individually.",
      "Missing the response date while waiting for a corrected form from an employer or bank.",
      "Filing a full amended return when a direct response to the specific items would resolve it faster.",
      "Not keeping a copy of exactly which items were agreed to and which were disputed.",
    ],
    scenarios: [
      { title: "You agree with everything", situation: "Every proposed item in the CP2000 matches income you simply forgot to report on your original return.", responsePath: "This workflow helps you prepare a response agreeing to the proposed changes and explains what happens next regarding any amended return." },
      { title: "One item is wrong", situation: "Most proposed items are correct, but one entry lists income that was already reported under a different category.", responsePath: "This workflow helps you prepare a partial-agreement response that accepts the correct items while disputing the specific incorrect one with documentation." },
      { title: "The whole notice looks wrong", situation: "None of the proposed items match your records, and you believe the information return itself may be incorrect.", responsePath: "This workflow helps you prepare a full disagreement response referencing your own return and any statement from the payer who issued the disputed document." },
    ],
    responsePaths: [
      "Agree with all proposed changes and sign the enclosed response form.",
      "Disagree with all proposed changes and provide documentation supporting your original return.",
      "Partially agree, accepting some items while disputing others individually.",
      "Request additional time to respond if you need it to gather documentation.",
    ],
    packetContents: [
      "A cover letter addressing each proposed line item individually.",
      "The signed response form, if the notice included one.",
      "Copies of the specific documents supporting any disputed item.",
      "A certified-mail cover sheet for tracking and proof of mailing.",
    ],
    submissionGuidance: [
      "Mail your response to the address printed on your specific CP2000 notice, which can differ from the general IRS correspondence address.",
      "Respond by the date printed on the notice even if you are still gathering documentation, and follow up separately once it is available.",
    ],
    practicalChecklist: [
      "List every proposed item before deciding your response.",
      "Decide agree, disagree, or partial for each item separately.",
      "Gather the specific document that supports any disputed item.",
      "Read the itemized draft fully before approving it.",
      "Confirm the recipient address matches the notice before mailing.",
    ],
    templatesAndTools: [
      "IRS Online Account for reviewing notices and prior-year information returns.",
      "IRS transcript request tools for confirming what was actually reported to the IRS by third parties.",
    ],
    faqs: [
      { question: "What is a CP2000 notice?", answer: "A CP2000 is a proposed adjustment notice showing where income or payment information reported by employers, banks, or brokers does not match your tax return, and it is not itself a bill." },
      { question: "Do I have to pay the amount shown on a CP2000?", answer: "No, the amount shown is a proposal, and you can agree, partially agree, or disagree with specific items using your own documentation before anything is assessed." },
      { question: "What if I disagree with some but not all of the proposed changes?", answer: "You can respond item by item, agreeing with some and disputing others, and this workflow prepares a response that addresses each item separately rather than as a single answer." },
      { question: "Can I request more time to respond to a CP2000?", answer: "Yes, taxpayers can generally request additional time to gather documentation, though the request should be made before the printed response date rather than after it passes." },
      { question: "What happens if I do not respond to a CP2000?", answer: "If you do not respond, the IRS may proceed with the proposed changes and issue a Statutory Notice of Deficiency, which starts a separate, more formal deadline." },
    ],
    glossary: [
      { term: "Automated Underreporter", definition: "The IRS program that compares third-party information returns against filed tax returns and generates CP2000 notices when they disagree." },
      { term: "Statutory Notice of Deficiency", definition: "A formal notice the IRS can issue if a CP2000 is not resolved, starting a strict deadline to petition Tax Court before assessment." },
    ],
    sources: [
      { title: "Understanding Your CP2000 Series Notice", publisher: "Internal Revenue Service", url: "https://www.irs.gov/individuals/understanding-your-cp2000-notice", reviewedAt: REVIEWED, kind: "official" },
      { title: "Responding to a Notice", publisher: "Internal Revenue Service", url: "https://www.irs.gov/individuals/responding-to-a-notice", reviewedAt: REVIEWED, kind: "official" },
    ],
    relatedWorkflowIds: ["notice/irs-notice", "notice/evidence-package", "notice/deadline-compliance", "notice/file-appeal"],
    reviewedAt: REVIEWED,
    disclaimer: "This workflow prepares a document for your review and does not provide tax or legal advice; for complex underreporting, amended-return, or deficiency questions, consider consulting a tax professional.",
  },
};

export default entry;
