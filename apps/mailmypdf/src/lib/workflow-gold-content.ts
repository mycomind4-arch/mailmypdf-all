export type WorkflowGoldContent = {
  overview: string;
  whenToUse: string[];
  whenNotToUse: string[];
  officialSources: readonly { title: string; publisher: string; url: string; reviewedAt: string }[];
  checklist: string[];
  faq: string[];
  authorityNote: string;
};

const REVIEWED = "2026-08-22";

export const WORKFLOW_GOLD_CONTENT: Record<string, WorkflowGoldContent> = {
  "appeal/denied-claim": {
    overview: "An organized starting point for challenging an adverse insurance claim decision. The workflow reads the actual denial, separates documented facts from unknowns, identifies the stated reason and instructions, maps supporting evidence to the disputed points, and prepares a review-ready response without inventing policy terms, deadlines, or facts.",
    whenToUse: [
      "You have a written denial or adverse claim decision and want to understand the stated reason before responding.",
      "The denial identifies missing information, a coverage position, a factual finding, or an appeal/review process.",
      "You want a durable record of the documents, evidence, response, approval, mailing, tracking, and proof.",
    ],
    whenNotToUse: [
      "The source decision or recipient instructions are unavailable and cannot yet be verified.",
      "You need court representation, legal advice, or a guaranteed outcome.",
      "The workflow would require us to invent policy language, medical facts, coverage, damages, or deadlines.",
    ],
    officialSources: [
      { title: "Health Insurance Claim Denied? How to Appeal the Denial", publisher: "National Association of Insurance Commissioners", url: "https://content.naic.org/article/consumer_insight_health_insurance_claim_denied_how_appeal_denial.htm", reviewedAt: REVIEWED },
      { title: "How to File a Complaint", publisher: "National Association of Insurance Commissioners", url: "https://content.naic.org/consumer/how-to-file-complaint", reviewedAt: REVIEWED },
      { title: "How to File an Appeal", publisher: "California Department of Insurance", url: "https://www.insurance.ca.gov/01-consumers/150-other-prog/001-ahb/appeal-process.cfm", reviewedAt: REVIEWED },
    ],
    checklist: [
      "Denial or adverse decision notice",
      "Claim or reference number",
      "Policy, plan, or agreement documents",
      "Relevant correspondence and claim records",
      "Evidence directly supporting disputed facts",
      "The exact appeal or response instructions from the issuer",
      "Verified recipient and mailing requirements",
    ],
    faq: [
      "What should I do first after a claim is denied?",
      "What evidence can support an appeal of a denied claim?",
      "How do I find the actual deadline and appeal method?",
      "When should an insurance regulator become part of the escalation path?",
    ],
    authorityNote: "For health-insurance claims, NAIC consumer guidance describes internal appeal and, where applicable, external review. The controlling deadline depends on the applicable plan and rules, so MailMyPDF should use the actual denial notice and verified jurisdiction-specific authority rather than present one universal deadline. NAIC also recommends gathering the denial, policy/coverage materials, supporting evidence, and records of insurer communications.",
  },

  "appeal/medical-insurance-denial": {
    overview: "A structured workflow for appealing a health insurance denial of medical services. Reads the explanation of benefits or denial letter, identifies the medical and contractual basis for denial, maps supporting clinical evidence and plan documents to the disputed points, and prepares a review-ready appeal package.",
    whenToUse: [
      "You received a denial of medical services, procedures, or treatments from a health insurer or Medicare Advantage plan.",
      "The denial references medical necessity, coverage limits, or plan exclusions.",
      "You want to prepare an internal appeal or external review request with supporting documentation.",
    ],
    whenNotToUse: [
      "You do not yet have the written denial or explanation of benefits.",
      "The denial involves a worker's compensation or auto insurance claim (different process).",
      "You need legal advice on malpractice or liability claims.",
    ],
    officialSources: [
      { title: "Filing an Appeal", publisher: "Medicare.gov", url: "https://www.medicare.gov/providers-services/claims-appeals-complaints/appeals", reviewedAt: REVIEWED },
      { title: "Medicare Managed Care Appeals & Grievances", publisher: "Centers for Medicare & Medicaid Services", url: "https://www.cms.gov/medicare/appeals-grievances/managed-care", reviewedAt: REVIEWED },
      { title: "External Appeals", publisher: "Centers for Medicare & Medicaid Services", url: "https://www.cms.gov/marketplace/about/affordable-care-act/external-appeals", reviewedAt: REVIEWED },
      { title: "Health Insurance Claim Denied? How to Appeal the Denial", publisher: "National Association of Insurance Commissioners", url: "https://content.naic.org/article/consumer_insight_health_insurance_claim_denied_how_appeal_denial.htm", reviewedAt: REVIEWED },
    ],
    checklist: [
      "Denial letter or Explanation of Benefits (EOB)",
      "Plan document or coverage policy",
      "Letter from treating physician supporting medical necessity",
      "Relevant medical records and test results",
      "Claim and reference numbers",
      "Internal appeal instructions and deadline from the denial notice",
      "Prior authorization correspondence if applicable",
    ],
    faq: [
      "How many levels of appeal does Medicare provide?",
      "What is the difference between internal appeal and external review?",
      "How long do I have to file a medical insurance appeal?",
      "What clinical evidence strengthens a medical necessity appeal?",
    ],
    authorityNote: "Medicare provides five levels of appeal (redetermination, reconsideration, ALJ hearing, Appeals Council, federal district court). For ACA-regulated private plans, consumers have the right to an independent external review after the internal appeal process. The specific deadline depends on the plan type and level of appeal — always use the deadline stated in the denial notice.",
  },

  "appeal/medical-necessity-appeal": {
    overview: "A focused workflow for appealing a denial based on a medical necessity determination. Identifies the clinical rationale cited in the denial, organizes physician statements, treatment guidelines, and peer-reviewed evidence, and prepares a response that addresses the specific medical necessity standard invoked.",
    whenToUse: [
      "Your insurer denied a service, treatment, or procedure citing lack of medical necessity.",
      "You have clinical documentation or physician letters that support the need for the denied service.",
      "You want to request an expedited appeal for urgent care.",
    ],
    whenNotToUse: [
      "The denial is based on coverage exclusion or plan limits (not medical necessity).",
      "You lack any clinical documentation supporting the service.",
      "The denial is for a non-medical service.",
    ],
    officialSources: [
      { title: "Filing an Appeal", publisher: "Medicare.gov", url: "https://www.medicare.gov/providers-services/claims-appeals-complaints/appeals", reviewedAt: REVIEWED },
      { title: "Original Medicare (Fee-for-service) Appeals", publisher: "Centers for Medicare & Medicaid Services", url: "https://www.cms.gov/medicare/appeals-grievances/fee-for-service", reviewedAt: REVIEWED },
      { title: "External Appeals", publisher: "Centers for Medicare & Medicaid Services", url: "https://www.cms.gov/marketplace/about/affordable-care-act/external-appeals", reviewedAt: REVIEWED },
    ],
    checklist: [
      "Denial letter stating medical necessity as the reason",
      "Letter from treating physician explaining clinical justification",
      "Relevant clinical guidelines or treatment protocols",
      "Medical records, test results, and imaging supporting the service",
      "Plan's medical necessity criteria if available",
      "Prior authorization request and response",
      "Appeal deadline and submission instructions from the denial notice",
    ],
    faq: [
      "What makes a medical necessity appeal successful?",
      "Can I request an expedited medical necessity appeal?",
      "What role does the treating physician's statement play?",
      "What happens during external review of a medical necessity denial?",
    ],
    authorityNote: "Medical necessity determinations are reviewed against plan-specific clinical criteria, which must be disclosed on request. Medicare appeals follow a five-level process; ACA plans allow external review by an independent medical reviewer. The treating physician's statement is critical but not determinative — the reviewer applies the plan's clinical criteria.",
  },

  "appeal/prior-authorization-denial": {
    overview: "A workflow for appealing a prior authorization denial. Reads the denial to identify whether it was based on medical necessity, missing information, or plan formulary limits, organizes the prescribing physician's justification and clinical evidence, and prepares a response targeting the specific reason cited.",
    whenToUse: [
      "A prior authorization request was denied by your health plan.",
      "Your physician recommends a service, medication, or device that requires prior approval.",
      "You want to appeal the denial with supporting clinical documentation.",
    ],
    whenNotToUse: [
      "The service does not require prior authorization.",
      "You have not yet submitted a prior authorization request.",
      "The denial is from a non-health insurance plan.",
    ],
    officialSources: [
      { title: "Prior Authorization and Pre-Claim Review Initiatives", publisher: "Centers for Medicare & Medicaid Services", url: "https://www.cms.gov/data-research/monitoring-programs/medicare-fee-service-compliance-programs/prior-authorization-and-pre-claim-review-initiatives", reviewedAt: REVIEWED },
      { title: "Filing an Appeal", publisher: "Medicare.gov", url: "https://www.medicare.gov/providers-services/claims-appeals-complaints/appeals", reviewedAt: REVIEWED },
      { title: "Medicare Managed Care Appeals & Grievances", publisher: "Centers for Medicare & Medicaid Services", url: "https://www.cms.gov/medicare/appeals-grievances/managed-care", reviewedAt: REVIEWED },
    ],
    checklist: [
      "Prior authorization denial letter with the stated reason",
      "Original prior authorization request and supporting documentation",
      "Letter from prescribing or treating physician justifying the service",
      "Clinical evidence: test results, imaging, treatment history",
      "Plan formulary or coverage policy for the requested service",
      "Appeal deadline from the denial notice",
      "Whether standard or expedited appeal is appropriate",
    ],
    faq: [
      "What is the difference between standard and expedited prior auth appeals?",
      "Can my doctor's letter override a prior authorization denial?",
      "What clinical evidence supports a prior authorization appeal?",
      "How long does a prior authorization appeal take?",
    ],
    authorityNote: "Under CMS rules, payers must respond to standard prior authorization appeals within 7 calendar days and expedited appeals within 72 hours (CMS-0057-F, effective 2026). Medicare Advantage plans must follow specific appeal timelines. The denial notice must include the specific reason and instructions for appeal.",
  },

  "appeal/out-of-network-denial": {
    overview: "A workflow for appealing a denial related to out-of-network services. Determines whether No Surprises Act protections apply, identifies the basis for the denial, and prepares a response that invokes the appropriate consumer protections.",
    whenToUse: [
      "You received a denial or bill for out-of-network services.",
      "You believe the No Surprises Act or state balance billing protections may apply.",
      "Your plan denied coverage because the provider was out-of-network.",
    ],
    whenNotToUse: [
      "You knowingly chose an out-of-network provider for a non-emergency service and signed a consent form waiving protections.",
      "The service is specifically excluded from your plan.",
      "The issue is a provider dispute about reimbursement rates (not a consumer appeal).",
    ],
    officialSources: [
      { title: "No Surprise Billing", publisher: "Centers for Medicare & Medicaid Services", url: "https://www.cms.gov/nosurprises", reviewedAt: REVIEWED },
      { title: "Understand your rights against surprise medical bills", publisher: "Centers for Medicare & Medicaid Services", url: "https://www.cms.gov/newsroom/fact-sheets/no-surprises-understand-your-rights-against-surprise-medical-bills", reviewedAt: REVIEWED },
      { title: "Action Plan: Didn't know that care was out-of-network", publisher: "Centers for Medicare & Medicaid Services", url: "https://www.cms.gov/medical-bill-rights/help/plan/insurance-care-out-of-network", reviewedAt: REVIEWED },
      { title: "External Appeals", publisher: "Centers for Medicare & Medicaid Services", url: "https://www.cms.gov/marketplace/about/affordable-care-act/external-appeals", reviewedAt: REVIEWED },
    ],
    checklist: [
      "Denial letter or out-of-network bill",
      "Explanation of whether the service was emergency or non-emergency",
      "Any consent form signed for out-of-network care",
      "Evidence that the service qualified under No Surprises Act protections",
      "Plan document regarding out-of-network coverage",
      "EOB showing the denial or balance billing amount",
      "Appeal deadline from the denial notice",
    ],
    faq: [
      "What services are protected under the No Surprises Act?",
      "Can I be balance billed for emergency care?",
      "What if I didn't know the provider was out-of-network?",
      "How do I file a complaint about a surprise medical bill?",
    ],
    authorityNote: "The No Surprises Act (effective January 1, 2022) bans balance billing for emergency services, post-stabilization care, and certain services provided by out-of-network providers at in-network facilities. Consumers can only be balance billed if they give prior written consent. CMS provides an appeal process and consumer complaint pathway through the federal portal.",
  },

  "appeal/dental-insurance-appeal": {
    overview: "A workflow for appealing a dental insurance claim denial. Reads the denial to determine whether it was based on plan exclusions, frequency limitations, medical necessity, or documentation gaps, and prepares an appeal with clinical notes, x-rays, and the dentist's narrative justification.",
    whenToUse: [
      "A dental insurance claim was denied and you want to appeal.",
      "The denial cites plan limitations, missing documentation, or lack of necessity.",
      "Your dentist supports the appeal with clinical evidence.",
    ],
    whenNotToUse: [
      "The service is clearly excluded from the dental plan (e.g., cosmetic procedures).",
      "You don't have access to the dentist's clinical records.",
      "The denial is from a medical (not dental) insurer.",
    ],
    officialSources: [
      { title: "Dental Insurance Frequently Asked Questions", publisher: "American Dental Association", url: "https://www.ada.org/resources/practice/dental-insurance/dental-insurance-resources/dental-insurance-frequently-asked-questions", reviewedAt: REVIEWED },
      { title: "Dental Insurance Resources", publisher: "American Dental Association", url: "https://www.ada.org/resources/practice/dental-insurance", reviewedAt: REVIEWED },
      { title: "How to File a Complaint", publisher: "National Association of Insurance Commissioners", url: "https://content.naic.org/consumer/how-to-file-complaint", reviewedAt: REVIEWED },
    ],
    checklist: [
      "Dental claim denial letter or EOB",
      "ADA dental claim form and supporting documentation",
      "Clinical notes from the treating dentist",
      "X-rays or other diagnostic images",
      "Dental plan document showing coverage and exclusions",
      "Dentist's narrative letter explaining clinical necessity",
      "Appeal instructions and deadline from the denial notice",
    ],
    faq: [
      "How do I appeal a dental insurance denial?",
      "What documentation does the ADA recommend for dental appeals?",
      "What are common reasons dental claims are denied?",
      "Can I file a complaint with my state insurance department about a dental denial?",
    ],
    authorityNote: "The ADA provides guidance on filing dental insurance appeals, including a downloadable 'How to File an Appeal' guide. Dental plans often have frequency limitations, waiting periods, and missing tooth clauses that differ from medical plans. State insurance departments regulate dental plans and accept consumer complaints.",
  },

  "appeal/life-insurance-denial": {
    overview: "A workflow for appealing a life insurance claim denial. Reads the denial to identify whether it was based on misrepresentation, policy lapse, contestability period, or exclusion clauses, and prepares an appeal with policy documents, premium payment records, and evidence contradicting the denial basis.",
    whenToUse: [
      "A life insurance claim was denied after the policyholder's death.",
      "The denial cites misrepresentation, material non-disclosure, or policy lapse.",
      "You want to contest the denial with the insurer or file a complaint with the state insurance department.",
    ],
    whenNotToUse: [
      "The policy was explicitly cancelled and you have no documentation to contest the cancellation.",
      "You are not the beneficiary or authorized representative.",
      "The denial involves a group life insurance policy through an employer (ERISA process may apply).",
    ],
    officialSources: [
      { title: "How to File a Complaint", publisher: "National Association of Insurance Commissioners", url: "https://content.naic.org/consumer/how-to-file-complaint", reviewedAt: REVIEWED },
      { title: "Health Insurance Claim Denied? How to Appeal the Denial", publisher: "National Association of Insurance Commissioners", url: "https://content.naic.org/article/consumer_insight_health_insurance_claim_denied_how_appeal_denial.htm", reviewedAt: REVIEWED },
    ],
    checklist: [
      "Life insurance claim denial letter",
      "Original life insurance policy document",
      "Premium payment records or bank statements",
      "Death certificate",
      "Beneficiary designation documents",
      "Correspondence with the insurance company",
      "Any medical records relevant to the contestability claim",
      "Appeal deadline (varies by state and insurer)",
    ],
    faq: [
      "What is the contestability period for life insurance?",
      "Can a life insurance company deny a claim after the contestability period?",
      "How do I file a complaint about a life insurance denial?",
      "What is the difference between an ERISA and state-regulated life insurance appeal?",
    ],
    authorityNote: "Life insurance policies generally have a two-year contestability period during which the insurer can investigate misrepresentations on the application. After the contestability period, denials are limited to specific policy exclusions. State insurance departments regulate life insurance and accept consumer complaints. Group policies through employers may fall under ERISA, which has a different appeals process.",
  },

  "appeal/insurance-claim-denial": {
    overview: "A general workflow for appealing any insurance claim denial. Reads the denial to identify the stated reason, gathers policy documents and evidence, and prepares a structured appeal letter that addresses each point in the denial with supporting documentation.",
    whenToUse: [
      "You received an insurance claim denial and want to appeal.",
      "The denial is from a property, casualty, auto, or other non-health insurance policy.",
      "You have policy documents and evidence to support the appeal.",
    ],
    whenNotToUse: [
      "The denial is from a health insurance plan (use the medical insurance denial workflow).",
      "You need legal representation for litigation.",
      "The claim denial involves workers' compensation (different administrative process).",
    ],
    officialSources: [
      { title: "How to File a Complaint", publisher: "National Association of Insurance Commissioners", url: "https://content.naic.org/consumer/how-to-file-complaint", reviewedAt: REVIEWED },
      { title: "Health Insurance Claim Denied? How to Appeal the Denial", publisher: "National Association of Insurance Commissioners", url: "https://content.naic.org/article/consumer_insight_health_insurance_claim_denied_how_appeal_denial.htm", reviewedAt: REVIEWED },
    ],
    checklist: [
      "Claim denial letter with stated reason",
      "Insurance policy or coverage document",
      "Claim file number and adjuster contact information",
      "Photos, repair estimates, police reports, or other evidence",
      "Correspondence history with the insurer",
      "Appeal deadline from the denial notice",
      "Any independent assessment or estimate",
    ],
    faq: [
      "How long do I have to appeal an insurance claim denial?",
      "What should I include in an insurance appeal letter?",
      "When should I contact my state insurance department?",
      "What is the difference between an internal appeal and a complaint?",
    ],
    authorityNote: "State insurance departments regulate claim handling and accept consumer complaints. The NAIC recommends reviewing the denial letter carefully, gathering supporting documentation, and filing an internal appeal before contacting the state insurance department. Deadlines and appeal processes vary by state and insurance type.",
  },

  "appeal/insurance-denial-letter": {
    overview: "A workflow for preparing a written response to an insurance denial letter. Reads the denial letter to extract the stated reason, policy provisions cited, and appeal instructions, then prepares a structured response letter that addresses each point with evidence and policy references.",
    whenToUse: [
      "You received an insurance denial letter and need to respond in writing.",
      "The letter specifies a response or appeal deadline.",
      "You want to create a formal written record of your dispute.",
    ],
    whenNotToUse: [
      "You want to call the insurer instead of writing (a written record is always recommended).",
      "The denial letter is not available and the reason is unknown.",
      "You need to file a lawsuit (consult an attorney).",
    ],
    officialSources: [
      { title: "How to File a Complaint", publisher: "National Association of Insurance Commissioners", url: "https://content.naic.org/consumer/how-to-file-complaint", reviewedAt: REVIEWED },
      { title: "Health Insurance Claim Denied? How to Appeal the Denial", publisher: "National Association of Insurance Commissioners", url: "https://content.naic.org/article/consumer_insight_health_insurance_claim_denied_how_appeal_denial.htm", reviewedAt: REVIEWED },
    ],
    checklist: [
      "The original denial letter",
      "Claim or policy number",
      "Insurance policy or coverage document",
      "Evidence supporting your position (photos, records, estimates)",
      "Deadlines stated in the denial letter",
      "Recipient name, address, and preferred submission method",
    ],
    faq: [
      "What should I include in an insurance denial response letter?",
      "How formal does the response letter need to be?",
      "Should I send the response by certified mail?",
      "What if I miss the deadline stated in the denial letter?",
    ],
    authorityNote: "A written response creates a formal record and preserves appeal rights. The NAIC recommends submitting appeals in writing and keeping copies of all correspondence. Certified mail with return receipt provides proof of timely submission. Always cite the specific policy provisions and denial reasons in the response.",
  },

  "appeal/insurance-coverage-denial": {
    overview: "A workflow for appealing a denial based on lack of coverage. Determines whether the denial is based on a plan exclusion, formulary limit, or coverage interpretation, reviews the policy language, and prepares an appeal that challenges the coverage determination with policy text and supporting evidence.",
    whenToUse: [
      "Your insurer denied a claim citing that the service is not covered by your plan.",
      "You believe the service should be covered based on the policy language.",
      "You want to challenge a coverage determination through internal appeal and external review.",
    ],
    whenNotToUse: [
      "The service is clearly excluded in the plan document (e.g., cosmetic surgery).",
      "The denial is based on medical necessity (use the medical necessity appeal workflow).",
      "You have not reviewed the plan's coverage provisions.",
    ],
    officialSources: [
      { title: "External Appeals", publisher: "Centers for Medicare & Medicaid Services", url: "https://www.cms.gov/marketplace/about/affordable-care-act/external-appeals", reviewedAt: REVIEWED },
      { title: "How to File a Complaint", publisher: "National Association of Insurance Commissioners", url: "https://content.naic.org/consumer/how-to-file-complaint", reviewedAt: REVIEWED },
      { title: "Health Insurance Claim Denied? How to Appeal the Denial", publisher: "National Association of Insurance Commissioners", url: "https://content.naic.org/article/consumer_insight_health_insurance_claim_denied_how_appeal_denial.htm", reviewedAt: REVIEWED },
    ],
    checklist: [
      "Denial letter stating the coverage basis for denial",
      "Full plan document or summary plan description",
      "Specific policy provisions being disputed",
      "Evidence that the service meets the plan's coverage criteria",
      "Internal appeal instructions and deadline",
      "External review eligibility information",
    ],
    faq: [
      "What is the difference between a coverage denial and a medical necessity denial?",
      "How does external review work for coverage denials?",
      "Can my state insurance department help with a coverage dispute?",
      "What policy language should I cite in a coverage appeal?",
    ],
    authorityNote: "Under the ACA, consumers have the right to external review of coverage denials by an independent third party. The plan must provide the reason for denial and instructions for appeal. State insurance departments can assist with coverage disputes and enforce consumer protections.",
  },

  "appeal/ssdi-denial": {
    overview: "A workflow for appealing a Social Security Disability Insurance (SSDI) denial. Reads the denial notice to identify the stated reason, organizes medical evidence and work history, and prepares a reconsideration request following the SSA's four-level appeal process.",
    whenToUse: [
      "You received a denial of your SSDI application and want to appeal.",
      "You are within the 60-day deadline for requesting reconsideration.",
      "You have medical evidence supporting your disability claim.",
    ],
    whenNotToUse: [
      "You have already passed the 60-day appeal deadline (unless you can show good cause).",
      "Your claim is for SSI only (use the SSI denial workflow, though the process is similar).",
      "You need legal representation for a federal court appeal.",
    ],
    officialSources: [
      { title: "Appeal a Decision We Made", publisher: "Social Security Administration", url: "https://www.ssa.gov/apply/appeal-decision-we-made", reviewedAt: REVIEWED },
      { title: "Request Reconsideration", publisher: "Social Security Administration", url: "https://www.ssa.gov/apply/appeal-decision-we-made/request-reconsideration", reviewedAt: REVIEWED },
      { title: "Form SSA-561 — Request for Reconsideration", publisher: "Social Security Administration", url: "https://www.ssa.gov/forms/ssa-561.html", reviewedAt: REVIEWED },
    ],
    checklist: [
      "SSDI denial notice with the stated reason",
      "Form SSA-561 (Request for Reconsideration)",
      "Medical records and treatment notes",
      "Work history and earnings records",
      "List of medications and their side effects",
      "Physician statements supporting disability",
      "Any vocational or functional capacity evaluations",
    ],
    faq: [
      "How long do I have to appeal an SSDI denial?",
      "What is the difference between reconsideration and a hearing?",
      "Can I submit new evidence with my reconsideration request?",
      "What happens if I miss the 60-day deadline?",
    ],
    authorityNote: "SSA provides four levels of appeal: (1) Reconsideration, (2) Hearing before an Administrative Law Judge, (3) Review by the Appeals Council, and (4) Federal district court. The deadline to request reconsideration is 60 days from receipt of the denial notice (5 days after the date on the notice is presumed). Form SSA-561 is used for reconsideration requests.",
  },

  "appeal/ssi-denial": {
    overview: "A workflow for appealing a Supplemental Security Income (SSI) denial. Reads the denial notice to identify whether it was based on medical, financial, or technical reasons, organizes income and resource documentation and medical evidence, and prepares a reconsideration request.",
    whenToUse: [
      "You received a denial of your SSI application and want to appeal.",
      "You are within the 60-day deadline for requesting reconsideration.",
      "You have additional evidence about your disability, income, or resources.",
    ],
    whenNotToUse: [
      "You have already passed the 60-day appeal deadline without good cause.",
      "Your claim is for SSDI only (use the SSDI denial workflow).",
      "You need legal representation for a federal court appeal.",
    ],
    officialSources: [
      { title: "Appeal a Decision We Made", publisher: "Social Security Administration", url: "https://www.ssa.gov/apply/appeal-decision-we-made", reviewedAt: REVIEWED },
      { title: "Appeals Process | Understanding SSI", publisher: "Social Security Administration", url: "https://www.ssa.gov/ssi/text-appeals-ussi.htm", reviewedAt: REVIEWED },
      { title: "Form SSA-561 — Request for Reconsideration", publisher: "Social Security Administration", url: "https://www.ssa.gov/forms/ssa-561.html", reviewedAt: REVIEWED },
    ],
    checklist: [
      "SSI denial notice with the stated reason",
      "Form SSA-561 (Request for Reconsideration)",
      "Medical records and treatment notes",
      "Income and resource documentation (bank statements, pay stubs)",
      "Proof of living arrangement",
      "Physician statements supporting disability",
      "List of current medications",
    ],
    faq: [
      "How long do I have to appeal an SSI denial?",
      "What is the SSI appeals process?",
      "Can I appeal both medical and financial denials?",
      "What if my income or resources changed since I applied?",
    ],
    authorityNote: "SSI appeals follow the same four-level process as SSDI: reconsideration, ALJ hearing, Appeals Council review, and federal district court. The deadline is 60 days from receipt of the denial notice. SSI has both medical and non-medical (income and resource) determinations, and both can be appealed using Form SSA-561.",
  },

  "appeal/social-security-denial": {
    overview: "A general workflow for appealing any Social Security Administration decision, including retirement benefit denials, overpayment recovery, and disability benefit denials. Reads the denial notice, identifies the appeal type and deadline, and prepares the appropriate appeal form with supporting documentation.",
    whenToUse: [
      "You received a Social Security decision you disagree with (benefit denial, overpayment, cessation).",
      "You want to request reconsideration, a hearing, or an Appeals Council review.",
      "You are within the 60-day appeal deadline.",
    ],
    whenNotToUse: [
      "You have passed the 60-day deadline and cannot establish good cause.",
      "You need representation at a federal court level.",
      "The decision is final and all appeal levels are exhausted.",
    ],
    officialSources: [
      { title: "Appeal a Decision We Made", publisher: "Social Security Administration", url: "https://www.ssa.gov/apply/appeal-decision-we-made", reviewedAt: REVIEWED },
      { title: "Form SSA-561 — Request for Reconsideration", publisher: "Social Security Administration", url: "https://www.ssa.gov/forms/ssa-561.html", reviewedAt: REVIEWED },
      { title: "Electronic Appeals Terms of Service", publisher: "Social Security Administration", url: "https://www.ssa.gov/disability/appeal.html", reviewedAt: REVIEWED },
    ],
    checklist: [
      "Social Security decision notice with the stated reason",
      "Form SSA-561 (Request for Reconsideration) or appropriate appeal form",
      "Supporting documentation for your claim type (medical, financial, etc.)",
      "Proof of timely submission (certified mail or online confirmation)",
      "Any new evidence not previously considered in the original application",
    ],
    faq: [
      "What forms do I need to appeal a Social Security decision?",
      "Can I appeal online?",
      "What happens if I miss the 60-day deadline?",
      "What is the difference between reconsideration and a hearing?",
    ],
    authorityNote: "SSA provides four appeal levels: reconsideration, ALJ hearing, Appeals Council review, and federal district court. The standard deadline is 60 days from receipt of the decision (presumed 5 days after the date on the notice). Good cause for late filing can be established in limited circumstances.",
  },

  "appeal/medicaid-denial": {
    overview: "A workflow for appealing a Medicaid eligibility or coverage denial. Reads the denial to identify whether it was based on income, resources, categorical eligibility, or medical necessity, and prepares a fair hearing request following the state Medicaid appeals process.",
    whenToUse: [
      "You received a Medicaid eligibility or coverage denial.",
      "You want to request a state fair hearing or managed care plan appeal.",
      "You have additional documentation of income, resources, or medical need.",
    ],
    whenNotToUse: [
      "The denial is from Medicare (use the Medicare appeals process).",
      "You are seeking Medicaid for a category your state does not cover.",
      "You need legal representation for a federal court action.",
    ],
    officialSources: [
      { title: "Filing an Appeal", publisher: "Medicare.gov", url: "https://www.medicare.gov/providers-services/claims-appeals-complaints/appeals", reviewedAt: REVIEWED },
      { title: "How to Appeal Medicaid", publisher: "Louisiana Department of Health", url: "https://ldh.la.gov/medicaid/how-to-appeal-medicaid", reviewedAt: REVIEWED },
      { title: "DMAS Appeals", publisher: "Virginia Department of Medical Assistance Services", url: "https://www.dmas.virginia.gov/appeals/", reviewedAt: REVIEWED },
    ],
    checklist: [
      "Medicaid denial notice with the stated reason",
      "Income and resource documentation",
      "Proof of residency and identity",
      "Medical records if the denial is medical-necessity based",
      "State fair hearing request form (varies by state)",
      "Managed care plan appeal information if enrolled in managed care",
      "Deadline for appeal (varies by state, typically 30 to 90 days)",
    ],
    faq: [
      "How do I appeal a Medicaid denial?",
      "What is a Medicaid fair hearing?",
      "Can I keep my benefits during the appeal?",
      "How long does a Medicaid appeal take?",
    ],
    authorityNote: "Medicaid appeals processes vary by state. Each state must provide a fair hearing process for denied applicants. Managed care enrollees may need to complete the plan's internal appeal before requesting a state fair hearing. The deadline for appeal varies by state (commonly 30 to 90 days). Some states allow continued benefits during the appeal if requested within a specific timeframe (often 10 days).",
  },

  "appeal/unemployment-denial": {
    overview: "A workflow for appealing an unemployment insurance benefit denial. Reads the determination to identify the stated reason, organizes employment records and witness statements, and prepares a written appeal for the state unemployment appeals process.",
    whenToUse: [
      "You received a denial of unemployment benefits and want to appeal.",
      "You want to contest a determination about your separation from employment.",
      "You have evidence supporting your eligibility for benefits.",
    ],
    whenNotToUse: [
      "You have passed the appeal deadline (varies by state, typically 10 to 30 days).",
      "You need representation for a court appeal.",
      "The determination is from a different state than where you worked.",
    ],
    officialSources: [
      { title: "Unemployment Insurance Appeals — EDD", publisher: "California EDD", url: "https://edd.ca.gov/en/unemployment/appeals/", reviewedAt: REVIEWED },
      { title: "Appeal an unemployment benefits decision", publisher: "Washington State Employment Security Department", url: "https://esd.wa.gov/get-financial-help/unemployment-benefits/appeal-unemployment-benefits-decision", reviewedAt: REVIEWED },
      { title: "Appeals — IDES", publisher: "Illinois Department of Employment Security", url: "https://ides.illinois.gov/unemployment/appeals.html", reviewedAt: REVIEWED },
    ],
    checklist: [
      "Notice of Determination with the stated reason for denial",
      "Employment records and pay stubs",
      "Separation documentation (resignation letter, termination notice, etc.)",
      "Witness statements or corroborating evidence",
      "Written appeal or state appeal form",
      "Deadline for appeal (varies by state)",
      "Document ID or claim number from the determination",
    ],
    faq: [
      "How long do I have to appeal an unemployment denial?",
      "What happens at an unemployment appeal hearing?",
      "Can I get benefits while my appeal is pending?",
      "What evidence helps win an unemployment appeal?",
    ],
    authorityNote: "Unemployment appeal deadlines vary by state, typically ranging from 10 to 30 days from the date of the determination. Appeals must be in writing. Most states hold a hearing before an administrative law judge. Claimants may be represented by an attorney but are not required to have one. States must issue a decision within a specific timeframe after the hearing.",
  },

  "appeal/edd-denial": {
    overview: "A workflow for appealing a California EDD unemployment determination. Reads the Notice of Determination, identifies the stated reason, and prepares an appeal using Form DE 1000M within the 30-day deadline.",
    whenToUse: [
      "You received an EDD Notice of Determination denying unemployment benefits in California.",
      "You want to file an appeal within 30 days of the mailing date.",
      "You have evidence supporting your eligibility.",
    ],
    whenNotToUse: [
      "You are outside California (use your state's unemployment appeal process).",
      "You have passed the 30-day appeal deadline.",
      "The denial is for disability insurance, not unemployment insurance.",
    ],
    officialSources: [
      { title: "Unemployment Insurance Appeals — EDD", publisher: "California Employment Development Department", url: "https://edd.ca.gov/en/unemployment/appeals/", reviewedAt: REVIEWED },
      { title: "Appeal Form (DE 1000M)", publisher: "California Employment Development Department", url: "https://edd.ca.gov/siteassets/files/pdf_pub_ctr/de1000m.pdf", reviewedAt: REVIEWED },
      { title: "Filing an Appeal — CUIAB", publisher: "California Unemployment Insurance Appeals Board", url: "https://cuiab.ca.gov/filing-an-appeal/", reviewedAt: REVIEWED },
    ],
    checklist: [
      "EDD Notice of Determination with the Document ID",
      "Form DE 1000M (Appeal Form) or written appeal letter",
      "Employment records and pay stubs",
      "Separation documentation",
      "Witness contact information",
      "Signed appeal form within 30 days of the mailing date",
    ],
    faq: [
      "How do I appeal an EDD determination in California?",
      "What is Form DE 1000M?",
      "How long do I have to appeal an EDD denial?",
      "What happens at a CUIAB hearing?",
    ],
    authorityNote: "California EDD appeals must be filed (postmarked) within 30 calendar days of the mailing date on the Notice of Determination. The appeal is filed with EDD using Form DE 1000M. If EDD does not change the determination, the case is referred to the California Unemployment Insurance Appeals Board (CUIAB) for a hearing before an Administrative Law Judge.",
  },

  "appeal/financial-aid-appeal": {
    overview: "A workflow for appealing a financial aid award or eligibility decision. Reads the aid offer or denial, identifies the basis for the decision, and prepares a professional judgment or special circumstances appeal to the school's financial aid office.",
    whenToUse: [
      "Your financial aid offer is insufficient and your circumstances have changed.",
      "You want to request a professional judgment review from your school's financial aid office.",
      "You are appealing a satisfactory academic progress (SAP) determination.",
    ],
    whenNotToUse: [
      "You want to appeal a federal student loan default (different process).",
      "You have not yet filed the FAFSA or applied for aid.",
      "You are disputing a private student loan decision (contact the lender directly).",
    ],
    officialSources: [
      { title: "Regaining Eligibility | Federal Student Aid", publisher: "U.S. Department of Education", url: "https://studentaid.gov/understand-aid/eligibility/regain", reviewedAt: REVIEWED },
      { title: "Satisfactory Academic Progress", publisher: "Federal Student Aid", url: "https://studentaid.gov/help-center/answers/article/satisfactory-academic-progress", reviewedAt: REVIEWED },
      { title: "How to Appeal Financial Aid Award Packages", publisher: "FinAid.org", url: "https://finaid.org/financial-aid-applications/financial-aid-appeal/", reviewedAt: REVIEWED },
    ],
    checklist: [
      "Financial aid award letter or denial notice",
      "FAFSA confirmation and Student Aid Report (SAR)",
      "Documentation of changed circumstances (job loss, medical bills, etc.)",
      "Tax returns and W-2 forms",
      "School's financial aid appeal form (if required)",
      "Letter explaining the special circumstances",
      "Supporting documentation (medical bills, unemployment notice, death certificate, etc.)",
    ],
    faq: [
      "What is a professional judgment appeal?",
      "What qualifies as special circumstances for financial aid?",
      "How do I appeal a financial aid suspension?",
      "What is satisfactory academic progress (SAP) and how do I appeal it?",
    ],
    authorityNote: "Financial aid appeals are handled by each school's financial aid office, which has discretion to make professional judgment adjustments to the FAFSA data under federal regulations. There is no universal appeal form — each school sets its own process. Federal Student Aid provides guidance on regaining eligibility, including SAP appeals. Deadlines vary by school.",
  },

  "appeal/fafsa-appeal": {
    overview: "A workflow for appealing FAFSA-related decisions, including dependency override requests, special circumstances adjustments, and SAP appeals that affect federal aid eligibility. Prepares documentation and a written request to the school's financial aid office.",
    whenToUse: [
      "You need a dependency override or special circumstances adjustment on your FAFSA.",
      "Your financial situation changed significantly after filing the FAFSA.",
      "You are appealing a SAP determination that affects your aid eligibility.",
    ],
    whenNotToUse: [
      "You simply want to correct a data entry error on the FAFSA (use FAFSA correction).",
      "You are disputing a private student loan decision.",
      "You have not yet completed the FAFSA.",
    ],
    officialSources: [
      { title: "Regaining Eligibility | Federal Student Aid", publisher: "U.S. Department of Education", url: "https://studentaid.gov/understand-aid/eligibility/regain", reviewedAt: REVIEWED },
      { title: "Satisfactory Academic Progress", publisher: "Federal Student Aid", url: "https://studentaid.gov/help-center/answers/article/satisfactory-academic-progress", reviewedAt: REVIEWED },
      { title: "Forms Library | Federal Student Aid", publisher: "U.S. Department of Education", url: "https://studentaid.gov/forms-library/", reviewedAt: REVIEWED },
    ],
    checklist: [
      "FAFSA confirmation and Student Aid Report (SAR)",
      "Financial aid award or denial notice",
      "Documentation of changed financial circumstances",
      "Third-party documentation supporting a dependency override (if applicable)",
      "School's financial aid appeal form",
      "Written statement explaining the basis for the appeal",
      "Supporting financial documents (tax returns, pay stubs, medical bills)",
    ],
    faq: [
      "What is a dependency override on the FAFSA?",
      "How do I report changed income on my FAFSA?",
      "What is a special circumstances adjustment?",
      "How do I appeal a SAP determination?",
    ],
    authorityNote: "FAFSA appeals are processed by the school's financial aid administrator, not by the Department of Education directly. Financial aid administrators have professional judgment authority to adjust the EFC in cases of special circumstances. Dependency overrides require documented unusual circumstances and third-party documentation. SAP appeals follow school-specific processes but must comply with federal regulations.",
  },

  "appeal/drivers-license-suspension": {
    overview: "A workflow for appealing a driver's license suspension. Reads the suspension notice to identify the basis, and prepares a request for an administrative hearing or departmental review within the applicable deadline.",
    whenToUse: [
      "You received a notice of license suspension and want to request a hearing.",
      "You are within the deadline to request an administrative hearing (varies by state).",
      "You have evidence supporting your case against the suspension.",
    ],
    whenNotToUse: [
      "Your license has already been suspended and the appeal period has passed.",
      "You need criminal defense representation for underlying charges.",
      "The suspension is from a court order (not an administrative action).",
    ],
    officialSources: [
      { title: "Driver Safety Case Management", publisher: "California DMV", url: "https://www.dmv.ca.gov/portal/driver-safety-portal/", reviewedAt: REVIEWED },
      { title: "Suspensions", publisher: "California DMV", url: "https://www.dmv.ca.gov/portal/suspensions/", reviewedAt: REVIEWED },
    ],
    checklist: [
      "Notice of suspension with the stated reason and effective date",
      "Driving record and abstract",
      "Evidence supporting your case (completion of requirements, corrected conditions, etc.)",
      "Hearing request form (varies by state)",
      "Deadline for requesting a hearing (e.g., 10 days for DUI suspensions in California)",
      "Any prior correspondence with the DMV",
    ],
    faq: [
      "How do I request a DMV hearing?",
      "How long do I have to appeal a license suspension?",
      "What happens at a DMV administrative hearing?",
      "Can I get a restricted license while my appeal is pending?",
    ],
    authorityNote: "License suspension appeal processes vary by state. In California, you typically have 10 calendar days from the notice date to request a DMV hearing for DUI-related suspensions. Other suspension types may have different deadlines. DMV hearings are administrative (not criminal) proceedings. After a DMV hearing, you may request a departmental review or appeal to the courts via a writ of mandate.",
  },

  "appeal/government-decision": {
    overview: "A general workflow for appealing a government agency decision. Reads the decision notice to identify the agency, the stated reason, the available appeal process, and the deadline, then prepares a structured appeal with supporting documentation.",
    whenToUse: [
      "You received an adverse decision from a government agency and want to appeal.",
      "The decision notice specifies an appeal process and deadline.",
      "You have documentation supporting your position.",
    ],
    whenNotToUse: [
      "The decision is from a court (use court-specific appeal processes).",
      "You have passed the stated appeal deadline.",
      "You need legal representation for a complex regulatory appeal.",
    ],
    officialSources: [
      { title: "Appeal a Decision We Made", publisher: "Social Security Administration", url: "https://www.ssa.gov/apply/appeal-decision-we-made", reviewedAt: REVIEWED },
      { title: "Filing an Appeal", publisher: "Medicare.gov", url: "https://www.medicare.gov/providers-services/claims-appeals-complaints/appeals", reviewedAt: REVIEWED },
    ],
    checklist: [
      "Decision or determination notice from the agency",
      "Case or reference number",
      "The stated reason for the decision",
      "Appeal instructions and deadline from the notice",
      "Supporting documentation and evidence",
      "The appropriate appeal form (varies by agency)",
    ],
    faq: [
      "How do I appeal a government agency decision?",
      "What is the deadline for appealing a government decision?",
      "Can I get help filing a government appeal?",
      "What if I disagree with the appeal decision?",
    ],
    authorityNote: "Each government agency has its own appeal process, deadlines, and forms. Common agencies with appeal processes include SSA, CMS/Medicare, state unemployment departments, DMV, and immigration. The decision notice must be read carefully to identify the specific appeal process. The Administrative Procedure Act provides a general framework for federal agency appeals.",
  },

  "appeal/reconsideration": {
    overview: "A workflow for requesting reconsideration of an adverse decision. Reads the original decision to identify the stated reason, prepares new or additional evidence, and submits a formal reconsideration request within the applicable deadline.",
    whenToUse: [
      "You received a decision you disagree with and the agency or insurer offers a reconsideration step.",
      "You have new evidence or information not considered in the original decision.",
      "You are within the reconsideration deadline.",
    ],
    whenNotToUse: [
      "The decision does not offer a reconsideration step (proceed to the next appeal level).",
      "You have passed the reconsideration deadline.",
      "You want to file a formal complaint instead of a reconsideration.",
    ],
    officialSources: [
      { title: "Request Reconsideration", publisher: "Social Security Administration", url: "https://www.ssa.gov/apply/appeal-decision-we-made/request-reconsideration", reviewedAt: REVIEWED },
      { title: "Form SSA-561 — Request for Reconsideration", publisher: "Social Security Administration", url: "https://www.ssa.gov/forms/ssa-561.html", reviewedAt: REVIEWED },
    ],
    checklist: [
      "Original decision notice",
      "New or additional evidence not previously considered",
      "Reconsideration request form (varies by agency or insurer)",
      "Case or reference number",
      "Written statement explaining why the decision should be reconsidered",
      "Deadline for requesting reconsideration",
    ],
    faq: [
      "What is the difference between reconsideration and an appeal?",
      "How long does reconsideration take?",
      "Can I submit new evidence with a reconsideration request?",
      "What happens if reconsideration is denied?",
    ],
    authorityNote: "Reconsideration is typically the first level of appeal after an initial decision. For SSA, reconsideration must be requested within 60 days of receiving the decision. For insurance, reconsideration timelines vary by plan. Reconsideration allows the same agency or insurer to review the decision with new evidence before escalating to a higher appeal level.",
  },

  "appeal/court-ruling": {
    overview: "A workflow for responding to a court ruling or preparing an appeal of a court decision. Reads the court order to identify the ruling, the basis, and the available appellate options, and prepares a response or notice of appeal with the required procedural documents.",
    whenToUse: [
      "You received an adverse court ruling and want to understand your appellate options.",
      "The court order specifies a deadline for filing a notice of appeal or post-judgment motion.",
      "You want to prepare documents for a legal response or appeal.",
    ],
    whenNotToUse: [
      "You need legal advice or representation (consult a licensed attorney).",
      "The deadline for appeal has passed.",
      "The ruling is from a small claims court (different process in many states).",
    ],
    officialSources: [
      { title: "Filing an Appeal", publisher: "Medicare.gov", url: "https://www.medicare.gov/providers-services/claims-appeals-complaints/appeals", reviewedAt: REVIEWED },
    ],
    checklist: [
      "Court order or judgment",
      "Case number and court name",
      "Notice of appeal form (varies by court)",
      "Deadline for filing (typically 30 to 60 days depending on court)",
      "Relevant case documents and filings",
      "Transcript or record of proceedings (if applicable)",
    ],
    faq: [
      "How long do I have to appeal a court ruling?",
      "What is a notice of appeal?",
      "What is the difference between an appeal and a motion for reconsideration?",
      "Do I need a lawyer to file an appeal?",
    ],
    authorityNote: "Court appeal deadlines are strict and vary by jurisdiction and court type. Federal court appeals typically require a notice of appeal within 30 days (60 days if the U.S. is a party). State court deadlines vary. Missing the deadline usually forfeits the right to appeal. This workflow provides document preparation only, not legal advice — consult a licensed attorney for court appeals.",
  },

  "dispute/debt-collection-dispute": {
    overview: "A workflow for disputing a debt collection attempt. Reads the collection notice to identify the debt, the collector, and the validation rights, then prepares a written dispute requesting validation of the debt within the 30-day FDCPA window.",
    whenToUse: [
      "You received a collection notice or call from a debt collector and want to dispute the debt.",
      "You want to request debt validation under the FDCPA within 30 days of first contact.",
      "You need a written record of your dispute to preserve your rights.",
    ],
    whenNotToUse: [
      "You acknowledge the debt and want to negotiate payment (use a payment plan workflow).",
      "The debt is past the statute of limitations for collection in your state.",
      "You need bankruptcy advice (consult a bankruptcy attorney).",
    ],
    officialSources: [
      { title: "Debt Collection | Consumer Financial Protection Bureau", publisher: "Consumer Financial Protection Bureau", url: "https://www.consumerfinance.gov/consumer-tools/debt-collection/", reviewedAt: REVIEWED },
      { title: "What information does a debt collector have to give me about the debt?", publisher: "Consumer Financial Protection Bureau", url: "https://www.consumerfinance.gov/ask-cfpb/what-information-does-a-debt-collector-have-to-give-me-about-the-debt-en-331/", reviewedAt: REVIEWED },
      { title: "Fair Debt Collection Practices Act", publisher: "Federal Trade Commission", url: "https://www.ftc.gov/legal-library/browse/rules/fair-debt-collection-practices-act-text", reviewedAt: REVIEWED },
    ],
    checklist: [
      "Collection notice or letter from the debt collector",
      "Debt collector's name, address, and license information",
      "Original creditor and account number",
      "Amount claimed and itemization if available",
      "Any prior correspondence with the collector",
      "Written dispute letter requesting validation",
      "Proof of mailing (certified mail recommended)",
    ],
    faq: [
      "What is debt validation under the FDCPA?",
      "How long do I have to dispute a debt after first contact?",
      "What must a debt collector include in a validation notice?",
      "Can a debt collector still contact me after I dispute the debt?",
    ],
    authorityNote: "Under the FDCPA (15 U.S.C. 1692g), consumers have 30 days from receiving the validation notice to dispute the debt in writing. If disputed, the debt collector must obtain verification of the debt before continuing collection. The CFPB's Regulation F (12 CFR 1006) implements the FDCPA and specifies the required validation notice content.",
  },

  "dispute/debt-validation": {
    overview: "A focused workflow for requesting debt validation from a collector. Prepares a written validation request citing the FDCPA 30-day window, identifies what information the collector must provide, and creates a record of the request.",
    whenToUse: [
      "You want to request validation of a debt under the FDCPA.",
      "You are within 30 days of receiving the initial validation notice.",
      "You want to ensure the collector has proper documentation before paying.",
    ],
    whenNotToUse: [
      "The 30-day validation window has passed (you can still dispute, but the collector is not required to cease collection).",
      "You know the debt is yours and valid and want to negotiate payment.",
      "The original creditor (not a third-party collector) is contacting you (FDCPA applies to debt collectors, not original creditors).",
    ],
    officialSources: [
      { title: "Section 1006.34 Notice for validation of debts", publisher: "Consumer Financial Protection Bureau", url: "https://www.consumerfinance.gov/rules-policy/regulations/1006/34", reviewedAt: REVIEWED },
      { title: "Debt Collection (FDCPA)", publisher: "Consumer Financial Protection Bureau", url: "https://www.consumerfinance.gov/compliance/compliance-resources/other-applicable-requirements/debt-collection/", reviewedAt: REVIEWED },
      { title: "What information does a debt collector have to give me about the debt?", publisher: "Consumer Financial Protection Bureau", url: "https://www.consumerfinance.gov/ask-cfpb/what-information-does-a-debt-collector-have-to-give-me-about-the-debt-en-331/", reviewedAt: REVIEWED },
    ],
    checklist: [
      "Validation notice or first communication from the debt collector",
      "Debt collector's full name and mailing address",
      "Account number and original creditor name",
      "Amount of the debt as stated by the collector",
      "Written validation request sent within 30 days",
      "Certified mail tracking number",
    ],
    faq: [
      "What information must a debt collector provide to validate a debt?",
      "What happens if the collector cannot validate the debt?",
      "Does the FDCPA apply to original creditors?",
      "Can I still request validation after 30 days?",
    ],
    authorityNote: "Under FDCPA Section 809 (15 U.S.C. 1692g) and CFPB Regulation F (12 CFR 1006.34), a debt collector must provide validation information either in the initial communication or within 5 days. The consumer has 30 days to dispute in writing. If disputed, the collector must cease collection until verification is obtained.",
  },

  "dispute/dispute-collection-agency": {
    overview: "A workflow for disputing a specific collection agency's practices. Identifies potential FDCPA violations (harassment, false statements, unfair practices), documents the violations, and prepares a complaint to the CFPB and a dispute letter to the agency.",
    whenToUse: [
      "A collection agency is violating FDCPA rules (harassing calls, false threats, contacting third parties).",
      "You want to file a complaint with the CFPB about a collector's practices.",
      "You want to dispute a collection while documenting FDCPA violations.",
    ],
    whenNotToUse: [
      "The collection is from an original creditor, not a third-party collector (FDCPA may not apply).",
      "You have no evidence of the alleged violations.",
      "You want to negotiate a settlement (use a payment workflow).",
    ],
    officialSources: [
      { title: "Debt Collection | Consumer Financial Protection Bureau", publisher: "Consumer Financial Protection Bureau", url: "https://www.consumerfinance.gov/consumer-tools/debt-collection/", reviewedAt: REVIEWED },
      { title: "Submit a Complaint", publisher: "Consumer Financial Protection Bureau", url: "https://www.consumerfinance.gov/complaint/", reviewedAt: REVIEWED },
      { title: "Fair Debt Collection Practices Act", publisher: "Federal Trade Commission", url: "https://www.ftc.gov/legal-library/browse/rules/fair-debt-collection-practices-act-text", reviewedAt: REVIEWED },
    ],
    checklist: [
      "All correspondence and communications from the collection agency",
      "Log of calls (dates, times, content, caller ID)",
      "Any threats, false statements, or harassing messages documented",
      "Debt validation notice from the agency",
      "Written dispute and complaint letter",
      "CFPB complaint reference number (if filed)",
    ],
    faq: [
      "What constitutes harassment under the FDCPA?",
      "How do I file a complaint against a debt collector?",
      "Can a debt collector contact my employer or family?",
      "What remedies are available for FDCPA violations?",
    ],
    authorityNote: "The FDCPA prohibits harassment, false statements, unfair practices, and contacting third parties about the debt (with limited exceptions). Consumers can file complaints with the CFPB at consumerfinance.gov/complaint. Violations may result in statutory damages of up to $1,000 per violation plus actual damages and attorney fees under 15 U.S.C. 1692k.",
  },

  "dispute/debt-dispute": {
    overview: "A general workflow for disputing a debt. Reads the debt claim to identify the amount, creditor, and basis, then prepares a structured dispute letter that requests validation, identifies errors, and preserves the consumer's rights under the FDCPA and FCRA.",
    whenToUse: [
      "You believe a debt is inaccurate, already paid, or not yours.",
      "You want to dispute a debt while preserving your FDCPA validation rights.",
      "You need a written record of your dispute for credit reporting purposes.",
    ],
    whenNotToUse: [
      "You acknowledge the debt and want to settle or set up a payment plan.",
      "The debt is from a government agency (different dispute process).",
      "You need legal advice on bankruptcy or debt litigation.",
    ],
    officialSources: [
      { title: "Debt Collection | Consumer Financial Protection Bureau", publisher: "Consumer Financial Protection Bureau", url: "https://www.consumerfinance.gov/consumer-tools/debt-collection/", reviewedAt: REVIEWED },
      { title: "How do I dispute an error on my credit report?", publisher: "Consumer Financial Protection Bureau", url: "https://www.consumerfinance.gov/ask-cfpb/how-do-i-dispute-an-error-on-my-credit-report-en-314/", reviewedAt: REVIEWED },
    ],
    checklist: [
      "Debt notice or collection letter",
      "Account number and creditor information",
      "Any evidence the debt is inaccurate or already paid",
      "Credit report showing the disputed debt",
      "Written dispute letter",
      "Proof of mailing (certified mail recommended)",
    ],
    faq: [
      "How do I dispute a debt I believe is not mine?",
      "What is the difference between debt validation and a credit report dispute?",
      "Can a disputed debt appear on my credit report?",
      "What happens after I send a debt dispute letter?",
    ],
    authorityNote: "A debt dispute triggers different rights depending on the stage. Under the FDCPA, disputing within 30 days requires the collector to validate. Under the FCRA, disputing with a credit bureau requires investigation within 30 days. The CFPB recommends disputing both with the collector and the credit bureau simultaneously.",
  },

  "dispute/credit-report": {
    overview: "A workflow for disputing errors on a credit report. Reads the credit report to identify inaccuracies, prepares a dispute with supporting documentation to both the credit bureau and the furnisher, and tracks the 30-day investigation timeline.",
    whenToUse: [
      "You found an error on your credit report (wrong account, incorrect balance, outdated information).",
      "You want to dispute with both the credit bureau and the furnisher as required by FCRA.",
      "You have supporting documentation for the dispute.",
    ],
    whenNotToUse: [
      "You have not yet obtained a copy of your credit report.",
      "The information is accurate but you want it removed (FCRA only requires removal of inaccurate or obsolete information).",
      "You want to dispute identity theft (file an FTC Identity Theft Report first).",
    ],
    officialSources: [
      { title: "How do I dispute an error on my credit report?", publisher: "Consumer Financial Protection Bureau", url: "https://www.consumerfinance.gov/ask-cfpb/how-do-i-dispute-an-error-on-my-credit-report-en-314/", reviewedAt: REVIEWED },
      { title: "Disputing Errors on Your Credit Reports", publisher: "Federal Trade Commission", url: "https://consumer.ftc.gov/articles/disputing-errors-your-credit-reports", reviewedAt: REVIEWED },
      { title: "Sample letters to dispute information on a credit report", publisher: "Consumer Financial Protection Bureau", url: "https://www.consumerfinance.gov/consumer-tools/credit-reports-and-scores/sample-letters-dispute-credit-report-information/", reviewedAt: REVIEWED },
    ],
    checklist: [
      "Copy of credit report from Equifax, Experian, and/or TransUnion",
      "Identification of specific errors with account numbers",
      "Supporting documentation (payment records, court documents, etc.)",
      "Dispute letter to each credit bureau with the error",
      "Dispute letter to the furnisher (creditor or collection agency)",
      "Proof of mailing for all disputes",
      "Calendar noting the 30-day investigation deadline",
    ],
    faq: [
      "How long does a credit bureau have to investigate a dispute?",
      "Should I dispute with the credit bureau, the furnisher, or both?",
      "What happens if the credit bureau says my dispute is frivolous?",
      "Can I dispute credit report errors online or must I write?",
    ],
    authorityNote: "Under the FCRA (15 U.S.C. 1681i), credit bureaus must investigate disputes within 30 days (45 days if additional information is provided). The CFPB recommends disputing with both the credit bureau and the furnisher. If the bureau considers the dispute frivolous, it must notify the consumer within 5 business days. Unverified information must be deleted.",
  },

  "dispute/credit-report-collections": {
    overview: "A workflow for disputing collection accounts on a credit report. Identifies whether the collection is accurate, validated, within the reporting period, and properly attributed, then prepares a dispute targeting the specific issue.",
    whenToUse: [
      "A collection account appears on your credit report that you believe is inaccurate or unverified.",
      "You want to dispute a collection that was never validated under the FDCPA.",
      "The collection is older than 7 years and should have been removed.",
    ],
    whenNotToUse: [
      "The collection is accurate and within the 7-year reporting period.",
      "You want to negotiate a pay-for-delete (different approach).",
      "The collection is from a government debt (different dispute process).",
    ],
    officialSources: [
      { title: "How do I dispute an error on my credit report?", publisher: "Consumer Financial Protection Bureau", url: "https://www.consumerfinance.gov/ask-cfpb/how-do-i-dispute-an-error-on-my-credit-report-en-314/", reviewedAt: REVIEWED },
      { title: "Disputing Errors on Your Credit Reports", publisher: "Federal Trade Commission", url: "https://consumer.ftc.gov/articles/disputing-errors-your-credit-reports", reviewedAt: REVIEWED },
      { title: "The law requires companies to delete disputed unverified information", publisher: "Consumer Financial Protection Bureau", url: "https://www.consumerfinance.gov/archive/blog/the-law-requires-companies-to-delete-disputed-unverified-information-from-consumer-reports/", reviewedAt: REVIEWED },
    ],
    checklist: [
      "Credit report showing the collection account",
      "Collection agency name and account number",
      "Evidence the collection is inaccurate, unvalidated, or outdated",
      "FDCPA validation request (if not previously requested)",
      "Dispute letter to the credit bureau",
      "Dispute letter to the collection agency as furnisher",
      "Proof of mailing for all disputes",
    ],
    faq: [
      "How long can a collection stay on my credit report?",
      "Can I dispute a collection that was never validated?",
      "What if the collection agency verifies but I still dispute the debt?",
      "How do I dispute a collection that is not mine?",
    ],
    authorityNote: "Under the FCRA, collection accounts can be reported for 7 years plus 180 days from the original delinquency date. If a consumer disputes a collection on their credit report, the bureau must investigate within 30 days. If the furnisher cannot verify the information, it must be deleted.",
  },

  "dispute/hard-inquiry": {
    overview: "A workflow for disputing unauthorized hard inquiries on a credit report. Identifies inquiries the consumer did not authorize, prepares a dispute to the credit bureaus citing FCRA requirements, and includes a request for the inquiry to be removed.",
    whenToUse: [
      "You found hard inquiries on your credit report that you did not authorize.",
      "You suspect identity theft or fraud resulted in unauthorized credit applications.",
      "You want unauthorized inquiries removed from your credit report.",
    ],
    whenNotToUse: [
      "The inquiry was authorized (you applied for credit and gave consent).",
      "You want to remove legitimate inquiries to improve your score (FCRA does not require removal of accurate inquiries).",
      "The inquiry is a soft inquiry (these do not affect credit scores).",
    ],
    officialSources: [
      { title: "How do I dispute an error on my credit report?", publisher: "Consumer Financial Protection Bureau", url: "https://www.consumerfinance.gov/ask-cfpb/how-do-i-dispute-an-error-on-my-credit-report-en-314/", reviewedAt: REVIEWED },
      { title: "Sample letters to dispute information on a credit report", publisher: "Consumer Financial Protection Bureau", url: "https://www.consumerfinance.gov/consumer-tools/credit-reports-and-scores/sample-letters-dispute-credit-report-information/", reviewedAt: REVIEWED },
      { title: "Disputing Errors on Your Credit Reports", publisher: "Federal Trade Commission", url: "https://consumer.ftc.gov/articles/disputing-errors-your-credit-reports", reviewedAt: REVIEWED },
    ],
    checklist: [
      "Credit report showing the unauthorized hard inquiry",
      "Date and name of the creditor who made the inquiry",
      "Statement that you did not authorize the inquiry",
      "Any evidence of identity theft (if applicable, file an FTC Identity Theft Report)",
      "Dispute letter to each credit bureau",
      "Proof of mailing",
    ],
    faq: [
      "What is a hard inquiry versus a soft inquiry?",
      "How long do hard inquiries stay on a credit report?",
      "Can I remove a hard inquiry I did not authorize?",
      "What if the credit bureau verifies the inquiry as authorized?",
    ],
    authorityNote: "Hard inquiries require the consumer's permission under the FCRA. Unauthorized inquiries can be disputed with the credit bureaus, which must investigate within 30 days. If the inquiry cannot be verified as authorized, it must be removed. Hard inquiries remain on credit reports for 2 years.",
  },

  "dispute/charge-off": {
    overview: "A workflow for disputing a charge-off on a credit report. Reads the charge-off entry to determine whether it is accurate, within the reporting period, properly attributed, and whether the amount is correct, then prepares a targeted dispute.",
    whenToUse: [
      "A charge-off appears on your credit report that you believe is inaccurate.",
      "The charge-off amount is wrong or the date is incorrect.",
      "The charge-off is older than 7 years and should have been removed.",
    ],
    whenNotToUse: [
      "The charge-off is accurate and within the 7-year reporting period.",
      "You want to negotiate a settlement of the charged-off debt (use a payment workflow).",
      "The charge-off resulted from identity theft (file an FTC Identity Theft Report first).",
    ],
    officialSources: [
      { title: "How do I dispute an error on my credit report?", publisher: "Consumer Financial Protection Bureau", url: "https://www.consumerfinance.gov/ask-cfpb/how-do-i-dispute-an-error-on-my-credit-report-en-314/", reviewedAt: REVIEWED },
      { title: "Disputing Errors on Your Credit Reports", publisher: "Federal Trade Commission", url: "https://consumer.ftc.gov/articles/disputing-errors-your-credit-reports", reviewedAt: REVIEWED },
    ],
    checklist: [
      "Credit report showing the charge-off entry",
      "Creditor name, account number, and charge-off date",
      "Evidence the charge-off is inaccurate (payment records, settlement documentation)",
      "Calculation of whether the 7-year reporting period has expired",
      "Dispute letter to the credit bureau",
      "Dispute letter to the creditor as furnisher",
      "Proof of mailing",
    ],
    faq: [
      "How long can a charge-off stay on my credit report?",
      "Can I dispute a charge-off if I still owe the debt?",
      "What is the difference between a charge-off and a collection?",
      "Does paying a charge-off remove it from my credit report?",
    ],
    authorityNote: "Under the FCRA, charge-offs can be reported for 7 years plus 180 days from the original delinquency date. The charge-off date is the date the creditor charged off the account, not the date of last payment. Disputing with both the credit bureau and the furnisher is required for investigation.",
  },

  "dispute/medical-collections": {
    overview: "A workflow for disputing medical collections on a credit report. Identifies whether the medical collection is accurate, properly attributed, and within the applicable reporting restrictions, then prepares a dispute citing FCRA and CFPB medical debt rules.",
    whenToUse: [
      "A medical collection appears on your credit report that you believe is inaccurate.",
      "You want to dispute a medical collection under the FCRA and CFPB medical debt rules.",
      "The medical collection is unpaid and you want to understand the reporting rules.",
    ],
    whenNotToUse: [
      "The medical collection is accurate and you want to negotiate payment.",
      "You are disputing a non-medical collection (use the general credit report dispute workflow).",
      "You need advice on medical billing errors (contact the provider or your insurer).",
    ],
    officialSources: [
      { title: "CFPB Finalizes Rule to Remove Medical Bills from Credit Reports", publisher: "Consumer Financial Protection Bureau", url: "https://www.consumerfinance.gov/archive/newsroom/cfpb-finalizes-rule-to-remove-medical-bills-from-credit-reports/", reviewedAt: REVIEWED },
      { title: "Consumer Credit and the Removal of Medical Collections from Credit Reports", publisher: "Consumer Financial Protection Bureau", url: "https://www.consumerfinance.gov/data-research/research-reports/consumer-credit-and-the-removal-of-medical-collections-from-credit-reports/", reviewedAt: REVIEWED },
      { title: "How do I dispute an error on my credit report?", publisher: "Consumer Financial Protection Bureau", url: "https://www.consumerfinance.gov/ask-cfpb/how-do-i-dispute-an-error-on-my-credit-report-en-314/", reviewedAt: REVIEWED },
    ],
    checklist: [
      "Credit report showing the medical collection",
      "Medical provider name and account number",
      "Any insurance Explanation of Benefits (EOB) related to the debt",
      "Evidence the collection is inaccurate or already paid",
      "Dispute letter to the credit bureau",
      "Dispute letter to the collection agency",
      "Proof of mailing",
    ],
    faq: [
      "Are medical bills included on credit reports?",
      "How long do medical collections stay on a credit report?",
      "Can I dispute a medical collection if I have insurance?",
      "What is the CFPB rule on medical debt and credit reports?",
    ],
    authorityNote: "The CFPB finalized a rule to ban medical bills from credit reports, though a court subsequently vacated this rule. The three major credit bureaus voluntarily removed paid medical collections and set a 1-year waiting period before unpaid medical collections appear. Consumers can still dispute inaccurate medical collections under the FCRA.",
  },

  "dispute/student-loan": {
    overview: "A workflow for disputing student loan account errors. Identifies whether the dispute is about servicing errors, incorrect reporting, payment processing, or eligibility, and routes to the appropriate dispute path.",
    whenToUse: [
      "Your student loan servicer made an error in payment processing, account status, or reporting.",
      "You want to dispute inaccurate student loan information on your credit report.",
      "You want to file a complaint with the FSA Ombudsman about a federal loan dispute.",
    ],
    whenNotToUse: [
      "You want to apply for loan forgiveness or income-driven repayment (contact your servicer).",
      "Your loan is in default and you need rehabilitation (different process).",
      "You have a private student loan dispute (contact the lender or CFPB).",
    ],
    officialSources: [
      { title: "Feedback and Ombudsman", publisher: "Federal Student Aid", url: "https://studentaid.gov/feedback-ombudsman", reviewedAt: REVIEWED },
      { title: "Federal Student Aid Ombudsman Group", publisher: "Federal Student Aid", url: "https://studentaid.gov/help-center/answers/article/how-to-contact-ombudsman-group", reviewedAt: REVIEWED },
      { title: "Submit a Complaint", publisher: "Consumer Financial Protection Bureau", url: "https://www.consumerfinance.gov/complaint/", reviewedAt: REVIEWED },
    ],
    checklist: [
      "Student loan account statements and payment history",
      "Servicer name and account number",
      "Credit report showing the student loan entry",
      "Documentation of the specific error or dispute",
      "Written dispute to the servicer",
      "FSA Ombudsman complaint (for federal loans)",
      "CFPB complaint (for private loans or servicer issues)",
    ],
    faq: [
      "How do I dispute a student loan error with my servicer?",
      "What is the FSA Ombudsman and when should I contact them?",
      "Can I dispute student loan information on my credit report?",
      "What is the difference between federal and private student loan disputes?",
    ],
    authorityNote: "For federal student loans, the Federal Student Aid Ombudsman Group at the Department of Education helps resolve disputes. Contact them at studentaid.gov/feedback-ombudsman or 1-877-557-2575. For private loans or servicer complaints, the CFPB accepts complaints at consumerfinance.gov/complaint.",
  },

  "dispute/credit-card-billing": {
    overview: "A workflow for disputing credit card billing errors under the Fair Credit Billing Act. Reads the billing statement to identify the error, prepares a written billing error notice within 60 days, and tracks the creditor's 90-day response timeline.",
    whenToUse: [
      "Your credit card statement contains a billing error (wrong amount, unauthorized charge, undelivered goods).",
      "You are within 60 days of the statement date containing the error.",
      "You want to exercise your FCBA billing error rights.",
    ],
    whenNotToUse: [
      "More than 60 days have passed since the statement with the error (FCBA deadline is strict).",
      "You want to dispute a debit card or electronic transfer (use EFTA dispute rights).",
      "You are disputing the quality of goods or services (different FCBA provision).",
    ],
    officialSources: [
      { title: "Using Credit Cards and Disputing Charges", publisher: "Federal Trade Commission", url: "https://consumer.ftc.gov/articles/using-credit-cards-and-disputing-charges", reviewedAt: REVIEWED },
      { title: "Fair Credit Billing Act", publisher: "Federal Trade Commission", url: "https://www.ftc.gov/legal-library/browse/statutes/fair-credit-billing-act", reviewedAt: REVIEWED },
      { title: "Section 1026.13 Billing error resolution", publisher: "Consumer Financial Protection Bureau", url: "https://www.consumerfinance.gov/rules-policy/regulations/1026/13", reviewedAt: REVIEWED },
    ],
    checklist: [
      "Credit card statement showing the billing error",
      "Account number and creditor name",
      "Description of the specific error and why it is wrong",
      "Written billing error notice sent within 60 days",
      "Mailing address for billing inquiries (not the payment address)",
      "Proof of mailing (certified mail recommended)",
    ],
    faq: [
      "What is the deadline for disputing a credit card billing error?",
      "What types of errors does the FCBA cover?",
      "Where do I send a billing error dispute?",
      "How long does the creditor have to respond to my dispute?",
    ],
    authorityNote: "Under the Fair Credit Billing Act (15 U.S.C. 1666), consumers must send a written billing error notice within 60 days of the statement date. The notice must go to the billing inquiries address, not the payment address. The creditor must acknowledge within 30 days and resolve within 90 days (two billing cycles).",
  },

  "dispute/unauthorized-charge": {
    overview: "A workflow for disputing an unauthorized charge on a debit card, credit card, or bank account. Identifies whether the charge falls under EFTA (debit/electronic) or FCBA (credit card), and prepares a dispute within the applicable deadline.",
    whenToUse: [
      "You found an unauthorized charge on your debit card, credit card, or bank account.",
      "You want to report the unauthorized charge within the required timeframe.",
      "You need to document the dispute for your financial institution.",
    ],
    whenNotToUse: [
      "You authorized the charge but are dissatisfied with the product or service (different dispute type).",
      "You suspect identity theft (file a report at IdentityTheft.gov first).",
      "The charge is from a family member or someone you gave access to (may not be unauthorized under EFTA).",
    ],
    officialSources: [
      { title: "Electronic Fund Transfers FAQs", publisher: "Consumer Financial Protection Bureau", url: "https://www.consumerfinance.gov/compliance/compliance-resources/deposit-accounts-resources/electronic-fund-transfers/electronic-fund-transfers-faqs/", reviewedAt: REVIEWED },
      { title: "Section 1005.11 Procedures for resolving errors", publisher: "Consumer Financial Protection Bureau", url: "https://www.consumerfinance.gov/rules-policy/regulations/1005/11", reviewedAt: REVIEWED },
      { title: "Using Credit Cards and Disputing Charges", publisher: "Federal Trade Commission", url: "https://consumer.ftc.gov/articles/using-credit-cards-and-disputing-charges", reviewedAt: REVIEWED },
    ],
    checklist: [
      "Bank or card statement showing the unauthorized charge",
      "Date, amount, and merchant name for the charge",
      "Account number and financial institution name",
      "Written notice to the financial institution",
      "Deadline: 60 days from statement date for EFTA; 60 days for FCBA",
      "If identity theft suspected: FTC Identity Theft Report",
      "Proof of mailing or online dispute confirmation",
    ],
    faq: [
      "What is my liability for an unauthorized debit card charge?",
      "How long do I have to report an unauthorized charge?",
      "What is the difference between EFTA and FCBA protections?",
      "Can I dispute an unauthorized charge online or must I write?",
    ],
    authorityNote: "Under the EFTA (15 U.S.C. 1693f) and Regulation E (12 CFR 1005.11), consumers must report unauthorized electronic fund transfers within 60 days of the statement date. Liability is limited to $50 if reported within 2 business days, $500 if reported within 60 days. For credit cards, the FCBA limits liability to $50 and requires written notice within 60 days.",
  },

  "dispute/billing-error": {
    overview: "A general workflow for disputing a billing error on any account. Reads the bill or statement to identify the error type, and prepares a written dispute citing the appropriate consumer protection law.",
    whenToUse: [
      "You found a billing error on a credit card, utility bill, medical bill, or other account.",
      "You want to dispute the error in writing to preserve your consumer rights.",
      "You need to identify which consumer protection law applies.",
    ],
    whenNotToUse: [
      "You simply want to ask for a courtesy adjustment (call the merchant first).",
      "The error is on a tax bill or government assessment (different process).",
      "The billing error is from fraud or identity theft (file an Identity Theft Report).",
    ],
    officialSources: [
      { title: "Using Credit Cards and Disputing Charges", publisher: "Federal Trade Commission", url: "https://consumer.ftc.gov/articles/using-credit-cards-and-disputing-charges", reviewedAt: REVIEWED },
      { title: "Section 1026.13 Billing error resolution", publisher: "Consumer Financial Protection Bureau", url: "https://www.consumerfinance.gov/rules-policy/regulations/1026/13", reviewedAt: REVIEWED },
    ],
    checklist: [
      "Bill or statement showing the error",
      "Account number and merchant or service provider name",
      "Description of the specific error",
      "Supporting documentation (receipts, contracts, prior statements)",
      "Written dispute letter",
      "Proof of mailing",
      "Deadline tracking (60 days for credit cards and EFTs)",
    ],
    faq: [
      "What types of billing errors can I dispute?",
      "How long do I have to dispute a billing error?",
      "What law protects me from billing errors on my credit card?",
      "What if the merchant refuses to correct the error?",
    ],
    authorityNote: "Billing error protections vary by account type. Credit cards are covered by the FCBA (15 U.S.C. 1666) with a 60-day written notice deadline. Debit cards and electronic transfers are covered by the EFTA (15 U.S.C. 1693f) with a 60-day reporting deadline. Other billing errors may be governed by state consumer protection laws.",
  },

  "dispute/cease-contact": {
    overview: "A workflow for sending a cease communication request to a debt collector. Prepares a written cease letter citing FDCPA Section 805, which requires the collector to stop all communication except to confirm cessation or notify of specific remedies.",
    whenToUse: [
      "You want a debt collector to stop contacting you.",
      "You have been harassed or subjected to excessive calls by a collector.",
      "You want to invoke your FDCPA right to cease communication.",
    ],
    whenNotToUse: [
      "The contact is from an original creditor, not a third-party debt collector (FDCPA may not apply).",
      "You want to negotiate or settle the debt (a cease letter may limit communication options).",
      "You are facing litigation and need to respond to a court summons (different process).",
    ],
    officialSources: [
      { title: "How do I get a debt collector to stop calling or contacting me?", publisher: "Consumer Financial Protection Bureau", url: "https://www.consumerfinance.gov/ask-cfpb/how-do-i-get-a-debt-collector-to-stop-contacting-me-en-1411/", reviewedAt: REVIEWED },
      { title: "Section 1006.6 Communications in connection with debt collection", publisher: "Consumer Financial Protection Bureau", url: "https://www.consumerfinance.gov/rules-policy/regulations/1006/6", reviewedAt: REVIEWED },
      { title: "Fair Debt Collection Practices Act", publisher: "Federal Trade Commission", url: "https://www.ftc.gov/legal-library/browse/rules/fair-debt-collection-practices-act-text", reviewedAt: REVIEWED },
    ],
    checklist: [
      "Debt collector's name and mailing address",
      "Account number and debt reference",
      "Written cease communication letter",
      "Statement that you wish the collector to cease all communication",
      "Certified mail with return receipt",
      "Copy of the letter kept for your records",
    ],
    faq: [
      "Can a debt collector contact me after I send a cease letter?",
      "What exceptions allow a debt collector to contact me after a cease request?",
      "Does a cease letter apply to the original creditor?",
      "What should I do if the collector ignores my cease request?",
    ],
    authorityNote: "Under FDCPA Section 805 (15 U.S.C. 1692c) and CFPB Regulation F (12 CFR 1006.6), a debt collector must cease communication if the consumer requests in writing. The collector may only contact the consumer to advise that collection efforts are being ceased or to notify of specific remedies (e.g., filing a lawsuit).",
  },

  "dispute/follow-up-no-response": {
    overview: "A workflow for following up on a dispute that received no response. Identifies the original dispute, the deadline that was missed, and prepares a follow-up letter that escalates to the CFPB or state attorney general if necessary.",
    whenToUse: [
      "You sent a dispute letter and received no response within the required timeframe.",
      "A credit bureau or furnisher did not investigate within 30 days.",
      "A debt collector did not validate a debt after your request.",
    ],
    whenNotToUse: [
      "You have not yet sent the initial dispute (send it first).",
      "The response deadline has not yet passed.",
      "You received a response but disagree with it (use the inadequate response workflow).",
    ],
    officialSources: [
      { title: "Submit a Complaint", publisher: "Consumer Financial Protection Bureau", url: "https://www.consumerfinance.gov/complaint/", reviewedAt: REVIEWED },
      { title: "What if I disagree with the results of my credit report dispute?", publisher: "Consumer Financial Protection Bureau", url: "https://www.consumerfinance.gov/ask-cfpb/what-if-i-disagree-with-the-results-of-my-credit-report-dispute-en-1327/", reviewedAt: REVIEWED },
    ],
    checklist: [
      "Copy of the original dispute letter and proof of mailing",
      "Date the dispute was sent and the response deadline",
      "Any partial or no response received",
      "Follow-up letter referencing the original dispute",
      "CFPB complaint (if escalation is needed)",
      "State attorney general complaint (if applicable)",
    ],
    faq: [
      "What happens if a credit bureau does not investigate within 30 days?",
      "How do I escalate a dispute that was ignored?",
      "Can I file a CFPB complaint about a non-responsive debt collector?",
      "What remedies are available if my dispute was ignored?",
    ],
    authorityNote: "Under the FCRA, if a credit bureau does not investigate within 30 days (or 45 days with additional information), the disputed information must be deleted. For FDCPA violations, a debt collector's failure to validate after a timely dispute means collection must cease. Consumers can escalate by filing a complaint with the CFPB.",
  },

  "dispute/inadequate-response": {
    overview: "A workflow for escalating a dispute that received an inadequate response. Reads the response to identify why it is insufficient, prepares an escalation letter citing the applicable law, and routes to the CFPB or legal action if necessary.",
    whenToUse: [
      "You received a response to your dispute but it did not address the issues.",
      "The credit bureau verified information you know is inaccurate.",
      "A debt collector provided inadequate validation.",
    ],
    whenNotToUse: [
      "You have not yet received any response (use the follow-up no-response workflow).",
      "The response fully resolved your dispute.",
      "You want to accept the response and move on.",
    ],
    officialSources: [
      { title: "What if I disagree with the results of my credit report dispute?", publisher: "Consumer Financial Protection Bureau", url: "https://www.consumerfinance.gov/ask-cfpb/what-if-i-disagree-with-the-results-of-my-credit-report-dispute-en-1327/", reviewedAt: REVIEWED },
      { title: "Submit a Complaint", publisher: "Consumer Financial Protection Bureau", url: "https://www.consumerfinance.gov/complaint/", reviewedAt: REVIEWED },
    ],
    checklist: [
      "The original dispute letter and proof of mailing",
      "The response received (letter, email, or credit report update)",
      "Analysis of why the response is inadequate",
      "Escalation letter with supporting documentation",
      "CFPB complaint (if applicable)",
      "Request for method of verification from the credit bureau",
    ],
    faq: [
      "What can I do if the credit bureau verified inaccurate information?",
      "How do I request the method of verification from a credit bureau?",
      "Can I sue for FCRA violations?",
      "How do I escalate to the CFPB?",
    ],
    authorityNote: "Under the FCRA, consumers can request a description of the procedure used to verify disputed information (method of verification). If the bureau cannot provide this, the information must be deleted. The statute of limitations for FCRA claims is generally 2 years from the violation.",
  },

  "dispute/subscription-billing": {
    overview: "A workflow for disputing recurring subscription charges. Identifies whether the subscription was cancelled, the charge is unauthorized, or the billing amount is incorrect, and prepares a dispute to the merchant and card issuer.",
    whenToUse: [
      "You are being charged for a subscription you already cancelled.",
      "A subscription charge is higher than agreed or appears without consent.",
      "You want to dispute recurring charges through your card issuer.",
    ],
    whenNotToUse: [
      "You want to cancel a subscription (send a cancellation request first).",
      "You are disputing the quality of a subscription service (contact the merchant).",
      "The subscription is a free trial that converted to paid (check the terms).",
    ],
    officialSources: [
      { title: "Using Credit Cards and Disputing Charges", publisher: "Federal Trade Commission", url: "https://consumer.ftc.gov/articles/using-credit-cards-and-disputing-charges", reviewedAt: REVIEWED },
      { title: "Submit a Complaint", publisher: "Consumer Financial Protection Bureau", url: "https://www.consumerfinance.gov/complaint/", reviewedAt: REVIEWED },
    ],
    checklist: [
      "Subscription agreement or terms of service",
      "Billing statements showing the disputed charges",
      "Cancellation confirmation (if applicable)",
      "Written dispute to the merchant",
      "Dispute with the card issuer if merchant does not resolve",
      "Proof of cancellation or evidence the charge is unauthorized",
    ],
    faq: [
      "Can I dispute a subscription charge I already cancelled?",
      "How do I stop recurring charges on my credit card?",
      "What if the merchant says I agreed to the charges?",
      "Can I file a chargeback for a subscription?",
    ],
    authorityNote: "Subscription billing disputes can be addressed through the merchant directly, the card issuer (FCBA billing error dispute for credit cards, EFTA for debit), or the CFPB. The FTC's Negative Option Rule (16 CFR 425) requires clear disclosure of subscription terms and easy cancellation.",
  },

  "dispute/service-contract": {
    overview: "A workflow for disputing charges or terms under a service contract. Reads the contract to identify the disputed term or charge, prepares a written dispute citing the contract language and applicable consumer protection laws.",
    whenToUse: [
      "You are being charged for services not received or not as described in the contract.",
      "The contract terms are being applied incorrectly.",
      "You want to dispute a charge while citing the specific contract provisions.",
    ],
    whenNotToUse: [
      "You want to cancel a service (use a cancellation letter workflow).",
      "The dispute is about a credit card billing error (use FCBA dispute rights).",
      "You need legal advice on contract interpretation.",
    ],
    officialSources: [
      { title: "Submit a Complaint", publisher: "Consumer Financial Protection Bureau", url: "https://www.consumerfinance.gov/complaint/", reviewedAt: REVIEWED },
    ],
    checklist: [
      "Service contract or agreement",
      "Billing statements showing the disputed charges",
      "Correspondence with the service provider",
      "Written dispute letter citing specific contract provisions",
      "Evidence that services were not rendered or terms were breached",
      "Proof of mailing",
    ],
    faq: [
      "What can I do if a service provider charges for services not rendered?",
      "How do I dispute a charge under a service contract?",
      "Can I file a complaint about a service provider?",
      "What consumer protections apply to service contracts?",
    ],
    authorityNote: "Service contract disputes are governed by the contract terms, state consumer protection laws, and potentially the FTC Act (prohibiting unfair and deceptive practices). Consumers can file complaints with the CFPB, FTC, or state attorney general.",
  },

  "dispute/insurance-billing": {
    overview: "A workflow for disputing insurance billing or payment errors. Reads the EOB or billing statement to identify whether the error is in coverage, coding, payment amount, or patient responsibility, and prepares a dispute to the insurer.",
    whenToUse: [
      "Your insurance company billed you incorrectly or applied the wrong coverage.",
      "The EOB shows an error in coding, payment, or patient responsibility.",
      "You want to dispute a billing error with the insurer before contacting the provider.",
    ],
    whenNotToUse: [
      "You are appealing a coverage denial (use the insurance appeal workflow).",
      "The billing error is from the medical provider, not the insurer (contact the provider).",
      "You need legal advice on insurance bad faith claims.",
    ],
    officialSources: [
      { title: "How to File a Complaint", publisher: "National Association of Insurance Commissioners", url: "https://content.naic.org/consumer/how-to-file-complaint", reviewedAt: REVIEWED },
      { title: "Submit a Complaint", publisher: "Consumer Financial Protection Bureau", url: "https://www.consumerfinance.gov/complaint/", reviewedAt: REVIEWED },
    ],
    checklist: [
      "EOB or billing statement showing the error",
      "Insurance policy or plan document",
      "Provider billing statements and coding information",
      "Prior correspondence with the insurer",
      "Written dispute letter identifying the specific billing error",
      "State insurance department complaint (if escalation needed)",
    ],
    faq: [
      "How do I dispute an insurance billing error?",
      "What is an EOB and how do I read it?",
      "Can I file a complaint about insurance billing errors?",
      "What is the difference between a billing dispute and a coverage appeal?",
    ],
    authorityNote: "Insurance billing disputes should first be directed to the insurer's customer service or billing department. If unresolved, consumers can file a complaint with the state insurance department (find contact information through the NAIC). Billing errors may involve incorrect coding, wrong plan tier, or coordination of benefits issues.",
  },

  "immigration/respond-to-notice": {
    overview: "A workflow for responding to a USCIS notice or Request for Evidence (RFE). Reads the notice to identify the requested evidence, the deadline, and the specific eligibility being evaluated, then prepares a response package with organized supporting documents.",
    whenToUse: [
      "You received a Request for Evidence (RFE), Notice of Intent to Deny (NOID), or other USCIS notice.",
      "You need to respond within the deadline stated in the notice.",
      "You have the evidence requested and want to organize it properly.",
    ],
    whenNotToUse: [
      "You need legal advice on immigration eligibility (consult an immigration attorney).",
      "You have not yet received the USCIS notice.",
      "The notice is from a consulate or embassy (different process).",
    ],
    officialSources: [
      { title: "Chapter 6 - Evidence", publisher: "U.S. Citizenship and Immigration Services", url: "https://www.uscis.gov/policy-manual/volume-1-part-e-chapter-6", reviewedAt: REVIEWED },
      { title: "Request for Evidence (RFE)", publisher: "U.S. Citizenship and Immigration Services", url: "https://www.uscis.gov/glossary-term/79521", reviewedAt: REVIEWED },
    ],
    checklist: [
      "The original USCIS notice (RFE, NOID, or other)",
      "Receipt number for the application or petition",
      "List of each item requested in the notice",
      "Supporting evidence for each requested item",
      "Cover letter organizing the response",
      "Deadline for response (typically 87 days for RFEs)",
      "Mailing address specified in the notice",
    ],
    faq: [
      "How long do I have to respond to a USCIS RFE?",
      "What should I include in my RFE response?",
      "Can I get an extension on my RFE deadline?",
      "What happens if I do not respond to the RFE?",
    ],
    authorityNote: "USCIS typically gives 87 days to respond to an RFE. The response must include all requested evidence and a cover letter organizing the submission. If the applicant does not respond by the deadline, USCIS may deny the application based on the existing record. The RFE notice specifies the exact deadline and mailing address.",
  },

  "immigration/supporting-documents": {
    overview: "A workflow for organizing and submitting supporting documents for an immigration application or response. Identifies what documents are needed, ensures they meet USCIS formatting requirements, and prepares an organized submission package.",
    whenToUse: [
      "You need to submit supporting documents with an immigration application or RFE response.",
      "You want to ensure documents meet USCIS translation and certification requirements.",
      "You need to organize documents to match the specific evidence requests.",
    ],
    whenNotToUse: [
      "You need to determine which visa or immigration benefit to apply for (consult an attorney).",
      "Your documents are not yet available (request them first).",
      "You need to file a new application (use the application workflow).",
    ],
    officialSources: [
      { title: "Chapter 6 - Evidence", publisher: "U.S. Citizenship and Immigration Services", url: "https://www.uscis.gov/policy-manual/volume-1-part-e-chapter-6", reviewedAt: REVIEWED },
      { title: "Request for Evidence (RFE)", publisher: "U.S. Citizenship and Immigration Services", url: "https://www.uscis.gov/glossary-term/79521", reviewedAt: REVIEWED },
    ],
    checklist: [
      "List of required documents from the application instructions or RFE",
      "All original documents or certified copies",
      "English translations of all foreign-language documents",
      "Translator certification for each translation",
      "Cover letter organizing the documents by request number",
      "Copies of all documents (keep originals)",
      "USCIS filing address and correct fee",
    ],
    faq: [
      "Do foreign-language documents need to be translated for USCIS?",
      "What is a certified translation for immigration purposes?",
      "Can I submit photocopies or do I need originals?",
      "How should I organize my supporting documents?",
    ],
    authorityNote: "USCIS requires that all foreign-language documents include a certified English translation. The translator must certify that the translation is accurate and that they are competent to translate. USCIS accepts photocopies of most documents but may request originals at interview.",
  },

  "immigration/explanation-letter": {
    overview: "A workflow for preparing an explanation letter for an immigration application or response. Identifies what needs to be explained, and prepares a clear, factual letter that addresses the issue without speculation.",
    whenToUse: [
      "You need to explain a discrepancy, gap, or issue in your immigration application.",
      "An RFE asks for an explanation of a specific circumstance.",
      "You want to provide context for an issue that may affect your eligibility.",
    ],
    whenNotToUse: [
      "You need to provide legal arguments for eligibility (consult an attorney).",
      "The explanation involves criminal history that may affect admissibility (consult an attorney).",
      "You have not identified the specific issue that needs explanation.",
    ],
    officialSources: [
      { title: "Chapter 6 - Evidence", publisher: "U.S. Citizenship and Immigration Services", url: "https://www.uscis.gov/policy-manual/volume-1-part-e-chapter-6", reviewedAt: REVIEWED },
    ],
    checklist: [
      "The specific issue requiring explanation",
      "Factual timeline of events",
      "Supporting documentation for the explanation",
      "Clear, concise letter addressing the issue",
      "Reference to the relevant application or receipt number",
      "Submission with the application or RFE response",
    ],
    faq: [
      "What should I include in an immigration explanation letter?",
      "How detailed should the explanation be?",
      "Can an explanation letter overcome a legal issue?",
      "Should I include an explanation letter proactively or wait for an RFE?",
    ],
    authorityNote: "Explanation letters should be factual, concise, and limited to the specific issue. They should not include legal arguments or speculation. If the issue involves criminal history, prior immigration violations, or potential inadmissibility, consulting an immigration attorney is strongly recommended before submitting.",
  },

  "notice/irs-notice": {
    overview: "A workflow for responding to an IRS notice. Reads the notice to identify the type, the issue, the deadline, and the required action, then prepares a response with supporting documentation.",
    whenToUse: [
      "You received an IRS notice and want to understand what it requires.",
      "You need to respond by the deadline stated in the notice.",
      "You want to dispute or correct the information in the notice.",
    ],
    whenNotToUse: [
      "You need tax preparation or filing assistance (consult a tax professional).",
      "The notice is an audit notice (Form 4564 or similar, consult a CPA or tax attorney).",
      "You are under criminal investigation by the IRS (consult a tax attorney immediately).",
    ],
    officialSources: [
      { title: "IRS Notices and Letters", publisher: "Internal Revenue Service", url: "https://www.irs.gov/individuals/irs-notices-and-letters", reviewedAt: REVIEWED },
      { title: "Responding to a Notice", publisher: "Internal Revenue Service", url: "https://www.irs.gov/individuals/responding-to-a-notice", reviewedAt: REVIEWED },
    ],
    checklist: [
      "The IRS notice or letter (CP, LT, or other series)",
      "Notice number or letter number (e.g., CP2000, CP504)",
      "Tax year and return referenced",
      "Social Security Number or Taxpayer ID",
      "Supporting documentation for your response",
      "Deadline for response (typically 30 to 60 days)",
      "Response mailed to the address on the notice",
    ],
    faq: [
      "What should I do if I receive an IRS notice?",
      "How long do I have to respond to an IRS notice?",
      "Can I respond to an IRS notice online?",
      "What if I disagree with the IRS notice?",
    ],
    authorityNote: "IRS notices have specific response deadlines, typically 30 to 60 days from the notice date. Each notice type (CP series, LT series) addresses different issues. The notice will specify the required action and the address for response. Taxpayers can respond by mail, and some notices can be addressed online at IRS.gov.",
  },

  "notice/cp2000-response": {
    overview: "A workflow for responding to an IRS CP2000 notice. Reads the CP2000 to identify the proposed changes, the income or payment discrepancies, and the response deadline, then prepares a response accepting, partially disputing, or fully disputing the proposed adjustment.",
    whenToUse: [
      "You received a CP2000 notice proposing changes to your tax return.",
      "You need to respond within the 30-day deadline.",
      "You have documentation supporting your position on the reported income.",
    ],
    whenNotToUse: [
      "You agree with all proposed changes and just want to pay (sign and return the response form).",
      "You need to file an amended return (use Form 1040-X separately).",
      "The notice is not a CP2000 (use the general IRS notice workflow).",
    ],
    officialSources: [
      { title: "IRS Notices and Letters", publisher: "Internal Revenue Service", url: "https://www.irs.gov/individuals/irs-notices-and-letters", reviewedAt: REVIEWED },
      { title: "Responding to a Notice", publisher: "Internal Revenue Service", url: "https://www.irs.gov/individuals/responding-to-a-notice", reviewedAt: REVIEWED },
    ],
    checklist: [
      "CP2000 notice with proposed changes",
      "Response form included with the notice",
      "Documentation supporting your reported income (W-2, 1099, etc.)",
      "Explanation of any discrepancies",
      "Signed response within 30 days",
      "Mailed to the address on the CP2000",
    ],
    faq: [
      "What is a CP2000 notice?",
      "Do I have to pay the amount shown on the CP2000?",
      "What if I disagree with the proposed changes?",
      "Can I request more time to respond to a CP2000?",
    ],
    authorityNote: "A CP2000 is a proposed adjustment notice, not a bill. It shows discrepancies between the income reported on the tax return and information returns (W-2, 1099) filed by third parties. The taxpayer has 30 days to respond. If the taxpayer agrees, they sign and return the form. If they disagree, they provide documentation supporting their position. If unresolved, it may become a Statutory Notice of Deficiency (CP3219N).",
  },

  "notice/court-summons": {
    overview: "A workflow for responding to a court summons. Reads the summons to identify the court, case type, response deadline, and required action, then prepares an answer or response document with the correct court formatting.",
    whenToUse: [
      "You received a court summons and need to file a written response.",
      "You want to understand the deadline and required format for your response.",
      "You need to prepare an answer, motion, or appearance for filing.",
    ],
    whenNotToUse: [
      "You need legal advice on your case strategy (consult an attorney).",
      "The deadline to respond has passed (consult an attorney immediately).",
      "The summons is for jury duty (follow the court's instructions).",
    ],
    officialSources: [
      { title: "Responding to a Federal Lawsuit or Summons", publisher: "United States Courts", url: "https://www.uscourts.gov/services-forms/responding-federal-lawsuit-or-summons", reviewedAt: REVIEWED },
    ],
    checklist: [
      "The court summons and complaint",
      "Case number, court name, and jurisdiction",
      "Deadline for response (typically 20 to 30 days)",
      "Answer or response document in the correct format",
      "Filing fee or fee waiver application",
      "Certificate of service (proof you served the other party)",
    ],
    faq: [
      "How long do I have to respond to a court summons?",
      "What happens if I do not respond to a summons?",
      "Do I need a lawyer to respond to a summons?",
      "What is the difference between an answer and a motion?",
    ],
    authorityNote: "Court summons response deadlines vary by jurisdiction. Federal court typically requires a response within 21 days. State courts vary from 20 to 30 days. Failing to respond can result in a default judgment. This workflow provides document preparation only — legal advice requires a licensed attorney.",
  },

  "notice/agency-action": {
    overview: "A workflow for responding to a government agency action notice. Reads the notice to identify the agency, the action taken, the appeal process, and the deadline, then prepares a written response or appeal request with supporting documentation.",
    whenToUse: [
      "You received a notice of agency action (license revocation, benefit reduction, compliance violation).",
      "The notice specifies a response or appeal deadline.",
      "You want to request a hearing or file an administrative appeal.",
    ],
    whenNotToUse: [
      "You need legal representation for a complex administrative proceeding.",
      "The agency action is from a court (use the court summons workflow).",
      "The notice does not specify an appeal process.",
    ],
    officialSources: [
      { title: "Appeal a Decision We Made", publisher: "Social Security Administration", url: "https://www.ssa.gov/apply/appeal-decision-we-made", reviewedAt: REVIEWED },
    ],
    checklist: [
      "Agency action notice with the stated reason",
      "Agency name and case or reference number",
      "Appeal or hearing request form (varies by agency)",
      "Supporting documentation for your response",
      "Deadline for response or appeal",
      "Correct mailing address or online portal",
    ],
    faq: [
      "How do I appeal a government agency action?",
      "What is an administrative hearing?",
      "Can I get a hearing before the agency takes action?",
      "What if I miss the appeal deadline?",
    ],
    authorityNote: "Agency action appeals are governed by the Administrative Procedure Act (5 U.S.C. 551 et seq.) for federal agencies and by state administrative law for state agencies. Each agency has its own appeal process, deadlines, and forms. The notice must specify the available appeal rights.",
  },

  "notice/file-appeal": {
    overview: "A general workflow for filing an appeal of an adverse decision. Reads the decision to identify the appeal process, deadline, and required forms, then prepares a complete appeal filing with supporting documentation.",
    whenToUse: [
      "You received an adverse decision and want to file an appeal.",
      "The decision specifies an appeal process and deadline.",
      "You have additional evidence or arguments for the appeal.",
    ],
    whenNotToUse: [
      "The decision does not offer an appeal process.",
      "The appeal deadline has passed.",
      "You need legal representation for a complex appeal.",
    ],
    officialSources: [
      { title: "Appeal a Decision We Made", publisher: "Social Security Administration", url: "https://www.ssa.gov/apply/appeal-decision-we-made", reviewedAt: REVIEWED },
      { title: "Filing an Appeal", publisher: "Medicare.gov", url: "https://www.medicare.gov/providers-services/claims-appeals-complaints/appeals", reviewedAt: REVIEWED },
    ],
    checklist: [
      "Original decision or determination notice",
      "Appeal form required by the agency or insurer",
      "Supporting evidence and documentation",
      "Written statement of the basis for appeal",
      "Deadline for filing the appeal",
      "Filing fee (if applicable)",
      "Proof of filing or mailing",
    ],
    faq: [
      "How do I file an appeal?",
      "What forms do I need to file an appeal?",
      "What is the deadline for filing an appeal?",
      "Can I submit new evidence with my appeal?",
    ],
    authorityNote: "Appeal processes and deadlines vary by agency, insurer, and court. The decision notice must be read to identify the specific appeal process. Common appeal types include administrative appeals (SSA, Medicare, unemployment), insurance appeals (internal and external review), and court appeals (notice of appeal).",
  },

  "appeal/car-insurance-appeal": {
    overview: "A workflow for appealing a car insurance claim denial. Reads the denial letter to identify the reason for denial, and prepares an appeal letter citing the policy provisions and supporting evidence.",
    whenToUse: [
      "Your auto insurance claim was denied",
      "The insurer cited policy exclusions you believe don't apply",
      "You have additional evidence (photos, repair estimates, witness statements)"
    ],
    whenNotToUse: [
      "The claim is still under investigation",
      "You've already filed a lawsuit",
      "The denial is from a different type of insurance"
    ],
    officialSources: [
      { title: "NAIC Auto Insurance Claims Guide", publisher: "NAIC", url: "https://content.naic.org/article/consumer-insight-auto-insurance-claims-process", reviewedAt: REVIEWED }
    ],
    checklist: [
      "Review the denial letter for the specific reason",
      "Check your policy for the cited exclusion or limitation",
      "Gather repair estimates, photos, and police reports",
      "Write your appeal citing policy provisions that support coverage",
      "Send via certified mail with return receipt"
    ],
    faq: [
      "How long do I have to appeal?",
      "Most policies require appeal within the time stated in the policy, typically 30-60 days from denial"
    ],
    authorityNote: "State insurance commissioners oversee auto insurance appeals. Contact your state's DOI if the insurer doesn't respond.",
  },
  "appeal/claim-denial-letter": {
    overview: "A workflow for responding to a generic claim denial letter. Reads the denial to identify the reason, and prepares a rebuttal letter with evidence and legal authority.",
    whenToUse: [
      "You received a denial letter for any type of claim",
      "The denial cites a reason you can rebut with evidence",
      "You want to preserve your right to further appeal"
    ],
    whenNotToUse: [
      "The claim was approved",
      "You've already escalated to litigation",
      "The denial is from a court judgment"
    ],
    officialSources: [
      { title: "Filing an Insurance Claim: Your Rights", publisher: "NAIC", url: "https://content.naic.org/consumer-insight-filing-insurance-claim-your-rights", reviewedAt: REVIEWED }
    ],
    checklist: [
      "Read the denial letter carefully for the specific reason",
      "Identify the policy provision or law cited",
      "Gather evidence that contradicts the denial reason",
      "Write a rebuttal addressing each point",
      "Send via certified mail with return receipt"
    ],
    faq: [
      "What should I include in my appeal?",
      "Your name, claim number, denial reason, rebuttal with evidence, and request for reconsideration"
    ],
    authorityNote: "Most policies require written appeal within the stated time limit. Missing the deadline may waive your right to appeal.",
  },
  "appeal/sap-appeal": {
    overview: "A workflow for appealing a Satisfactory Academic Progress (SAP) suspension. Reads the SAP notification to identify the deficiency, and prepares an appeal letter with a documented plan for improvement.",
    whenToUse: [
      "You lost federal financial aid due to SAP failure",
      "You have extenuating circumstances (illness, family emergency)",
      "You have a realistic plan to meet SAP standards going forward"
    ],
    whenNotToUse: [
      "You're not on SAP probation",
      "Your aid was terminated for non-academic reasons",
      "You haven't spoken with your financial aid office yet"
    ],
    officialSources: [
      { title: "Satisfactory Academic Progress (SAP)", publisher: "Federal Student Aid", url: "https://studentaid.gov/understand-aid/eligibility/requirements/satisfactory-academic-progress", reviewedAt: REVIEWED }
    ],
    checklist: [
      "Review the SAP notification for the specific deficiency",
      "Document any extenuating circumstances with third-party evidence",
      "Create a realistic academic improvement plan",
      "Write the appeal including the documentation and plan",
      "Submit by the deadline stated by the financial aid office"
    ],
    faq: [
      "What is SAP?",
      "Satisfactory Academic Progress — the academic standard you must meet to keep federal financial aid"
    ],
    authorityNote: "Each school sets its own SAP policy and appeal deadline. Check with your financial aid office for specific requirements.",
  },
  "appeal/financial-aid-suspension-appeal": {
    overview: "A workflow for appealing a financial aid suspension. Reads the suspension notice to identify the cause, and prepares an appeal with documentation of mitigating circumstances.",
    whenToUse: [
      "Your financial aid was suspended",
      "You have documentation of the circumstances that caused the suspension",
      "You have a plan to return to good standing"
    ],
    whenNotToUse: [
      "Your aid was suspended for fraud",
      "You haven't been formally notified",
      "The suspension is for non-academic reasons you can't appeal"
    ],
    officialSources: [
      { title: "How to Appeal a Financial Aid Suspension", publisher: "Federal Student Aid", url: "https://studentaid.gov/help-center/how-to-appeal-financial-aid-suspension", reviewedAt: REVIEWED }
    ],
    checklist: [
      "Read the suspension notice for the specific cause",
      "Gather documentation of mitigating circumstances",
      "Write an appeal letter with a plan for improvement",
      "Submit by the deadline stated by the financial aid office"
    ],
    faq: [
      "Can I get my aid back?",
      "Yes, if you successfully appeal and demonstrate a plan to meet academic standards"
    ],
    authorityNote: "Each school has its own appeal process and deadline. Contact your financial aid office immediately upon receiving a suspension notice.",
  },
  "appeal/financial-aid-reinstatement": {
    overview: "A workflow for requesting financial aid reinstatement after suspension. Reads the reinstatement requirements, and prepares a request letter with evidence that you now meet SAP standards.",
    whenToUse: [
      "You were on financial aid suspension and now meet SAP",
      "You've completed coursework that brings you back into compliance",
      "You want to regain eligibility for federal aid"
    ],
    whenNotToUse: [
      "You're currently meeting SAP and never lost aid",
      "Your suspension was for fraud or non-academic reasons",
      "You haven't completed any corrective coursework"
    ],
    officialSources: [
      { title: "Reinstating Federal Student Aid", publisher: "Federal Student Aid", url: "https://studentaid.gov/understand-aid/eligibility/requirements/satisfactory-academic-progress", reviewedAt: REVIEWED }
    ],
    checklist: [
      "Verify you now meet SAP standards with your registrar",
      "Gather transcripts showing improved academic performance",
      "Write a reinstatement request to the financial aid office",
      "Include documentation of any completed corrective coursework"
    ],
    faq: [
      "How long does reinstatement take?",
      "Varies by school, but typically 2-4 weeks after submitting the request"
    ],
    authorityNote: "Reinstatement is at the school's discretion. Check your school's financial aid office for the specific process.",
  },
  "appeal/financial-aid-special-circumstances": {
    overview: "A workflow for requesting a financial aid adjustment based on special circumstances. Reads the current aid award, and prepares a letter documenting the changed circumstances.",
    whenToUse: [
      "Your financial situation changed since filing the FAFSA",
      "You experienced job loss, medical emergency, or family changes",
      "Your current aid doesn't reflect your actual need"
    ],
    whenNotToUse: [
      "Your financial situation hasn't changed",
      "You haven't filed the FAFSA yet",
      "The change is minor or temporary"
    ],
    officialSources: [
      { title: "Special Circumstances for Financial Aid", publisher: "Federal Student Aid", url: "https://studentaid.gov/apply-for-aid/fafsa/renewal-changes", reviewedAt: REVIEWED }
    ],
    checklist: [
      "Document the change in circumstances (job loss, medical bills, etc.)",
      "Gather supporting documentation (termination notice, medical bills)",
      "Write a letter requesting a professional judgment review",
      "Submit to the financial aid office with all documentation"
    ],
    faq: [
      "What counts as special circumstances?",
      "Job loss, death of a parent, divorce, medical emergency, or loss of benefits"
    ],
    authorityNote: "Financial aid administrators have discretion to adjust aid based on special circumstances under Section 479A of the Higher Education Act.",
  },
  "appeal/scholarship-appeal": {
    overview: "A workflow for appealing a scholarship denial or revocation. Reads the denial to identify the reason, and prepares an appeal with evidence of continued eligibility.",
    whenToUse: [
      "Your scholarship was denied or revoked",
      "You believe the decision was based on incorrect information",
      "You have evidence of continued eligibility"
    ],
    whenNotToUse: [
      "The scholarship was awarded",
      "You don't meet the basic eligibility criteria",
      "The appeal deadline has passed"
    ],
    officialSources: [
      { title: "Scholarship Appeals", publisher: "Federal Student Aid", url: "https://studentaid.gov/help-center/answer/scholarship-appeals", reviewedAt: REVIEWED }
    ],
    checklist: [
      "Read the denial for the specific reason",
      "Gather evidence of continued eligibility",
      "Write an appeal addressing each denial reason",
      "Submit by the deadline stated in the denial"
    ],
    faq: [
      "Can I appeal any scholarship denial?",
      "Most institutional scholarships allow appeals, but private scholarships may not"
    ],
    authorityNote: "Scholarship appeal processes vary by provider. Check the original scholarship notice for the specific appeal procedure.",
  },
  "appeal/license-suspension-appeal": {
    overview: "A workflow for appealing a professional license suspension. Reads the suspension order to identify the grounds, and prepares an appeal with evidence of compliance.",
    whenToUse: [
      "Your professional license was suspended",
      "You believe the suspension was unjustified",
      "You have evidence of compliance with requirements"
    ],
    whenNotToUse: [
      "The suspension was for criminal conviction",
      "You haven't received formal notice",
      "The appeal deadline has passed"
    ],
    officialSources: [
      { title: "Professional License Defense", publisher: "NAIC", url: "https://content.naic.org/consumer-insight-understanding-professional-licenses", reviewedAt: REVIEWED }
    ],
    checklist: [
      "Read the suspension order for the specific grounds",
      "Gather evidence of compliance or mitigating circumstances",
      "Write an appeal to the licensing board",
      "File within the stated deadline"
    ],
    faq: [
      "How long do I have to appeal?",
      "Varies by licensing board, typically 15-30 days from the suspension notice"
    ],
    authorityNote: "Each licensing board sets its own appeal process. Check the suspension order for specific instructions and deadlines.",
  },
  "appeal/license-revocation-appeal": {
    overview: "A workflow for appealing a professional license revocation. Reads the revocation order to identify the grounds, and prepares an appeal with mitigating evidence.",
    whenToUse: [
      "Your professional license was revoked",
      "You believe the revocation was disproportionate",
      "You have evidence of rehabilitation or mitigating factors"
    ],
    whenNotToUse: [
      "The revocation was for fraud or criminal conviction",
      "You haven't exhausted administrative remedies",
      "The appeal deadline has passed"
    ],
    officialSources: [
      { title: "Administrative Appeals Process", publisher: "ABA", url: "https://www.americanbar.org/groups/professional_responsibility/publications/model_rules_for_professional_conduct/", reviewedAt: REVIEWED }
    ],
    checklist: [
      "Read the revocation order for specific grounds",
      "Document rehabilitation efforts or mitigating circumstances",
      "Write a formal appeal to the licensing board",
      "File within the stated deadline"
    ],
    faq: [
      "Can I get my license back after revocation?",
      "Some boards allow reinstatement after a waiting period, typically 1-5 years"
    ],
    authorityNote: "License revocation appeals are formal administrative proceedings. Consider consulting an attorney for professional license defense.",
  },
  "appeal/dmv-suspension-appeal": {
    overview: "A workflow for appealing a DMV license suspension. Reads the suspension notice to identify the grounds, and prepares an appeal for a DMV administrative hearing.",
    whenToUse: [
      "Your driver's license was suspended by the DMV",
      "You believe the suspension was in error",
      "You have grounds for a hardship exemption"
    ],
    whenNotToUse: [
      "The suspension was court-ordered",
      "You haven't received the suspension notice",
      "The appeal deadline has passed"
    ],
    officialSources: [
      { title: "DMV Hearings and Appeals", publisher: "California DMV", url: "https://www.dmv.ca.gov/portal/driver-education-and-safety/hearings-and-appeals/", reviewedAt: REVIEWED }
    ],
    checklist: [
      "Read the suspension notice for the specific grounds",
      "Request a DMV administrative hearing within the deadline",
      "Gather evidence supporting your case",
      "Prepare for the hearing with documentation and witnesses"
    ],
    faq: [
      "How long do I have to request a hearing?",
      "Typically 10-14 days from the suspension notice, varies by state"
    ],
    authorityNote: "DMV suspension appeals have strict deadlines. Request a hearing immediately upon receiving a suspension notice.",
  },
  "appeal/registration-suspension-appeal": {
    overview: "A workflow for appealing a vehicle registration suspension. Reads the suspension notice to identify the cause, and prepares an appeal with evidence of compliance.",
    whenToUse: [
      "Your vehicle registration was suspended",
      "You've resolved the underlying issue (insurance, emissions, fees)",
      "You need the registration reinstated for legal driving"
    ],
    whenNotToUse: [
      "The suspension was for unresolved citations",
      "You haven't fixed the underlying issue",
      "The appeal deadline has passed"
    ],
    officialSources: [
      { title: "Registration Suspensions and Revocations", publisher: "California DMV", url: "https://www.dmv.ca.gov/portal/vehicle-registration/registration-suspensions-and-revocations/", reviewedAt: REVIEWED }
    ],
    checklist: [
      "Read the suspension notice for the specific cause",
      "Resolve the underlying issue (insurance, emissions, unpaid fees)",
      "Gather proof of compliance",
      "Write an appeal with the compliance documentation",
      "Submit by the deadline stated in the notice"
    ],
    faq: [
      "What causes registration suspension?",
      "Lapsed insurance, failed emissions test, unpaid tolls or fees, or unresolved citations"
    ],
    authorityNote: "Registration reinstatement typically requires resolving the underlying issue and paying a reinstatement fee. Check your state DMV for specific requirements.",
  },
  "benefits/benefits-appeal": {
    overview: "A workflow for appealing a benefits denial. Reads the denial notice to identify the reason, and prepares an appeal with supporting documentation.",
    whenToUse: [
      "Your benefits claim was denied",
      "You have additional evidence to support your claim",
      "You're within the appeal deadline"
    ],
    whenNotToUse: [
      "Your benefits were approved",
      "The denial was for ineligibility that hasn't changed",
      "The appeal deadline has passed"
    ],
    officialSources: [
      { title: "Appealing a Benefits Decision", publisher: "Benefits.gov", url: "https://www.benefits.gov/help/appealing-decision", reviewedAt: REVIEWED }
    ],
    checklist: [
      "Read the denial notice for the specific reason",
      "Gather additional evidence supporting your eligibility",
      "Write an appeal addressing each denial reason",
      "Submit by the deadline stated in the notice"
    ],
    faq: [
      "How long do I have to appeal?",
      "Typically 30-90 days from the denial notice, varies by program"
    ],
    authorityNote: "Each benefits program has its own appeal process. The denial notice should include instructions for filing an appeal.",
  },
  "benefits/benefits-denial": {
    overview: "A workflow for responding to a benefits denial notice. Reads the denial to identify the basis, and prepares a reconsideration request with evidence.",
    whenToUse: [
      "You received a benefits denial notice",
      "You believe the denial was based on incorrect information",
      "You have evidence of eligibility"
    ],
    whenNotToUse: [
      "Your benefits were approved",
      "You're already in the appeal process",
      "The denial is for a different benefit program"
    ],
    officialSources: [
      { title: "If Your Benefits Claim is Denied", publisher: "Benefits.gov", url: "https://www.benefits.gov/help/if-claim-denied", reviewedAt: REVIEWED }
    ],
    checklist: [
      "Read the denial for the specific reason",
      "Identify what information was incorrect or missing",
      "Gather evidence proving eligibility",
      "Request reconsideration with the supporting documentation"
    ],
    faq: [
      "What's the difference between reconsideration and appeal?",
      "Reconsideration is the first level of review; appeal is the formal hearing"
    ],
    authorityNote: "Most benefits programs require you to request reconsideration before filing a formal appeal.",
  },
  "benefits/benefits-reconsideration": {
    overview: "A workflow for requesting reconsideration of a benefits decision. Reads the initial decision, and prepares a reconsideration request with additional evidence.",
    whenToUse: [
      "Your initial benefits claim was denied",
      "You have new evidence not previously considered in the original claim",
      "You're within the reconsideration deadline"
    ],
    whenNotToUse: [
      "You've already filed a formal appeal",
      "The denial was for a reason you can't rebut",
      "The reconsideration deadline has passed"
    ],
    officialSources: [
      { title: "Request for Reconsideration", publisher: "SSA", url: "https://www.ssa.gov/benefits/disability/appeal.html", reviewedAt: REVIEWED }
    ],
    checklist: [
      "Read the initial decision for the specific denial reason",
      "Gather new evidence not in the original claim",
      "Write a reconsideration request citing the new evidence",
      "Submit within the deadline (typically 60 days)"
    ],
    faq: [
      "What if reconsideration is denied?",
      "You can then request a hearing before an administrative law judge"
    ],
    authorityNote: "Reconsideration is mandatory for SSA disability claims before requesting a hearing. File within 60 days of the denial.",
  },
  "benefits/benefits-documentation": {
    overview: "A workflow for assembling benefits documentation. Reads the benefits requirements, and prepares a comprehensive evidence package.",
    whenToUse: [
      "You're preparing a benefits claim or appeal",
      "You need to gather and organize supporting documents",
      "You want to ensure your claim is well-documented"
    ],
    whenNotToUse: [
      "Your claim is already fully documented",
      "You're not filing a benefits claim",
      "You've already submitted all required documents"
    ],
    officialSources: [
      { title: "Required Documents for Benefits", publisher: "Benefits.gov", url: "https://www.benefits.gov/help/required-documents", reviewedAt: REVIEWED }
    ],
    checklist: [
      "List the required documents for your specific benefit",
      "Gather identification, income, and residency proof",
      "Organize documents by category",
      "Include a cover letter referencing your claim number"
    ],
    faq: [
      "What documents do I need?",
      "Varies by program, but typically: ID, proof of income, proof of residence, and medical records for disability claims"
    ],
    authorityNote: "Incomplete documentation is the most common reason for benefits denial. Gather all required documents before filing.",
  },
  "benefits/hearing-preparation": {
    overview: "A workflow for preparing for a benefits hearing. Reads the hearing notice, and prepares a hearing brief with evidence and witness statements.",
    whenToUse: [
      "You've requested a hearing for your benefits appeal",
      "You need to prepare a hearing brief and evidence",
      "You want to present your case effectively"
    ],
    whenNotToUse: [
      "You haven't requested a hearing yet",
      "The hearing has been rescheduled",
      "You're representing yourself and don't need preparation"
    ],
    officialSources: [
      { title: "Prepare for Your Hearing", publisher: "SSA Office of Disability Adjudication", url: "https://www.ssa.gov/benefits/disability/appeal-hearing.html", reviewedAt: REVIEWED }
    ],
    checklist: [
      "Review the hearing notice for date, time, and format",
      "Organize all evidence in a logical order",
      "Prepare a written hearing brief summarizing your case",
      "Identify and prepare any witnesses",
      "Practice answering questions about your case"
    ],
    faq: [
      "Can I bring a representative?",
      "Yes, you can bring an attorney, advocate, or friend to the hearing"
    ],
    authorityNote: "Benefits hearings are formal proceedings. Prepare a organized evidence file and written brief.",
  },
  "business/payment-reminder": {
    overview: "A workflow for sending a professional payment reminder. Reads the invoice or account, and prepares a courteous reminder letter.",
    whenToUse: [
      "An invoice is past due or approaching the due date",
      "You want to maintain a professional relationship",
      "You haven't sent a reminder yet"
    ],
    whenNotToUse: [
      "The invoice has been paid",
      "You want to send a demand letter instead",
      "The client has disputed the invoice"
    ],
    officialSources: [
      { title: "How to Write a Payment Reminder Email", publisher: "SBA", url: "https://www.sba.gov/blog/how-write-payment-reminder-email", reviewedAt: REVIEWED }
    ],
    checklist: [
      "Include the invoice number and original due date",
      "State the outstanding amount clearly",
      "Offer payment options (check, ACH, online)",
      "Maintain a professional, non-threatening tone",
      "Send via email and certified mail if the invoice is 30+ days past due"
    ],
    faq: [
      "When should I send the first reminder?",
      "The day after the due date, then weekly thereafter"
    ],
    authorityNote: "Payment reminders should be courteous but clear. Escalate to a demand letter after 60 days past due.",
  },
  "business/payment-demand": {
    overview: "A workflow for sending a formal payment demand letter. Reads the account history, and prepares a demand letter citing the debt and consequences.",
    whenToUse: [
      "Multiple payment reminders have been ignored",
      "The invoice is 60+ days past due",
      "You need to preserve legal options"
    ],
    whenNotToUse: [
      "The invoice is less than 30 days past due",
      "The client has communicated about a payment plan",
      "You've already filed a lawsuit"
    ],
    officialSources: [
      { title: "Writing a Demand Letter", publisher: "SBA", url: "https://www.sba.gov/business-guide/manage-your-business/debt-collection/", reviewedAt: REVIEWED }
    ],
    checklist: [
      "State the invoice number, amount, and original due date",
      "Reference previous reminders sent",
      "State the consequences of non-payment (collections, small claims)",
      "Set a specific deadline for payment (typically 10-14 days)",
      "Send via certified mail with return receipt"
    ],
    faq: [
      "Can I charge late fees?",
      "Only if your contract or invoice specifies late fees"
    ],
    authorityNote: "A demand letter is the last step before legal action. Keep copies and the certified mail receipt as evidence.",
  },
  "business/contract-renewal": {
    overview: "A workflow for sending a contract renewal letter. Reads the existing contract, and prepares a renewal letter with updated terms.",
    whenToUse: [
      "Your contract is approaching its renewal date",
      "You want to renew with modified terms",
      "You need formal written notice of renewal"
    ],
    whenNotToUse: [
      "The contract has already expired",
      "You want to terminate the contract",
      "The contract auto-renews and you want to maintain current terms"
    ],
    officialSources: [
      { title: "Contract Renewal Best Practices", publisher: "SBA", url: "https://www.sba.gov/business-guide/launch-your-business/choose-business-name/", reviewedAt: REVIEWED }
    ],
    checklist: [
      "Review the existing contract for renewal terms and deadlines",
      "Identify any changes you want to propose",
      "Write a renewal letter stating your intent to renew",
      "Include proposed changes and a timeline for response",
      "Send within the notice period stated in the contract"
    ],
    faq: [
      "How much notice do I need to give?",
      "Check the contract, but typically 30-90 days before expiration"
    ],
    authorityNote: "Contract renewal letters should reference the original contract and be sent within the notice period stated in the contract.",
  },
  "business/compliance-notice": {
    overview: "A workflow for sending a compliance notice. Reads the applicable regulation, and prepares a compliance notice to employees or partners.",
    whenToUse: [
      "You need to notify stakeholders of regulatory requirements",
      "There's been a change in applicable regulations",
      "You need documented proof of compliance notification"
    ],
    whenNotToUse: [
      "There's no regulatory requirement to notify",
      "The notice is about internal policy, not compliance",
      "You've already sent the notice"
    ],
    officialSources: [
      { title: "Small Business Compliance Guide", publisher: "SBA", url: "https://www.sba.gov/business-guide/manage-your-business/stay-compliant/", reviewedAt: REVIEWED }
    ],
    checklist: [
      "Identify the specific regulation requiring notification",
      "Summarize the compliance requirement clearly",
      "State the deadline and consequences of non-compliance",
      "Include contact information for questions",
      "Send via certified mail for compliance documentation"
    ],
    faq: [
      "What regulations require formal notice?",
      "OSHA, ADA, FMLA, and state labor laws may require formal employee notification"
    ],
    authorityNote: "Keep copies of all compliance notices with certified mail receipts as proof of notification.",
  },
  "business/customer-dispute-response": {
    overview: "A workflow for responding to a customer dispute. Reads the complaint, and prepares a professional response addressing each issue.",
    whenToUse: [
      "A customer has formally disputed a charge or service",
      "You want to resolve the dispute professionally",
      "You need to document your response"
    ],
    whenNotToUse: [
      "The dispute has been resolved informally",
      "The customer has filed a lawsuit",
      "You've already responded"
    ],
    officialSources: [
      { title: "Responding to Customer Complaints", publisher: "FTC", url: "https://www.ftc.gov/business-guidance/resources/responding-customer-complaints", reviewedAt: REVIEWED }
    ],
    checklist: [
      "Read the complaint carefully and identify each issue",
      "Acknowledge the customer's concerns",
      "Provide a clear response to each point",
      "Offer a resolution or explanation",
      "Send promptly and maintain a professional tone"
    ],
    faq: [
      "Should I admit fault?",
      "Acknowledge the issue without admitting legal liability; offer a reasonable resolution"
    ],
    authorityNote: "Document all customer dispute responses. If the dispute involves a credit card chargeback, respond within the card network's deadline.",
  },
  "claim/claim-proof": {
    overview: "A workflow for assembling claim proof documentation. Reads the claim requirements, and prepares a comprehensive evidence package.",
    whenToUse: [
      "You're filing an insurance or benefits claim",
      "You need to document your losses or eligibility",
      "You want to strengthen your claim with organized evidence"
    ],
    whenNotToUse: [
      "Your claim has already been approved",
      "You're not filing a claim",
      "You've already submitted all evidence"
    ],
    officialSources: [
      { title: "Filing an Insurance Claim: Your Rights", publisher: "NAIC", url: "https://content.naic.org/consumer-insight-filing-insurance-claim-your-rights", reviewedAt: REVIEWED }
    ],
    checklist: [
      "List the specific evidence required for your claim type",
      "Gather photos, receipts, estimates, and reports",
      "Organize evidence chronologically",
      "Include a cover letter with your claim number",
      "Keep copies of everything you submit"
    ],
    faq: [
      "What counts as proof?",
      "Receipts, photos, professional estimates, police reports, medical records, and witness statements"
    ],
    authorityNote: "Organized, comprehensive evidence packages are more likely to result in claim approval. Keep copies of everything.",
  },
  "claim/evidence-package": {
    overview: "A workflow for assembling an evidence package. Reads the claim or dispute requirements, and organizes supporting documents into a professional package.",
    whenToUse: [
      "You need to submit evidence for a claim, dispute, or appeal",
      "You have multiple documents that need organization",
      "You want a professional presentation of your evidence"
    ],
    whenNotToUse: [
      "You have no documents to submit",
      "Your case has already been decided",
      "You're submitting evidence digitally through a portal"
    ],
    officialSources: [
      { title: "Evidence Guide for Consumers", publisher: "NAIC", url: "https://content.naic.org/consumer-insight-filing-insurance-claim-your-rights", reviewedAt: REVIEWED }
    ],
    checklist: [
      "Sort all documents by category and date",
      "Create a table of contents or index",
      "Label each document clearly",
      "Include a cover letter summarizing the package",
      "Send via certified mail with return receipt"
    ],
    faq: [
      "How should I organize the package?",
      "Chronologically by event date, grouped by document type (photos, receipts, reports)"
    ],
    authorityNote: "A well-organized evidence package makes it easier for reviewers to understand your case and increases the likelihood of approval.",
  },
  "claim/documentation": {
    overview: "A workflow for preparing claim documentation. Reads the claim requirements, and prepares a comprehensive documentation file.",
    whenToUse: [
      "You're filing a claim that requires extensive documentation",
      "You need to document losses, damages, or eligibility",
      "You want to ensure complete documentation"
    ],
    whenNotToUse: [
      "Your claim is simple and doesn't require documentation",
      "You've already submitted all documentation",
      "The claim has been resolved"
    ],
    officialSources: [
      { title: "Documenting Your Claim", publisher: "NAIC", url: "https://content.naic.org/consumer-insight-filing-insurance-claim-your-rights", reviewedAt: REVIEWED }
    ],
    checklist: [
      "Identify all documents required for your claim type",
      "Gather original documents or certified copies",
      "Create a documentation checklist",
      "Include a cover letter referencing your claim number",
      "Keep organized copies of everything submitted"
    ],
    faq: [
      "What if I'm missing a document?",
      "Contact the claim administrator to ask about alternatives or substitutions"
    ],
    authorityNote: "Incomplete documentation is the leading cause of claim delays and denials. Submit a complete package to avoid unnecessary review cycles.",
  },
  "claim/submission-package": {
    overview: "A workflow for assembling a claim submission package. Reads the claim requirements, and prepares a complete submission with all required elements.",
    whenToUse: [
      "You're ready to submit a claim",
      "You need to assemble all components into a complete package",
      "You want to ensure nothing is missing"
    ],
    whenNotToUse: [
      "Your claim has been submitted",
      "You're still gathering evidence",
      "The claim deadline has passed"
    ],
    officialSources: [
      { title: "Filing an Insurance Claim", publisher: "NAIC", url: "https://content.naic.org/consumer-insight-filing-insurance-claim-your-rights", reviewedAt: REVIEWED }
    ],
    checklist: [
      "Verify all required forms are completed and signed",
      "Include all supporting documentation",
      "Attach a cover letter with claim details",
      "Make copies of the complete package",
      "Send via certified mail with return receipt and tracking"
    ],
    faq: [
      "How do I know what to include?",
      "Check the claim instructions for a required documents list"
    ],
    authorityNote: "Keep the certified mail receipt and tracking number as proof of timely submission.",
  },
  "notice/government-notice-response": {
    overview: "A workflow for responding to a government notice. Reads the notice to identify required actions, and prepares a formal response.",
    whenToUse: [
      "You received a formal government notice",
      "The notice requires a written response by a deadline",
      "You need to address the issues raised"
    ],
    whenNotToUse: [
      "The notice is informational only and doesn't require a response",
      "You've already responded",
      "The response deadline has passed"
    ],
    officialSources: [
      { title: "Responding to Government Notices", publisher: "USA.gov", url: "https://www.usa.gov/respond-government-notices", reviewedAt: REVIEWED }
    ],
    checklist: [
      "Read the notice for the specific required action",
      "Note the response deadline",
      "Gather any requested documents or information",
      "Write a formal response addressing each point",
      "Send via certified mail with return receipt before the deadline"
    ],
    faq: [
      "What happens if I don't respond?",
      "You may lose rights, face penalties, or default on the issue"
    ],
    authorityNote: "Government notices often have strict deadlines. Missing a deadline can result in penalties or loss of rights.",
  },
  "notice/government-letter-response": {
    overview: "A workflow for responding to a government letter. Reads the letter to identify the purpose, and prepares a formal reply.",
    whenToUse: [
      "You received a formal letter from a government agency",
      "The letter requires a response",
      "You need to provide information or documentation"
    ],
    whenNotToUse: [
      "The letter is informational and doesn't require a response",
      "You've already responded",
      "The letter is from a court (use court-summons workflow instead)"
    ],
    officialSources: [
      { title: "Contacting Federal Agencies", publisher: "USA.gov", url: "https://www.usa.gov/federal-agencies", reviewedAt: REVIEWED }
    ],
    checklist: [
      "Read the letter for the specific request or requirement",
      "Gather any requested information or documents",
      "Write a formal response with your case or reference number",
      "Send via certified mail with return receipt"
    ],
    faq: [
      "How do I find my case number?",
      "It's typically on the first page of the letter, often labeled 'Case Number' or 'Reference Number'"
    ],
    authorityNote: "Government letters may not always state a deadline, but prompt response is recommended to avoid escalation.",
  },
  "notice/agency-request-response": {
    overview: "A workflow for responding to an agency request for information. Reads the request, and prepares a response with the requested documentation.",
    whenToUse: [
      "A government agency requested information from you",
      "You need to provide documents or testimony",
      "The request has a stated deadline"
    ],
    whenNotToUse: [
      "The request is from a court",
      "You've already provided the information",
      "The request is a scam (verify the agency first)"
    ],
    officialSources: [
      { title: "Responding to Agency Information Requests", publisher: "Administrative Conference of the United States", url: "https://www.acus.gov/research-projects/administrative-record", reviewedAt: REVIEWED }
    ],
    checklist: [
      "Read the request for specific information needed",
      "Verify the agency's authority to request the information",
      "Gather the requested documents",
      "Write a response with a cover letter and the documents",
      "Send via certified mail before the deadline"
    ],
    faq: [
      "Do I have to respond?",
      "Failure to respond to a lawful agency request can result in penalties or subpoenas"
    ],
    authorityNote: "Verify the identity and authority of the requesting agency before providing sensitive information.",
  },
  "notice/evidence-package": {
    overview: "A workflow for assembling an evidence package for a government agency. Reads the agency requirements, and prepares a comprehensive evidence file.",
    whenToUse: [
      "A government agency requested evidence or documentation",
      "You need to submit an organized evidence package",
      "You want to present your case clearly"
    ],
    whenNotToUse: [
      "No evidence has been requested",
      "You've already submitted all evidence",
      "The submission deadline has passed"
    ],
    officialSources: [
      { title: "Submitting Evidence to Federal Agencies", publisher: "ACUS", url: "https://www.acus.gov/", reviewedAt: REVIEWED }
    ],
    checklist: [
      "Identify all evidence requested by the agency",
      "Gather and organize documents chronologically",
      "Create a cover letter with reference numbers",
      "Label each document clearly",
      "Send via certified mail with return receipt"
    ],
    faq: [
      "Can I submit evidence electronically?",
      "Many agencies accept electronic submissions, but check the request for the preferred method"
    ],
    authorityNote: "Keep copies of all evidence submitted to government agencies and the certified mail receipt as proof of delivery.",
  },
  "notice/deadline-compliance": {
    overview: "A workflow for ensuring deadline compliance in government correspondence. Reads the deadline and required actions, and prepares a compliance package.",
    whenToUse: [
      "You have a government deadline approaching",
      "You need to ensure your response is submitted on time",
      "You want proof of timely submission"
    ],
    whenNotToUse: [
      "There's no deadline",
      "The deadline has passed",
      "You've already submitted your response"
    ],
    officialSources: [
      { title: "Government Deadlines and Compliance", publisher: "USA.gov", url: "https://www.usa.gov/", reviewedAt: REVIEWED }
    ],
    checklist: [
      "Identify the exact deadline (date and time)",
      "Calculate the time needed for mail delivery (2-5 business days)",
      "Prepare your response well in advance",
      "Send via certified mail with return receipt",
      "Keep the postmark as proof of timely submission"
    ],
    faq: [
      "What if the deadline falls on a weekend?",
      "Most government deadlines extend to the next business day"
    ],
    authorityNote: "Government deadlines are often strict. Submit well in advance and keep proof of mailing.",
  },
  "mail/mail-a-pdf": {
    overview: "A workflow for mailing a PDF document via USPS. Reads the PDF, and prepares it for physical mailing with tracking.",
    whenToUse: [
      "You have a PDF document that needs to be physically mailed",
      "You want proof of mailing and delivery",
      "You need a professional mailing service"
    ],
    whenNotToUse: [
      "You need to email the document instead",
      "The document needs to be hand-delivered",
      "You don't need proof of delivery"
    ],
    officialSources: [
      { title: "USPS Certified Mail Guide", publisher: "USPS", url: "https://www.usps.com/ship/certified-mail.htm", reviewedAt: REVIEWED }
    ],
    checklist: [
      "Upload the PDF document",
      "Verify the recipient address is correct",
      "Choose your mail class (First-Class, Priority, Certified)",
      "Add tracking and return receipt if needed",
      "Confirm and send"
    ],
    faq: [
      "How long does delivery take?",
      "First-Class Mail: 1-5 business days; Priority Mail: 1-3 business days"
    ],
    authorityNote: "Certified Mail with Return Receipt provides legal proof of mailing and delivery. Use it for important documents.",
  },
  "mail/write-a-letter": {
    overview: "A workflow for writing and mailing a formal letter. Guides the user through composing a professional letter and mailing it via USPS.",
    whenToUse: [
      "You need to write and send a formal letter",
      "You want professional formatting and delivery",
      "You need proof of mailing"
    ],
    whenNotToUse: [
      "You need an email instead of a physical letter",
      "You need a legal document drafted by an attorney",
      "The letter is personal and informal"
    ],
    officialSources: [
      { title: "USPS Letter Mailing Guide", publisher: "USPS", url: "https://www.usps.com/ship/letters.htm", reviewedAt: REVIEWED }
    ],
    checklist: [
      "Choose a letter template or start from scratch",
      "Fill in the recipient address and return address",
      "Compose your letter content",
      "Choose mail class and add-ons (tracking, certified)",
      "Review and confirm for mailing"
    ],
    faq: [
      "What size letter can I send?",
      "Standard letter size up to 6.125 x 11.5 inches, max 3.5 oz for First-Class Mail"
    ],
    authorityNote: "For legal or official correspondence, use Certified Mail with Return Receipt for proof of delivery.",
  },
  "mail/send-a-letter-online": {
    overview: "A workflow for sending a physical letter online. Composes the letter digitally and mails it via USPS without printing.",
    whenToUse: [
      "You want to send a physical letter without going to the post office",
      "You need the convenience of online mailing",
      "You want tracking and proof of delivery"
    ],
    whenNotToUse: [
      "You need to hand-deliver the letter",
      "You want to send an email instead",
      "The letter requires special handling (registered mail)"
    ],
    officialSources: [
      { title: "USPS Online Postal Services", publisher: "USPS", url: "https://www.usps.com/", reviewedAt: REVIEWED }
    ],
    checklist: [
      "Compose your letter online or upload a document",
      "Enter the recipient's address",
      "Choose mail class and tracking options",
      "Pay online and the letter is printed and mailed for you",
      "Receive tracking information by email"
    ],
    faq: [
      "Is the letter printed and mailed physically?",
      "Yes, your digital letter is printed, inserted in an envelope, and mailed via USPS"
    ],
    authorityNote: "Online letter services print and mail your letter the same business day if submitted before the cutoff.",
  },
  "mail/send-documents": {
    overview: "A workflow for mailing physical documents. Uploads documents and sends them via USPS with tracking.",
    whenToUse: [
      "You have documents that need to be physically mailed",
      "You want tracking and proof of delivery",
      "You have multiple pages to send"
    ],
    whenNotToUse: [
      "You need to email the documents",
      "The documents require registered mail (high value)",
      "You need same-day delivery"
    ],
    officialSources: [
      { title: "USPS Mailing Services", publisher: "USPS", url: "https://www.usps.com/ship/", reviewedAt: REVIEWED }
    ],
    checklist: [
      "Upload your documents (PDF, Word, or image files)",
      "Verify the recipient address",
      "Choose mail class based on urgency",
      "Add Certified Mail and Return Receipt if needed",
      "Confirm and send with tracking"
    ],
    faq: [
      "What's the maximum weight?",
      "First-Class Mail: up to 3.5 oz; Priority Mail: up to 70 lbs"
    ],
    authorityNote: "For legal documents, use Certified Mail with Return Receipt to maintain a chain of custody.",
  },
  "mail/templates": {
    overview: "A workflow for using letter templates. Provides professionally formatted templates for common letter types.",
    whenToUse: [
      "You need a professionally formatted letter",
      "You want to save time with a template",
      "You're not sure how to structure a formal letter"
    ],
    whenNotToUse: [
      "You need a fully custom letter",
      "Your letter requires legal review",
      "You need a letter in a language other than English"
    ],
    officialSources: [
      { title: "Business Letter Format", publisher: "Purdue OWL", url: "https://owl.purdue.edu/owl/subject_specific_writing/professional_technical_writing/basic_business_letters/index.html", reviewedAt: REVIEWED }
    ],
    checklist: [
      "Choose a template that matches your letter type",
      "Fill in the template with your specific information",
      "Customize the content as needed",
      "Review for accuracy and tone",
      "Send via your preferred mail method"
    ],
    faq: [
      "Are the templates legally reviewed?",
      "Templates provide formatting and structure, but you should review content for your specific situation"
    ],
    authorityNote: "Templates provide structure and formatting but should be customized for your specific situation.",
  },
  "mail/proof-of-mailing": {
    overview: "A workflow for obtaining proof of mailing. Sends documents via USPS Certified Mail and provides proof of mailing documentation.",
    whenToUse: [
      "You need legal proof that you mailed a document on a specific date",
      "You're submitting a time-sensitive document",
      "You need to prove compliance with a deadline"
    ],
    whenNotToUse: [
      "You don't need proof of mailing",
      "You're sending an email instead",
      "You need proof of delivery but not proof of mailing"
    ],
    officialSources: [
      { title: "USPS Certified Mail", publisher: "USPS", url: "https://www.usps.com/ship/certified-mail.htm", reviewedAt: REVIEWED }
    ],
    checklist: [
      "Upload your document",
      "Enter the recipient address",
      "Select Certified Mail for proof of mailing",
      "Receive a tracking number and postmarked receipt",
      "Access your proof of mailing certificate"
    ],
    faq: [
      "What proof do I get?",
      "A postmarked receipt showing the date and recipient address, plus a tracking number"
    ],
    authorityNote: "Certified Mail provides a postmarked receipt as legal proof of mailing. Keep the receipt for your records.",
  },
  "mail/proof-of-delivery": {
    overview: "A workflow for obtaining proof of delivery. Sends documents via USPS Certified Mail with Return Receipt and provides delivery confirmation.",
    whenToUse: [
      "You need proof that the recipient received your document",
      "You're sending a legal notice that requires delivery confirmation",
      "You need a signed return receipt for your records"
    ],
    whenNotToUse: [
      "You only need proof of mailing, not delivery",
      "You're sending an email",
      "The recipient has acknowledged receipt verbally"
    ],
    officialSources: [
      { title: "USPS Return Receipt", publisher: "USPS", url: "https://www.usps.com/ship/certified-mail.htm#return-receipt", reviewedAt: REVIEWED }
    ],
    checklist: [
      "Upload your document",
      "Enter the recipient address",
      "Select Certified Mail with Return Receipt",
      "The recipient signs for the delivery",
      "Receive the signed return receipt electronically or by mail"
    ],
    faq: [
      "What if the recipient refuses to sign?",
      "The mail is returned with 'Refused' noted, which still serves as proof of attempted delivery"
    ],
    authorityNote: "A signed Return Receipt is the gold standard for legal proof of delivery. Keep it with your case file.",
  },
  "mail/proof-of-service": {
    overview: "A workflow for obtaining proof of service for legal documents. Sends documents via USPS Certified Mail with Return Receipt and provides a proof of service certificate.",
    whenToUse: [
      "You need to serve legal documents by mail",
      "Your court or tribunal requires proof of service",
      "You need a certified proof of service for your case file"
    ],
    whenNotToUse: [
      "You need personal service (hand delivery)",
      "The court requires service by a process server",
      "You're not serving a legal document"
    ],
    officialSources: [
      { title: "Proof of Service by Mail", publisher: "US Courts", url: "https://www.uscourts.gov/services-forms/case-management/case-procedures", reviewedAt: REVIEWED }
    ],
    checklist: [
      "Upload your legal document",
      "Enter the recipient (party to be served) address",
      "Select Certified Mail with Return Receipt",
      "The signed return receipt serves as proof of service",
      "Download your proof of service certificate with the signed receipt"
    ],
    faq: [
      "Is Certified Mail sufficient for legal service?",
      "In many cases yes, but some courts require personal service. Check your court's rules"
    ],
    authorityNote: "Proof of service requirements vary by court. Check local rules to confirm Certified Mail is acceptable for your case type.",
  },
  "permit/permit-reply": {
    overview: "A workflow for responding to a permit notice. Reads the notice to identify required actions, and prepares a formal response.",
    whenToUse: [
      "You received a permit-related notice from a government agency",
      "The notice requires a written response",
      "You need to address permit conditions or requirements"
    ],
    whenNotToUse: [
      "The notice is informational only",
      "You've already responded",
      "The permit has been approved"
    ],
    officialSources: [
      { title: "Permitting Process Guide", publisher: "EPA", url: "https://www.epa.gov/permits", reviewedAt: REVIEWED }
    ],
    checklist: [
      "Read the permit notice for the specific required action",
      "Note the response deadline",
      "Gather any requested documentation",
      "Write a formal response addressing each requirement",
      "Send via certified mail before the deadline"
    ],
    faq: [
      "What if I miss the deadline?",
      "You may lose your permit rights or face enforcement action"
    ],
    authorityNote: "Permit notices often have strict deadlines. Contact the issuing agency immediately if you need more time.",
  },
  "permit/permit-denial-response": {
    overview: "A workflow for responding to a permit denial. Reads the denial to identify the grounds, and prepares an appeal with supporting evidence.",
    whenToUse: [
      "Your permit application was denied",
      "You believe the denial was based on incorrect information",
      "You have evidence to address the denial reasons"
    ],
    whenNotToUse: [
      "The permit was approved",
      "You haven't applied for a permit yet",
      "The appeal deadline has passed"
    ],
    officialSources: [
      { title: "Appealing a Permit Denial", publisher: "EPA", url: "https://www.epa.gov/permits/permit-appeals", reviewedAt: REVIEWED }
    ],
    checklist: [
      "Read the denial for the specific grounds",
      "Gather evidence addressing each denial reason",
      "Write an appeal with the supporting documentation",
      "File within the deadline stated in the denial",
      "Send via certified mail with return receipt"
    ],
    faq: [
      "How long do I have to appeal?",
      "Typically 10-30 days from the denial notice, varies by agency"
    ],
    authorityNote: "Permit denial appeals have strict deadlines. Check the denial notice for the specific appeal process and timeline.",
  },
  "permit/permit-correction-response": {
    overview: "A workflow for responding to a permit correction notice. Reads the notice to identify required corrections, and prepares a response with corrected documentation.",
    whenToUse: [
      "You received a notice that your permit application needs corrections",
      "You can make the requested corrections",
      "You need to resubmit with corrected information"
    ],
    whenNotToUse: [
      "Your permit was approved without corrections",
      "You've already submitted corrections",
      "You want to withdraw the application"
    ],
    officialSources: [
      { title: "Permit Application Corrections", publisher: "EPA", url: "https://www.epa.gov/permits", reviewedAt: REVIEWED }
    ],
    checklist: [
      "Read the correction notice for specific issues to fix",
      "Make the requested corrections to your application",
      "Gather any additional documentation required",
      "Write a response with the corrected application",
      "Submit by the deadline in the notice"
    ],
    faq: [
      "What if I can't make the corrections in time?",
      "Contact the agency to request an extension before the deadline"
    ],
    authorityNote: "Respond to correction notices promptly. Most agencies allow a short window for corrections.",
  },
  "permit/agency-permit-correspondence": {
    overview: "A workflow for general correspondence with a permitting agency. Reads the agency's communication, and prepares a formal response.",
    whenToUse: [
      "You need to correspond with a permitting agency about your application",
      "The agency requested additional information",
      "You need to provide updates on your project"
    ],
    whenNotToUse: [
      "Your permit has been issued",
      "You haven't submitted a permit application",
      "You need to appeal a denial (use permit-denial-response instead)"
    ],
    officialSources: [
      { title: "Contact Your Permitting Agency", publisher: "EPA", url: "https://www.epa.gov/permits", reviewedAt: REVIEWED }
    ],
    checklist: [
      "Reference your permit application number in all correspondence",
      "Address each question or request from the agency",
      "Provide clear, complete responses",
      "Send via certified mail with return receipt",
      "Keep copies of all correspondence"
    ],
    faq: [
      "How do I find my application number?",
      "It's on your original application receipt or any agency correspondence"
    ],
    authorityNote: "Keep a file of all permit correspondence. Include your application number in every communication.",
  },
  "records/records-request": {
    overview: "A workflow for filing a records request. Identifies the agency and records sought, and prepares a formal request letter.",
    whenToUse: [
      "You need to obtain records from a government agency",
      "The records are subject to FOIA or state public records law",
      "You want a formal, written request"
    ],
    whenNotToUse: [
      "The records are publicly available online",
      "The records are classified or exempt",
      "You're requesting private records (use a subpoena instead)"
    ],
    officialSources: [
      { title: "FOIA Request Guide", publisher: "DOJ Office of Information Policy", url: "https://www.justice.gov/oip", reviewedAt: REVIEWED }
    ],
    checklist: [
      "Identify the specific records you're requesting",
      "Determine which agency holds the records",
      "Write a clear request describing the records",
      "State your fee category and willingness to pay fees",
      "Send via certified mail or submit through the agency's portal"
    ],
    faq: [
      "How long does the agency have to respond?",
      "Federal agencies have 20 business days under FOIA; state timelines vary"
    ],
    authorityNote: "Be specific in your request. Vague or overly broad requests can be denied or result in excessive fees.",
  },
  "records/public-records-request": {
    overview: "A workflow for filing a state public records request. Identifies the state agency and records, and prepares a formal request under state public records law.",
    whenToUse: [
      "You need records from a state or local government agency",
      "The records are subject to your state's public records law",
      "You want a formal written request"
    ],
    whenNotToUse: [
      "The records are from a federal agency (use FOIA instead)",
      "The records are publicly available",
      "The records are exempt under state law"
    ],
    officialSources: [
      { title: "State Public Records Laws", publisher: "National Freedom of Information Coalition", url: "https://www.nfoic.org/", reviewedAt: REVIEWED }
    ],
    checklist: [
      "Identify the state agency holding the records",
      "Check your state's public records law for specific requirements",
      "Write a clear request describing the records sought",
      "State any fee limitations",
      "Submit according to the state's required method"
    ],
    faq: [
      "What's the difference between FOIA and state public records laws?",
      "FOIA applies to federal agencies; state laws (like California's CPRA) apply to state and local agencies"
    ],
    authorityNote: "Each state has its own public records law with different response times and fee structures. Check your state's specific requirements.",
  },
  "records/agency-records-request": {
    overview: "A workflow for filing a records request with a specific agency. Identifies the agency's records request process, and prepares a request accordingly.",
    whenToUse: [
      "You need records from a specific government agency",
      "The agency has a specific records request process",
      "You want to follow the agency's preferred method"
    ],
    whenNotToUse: [
      "The records are from multiple agencies (file separate requests)",
      "The records are publicly available",
      "You're requesting your own records (use a Privacy Act request instead)"
    ],
    officialSources: [
      { title: "Agency FOIA Contacts", publisher: "DOJ Office of Information Policy", url: "https://www.justice.gov/oip/agency-foia-contacts", reviewedAt: REVIEWED }
    ],
    checklist: [
      "Look up the agency's FOIA or records request process",
      "Address your request to the agency's FOIA officer",
      "Describe the records you're seeking as specifically as possible",
      "Include your contact information for the response",
      "Submit via the agency's preferred method (portal, mail, or email)"
    ],
    faq: [
      "Can I request records electronically?",
      "Most federal agencies accept FOIA requests through their online portal or email"
    ],
    authorityNote: "Each agency has its own FOIA office. Address your request to the correct agency and FOIA contact.",
  },
  "records/follow-up": {
    overview: "A workflow for following up on a records request. Reads the original request and response timeline, and prepares a follow-up letter.",
    whenToUse: [
      "You filed a records request and haven't received a response within the statutory timeframe",
      "You received a partial response and want the remaining records",
      "You want to check the status of your request"
    ],
    whenNotToUse: [
      "You've received a complete response",
      "The statutory response time hasn't elapsed yet",
      "Your request was denied and you're appealing (use the appeal process instead)"
    ],
    officialSources: [
      { title: "FOIA Status Checks", publisher: "DOJ Office of Information Policy", url: "https://www.justice.gov/oip", reviewedAt: REVIEWED }
    ],
    checklist: [
      "Reference your original request number and date",
      "Note the statutory response deadline that has passed",
      "Request a status update and estimated completion date",
      "Ask if additional information is needed from you",
      "Send via certified mail or follow up through the agency's portal"
    ],
    faq: [
      "When can I follow up?",
      "After the statutory response time has passed (20 business days for federal FOIA requests)"
    ],
    authorityNote: "If the agency doesn't respond to your follow-up, you can file a FOIA lawsuit or contact the agency's FOIA Public Liaison.",
  },
  "tenant/notice-response": {
    overview: "A workflow for responding to a landlord notice. Reads the notice to identify the required action, and prepares a formal response.",
    whenToUse: [
      "You received a notice from your landlord",
      "The notice requires a written response",
      "You need to address the issues raised in the notice"
    ],
    whenNotToUse: [
      "The notice is informational only",
      "You've already responded",
      "The notice is an eviction (consult an attorney immediately)"
    ],
    officialSources: [
      { title: "Tenant Rights and Responsibilities", publisher: "HUD", url: "https://www.hud.gov/topics/rental-help/tenantrights", reviewedAt: REVIEWED }
    ],
    checklist: [
      "Read the notice for the specific required action",
      "Note any response deadline",
      "Gather relevant documentation (lease, correspondence, photos)",
      "Write a formal response addressing each point",
      "Send via certified mail with return receipt"
    ],
    faq: [
      "How long do I have to respond?",
      "Varies by state and notice type, but typically 3-30 days"
    ],
    authorityNote: "Landlord-tenant laws vary by state. Check your local tenant rights organization for specific requirements.",
  },
  "tenant/repair-condition-response": {
    overview: "A workflow for responding to a repair or condition notice. Reads the notice, and prepares a response with documentation of the condition.",
    whenToUse: [
      "Your landlord notified you about a condition that needs repair",
      "You need to document your response to the repair request",
      "You want to ensure the repair is completed properly"
    ],
    whenNotToUse: [
      "The repair has been completed",
      "The condition doesn't require repair",
      "You haven't received a notice"
    ],
    officialSources: [
      { title: "Tenant Repair Rights", publisher: "HUD", url: "https://www.hud.gov/topics/rental-help/tenantrights", reviewedAt: REVIEWED }
    ],
    checklist: [
      "Document the condition with photos and videos",
      "Note the date you first reported the issue",
      "Write a response confirming access for repairs",
      "Request a timeline for completion",
      "Send via certified mail with return receipt"
    ],
    faq: [
      "Can I withhold rent for repairs?",
      "In some states, yes, under repair-and-deduct laws. Check your state's tenant rights"
    ],
    authorityNote: "Document all repair requests and conditions. Photos with timestamps are valuable evidence.",
  },
  "tenant/dispute": {
    overview: "A workflow for disputing a landlord action. Reads the disputed action, and prepares a formal dispute letter with supporting evidence.",
    whenToUse: [
      "You need to formally dispute a landlord's action (rent increase, charge, lease change)",
      "You have evidence supporting your position",
      "You want to resolve the dispute in writing"
    ],
    whenNotToUse: [
      "You've already resolved the dispute",
      "The dispute involves eviction (consult an attorney)",
      "You've already filed in court"
    ],
    officialSources: [
      { title: "Resolving Landlord-Tenant Disputes", publisher: "HUD", url: "https://www.hud.gov/topics/rental-help/tenantrights", reviewedAt: REVIEWED }
    ],
    checklist: [
      "Identify the specific action you're disputing",
      "Gather your lease and relevant correspondence",
      "Write a dispute letter citing your lease terms and rights",
      "State your proposed resolution",
      "Send via certified mail with return receipt"
    ],
    faq: [
      "What if my landlord doesn't respond?",
      "You can contact your local tenant rights organization or file in small claims court"
    ],
    authorityNote: "Landlord-tenant disputes are governed by state law. Check your state's specific tenant rights and remedies.",
  },
  "tenant/landlord-correspondence": {
    overview: "A workflow for general correspondence with a landlord. Reads the context, and prepares a formal letter to the landlord.",
    whenToUse: [
      "You need to communicate formally with your landlord",
      "You want a written record of your communication",
      "You need to request something from your landlord"
    ],
    whenNotToUse: [
      "You can resolve the issue verbally",
      "You're filing a legal action (consult an attorney)",
      "The communication is an emergency (call instead)"
    ],
    officialSources: [
      { title: "Communicating with Your Landlord", publisher: "HUD", url: "https://www.hud.gov/topics/rental-help/tenantrights", reviewedAt: REVIEWED }
    ],
    checklist: [
      "Reference your lease and any relevant dates",
      "State your request or concern clearly",
      "Include any relevant documentation",
      "Request a response within a specific timeframe",
      "Send via certified mail with return receipt"
    ],
    faq: [
      "Should I keep copies of all correspondence?",
      "Yes, maintain a file of all written communication with your landlord"
    ],
    authorityNote: "Written correspondence creates a legal record. Send important letters via certified mail and keep copies.",
  },
};
