import type { WorkflowDetailGuide } from "@mailmypdf/workflow-ui"

/** Dental coverage differs between stand-alone plans and medical-plan benefits. */
export const detail = {
  overview: "Prepare a review request for a dental insurer's denial of a procedure, claim, or pre-treatment estimate. Match the insurer's exact denial reason to the plan's dental benefit terms and the treating dentist's records; a pre-treatment estimate is not necessarily a guarantee of payment.",
  appropriateFor: [
    "A dental plan denied or reduced payment for a submitted claim, or refused coverage for a proposed dental service.",
    "You can obtain the explanation of benefits or denial letter and identify the service, code, date, and reason in dispute.",
  ],
  beforeYouBegin: [
    "Check whether the coverage is a stand-alone dental plan, a benefit under a medical plan, a government program, or an employer plan. Review rights and regulators can differ.",
    "Ask the dental office for the submitted claim, treatment notes, diagnostic images or other materials actually relevant to the denial.",
  ],
  documentsAndFacts: [
    "Denial letter or explanation of benefits, plan certificate or benefit summary, claim number, service date, procedure codes, and stated denial reason.",
    "Dentist's treatment plan, clinical notes, X-rays when relevant, itemized bill, prior authorization or pre-treatment estimate, and previous correspondence.",
    "Evidence of medical/dental necessity, alternative treatment, or corrected coding only if supported by the treating provider and plan terms.",
  ],
  timing: [
    "Use the appeal instructions and date on your dental plan's denial notice; verify whether the deadline runs from receipt, date of decision, or another event.",
    "Do not assume health-plan appeal deadlines automatically apply to a stand-alone dental policy. Ask the plan about urgent review if delaying treatment could be harmful.",
  ],
  steps: [
    { title: "Identify the reason", description: "Determine whether the plan cites coverage, frequency or waiting-period limits, coding, network status, missing information, or clinical necessity." },
    { title: "Gather supporting records", description: "Match the explanation of benefits and plan language to provider records and any corrected claim or clinical explanation." },
    { title: "Prepare the appeal", description: "Request a specific reconsideration of the identified service and reason. Distinguish insurer statements from facts verified by your dental provider." },
    { title: "Review the packet", description: "Verify patient and claim identifiers, procedure codes, signature authority, attachments, destination, and approved method before sending." },
  ],
  reviewChecklist: [
    "The appealed service, billing code, dates, provider, member ID, and denial reason match the source record.",
    "Clinical statements are supported by the treating dentist; no diagnosis, benefit promise, or plan term is invented.",
    "Required form, provider letter, records, and representative authorization are included when the plan requires them.",
  ],
  deliveryAndProof: [
    "Submit through the plan's accepted appeal channel, which may be a portal or specified address. Ask whether a provider's corrected claim is needed instead of a member appeal.",
    "Retain the exact submitted packet, the plan's receipt or acknowledgment, and any mailing or portal confirmation.",
  ],
  afterSubmission: [
    "Track requests for additional records and the written appeal determination. If unresolved, consult the plan's next-level review instructions or your state insurance department.",
  ],
  costsAndLimits: [
    "Check the plan for coverage limits, waiting periods, frequency limits, patient share, and whether a provider or mailing service charges separately.",
  ],
  helpAndAlternatives: [
    "Ask the dental office whether a corrected claim, provider documentation, or a member appeal is appropriate; consult the plan or state insurance department for escalation.",
  ],
  cautions: [
    "Federal health-plan internal and external appeal rights may not apply to every stand-alone dental or excepted-benefit plan. Verify your particular plan's process.",
    "An explanation of benefits is not always a final denial; confirm the claim's status before drafting an appeal.",
  ],
  sources: [
    { label: "NAIC: Understanding your dental insurance", url: "https://content.naic.org/article/consumer-insight-understanding-your-dental-insurance-cavities-cosmetic" },
    { label: "HealthCare.gov: Appealing a health insurer's decision (when applicable)", url: "https://www.healthcare.gov/appeal-insurance-company-decision/appeals/" },
    { label: "NAIC: Find your state insurance department", url: "https://content.naic.org/state-insurance-departments" },
  ],
  reviewedOn: "September 22, 2026",
  scopeNote: "General preparation information, not clinical or legal advice. The applicable plan documents and denial notice determine the review process and coverage.",
} satisfies WorkflowDetailGuide
