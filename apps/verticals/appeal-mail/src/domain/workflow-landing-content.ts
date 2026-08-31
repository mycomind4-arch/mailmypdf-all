/* ═══════════════════════════════════════════════════════════
   Appeal Mail — Workflow Landing Page Content
   Structured SEO + conversion content for top-priority workflows.
   ═══════════════════════════════════════════════════════════ */

export interface FAQEntry {
  question: string;
  answer: string;
}

export interface LandingContent {
  h1: string;
  subheadline: string;
  whatItMeans: string;
  whoIsThisFor: string;
  commonReasons: string[];
  whatMatters: string;
  evidenceChecklist: string[];
  deadlineGuidance: string;
  whatWeDo: string;
  ctaText: string;
  faqs: FAQEntry[];
  relatedWorkflowIds: string[];
}

export const workflowLandingContent: Partial<Record<string, LandingContent>> = {
  "unemployment-denial": {
    h1: "Appeal an Unemployment Denial",
    subheadline: "Upload your unemployment decision. AI analyzes the findings, builds your appeal, and prepares it for certified mailing — all in one flow.",
    whatItMeans: "An unemployment denial means the state agency determined you did not qualify for benefits. Common reasons include voluntary quit without good cause, misconduct connected to the work, insufficient earnings in the base period, or failure to meet weekly certification requirements. You have a limited window — typically 10 to 30 days — to file an appeal.",
    whoIsThisFor: "Anyone who applied for unemployment benefits and received a determination letter denying their claim. This includes workers laid off, fired, or who left a job and are disputing the state's reasoning for denial.",
    commonReasons: [
      "The agency says you quit without good cause",
      "The agency says you were fired for misconduct",
      "Insufficient earnings during the base period",
      "You did not meet the weekly work-search requirements",
      "You refused suitable work without good cause",
      "The agency says you are not able or available to work",
    ],
    whatMatters: "The most important things in your appeal are: the specific reason the agency gave for denial, the deadline to appeal (printed on your determination letter), and any evidence that contradicts the agency's reasoning — such as separation documents, witness statements, medical records, or pay stubs.",
    evidenceChecklist: [
      "Your determination or denial letter from the state agency",
      "Separation notice or termination letter from your employer",
      "Pay stubs or earnings records for the base period",
      "Any correspondence with the unemployment agency",
      "Medical records (if health issues affected employment)",
      "Witness contact information or written statements",
      "Documentation of your work-search activities",
    ],
    deadlineGuidance: "Most states give you 10 to 30 days from the date on your determination letter to file an appeal. The deadline is printed on the letter. File as soon as possible — if you miss the deadline, you may lose your right to a hearing entirely. Appeal Mail uses certified mail so you have proof your appeal was delivered on time.",
    whatWeDo: "Appeal Mail analyzes your denial letter with AI to identify the specific reasons for denial, the relevant deadline, and what evidence you need. It drafts a structured appeal letter that addresses each finding, validates the letter for completeness, and lets you send it by certified mail with proof of delivery — without ever leaving the page.",
    ctaText: "Start your unemployment appeal",
    faqs: [
      { question: "How long do I have to appeal an unemployment denial?", answer: "Most states require you to file within 10 to 30 days of the date on your determination letter. The exact deadline is printed on the letter. If you miss it, you generally lose the right to a hearing. Appeal Mail helps you move fast with certified mail proof of delivery." },
      { question: "Do I need a lawyer for an unemployment appeal?", answer: "You are not required to have a lawyer for an unemployment appeal hearing. Many people represent themselves successfully. Appeal Mail helps you prepare a clear, well-organized appeal letter that addresses the agency's findings — but it does not provide legal representation." },
      { question: "What happens after I file my appeal?", answer: "The agency will schedule a hearing, usually by phone or video. You will present your side, and the agency or employer will present theirs. The hearing officer issues a written decision. If you disagree with that decision, you may have a second level of appeal." },
      { question: "Can I appeal an EDD denial with Appeal Mail?", answer: "Yes. Appeal Mail has a dedicated EDD denial workflow for California unemployment appeals. If you received a denial from EDD, you can use either the general unemployment workflow or the EDD-specific workflow." },
      { question: "Why certified mail for an unemployment appeal?", answer: "Certified mail provides proof that your appeal was delivered and when. Many state agencies require mailed appeals, and proof of timely filing protects you if the agency claims your appeal was late." },
    ],
    relatedWorkflowIds: ["edd-denial", "reconsideration"],
  },

  "insurance-claim-denial": {
    h1: "Appeal an Insurance Claim Denial",
    subheadline: "Upload your denial letter. AI identifies coverage issues and policy violations, builds a documented appeal, and sends it by certified mail.",
    whatItMeans: "An insurance claim denial means the insurer determined your claim is not covered, not medically necessary, or did not meet plan requirements. Under the Affordable Care Act, you have the right to an internal appeal and, if denied, an external review. Most insurance denials can be appealed — and many are overturned.",
    whoIsThisFor: "Anyone whose health, auto, home, or other insurance claim was denied. This includes patients denied coverage for medical procedures, policyholders whose claims were rejected, and anyone who received a denial letter from an insurance company.",
    commonReasons: [
      "The insurer says the treatment is not medically necessary",
      "The service or provider is out of network",
      "The claim was filed too late (timely filing)",
      "The treatment is excluded under the plan",
      "Prior authorization was not obtained",
      "The insurer says the diagnosis is not covered",
      "The claim has coding or billing errors",
    ],
    whatMatters: "The most critical elements are: the specific denial reason cited by the insurer, the plan section or policy language the insurer relied on, the deadline to appeal (typically 180 days under ACA for health plans), and any supporting documentation such as medical records, letters of medical necessity from your doctor, or policy language that supports coverage.",
    evidenceChecklist: [
      "Your denial or explanation of benefits (EOB) letter",
      "Your insurance policy or plan document",
      "Medical records or clinical notes",
      "A letter of medical necessity from your provider",
      "Prior authorization documents (if applicable)",
      "Bills, receipts, or cost estimates",
      "Any prior correspondence with the insurer",
    ],
    deadlineGuidance: "For health insurance under the ACA, you generally have 180 days to file an internal appeal. Other insurance types (auto, home, life) may have shorter deadlines — often 30 to 60 days. The deadline is stated in your denial letter. Certified mail ensures your appeal is received and documented before the deadline.",
    whatWeDo: "Appeal Mail analyzes your denial letter with AI to identify the coverage issues, policy language, and deadline. It drafts a structured appeal that references your policy, addresses each denial reason, and includes your evidence. After you review and approve, it sends the appeal by certified mail with tracking and proof of delivery.",
    ctaText: "Start your insurance appeal",
    faqs: [
      { question: "How long do I have to appeal an insurance claim denial?", answer: "For health insurance plans under the Affordable Care Act, you typically have 180 days from the denial to file an internal appeal. Other insurance types may have shorter deadlines — check your denial letter for the specific timeframe." },
      { question: "What is the difference between an internal appeal and external review?", answer: "An internal appeal asks the insurance company to reconsider its decision. If the internal appeal is denied, you can request an external review by an independent third party. The insurer must follow the external reviewer's decision." },
      { question: "Do I need a lawyer to appeal an insurance denial?", answer: "Many people successfully appeal insurance denials on their own. Appeal Mail helps you build a structured, evidence-backed appeal letter. For complex cases or large claims, you may want to consult an attorney — but Appeal Mail does not provide legal representation." },
      { question: "Can I appeal a medical necessity denial?", answer: "Yes. Medical necessity denials are among the most common and most successfully appealed. Appeal Mail has a dedicated medical necessity appeal workflow, or you can use the general insurance claim denial workflow." },
      { question: "Why send my appeal by certified mail?", answer: "Certified mail provides proof that your appeal was delivered and when. This protects you if the insurer claims they never received your appeal or that it was filed late. The tracking number and delivery confirmation serve as legal proof of timely filing." },
    ],
    relatedWorkflowIds: ["medical-necessity-appeal", "insurance-coverage-denial", "claim-denial-letter", "dental-insurance-appeal"],
  },


  "ssdi-denial": {
    h1: "Appeal an SSDI Denial",
    subheadline: "Upload your SSDI denial notice. AI identifies the findings, deadline, and evidence gaps, then builds your appeal for certified mailing to the SSA.",
    whatItMeans: "An SSDI (Social Security Disability Insurance) denial means the SSA determined you are not disabled under their rules — usually because they believe your condition is not severe enough, will not last 12 months, or you can still perform work. You have 60 days to appeal, and the appeal process has multiple stages: reconsideration, ALJ hearing, and Appeals Council.",
    whoIsThisFor: "Anyone who applied for Social Security Disability Insurance and received a denial notice. This includes initial applications, reconsiderations, and ALJ hearing denials. If you were denied at any stage, you can appeal to the next level within 60 days.",
    commonReasons: [
      "The SSA says your condition is not severe enough to prevent work",
      "The SSA says your condition will not last at least 12 months",
      "Insufficient medical evidence to support your claim",
      "The SSA says you can still perform your past work",
      "The SSA says you can adjust to other work",
      "You did not follow prescribed treatment",
      "Your earnings exceed the substantial gainful activity (SGA) limit",
    ],
    whatMatters: "The most critical elements are: the stage of your appeal (initial, reconsideration, ALJ, Appeals Council), the 60-day deadline, medical evidence documenting your condition and its severity, and the specific findings the SSA made in your denial letter. The SSA assumes you received the denial 5 days after the date on the letter, so you effectively have 65 days.",
    evidenceChecklist: [
      "Your SSDI denial or decision notice",
      "Medical records from all treating providers",
      "A letter from your doctor describing your limitations",
      "Medication list and treatment history",
      "Work history (to show you cannot perform past work)",
      "Any prior decisions or reconsideration determinations",
      "Contact information for current medical providers",
    ],
    deadlineGuidance: "You have 60 days from the date on your denial notice to file an appeal. The SSA assumes you received the notice 5 days after the date on the letter, so you effectively have 65 days. If you miss the deadline, you generally have to start a new application. Certified mail is critical for SSA appeals — it provides proof of timely filing.",
    whatWeDo: "Appeal Mail analyzes your SSDI denial notice with AI to identify the stage, the findings, the deadline, and what medical evidence you need. It drafts a reconsideration or hearing request that addresses each finding, references your evidence, and follows SSA formatting. You review, approve, and send by certified mail with proof of delivery.",
    ctaText: "Start your SSDI appeal",
    faqs: [
      { question: "How long do I have to appeal an SSDI denial?", answer: "You have 60 days from the date on your denial notice. The SSA assumes you received it 5 days after the date on the letter, giving you effectively 65 days. If you miss the deadline, you usually have to start over with a new application." },
      { question: "What are the stages of an SSDI appeal?", answer: "There are four stages: (1) Initial application, (2) Reconsideration, (3) Administrative Law Judge (ALJ) hearing, and (4) Appeals Council. You can appeal to each next stage within 60 days of the prior denial. Appeal Mail supports the reconsideration and ALJ stages." },
      { question: "Do I need a disability attorney for an SSDI appeal?", answer: "You are not required to have an attorney, but many people get one for the ALJ hearing stage. Attorneys typically work on contingency (25% of back pay, up to $7,200). Appeal Mail helps you prepare the appeal letter yourself — but it does not replace legal representation." },
      { question: "Can I appeal an SSI denial the same way?", answer: "Yes. SSI (Supplemental Security Income) appeals follow the same 60-day deadline and multi-stage process as SSDI. Appeal Mail has a dedicated SSI denial workflow with the same analysis, drafting, and certified mailing capabilities." },
      { question: "Why is certified mail important for SSA appeals?", answer: "The SSA requires proof of timely filing. Certified mail with a return receipt gives you a tracking number and delivery confirmation — legal proof that your appeal was received within the 60-day window. This protects you if the SSA claims your appeal was late." },
    ],
    relatedWorkflowIds: ["ssi-denial", "social-security-denial", "reconsideration"],
  },


  "drivers-license-suspension": {
    h1: "Appeal a Driver's License Suspension",
    subheadline: "Upload your DMV suspension notice. AI identifies the reason, deadline, and hearing path, then builds your appeal for certified mailing.",
    whatItMeans: "A driver's license suspension means the DMV has taken away your driving privileges for a set period. Common causes include DUI/DWI, excessive points, failure to appear in court, unpaid tickets, or driving without insurance. You have the right to request a hearing, but the deadline is short — often 7 to 30 days from the notice date.",
    whoIsThisFor: "Anyone whose driver's license was suspended by the DMV. This includes DUI suspensions, point-accumulation suspensions, failure-to-appear suspensions, and administrative suspensions. If you need to drive for work, school, or medical appointments, you may also be eligible for a restricted or hardship license.",
    commonReasons: [
      "DUI or DWI arrest or conviction",
      "Accumulation of too many points on your driving record",
      "Failure to appear in court or pay a traffic ticket",
      "Driving without insurance or with a suspended registration",
      "Failure to complete required programs (DUI school, traffic school)",
      "Refusal to take a chemical test (implied consent)",
      "Medical condition reported to the DMV",
    ],
    whatMatters: "The most important things are: the specific reason for suspension (which determines the hearing type and your defense), the deadline to request a hearing (printed on the notice), whether you qualify for a restricted or hardship license, and any evidence that the suspension was issued in error or that you have mitigating circumstances.",
    evidenceChecklist: [
      "Your license suspension notice from the DMV",
      "Your driving record or abstract",
      "Court disposition or conviction records",
      "Proof of completed programs (DUI school, traffic school, community service)",
      "Proof of insurance (if the suspension was for no insurance)",
      "Payment records for fines or tickets",
      "Medical clearance (if medical suspension)",
      "Employment or school records (for hardship license request)",
    ],
    deadlineGuidance: "The deadline to request a DMV hearing varies by state and by the type of suspension. DUI suspensions often have very short deadlines — 7 to 10 days in some states. Check your suspension notice for the exact deadline. Certified mail ensures your hearing request is received and documented before the deadline expires.",
    whatWeDo: "Appeal Mail analyzes your suspension notice with AI to identify the basis for suspension, the hearing deadline, and what evidence you need. It drafts a hearing request and appeal letter that addresses the suspension, references your evidence, and requests a hearing or hardship license. You review, approve, and send by certified mail with proof of delivery.",
    ctaText: "Start your driver's license appeal",
    faqs: [
      { question: "How long do I have to appeal a driver's license suspension?", answer: "The deadline depends on your state and the type of suspension. DUI suspensions can have deadlines as short as 7 to 10 days. Check your suspension notice for the exact deadline — it will tell you how long you have to request a hearing." },
      { question: "Can I get a restricted or hardship license?", answer: "Many states offer restricted or hardship licenses that allow you to drive to work, school, or medical appointments during the suspension. Appeal Mail can help you request a hardship license as part of your appeal letter." },
      { question: "Do I need a lawyer for a DMV hearing?", answer: "You are not required to have a lawyer at a DMV hearing, but for DUI or complex cases, an attorney can be helpful. Appeal Mail helps you prepare the hearing request and supporting letter yourself — but it does not provide legal representation." },
      { question: "What is the difference between a suspension and a revocation?", answer: "A suspension is temporary — your license is taken away for a set period, and you can usually get it back by paying a reinstatement fee. A revocation is more serious — your license is completely cancelled, and you must reapply for a new license. Appeal Mail has a separate workflow for license revocation appeals." },
      { question: "Why certified mail for a DMV appeal?", answer: "DMV deadlines are strict and short. Certified mail provides proof that your hearing request was delivered and when. If the DMV claims your request was late, the certified mail receipt is your proof of timely filing." },
    ],
    relatedWorkflowIds: ["license-suspension-appeal", "license-revocation-appeal"],
  },

  "license-revocation-appeal": {
    h1: "Appeal a License Revocation",
    subheadline: "Upload your revocation decision. AI identifies the stated reason, appeal path, and evidence gaps, then builds your appeal for certified mailing.",
    whatItMeans: "A license revocation means the DMV or licensing authority has completely cancelled your driving privileges. Unlike a suspension, a revocation means you must reapply for a new license after the revocation period ends. Common causes include serious DUI convictions, repeated offenses, or fraud. You have the right to appeal — but the deadline is short.",
    whoIsThisFor: "Anyone whose driver's license was revoked by the DMV or whose professional license was revoked by a licensing board. This includes revocations for serious DUI convictions, repeated traffic offenses, fraud, or professional misconduct. If your livelihood depends on your license, appealing quickly is critical.",
    commonReasons: [
      "Serious or repeated DUI/DWI convictions",
      "Accumulation of multiple suspensions or serious offenses",
      "Fraud or misrepresentation on a license application",
      "Vehicular manslaughter or serious criminal charges",
      "Failure to complete court-ordered programs",
      "Professional license revocation for misconduct or violations",
      "Medical condition that makes driving unsafe",
    ],
    whatMatters: "The most critical elements are: the specific reason for revocation (which determines whether appeal is even possible), the deadline to request an administrative hearing, whether you are eligible for a restricted license during the revocation period, and any evidence of mitigating circumstances or errors in the revocation process.",
    evidenceChecklist: [
      "Your license revocation notice from the DMV or licensing board",
      "Your complete driving record or abstract",
      "Court dispositions for all relevant cases",
      "Proof of completed programs (DUI school, treatment, community service)",
      "Character references or employment records",
      "Medical clearance (if medical revocation)",
      "Evidence of mitigating circumstances",
      "Any prior appeal or hearing decisions",
    ],
    deadlineGuidance: "The deadline to appeal a license revocation varies by state and by the type of revocation. Some revocations have very short deadlines — 7 to 14 days. Check your revocation notice for the exact deadline. Certified mail ensures your appeal is received and documented before the deadline expires.",
    whatWeDo: "Appeal Mail analyzes your revocation decision with AI to identify the stated reason, the appeal path, the deadline, and what evidence you need. It drafts an appeal letter that addresses the revocation, references your evidence, and requests a hearing or reinstatement. You review, approve, and send by certified mail with proof of delivery.",
    ctaText: "Start your license revocation appeal",
    faqs: [
      { question: "How long do I have to appeal a license revocation?", answer: "The deadline depends on your state and the type of revocation. Some revocations have deadlines as short as 7 to 14 days. Check your revocation notice for the exact deadline." },
      { question: "Can I get my license back after a revocation?", answer: "Unlike a suspension, a revocation means your license is completely cancelled. After the revocation period ends, you must reapply for a new license, which may require retaking tests and paying fees. Appeal Mail can help you appeal the revocation itself or request early reinstatement." },
      { question: "What is the difference between a suspension and a revocation?", answer: "A suspension is temporary — your license is taken away for a set period, and you can usually get it back by paying a reinstatement fee. A revocation is more serious — your license is completely cancelled, and you must reapply for a new license." },
      { question: "Can I drive during the revocation period?", answer: "Generally no. However, some states offer restricted or hardship licenses during a revocation period for essential driving (work, school, medical). Appeal Mail can help you request a hardship license as part of your appeal." },
      { question: "Why certified mail for a license revocation appeal?", answer: "Revocation deadlines are strict. Certified mail provides proof that your appeal was delivered and when. If the DMV or licensing board claims your appeal was late, the certified mail receipt is your proof of timely filing." },
    ],
    relatedWorkflowIds: ["drivers-license-suspension", "license-suspension-appeal"],
  },
};
