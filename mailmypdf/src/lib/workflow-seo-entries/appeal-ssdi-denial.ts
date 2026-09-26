import type { AuthoredWorkflowSeoEntry } from ".";

const REVIEWED = "2026-09-21";

/**
 * Authority content for the appeal-mail vertical's SSDI denial workflow.
 * Scope follows apps/verticals/appeal-mail's ssdi-denial routes and
 * mailmypdf/src/components/workflows/ssdi-denial-workflow.tsx: the workflow
 * reads an uploaded SSA decision notice, helps the claimant assemble a
 * reconsideration or hearing-level response with supporting evidence, and
 * mails it. It does not evaluate medical eligibility, predict an outcome, or
 * file anything with the Social Security Administration.
 */
const entry: AuthoredWorkflowSeoEntry = {
  id: "appeal-mail/appeal-ssdi-denial",
  content: {
    primaryKeyword: "appeal an SSDI denial",
    primaryIntent:
      "Someone received a Social Security Administration notice denying or reducing Social Security Disability Insurance benefits and needs to understand the stated reason, meet the appeal deadline, and prepare a reconsideration or hearing-level response with the medical and work-history evidence that reason actually calls for.",
    secondaryKeywords: [
      "SSDI denial letter appeal",
      "SSDI reconsideration deadline",
      "SSA-561 request for reconsideration",
      "SSDI disability hearing request",
      "why was my SSDI claim denied",
    ],
    seoTitle: "Appeal an SSDI Denial Letter | MailMyPDF",
    h1: "Appeal a Social Security Disability Insurance denial",
    metaDescription:
      "Denied SSDI benefits? Read the actual reason on your notice, track the 60-day deadline, and prepare a reconsideration or hearing packet backed by the right evidence.",
    overview:
      "This workflow is for someone who has just received a Social Security Administration notice denying, reducing, or ending Social Security Disability Insurance benefits and needs to respond before the appeal window closes. SSDI is the Title II disability program funded through payroll taxes, so an initial denial can rest on a medical finding, a non-medical finding such as insured status or work credits, or both, and the correct response depends on which the notice actually states. The workflow reads the uploaded notice, identifies the decision, the stated reasons, and the appeal deadline, and helps assemble a written response at the appeal level the notice itself calls for, whether that is a first-level reconsideration or an administrative law judge hearing after a reconsideration denial. It organizes the claimant's own account of their limitations alongside medical and work-history records the claimant supplies, and produces a document ready for review and mailing. It does not diagnose a condition, estimate approval odds, or submit anything to SSA on the claimant's behalf.",
    issuerContext:
      "SSDI claims are decided in two layers. The Social Security Administration owns the claim and the non-medical rules, including insured status, the date a worker's coverage under the program lapses, and work credits earned through payroll taxes. The actual medical determination is usually made by a state Disability Determination Services agency working under contract to SSA, applying a five-step sequential evaluation that considers current work activity, the severity of the impairment, whether it meets or equals SSA's own Listing of Impairments, and whether the claimant's residual functional capacity still allows past work or other work. A denial notice can therefore fail at the medical step, at a non-medical step such as insured status, or state both, and each requires different evidence in response.",
    documentIdentification: [
      "Notice of Disapproved Claim (an initial denial) or Notice of Reconsideration (a denial of the first appeal), naming which decision is being appealed.",
      "The claim or Social Security number printed on the notice, usually formatted as a standard nine-digit number sometimes followed by a beneficiary suffix.",
      "A stated decision date and a paragraph explaining the reason for the decision, which is the language the workflow reads to identify medical versus non-medical grounds.",
      "An appeal-rights section stating the time limit to respond and the specific form or address to use for that appeal level.",
      "The Disability Determination Services office identified as having made the medical finding, which is often a different office than the one that mailed the notice.",
    ],
    whenToUse: [
      "You received a notice denying, reducing, or ending SSDI benefits and the appeal deadline stated on that notice has not passed.",
      "The notice gives a medical reason, such as your condition not meeting the severity SSA requires, that you can address with records or a statement about your limitations.",
      "The notice gives a non-medical reason, such as a question about insured status or work credits, that you believe is based on incomplete or incorrect information.",
      "You already appealed once and received a reconsideration denial, and now need to request a hearing before an administrative law judge.",
    ],
    whenNotToUse: [
      "Your notice concerns Supplemental Security Income only, not SSDI; SSI is a separate, needs-based program with its own denial notice and appeal path.",
      "You want a prediction of the appeal outcome or an assessment of how a judge would weigh your medical evidence, which is outside what this workflow does.",
      "Your appeal deadline already passed and you have not yet decided whether to request a good-cause extension, which is a separate determination SSA makes first.",
      "You need someone to represent you at a hearing, cross-examine a vocational expert, or negotiate with SSA directly, which requires a representative, not a document workflow.",
    ],
    inspectOnDocument: [
      "Find the decision date printed on the notice; SSA generally presumes the notice was received five days after that date unless you can show otherwise.",
      "Read the stated reason paragraph closely and separate a medical finding, such as unmet severity, from a non-medical finding, such as insured status or work credits.",
      "Check which appeal level the notice describes: an initial Notice of Disapproved Claim points to reconsideration, while a Notice of Reconsideration points to a hearing request.",
      "Note the Disability Determination Services office named on the notice, since evidence requests for that specific medical file go to that office, not SSA generally.",
      "Look for any date-last-insured language, which affects whether disability has to be shown as of a specific past date rather than the date you apply.",
      "Identify the exact mailing address or online submission path given for this appeal level, since reconsideration and hearing requests are not always sent to the same office.",
    ],
    timingGuidance: [
      "The standard window to appeal an SSDI denial is 60 days from receipt of the notice, and SSA's five-day mailing presumption means the effective deadline is usually calculated from the decision date printed on the notice, not the day it was opened.",
      "A late appeal is not automatically rejected. SSA can accept one for good cause, such as a serious illness, a death in the family, incorrect information given by SSA staff, or a documented mailing problem, but that determination is made by SSA and is not something this workflow can decide or guarantee.",
      "Requesting the reconsideration or hearing level named on the notice as soon as the reason is understood leaves more time to gather medical records, which commonly take longer to obtain from a provider's office than the response itself takes to prepare.",
      "A hearing request generally follows only after a reconsideration denial, so filing at the wrong level, such as requesting a hearing on an initial denial that has not yet been reconsidered, can create delay rather than saving it.",
    ],
    informationChecklist: [
      "The claim or Social Security number, the decision date, and the specific appeal level named on the notice.",
      "The exact reason paragraph from the notice, copied as written rather than summarized from memory.",
      "Full name, mailing address, and phone number as SSA has them on file, since a mismatch can delay correspondence.",
      "Whether a representative, attorney, or non-attorney advocate is already involved, and their contact information if so.",
      "The date last insured, if the notice states one, and the alleged onset date of disability from the original application.",
      "Every medical provider seen for the condition since the alleged onset date, with approximate dates of treatment.",
    ],
    evidenceChecklist: [
      "Treatment records from every provider tied to the condition described in the notice, not only the most recent visit.",
      "A statement from a treating physician describing functional limitations in specific, work-relevant terms rather than only a diagnosis.",
      "Test results, imaging reports, or lab work that support the severity of the condition named in the denial reason.",
      "A current medication list with dosages and known side effects that affect concentration, stamina, or physical capacity.",
      "Work history for roughly the past fifteen years, including job titles, duties, and physical or mental demands of each role.",
      "Any prior SSA decision, such as an earlier approval or denial, that bears on insured status or a previously established onset date.",
      "Correspondence already exchanged with SSA or the Disability Determination Services office about this specific claim.",
    ],
    processSteps: [
      {
        title: "Upload and read the actual denial notice",
        guidance:
          "The workflow reads the uploaded notice rather than relying on a claimant's memory of it, extracting the decision, the stated reason, and the deadline directly from the document's own language.",
      },
      {
        title: "Identify the correct appeal level",
        guidance:
          "Whether the correct response is a reconsideration or a hearing request depends on which decision the notice reflects, and requesting the wrong level can waste the time available before the deadline.",
      },
      {
        title: "Separate medical grounds from non-medical grounds",
        guidance:
          "A denial resting on insured status calls for different evidence than one resting on unmet medical severity, and the workflow keeps the two apart instead of treating every denial as a medical dispute.",
      },
      {
        title: "Assemble the claimant's own account of limitations",
        guidance:
          "The claimant's description of daily limitations, pain, and functional restrictions is recorded in their own words alongside supporting records, since this account is part of the file a decision-maker reviews.",
      },
      {
        title: "Attach supporting medical and work-history evidence",
        guidance:
          "Records the claimant uploads are organized by provider and date so a reviewer can trace each claim in the response back to a specific document rather than an unsupported assertion.",
      },
      {
        title: "Draft the written response and run an independent check",
        guidance:
          "A draft response is generated from the notice, the account of limitations, and the attached records, then checked for unresolved placeholders, missing required fields, and internal inconsistencies before it reaches review.",
      },
      {
        title: "Review, edit, and approve the exact document",
        guidance:
          "The claimant reviews the drafted response, can edit it directly, and must approve the exact text and packet contents before anything is prepared for mailing.",
      },
      {
        title: "Address, price, and mail the approved packet",
        guidance:
          "The approved response and its evidence are assembled into a mailing packet, priced by page count and mailing method, and sent by the method the claimant selects, with a mailing record retained afterward.",
      },
    ],
    issuesChecked: [
      "Whether the notice states a medical reason, a non-medical reason such as insured status, or both.",
      "Whether the appeal deadline calculated from the decision date has already passed.",
      "Whether the appeal level being requested matches the decision the notice actually reflects.",
      "Whether the claimant's account of limitations is specific enough to be useful, rather than a general description.",
      "Whether attached medical records actually cover the period and condition the denial reason addresses.",
      "Whether a required field, such as the claim number or a signature, is missing from the drafted response.",
      "Whether the response contains an unresolved placeholder or a claim not supported by an attached document.",
    ],
    commonMistakes: [
      "Requesting a hearing on an initial denial that has not yet gone through reconsideration, which is generally the wrong next step.",
      "Waiting for every medical record to arrive before starting the response, when the deadline runs from the notice date regardless of how long records take to obtain.",
      "Describing limitations in vague terms such as \"I can't work anymore\" instead of specific functional restrictions a decision-maker can evaluate against the medical record.",
      "Assuming a denial for insured status can be fixed with more medical evidence, when the actual issue is a non-medical work-credit or coverage-date question.",
      "Sending records to SSA generally instead of the Disability Determination Services office identified on the notice as holding the medical file.",
      "Treating an old denial's stated onset date as fixed, when a later claim can sometimes allege a different onset date depending on the medical record.",
      "Missing that a notice addressed to a representative payee or an auxiliary beneficiary carries its own separate deadline from the claimant's own notice.",
    ],
    scenarios: [
      {
        title: "Initial denial citing unmet medical severity",
        situation:
          "A claimant received a Notice of Disapproved Claim stating their condition does not meet SSA's severity requirements, with treatment records that exist but were never sent to the Disability Determination Services office.",
        responsePath:
          "The workflow identifies reconsideration as the correct next step, organizes the existing treatment records by provider and date, and drafts a response describing functional limitations tied directly to those records for review before mailing.",
      },
      {
        title: "Denial based on insured status rather than medical findings",
        situation:
          "The notice states the claimant's date last insured passed before the alleged onset date, with no medical determination discussed at all, meaning additional treatment records would not change the outcome.",
        responsePath:
          "The workflow flags this as a non-medical issue, prompts for any documentation bearing on work credits or coverage dates, and keeps the response focused on the insured-status question the notice actually raises.",
      },
      {
        title: "Reconsideration denial requiring a hearing request",
        situation:
          "A claimant already appealed once, received a reconsideration denial repeating the original medical reason, and now has a new physician statement describing more specific functional limits than the original file contained.",
        responsePath:
          "The workflow identifies the hearing request as the applicable next level, attaches the new physician statement alongside the earlier record, and prepares a response noting what has changed since the reconsideration decision.",
      },
      {
        title: "Deadline close to expiring with incomplete records",
        situation:
          "The notice's 60-day window is now less than two weeks from expiring, and the claimant has requested records from a provider that have not yet arrived.",
        responsePath:
          "The workflow prepares the response with the evidence already on hand, clearly marks which records are still pending, and lets the claimant approve and mail a timely response rather than miss the deadline waiting for a complete file.",
      },
    ],
    responsePaths: [
      "Mail the approved reconsideration or hearing request to the address or office the notice itself identifies, which the workflow addresses accordingly.",
      "Hold the approved packet as a personal record while gathering additional evidence, then return to revise it before the deadline.",
      "Provide the packet and underlying records to a representative or attorney who is handling the appeal, as background material rather than a final filing.",
      "Use the packet's evidence organization to submit records separately to the Disability Determination Services office if SSA requests additional documentation later.",
    ],
    packetContents: [
      "A summary of the notice's stated decision, reason, and deadline as extracted from the uploaded document.",
      "The claimant's written account of functional limitations, organized in the claimant's own words.",
      "Supporting medical records and provider statements, attached and referenced by date and source.",
      "A work-history summary covering roughly the past fifteen years relevant to the medical determination.",
      "The completed reconsideration or hearing-request response addressed to the correct SSA or Disability Determination Services office.",
      "A mailing cover sheet recording the recipient, mailing method, and date sent for the claimant's own records.",
    ],
    submissionGuidance: [
      "The workflow prepares and mails the approved response; it does not submit anything electronically to SSA, does not call SSA on the claimant's behalf, and does not represent the claimant in any proceeding.",
      "Because reconsideration and hearing requests are addressed to the office named on the notice, using the address associated with an earlier notice for a later appeal level can misdirect the response even when the claim number is correct.",
      "A mailing method that produces delivery confirmation is generally worth the added cost for a document tied to a fixed deadline, since it creates a record of when the response was sent, separate from when the notice was decided.",
    ],
    practicalChecklist: [
      "Photograph or scan the denial notice in full, including every page, before uploading it so no page of the stated reason is missed.",
      "Write down the exact deadline date calculated from the notice rather than relying on a remembered approximate date.",
      "Request records from every treating provider as soon as the notice is read, since provider offices often take longer to respond than the appeal itself takes to prepare.",
      "Keep a copy of the approved response and every attached record, separate from what is mailed, in case a copy is needed later.",
      "Note whether a family member or representative payee also received a copy of the notice, since that can affect who needs to respond.",
      "Track the mailing confirmation or tracking number after the packet is sent and store it with the notice and the response copy.",
    ],
    templatesAndTools: [
      "A guided intake that reads an uploaded SSA decision notice and extracts the decision, stated reason, and deadline before any drafting begins.",
      "An evidence organizer that sorts medical records, provider statements, and work history by date and source for the reconsideration or hearing response.",
      "An independent readiness check that flags missing fields, unresolved placeholders, and claims in the draft not tied to an attached record before approval.",
    ],
    faqs: [
      {
        question: "How long do I have to appeal an SSDI denial?",
        answer:
          "The standard window is 60 days from receipt of the notice, and SSA generally presumes receipt five days after the date printed on the notice unless you can show it arrived later. The exact deadline always depends on your specific notice, so read the appeal-rights section on your own copy.",
      },
      {
        question: "What if I missed the deadline on my SSDI denial notice?",
        answer:
          "SSA can accept a late appeal for good cause, such as a serious illness, a death in the family, or a documented problem with the mail, but that determination is made by SSA, not by this workflow, and is not automatic. Explaining the reason for the delay as part of the response is still worthwhile.",
      },
      {
        question: "Is a reconsideration request the same as a hearing request?",
        answer:
          "No. Reconsideration is the first appeal level after an initial denial and is generally reviewed by a different examiner at the same Disability Determination Services office. A hearing request comes after a reconsideration denial and is decided by an administrative law judge, a different process with its own form and deadline.",
      },
      {
        question: "Can this workflow tell me whether my SSDI appeal is likely to be approved?",
        answer:
          "No. It reads your notice, organizes your evidence, and drafts a response for your review, but it does not evaluate medical eligibility, predict a decision, or estimate your chances. Only SSA and, at the hearing level, an administrative law judge decide the outcome.",
      },
      {
        question: "My notice denies SSDI for insured status, not my medical condition. Does that change anything?",
        answer:
          "Yes. A denial based on insured status or work credits is a non-medical finding, and sending more medical records generally will not address it. This workflow separates the two so the response addresses the reason actually stated on your notice instead of assuming every denial is medical.",
      },
      {
        question: "Can this workflow represent me at a hearing?",
        answer:
          "No. It prepares and mails a written response and organizes supporting evidence, but it does not appear at a hearing, question a vocational expert, or act as your representative. If a hearing is scheduled, you may want an attorney or a qualified non-attorney representative for that stage.",
      },
      {
        question: "Is SSDI the same as SSI, and does this workflow cover both?",
        answer:
          "No. SSDI is funded through payroll taxes and depends on work credits, while Supplemental Security Income is a separate, needs-based program with its own rules and its own denial notice. This workflow is built for SSDI notices; an SSI denial follows a related but distinct process.",
      },
    ],
    glossary: [
      {
        term: "Disability Determination Services (DDS)",
        definition:
          "The state agency that makes the medical disability determination on SSA's behalf, applying SSA's own rules even though it is not part of SSA itself.",
      },
      {
        term: "Date last insured (DLI)",
        definition:
          "The date after which a worker's SSDI coverage lapses because insufficient recent work credits remain; disability generally must be shown as of on or before this date.",
      },
      {
        term: "Residual functional capacity (RFC)",
        definition:
          "SSA's assessment of what a claimant can still do physically and mentally despite their impairments, used to decide whether past or other work remains possible.",
      },
      {
        term: "Sequential evaluation",
        definition:
          "The five-step process SSA and DDS use to decide a disability claim, moving from current work activity through impairment severity, the Listings, past work, and other work.",
      },
      {
        term: "Good cause (late filing)",
        definition:
          "SSA's standard for accepting an appeal filed after the deadline, based on specific circumstances such as illness, a death in the family, or SSA's own error, decided case by case.",
      },
      {
        term: "Listing of Impairments",
        definition:
          "SSA's published criteria for specific conditions severe enough to be found disabling without a full functional-capacity analysis, sometimes called the Blue Book.",
      },
    ],
    sources: [
      {
        title: "Appeal a Decision We Made",
        publisher: "Social Security Administration",
        url: "https://www.ssa.gov/apply/appeal-decision-we-made",
        reviewedAt: REVIEWED,
        kind: "official",
      },
      {
        title: "Request Reconsideration",
        publisher: "Social Security Administration",
        url: "https://www.ssa.gov/apply/appeal-decision-we-made/request-reconsideration",
        reviewedAt: REVIEWED,
        kind: "official",
      },
      {
        title: "Form SSA-561, Request for Reconsideration",
        publisher: "Social Security Administration",
        url: "https://www.ssa.gov/forms/ssa-561.html",
        reviewedAt: REVIEWED,
        kind: "primary",
      },
      {
        title: "Form SSA-3441, Disability Report - Appeal",
        publisher: "Social Security Administration",
        url: "https://www.ssa.gov/forms/ssa-3441.html",
        reviewedAt: REVIEWED,
        kind: "primary",
      },
      {
        title: "Request a Hearing with a Judge",
        publisher: "Social Security Administration",
        url: "https://www.ssa.gov/apply/appeal-decision-we-made/request-hearing",
        reviewedAt: REVIEWED,
        kind: "official",
      },
    ],
    relatedWorkflowIds: [
      "appeal/ssi-denial",
      "appeal/social-security-denial",
      "benefits/benefits-reconsideration",
      "benefits/hearing-preparation",
    ],
    reviewedAt: REVIEWED,
    disclaimer:
      "MailMyPDF is not a law firm, does not give legal advice, and does not represent claimants before the Social Security Administration. This workflow organizes the notice and evidence a claimant supplies into a response for their own review and mailing, and it does not predict the outcome of an appeal.",
  },
};

export default entry;
