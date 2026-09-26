import type { AuthoredWorkflowSeoEntry } from ".";

const REVIEWED = "2026-09-21";

/**
 * Authority content for the "notice/irs-notice" workflow: responding to a
 * mailed IRS notice or letter in general (balance-due, income-matching,
 * math-error, or collection track). Deliberately kept broader than the
 * separate notice/cp2000-response workflow, which covers one specific
 * notice type in depth. Scope follows MailMyPDF's product boundary: this
 * prepares and mails a written response, it does not give tax or legal
 * advice, calculate what is owed, or represent anyone before the IRS.
 */
const entry: AuthoredWorkflowSeoEntry = {
  id: "notice-respond/irs-notice-response",
  content: {
    primaryKeyword: "respond to an irs notice",
    primaryIntent:
      "Someone received a notice or letter directly from the IRS about a federal tax account and needs to understand exactly what it says, verify it is genuine, decide whether they agree or disagree with each item it raises, and prepare a written response before the deadline printed on that specific notice.",
    secondaryKeywords: [
      "what does my irs notice mean",
      "irs notice response deadline",
      "irs letter says i owe money",
      "cp14 cp504 balance due notice",
      "how to respond to an irs letter by mail",
      "is my irs notice a scam",
    ],
    seoTitle: "Respond to an IRS Notice or Letter | MailMyPDF",
    h1: "How to respond to an IRS notice or letter",
    metaDescription:
      "Received an IRS notice or letter? Identify what it actually says, compare it against your own records, and prepare a written response and evidence packet before its deadline.",
    overview:
      "This workflow is for the specific situation where a taxpayer has received a notice or letter directly from the IRS about a federal tax account — a balance-due notice, a proposed change to reported income, a request for missing information, a math-error correction, or a collection warning — and needs to work out exactly what the notice says, whether the underlying tax return or account record supports it, and how to put a written response together before the response window printed on that notice closes. The workflow does not calculate what is actually owed or predict how the IRS will rule on a disputed item. It walks through the notice line by line, separates the parts generated automatically by IRS processing from the parts that depend on records only the taxpayer holds, and produces a structured written response and an evidence packet addressed to the campus shown on the notice itself.",
    issuerContext:
      "Most individual notices are generated automatically by IRS account and return-processing systems when a filed return, a third-party information return such as a W-2 or 1099, or an existing account balance triggers a rule — a human employee typically has not individually reviewed the specific notice before it is mailed. Notices are identified by a CP number or an LTR/Letter number printed in the upper right corner of the first page, and each number corresponds to a distinct IRS process — balance due, income matching, math-error correction, identity verification, or collection escalation — with its own response procedure, its own mailing address, and its own deadline printed on that particular notice, which varies by notice type and is never a single fixed number of days across every notice.",
    documentIdentification: [
      "The notice or letter number printed in the upper right corner of page one (a CP number or an LTR/Letter number), which determines which response process applies.",
      "The tax year or tax period the notice concerns, which can be several years earlier than the date the notice was actually mailed.",
      "The notice date and the separate response-by deadline date, both printed near the top of the first page rather than calculated by the taxpayer.",
      "The reply address and phone number printed on the notice, which vary by notice type and processing campus and often differ from the IRS's general filing address.",
      "Whether the notice states a specific dollar amount already due, proposes a change pending a response, or explicitly states it is not a bill.",
    ],
    whenToUse: [
      "You received a notice or letter from the IRS by mail about your tax account and are not yet certain what it is actually asking you to do.",
      "The notice proposes a change to a filed return, states an amount due, or requests documentation that you can supply.",
      "You disagree with part or all of a proposed adjustment and want to prepare a written position with supporting records.",
      "You agree with the notice but want a documented written response on file, or you want to request an appeal of a collection action before it proceeds further.",
    ],
    whenNotToUse: [
      "The contact arrived by email, text message, or an unsolicited phone call demanding immediate payment — the IRS does not initiate contact that way, and this workflow only handles a mailed paper notice carrying a genuine notice or letter number.",
      "You need someone to represent you in a call, an audit interview, or a Tax Court proceeding, which requires a licensed representative acting under a power of attorney, not a mailed written response.",
      "You need a calculation of what you actually owe, an eligibility determination for a payment plan or offer in compromise, or general tax advice.",
      "You want a return prepared, reviewed, or amended before filing — this workflow responds to a notice already received, it does not prepare or amend tax returns.",
    ],
    inspectOnDocument: [
      "Confirm the notice or letter number and compare it against the type of issue you expect, since different numbers trigger completely different response tracks.",
      "Check the tax year or period referenced, because a notice can concern a return filed several years before the notice itself was mailed.",
      "Read whether the notice states a specific dollar figure already due, a proposed change amount, or no dollar figure at all.",
      "Locate the response deadline date printed on the notice and note whether it runs from the notice date or names a fixed calendar date.",
      "Check the reply address and phone number printed on the notice, since different notice types route to different IRS campuses and a response sent to the wrong address can be delayed.",
      "Look for a tear-off response form enclosed with the notice, since some notice types require that specific form to be returned along with any written reply.",
    ],
    timingGuidance: [
      "The response deadline is printed on the notice itself and is not a fixed number of days across every notice type — some notices allow substantially more time than others, and the only reliable deadline is the one printed on the specific notice received, not a general rule remembered from elsewhere.",
      "Notices that carry a time-limited appeal right tied to a specific request form generally set a firm window measured from the notice date, and missing that window can close off a route to an independent hearing rather than eliminating the underlying tax issue, so identifying whether a notice carries that kind of right matters early.",
      "An IRS account transcript has its own separate ordering and processing turnaround that is unrelated to the notice's own response deadline, so requesting a transcript to check a disputed figure should start immediately rather than being scheduled around the response date.",
    ],
    informationChecklist: [
      "The exact notice or letter number, the tax year it concerns, and any case or reference number printed on the notice.",
      "The taxpayer's name and address exactly as printed on the notice, plus the last four digits of the SSN or EIN shown.",
      "The response deadline date and the mailing address printed for replies on that specific notice.",
      "Whether the position on each item the notice raises is agree, partially agree, or disagree.",
      "Any prior correspondence already sent to the IRS about this same notice or the same tax year.",
      "Whether a paid preparer, CPA, enrolled agent, or attorney already has a power of attorney on file for this account.",
    ],
    evidenceChecklist: [
      "A copy of the tax return as originally filed for the year the notice concerns, not a later amended version.",
      "Any IRS account transcript or wage-and-income transcript already obtained for that same tax year.",
      "The W-2s, 1099s, or other information returns the notice references, compared line by line against what was actually reported.",
      "Bank records or payment confirmations showing any amount already paid toward the balance the notice describes.",
      "Certified-mail receipts or delivery confirmation from any prior written response already sent to the IRS on this matter.",
      "Receipts, statements, or records supporting any deduction, credit, or income figure the notice disputes.",
      "Copies of every earlier notice or letter received about the same tax year, kept in the order they arrived.",
    ],
    processSteps: [
      {
        title: "Confirm the notice is genuine and identify its type",
        guidance:
          "Match the notice or letter number against the notice type it claims to be, confirm the return address is an actual IRS campus, and rule out a phishing attempt before treating any figure on the page as authoritative.",
      },
      {
        title: "Extract every figure and date the notice states",
        guidance:
          "Record the notice number, tax year, proposed or assessed amount, and the exact response deadline separately from any interpretation, so the objective facts printed on the page are not mixed with conclusions drawn from them later.",
      },
      {
        title: "Compare the notice against the return and prior records",
        guidance:
          "Line up the notice's figures against the filed return, any transcripts, and the information returns it references, marking each item as matching, partially matching, or in dispute rather than accepting the notice's framing without checking it.",
      },
      {
        title: "Decide the response position for each item raised",
        guidance:
          "Work through the notice item by item and record whether the position is agree, partially agree, or disagree, along with the specific evidence supporting that position for each individual item raised.",
      },
      {
        title: "Identify whether the notice carries a time-limited appeal right",
        guidance:
          "Check whether the notice is a type that opens a Collection Appeals Program or Collection Due Process window, since those routes require a specific request form filed within the period stated on that particular notice.",
      },
      {
        title: "Draft the written response in the notice's expected format",
        guidance:
          "Build a written response addressed to the campus and department shown on the notice, referencing its notice number and tax year, and attach the supporting records identified as relevant to each disputed item.",
      },
      {
        title: "Review, approve, and prepare the packet for mailing",
        guidance:
          "Review the drafted response and attached evidence against the original notice one final time before approval, then prepare the packet exactly as approved so nothing changes between review and mailing.",
      },
    ],
    issuesChecked: [
      "Whether the notice number and tax year match the issue the taxpayer actually expects to have open.",
      "Whether the dollar figures in the notice match the taxpayer's own return, transcript, or W-2/1099 records.",
      "Whether the notice's stated deadline has already passed or is still open.",
      "Whether the notice is a proposal, an already-assessed bill, or an informational notice requiring no payment.",
      "Whether the notice references a Collection Appeals Program or Collection Due Process right tied to a specific request form.",
      "Whether a payment the taxpayer already made is reflected in the notice's stated balance.",
    ],
    commonMistakes: [
      "Assuming a proposed change on an income-matching notice is already final and paying it without first checking whether the underlying figure is actually correct.",
      "Missing a Collection Due Process request window because the deadline was measured from the wrong date instead of the date actually printed on the notice.",
      "Calling the number on the notice and relying on that verbal conversation instead of following up in writing, since a phone call generally is not preserved the way a written response is.",
      "Sending original documents instead of copies and losing the only copy of a receipt, statement, or transcript that may be needed again later.",
      "Responding about the wrong tax year because a notice about an earlier year arrived around the same time as a notice about the current year.",
      "Ignoring a notice that states no dollar amount is owed, on the assumption that no balance means no response is needed, when some no-balance notices still require a reply to avoid a default outcome.",
      "Treating every notice as requiring the same response process, when a math-error notice, an income-matching notice, and a collection notice each follow a different procedure with a different deadline structure.",
    ],
    scenarios: [
      {
        title: "Balance-due notice larger than expected after filing",
        situation:
          "A taxpayer filed a return showing a balance due, made a partial payment toward it, and then received a follow-up notice stating a larger balance than expected, with penalty and interest calculated back to the original filing date.",
        responsePath:
          "The workflow compares the notice's stated balance against the return and the payment record, separates the original tax, penalty, and interest components, and prepares a written response documenting the payment already made before any further contact with the IRS.",
      },
      {
        title: "Income-matching notice citing a 1099 the taxpayer never received",
        situation:
          "The IRS sent a notice proposing additional tax because a 1099 filed by a client or platform reported income higher than what the taxpayer reported, and the taxpayer never actually received a copy of that 1099 to check it against their own records.",
        responsePath:
          "The workflow documents the taxpayer's own contemporaneous records of the income in question, flags the discrepancy against the reported 1099 amount, and prepares a written response disputing the unsupported portion while conceding any portion that does match.",
      },
      {
        title: "Final notice that opens a Collection Due Process window",
        situation:
          "A taxpayer received a notice stating the IRS intends to levy a bank account or wages, a more serious and more time-sensitive notice than an earlier routine balance-due reminder the taxpayer may have already set aside.",
        responsePath:
          "The workflow flags that this specific notice type carries a time-limited hearing right, identifies the request form and the exact deadline printed on that notice, and prepares the hearing request alongside the supporting evidence packet so it can be mailed before the window closes.",
      },
      {
        title: "New notice arriving while a payment plan is already in place",
        situation:
          "A taxpayer already has an existing installment agreement running and receives a new notice about the same tax year, without being sure whether the new notice cancels the agreement, adds to it, or is unrelated to the payment plan already in place.",
        responsePath:
          "The workflow records the existing agreement's details alongside the new notice, checks whether the new notice's tax year and amount overlap with the agreement already running, and drafts a written response that references the existing agreement rather than starting a duplicate negotiation from scratch.",
      },
    ],
    responsePaths: [
      "Mail the completed written response and evidence packet to the address printed on the notice itself, which is often different from the IRS's general filing address.",
      "File a time-limited appeal request, such as a Collection Appeals Program or Collection Due Process request, when the specific notice received carries that right.",
      "Hold the prepared packet and respond by phone or through an online IRS account instead, using the packet as the underlying written record of the position taken.",
      "Route the completed packet to a CPA, enrolled agent, or tax attorney who already represents the taxpayer, rather than mailing it directly to the IRS.",
    ],
    packetContents: [
      "A cover response letter addressed to the notice's campus and department, referencing the exact notice number and tax year.",
      "An item-by-item position statement showing agree, partially agree, or disagree for each issue the notice raised.",
      "The supporting records identified as relevant to each disputed item, organized in the same order the notice raises them.",
      "A copy of the original notice itself, so the recipient can match the response against the specific notice that prompted it.",
      "A figure comparison table, when the dispute involves a dollar amount, placing the notice's number against the taxpayer's own record.",
      "A time-limited appeal request form, such as Form 9423 or Form 12153, when the notice type makes one available and the taxpayer elects to use it.",
    ],
    submissionGuidance: [
      "The prepared response is mailed to the address printed on the specific notice received, which is frequently a dedicated response address rather than the IRS's general return-filing address, and using the wrong address can delay processing even when the content itself is correct.",
      "This workflow does not file anything electronically with the IRS, does not submit a return or an amended return, and does not represent the taxpayer in any call, meeting, or proceeding with the IRS.",
      "When the response includes a time-limited appeal request such as Form 9423 or Form 12153, the mailing record and any tracking or certified-mail receipt are retained alongside a copy of what was sent, since proof of timely mailing can matter later if the timing of the request is ever questioned.",
    ],
    practicalChecklist: [
      "Photograph or scan the notice's first page showing the notice number, tax year, and mailing address before anything else is done with it.",
      "Write the exact response deadline into a calendar reminder set several days before the printed date, not on the date itself.",
      "Order an account transcript for the tax year in question as early as possible, since transcript requests take their own separate processing time.",
      "Keep the envelope the notice arrived in, since its postmark can matter if the notice's mailing date is ever disputed.",
      "Note whether a paid preparer already has a power of attorney on file, since a response sent without referencing that authorization can be treated as coming from an unrepresented taxpayer.",
      "Record what is genuinely unknown about a disputed figure as unknown, rather than guessing at an amount that may not match the underlying return.",
    ],
    templatesAndTools: [
      "A guided intake covering the notice's type, tax year, stated figures, and the taxpayer's item-by-item position on each issue raised.",
      "A notice-type reference that flags when a specific notice carries a time-limited appeal right tied to a particular request form.",
      "A response-packet generator that assembles the cover letter, position statement, supporting evidence, and any applicable appeal request form into a single mailable document.",
    ],
    faqs: [
      {
        question: "How much time do I have to respond to an IRS notice?",
        answer:
          "The response deadline is printed on the specific notice you received and is not the same across every notice type, so the only reliable deadline is the date printed on your own notice rather than a general rule you may have heard applies to IRS notices generally.",
      },
      {
        question: "Is a notice that proposes a change to my return the same as a bill?",
        answer:
          "No. Some notices propose a change and ask for a response before anything is actually assessed, while others state a balance already due. The notice itself states which situation applies, and this workflow treats those two situations differently instead of assuming every notice is a bill.",
      },
      {
        question: "What if I don't have the return or records the notice references?",
        answer:
          "You can request an account transcript or a copy of a prior return from the IRS, and the workflow documents what is missing so the response can note that a record is being requested rather than guessing at figures that are not yet available.",
      },
      {
        question: "Will this workflow calculate what I actually owe?",
        answer:
          "No. It organizes the notice's figures against your own records and documents where they match or differ, but it does not calculate tax liability, determine penalty relief eligibility, or provide tax advice about what you actually owe the IRS.",
      },
      {
        question: "Can this workflow represent me before the IRS?",
        answer:
          "No. MailMyPDF prepares and mails a written response on your behalf as the sender, but it does not represent you in a call, meeting, or proceeding with the IRS, which requires a licensed representative acting under a power of attorney.",
      },
      {
        question: "What happens if I miss the deadline printed on the notice?",
        answer:
          "The consequence depends on the specific notice type, and can range from a proposed change becoming final to a collection action moving forward, or to losing a specific time-limited appeal right, which is why identifying the deadline and what it protects matters early rather than after it has already passed.",
      },
      {
        question: "How do I know if my notice is a scam and not really from the IRS?",
        answer:
          "A genuine notice arrives by mail, states a specific notice or letter number, and never demands immediate payment by gift card, wire transfer, or cryptocurrency. This workflow checks the notice number and return address as part of confirming it is a real IRS notice before proceeding further.",
      },
    ],
    glossary: [
      {
        term: "CP notice",
        definition:
          "A notice number beginning with 'CP' generated by automated IRS processing, with each number tied to a specific process such as a balance due, a proposed change, or a math-error correction.",
      },
      {
        term: "Letter number (LTR)",
        definition:
          "An IRS letter identified by a number rather than a CP prefix, often used for more complex matters such as a final notice of intent to levy or an audit-related letter.",
      },
      {
        term: "Collection Appeals Program (CAP)",
        definition:
          "An IRS appeal process for certain collection actions such as liens, levies, and installment agreement terminations, requested using Form 9423.",
      },
      {
        term: "Collection Due Process (CDP)",
        definition:
          "A hearing right tied to specific collection notices, requested using Form 12153 within the period stated on that notice, that can preserve the right to later Tax Court review.",
      },
      {
        term: "Account transcript",
        definition:
          "An IRS record of a taxpayer's account activity for a given tax year, including payments, penalties, and adjustments, separate from the filed return itself.",
      },
      {
        term: "Power of attorney (Form 2848)",
        definition:
          "The IRS form that authorizes a specific representative, such as a CPA, enrolled agent, or attorney, to act or receive information on a taxpayer's behalf.",
      },
    ],
    sources: [
      {
        title: "Understanding Your IRS Notice or Letter",
        publisher: "Internal Revenue Service",
        url: "https://www.irs.gov/individuals/understanding-your-irs-notice-or-letter",
        reviewedAt: REVIEWED,
        kind: "official",
      },
      {
        title: "Taxpayer Advocate Service",
        publisher: "Internal Revenue Service",
        url: "https://www.taxpayeradvocate.irs.gov/",
        reviewedAt: REVIEWED,
        kind: "official",
      },
    ],
    relatedWorkflowIds: [
      "notice-respond/cp2000-response",
      "notice-respond/agency-action-response",
      "notice-respond/appeal-after-notice",
      "notice-respond/follow-up-after-notice-submission",
    ],
    reviewedAt: REVIEWED,
    disclaimer:
      "MailMyPDF is not a law firm, a CPA, or an enrolled agent, and does not provide tax or legal advice. This workflow organizes the notice you received and the records you supply into a written response and mailing packet for your review and approval. It does not calculate what you owe, represent you before the IRS, or file anything with the IRS on your behalf.",
  },
};

export default entry;
