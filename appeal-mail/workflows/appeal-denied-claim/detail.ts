import type { WorkflowDetailGuide } from "@mailmypdf/workflow-ui"

/** Cross-domain denied-claim guide: the issuing program's own process controls. */
export const detail = {
  overview: "Turn a denied insurance, government, or benefits claim into a source-grounded request for reconsideration. Start with the actual denial notice: it identifies what was denied, the stated reason, the reviewer, and the procedure that applies to this particular claim.",
  appropriateFor: [
    "You have a written claim denial or adverse decision and want to challenge a stated reason or factual finding.",
    "For a specialized denial, use a dedicated workflow when available, such as health coverage, unemployment, or Social Security.",
  ],
  beforeYouBegin: [
    "Determine who issued the denial, which claim or benefit is affected, and whether the notice requires a form, portal, hearing request, internal review, or another specific procedure.",
    "Check whether a representative, guardian, or authorized claimant must sign or submit the appeal.",
  ],
  documentsAndFacts: [
    "Full denial notice including all pages, claim/case number, policy or program terms, and instructions for review.",
    "Evidence relevant to each denial reason, prior applications or submissions, correspondence, and a dated chronology of important events.",
    "The precise correction or outcome requested, with support for each factual assertion.",
  ],
  timing: [
    "Read the specific notice for the filing deadline, where and how to file, and when receipt rather than postmark controls. There is no single appeal deadline across all claim types.",
    "An internal appeal, agency review, complaint, and court challenge may be separate paths with different deadlines. A mailed letter alone may not preserve them.",
  ],
  steps: [
    { title: "Classify the denial", description: "Identify the issuing organization, claim type, decision date, denial reasons, and controlling review instructions." },
    { title: "Verify the record", description: "Compare each stated reason with the documents, policy or program requirements, and facts you can substantiate." },
    { title: "Draft the response", description: "Address the denial point by point, request a specific review or remedy, and attach only relevant evidence." },
    { title: "Approve and submit", description: "Check every name, date, deadline, signature, addressee, and exhibit before using the required submission channel." },
  ],
  reviewChecklist: [
    "Decision date, reference number, denial grounds, cited terms, and appeal destination match the original notice.",
    "The requested outcome follows from stated facts; uncertain or missing evidence stays identified as uncertain.",
    "The final packet has every referenced attachment, required form or signature, and a retained copy.",
  ],
  deliveryAndProof: [
    "Follow the notice's specified filing instructions. Confirm whether mail is accepted before paying to mail a packet.",
    "Keep the submitted copy, acknowledgment or receipt, and any tracking or delivery evidence; sending is not the same as the reviewer accepting it as timely or complete.",
  ],
  afterSubmission: [
    "Log the date of the actual acknowledgment, requests for more evidence, decision on review, and any further appeal instructions.",
    "If the issuer is an insurer and the issue remains unresolved, your state insurance department may accept a complaint, but that is not a substitute for the required appeal.",
  ],
  costsAndLimits: [
    "Confirm any required filing or records costs with the issuing program. Optional mailing services can have separate charges.",
  ],
  helpAndAlternatives: [
    "A specialized appeal, corrected claim, hearing request, or complaint may be the proper next step. Consult the actual denial notice or a qualified advisor.",
  ],
  cautions: [
    "Health, government benefit, and private insurance review rights are not interchangeable. Do not use a deadline or form from a different program.",
    "Urgent claims or imminent filing deadlines call for direct contact with the issuer or a qualified advisor.",
  ],
  sources: [
    { label: "NAIC: Find your state insurance department", url: "https://content.naic.org/state-insurance-departments" },
    { label: "HealthCare.gov: Appeal an insurance company decision (when applicable)", url: "https://www.healthcare.gov/appeal-insurance-company-decision/appeals/" },
  ],
  reviewedOn: "September 22, 2026",
  scopeNote: "A cross-domain organizational guide, not a statement of your legal rights. The actual denial notice and applicable plan, agency, or state rules take precedence.",
} satisfies WorkflowDetailGuide
