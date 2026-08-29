/**
 * Per-Workflow SEO Content
 *
 * Rich FAQ content, keyword maps, and extended SEO metadata for each workflow.
 * This is merged into the workflow catalog definitions at the route level.
 *
 * Each workflow gets:
 * - 4-6 FAQ entries (for FAQPage structured data and on-page SEO)
 * - Primary + secondary keywords
 * - Open Graph + Twitter card metadata
 * - Breadcrumb data for internal linking
 */

export interface FAQEntry {
  question: string;
  answer: string;
}

export interface WorkflowSEO {
  faq: FAQEntry[];
  keywords: string[];
  ogImage?: string;
  twitterCard: "summary" | "summary_large_image";
  breadcrumb: Array<{ name: string; path: string }>;
}

export const WORKFLOW_SEO: Record<string, WorkflowSEO> = {
  "cp2000-response": {
    faq: [
      {
        question: "What is an IRS CP2000 notice?",
        answer: "A CP2000 is a proposed adjustment notice the IRS sends when the income reported on your tax return doesn't match what payers (employers, banks, brokerages) reported to the IRS. It shows the discrepancy and proposes additional tax, penalties, and interest — but it is not a bill. You have the right to respond with documentation explaining the difference.",
      },
      {
        question: "How long do I have to respond to a CP2000 notice?",
        answer: "The CP2000 notice typically gives you 30 days to respond. The deadline is printed on the notice. If you disagree with the proposed changes, you should respond by the deadline with supporting documentation. If you agree, you can sign and return the response form with payment. Missing the deadline can result in the IRS issuing a statutory notice of deficiency.",
      },
      {
        question: "What should I include in my CP2000 response?",
        answer: "Your response should address each income discrepancy listed in the notice. Include copies (not originals) of supporting documents such as W-2s, 1099s, broker statements, or corrected returns. Explain whether you agree or disagree with each proposed change, and provide factual evidence for your position. The IRS needs enough information to verify your return as filed or to understand why the proposed adjustment is incorrect.",
      },
      {
        question: "Do I need a tax professional to respond to a CP2000?",
        answer: "You are not required to hire a tax professional to respond to a CP2000 notice. Many taxpayers respond directly, especially for straightforward discrepancies (e.g., a corrected W-2 that was already submitted). However, for complex situations involving multiple income sources, capital gains, or business income, consulting a CPA or tax attorney may be advisable. Notice Respond helps you organize your documents and prepare a written response, but does not provide tax advice.",
      },
      {
        question: "What happens if I don't respond to a CP2000 notice?",
        answer: "If you don't respond by the deadline, the IRS will issue a Statutory Notice of Deficiency (CP3219A), which gives you 90 days to petition the U.S. Tax Court. After that, the proposed tax, penalties, and interest become assessed and the IRS begins collection. Responding promptly — even if you need more time — is always better than ignoring the notice.",
      },
      {
        question: "Can I mail my CP2000 response with tracking?",
        answer: "Yes. Certified mail with return receipt is the recommended method for sending a CP2000 response. It provides proof of mailing and proof of delivery. Notice Respond offers Certified mail as a mailing option, with tracking and delivery confirmation included.",
      },
    ],
    keywords: ["CP2000 response", "IRS CP2000 notice", "respond to CP2000", "CP2000 income discrepancy", "CP2000 deadline", "IRS proposed adjustment", "underreported income notice", "CP2000 response letter"],
    twitterCard: "summary_large_image",
    breadcrumb: [
      { name: "Notice Respond", path: "/" },
      { name: "Workflows", path: "/workflows" },
      { name: "CP2000 Response", path: "/workflows/cp2000-response" },
    ],
  },

  "cp14-response": {
    faq: [
      {
        question: "What is an IRS CP14 notice?",
        answer: "A CP14 is the first balance-due notice the IRS sends when you owe taxes. It shows the amount you owe, including any penalties and interest, and includes a payment coupon. It is an actual bill — not a proposal — and the IRS expects either payment or a written response explaining why the balance is incorrect.",
      },
      {
        question: "How long do I have to respond to a CP14 notice?",
        answer: "The CP14 notice shows a response or payment deadline. If you agree with the balance, you should pay by the deadline to stop further penalties and interest. If you disagree, you should respond in writing by the deadline with supporting documentation. If you need more time to pay, you can request an installment agreement or currently not collectible status.",
      },
      {
        question: "What if I can't pay the full amount on my CP14?",
        answer: "If you can't pay in full, you have options: (1) request an installment agreement to pay over time, (2) request a short-term extension (up to 120 days), (3) make an offer in compromise if you can't pay the full amount, or (4) request currently not collectible status if you're experiencing financial hardship. Notice Respond can help you draft a letter requesting any of these options, but cannot advise which is best for your situation.",
      },
      {
        question: "What if the balance on my CP14 is wrong?",
        answer: "If the balance is incorrect — for example, you already paid it, the IRS applied a payment to the wrong year, or your return was correct as filed — you should respond in writing with evidence. Include copies of canceled checks, payment confirmations, tax returns, or IRS account transcripts that support your position. Explain clearly why the balance shown is incorrect.",
      },
      {
        question: "What happens if I ignore a CP14 notice?",
        answer: "Ignoring a CP14 leads to more serious collection notices (CP501, CP503, CP504) and eventually a Notice of Federal Tax Lien or Notice of Federal Tax Levy. The IRS will continue to add penalties and interest. Responding promptly — even if you can't pay — prevents escalation and preserves your options for payment plans and collection alternatives.",
      },
    ],
    keywords: ["CP14 response", "IRS CP14 notice", "respond to CP14", "IRS balance due", "CP14 payment", "IRS first notice", "CP14 response letter", "IRS installment agreement"],
    twitterCard: "summary_large_image",
    breadcrumb: [
      { name: "Notice Respond", path: "/" },
      { name: "Workflows", path: "/workflows" },
      { name: "CP14 Response", path: "/workflows/cp14-response" },
    ],
  },

  "cp504-response": {
    faq: [
      {
        question: "What is an IRS CP504 notice?",
        answer: "A CP504 is an Intent to Levy notice. It tells you that the IRS plans to seize your property or rights to property (wages, bank accounts, etc.) to satisfy your tax debt. It also notifies you of your right to a Collection Due Process (CDP) hearing. This is a serious notice — you have 30 days to act.",
      },
      {
        question: "What is a Collection Due Process (CDP) hearing?",
        answer: "A CDP hearing is your legal right to contest the IRS's collection actions before a neutral Appeals Officer. You can request a CDP hearing within 30 days of the CP504 notice. At the hearing, you can propose collection alternatives (installment agreement, offer in compromise, currently not collectible) or dispute the amount owed. Requesting a CDP hearing also stops collection action while the hearing is pending.",
      },
      {
        question: "How long do I have to respond to a CP504?",
        answer: "You have 30 days from the date of the CP504 notice to request a CDP hearing. This is a hard statutory deadline — if you miss it, you lose your right to a pre-collection hearing. You can still request an equivalent hearing within 1 year, but the IRS can continue collection during that time.",
      },
      {
        question: "What happens if I don't respond to a CP504?",
        answer: "If you don't respond within 30 days, the IRS can proceed with levy action — seizing wages, bank accounts, Social Security benefits, and other property. The IRS may also file a Notice of Federal Tax Lien if it hasn't already. Responding immediately is critical to protect your rights and property.",
      },
      {
        question: "Can I still set up a payment plan after a CP504?",
        answer: "Yes. Even after receiving a CP504, you can request an installment agreement, offer in compromise, or currently not collectible status. However, you should also request a CDP hearing to protect your rights and stop collection action while your request is reviewed. Notice Respond can help you draft a CDP hearing request letter.",
      },
    ],
    keywords: ["CP504 response", "IRS CP504 notice", "intent to levy", "Collection Due Process", "CDP hearing", "IRS levy notice", "CP504 deadline", "IRS collection appeal"],
    twitterCard: "summary_large_image",
    breadcrumb: [
      { name: "Notice Respond", path: "/" },
      { name: "Workflows", path: "/workflows" },
      { name: "CP504 Response", path: "/workflows/cp504-response" },
    ],
  },

  "cp523-response": {
    faq: [
      {
        question: "What is an IRS CP523 notice?",
        answer: "A CP523 tells you that the IRS intends to terminate your installment agreement (payment plan). It shows the reason for termination, the amount still owed, and the date the agreement will end. You have 30 days to respond — either to reinstate the agreement or to appeal the termination.",
      },
      {
        question: "Why would the IRS terminate my installment agreement?",
        answer: "Common reasons include: missed payments, failure to file a required tax return, a new balance owed on another tax year, or a change in financial circumstances that makes your agreed payment amount no longer affordable. The CP523 notice states the specific reason for the proposed termination.",
      },
      {
        question: "How do I reinstate my installment agreement after a CP523?",
        answer: "You can request reinstatement by responding to the CP523 within 30 days. Contact the IRS, explain the reason for the default, propose a new payment amount you can afford, and provide updated financial information if needed. If your financial situation has changed, the IRS may accept a lower payment or grant a grace period.",
      },
      {
        question: "What happens if my installment agreement is terminated?",
        answer: "If the agreement is terminated, the full balance becomes due immediately. The IRS can then file a lien or issue a levy on your wages, bank accounts, or other assets. You lose the protection of the installment agreement and will need to negotiate a new one — which is harder after a default.",
      },
      {
        question: "Can I appeal the termination of my installment agreement?",
        answer: "Yes. You can request a Collection Appeal (CAP) within 30 days of the CP523. The appeal goes to the IRS Office of Appeals, which reviews whether the termination was proper. You can also propose a revised payment plan as part of the appeal. Notice Respond can help you draft an appeal or reinstatement request letter.",
      },
    ],
    keywords: ["CP523 response", "IRS CP523 notice", "installment agreement termination", "IRS payment plan default", "CP523 deadline", "reinstate IRS payment plan", "IRS collection appeal"],
    twitterCard: "summary_large_image",
    breadcrumb: [
      { name: "Notice Respond", path: "/" },
      { name: "Workflows", path: "/workflows" },
      { name: "CP523 Response", path: "/workflows/cp523-response" },
    ],
  },

  "irs-notice": {
    faq: [
      {
        question: "How do I know what type of IRS notice I received?",
        answer: "Every IRS notice has a notice number printed at the top right or bottom right of the first page. It usually starts with 'CP' (computer paragraph) or 'LTR' (letter). Common notices include CP2000 (income mismatch), CP14 (balance due), CP504 (intent to levy), and Letter 2202 (refund inquiry). The notice number tells you what the IRS is asking and how to respond.",
      },
      {
        question: "Do all IRS notices require a response?",
        answer: "No. Some notices are informational only (e.g., CP12, which announces a math correction and a refund adjustment). Others require immediate action (e.g., CP2000, CP14, CP504). Read the notice carefully — it will state whether a response is required and by what deadline. If you're unsure, respond anyway with a letter asking for clarification.",
      },
      {
        question: "How do I respond to an IRS notice?",
        answer: "You can respond by mail using the address shown on the notice, by phone at the number listed, or through your IRS online account. For written responses, include: your name, address, SSN or EIN, the notice number, the tax year (if applicable), and a clear explanation of your position. Attach copies of supporting documents — never send originals.",
      },
      {
        question: "What if I disagree with an IRS notice?",
        answer: "If you disagree, respond in writing by the deadline. State clearly that you disagree, explain why with factual support, and include copies of evidence. The IRS will review your response and either reverse the proposed action or send you a revised notice. If you still disagree after that, you may have appeal rights — the notice will explain them.",
      },
      {
        question: "Should I send my IRS response by certified mail?",
        answer: "Certified mail with return receipt is recommended for all IRS correspondence. It provides proof that you mailed your response by the deadline and proof that the IRS received it. This is especially important for notices with statutory deadlines (CP2000, CP504). Notice Respond offers Certified mail as a mailing option.",
      },
    ],
    keywords: ["respond to IRS notice", "IRS notice response", "IRS letter response", "IRS notice deadline", "IRS notice types", "how to respond to IRS", "IRS response letter"],
    twitterCard: "summary_large_image",
    breadcrumb: [
      { name: "Notice Respond", path: "/" },
      { name: "Workflows", path: "/workflows" },
      { name: "IRS Notice", path: "/workflows/irs-notice" },
    ],
  },

  "court-summons": {
    faq: [
      {
        question: "What is a court summons?",
        answer: "A court summons is a formal document that notifies you that a lawsuit has been filed against you and tells you how and by when to respond. In civil cases, it is usually served with a complaint that lists the specific claims. You must file a written response (answer) with the court by the deadline or risk a default judgment.",
      },
      {
        question: "How long do I have to respond to a summons?",
        answer: "The response deadline depends on your jurisdiction and the type of case. Typically, you have 20-30 days from the date you were served. Some courts allow more time. The summons itself will state the deadline. This is a hard deadline — missing it can result in a default judgment entered against you.",
      },
      {
        question: "What should I include in my response to a summons?",
        answer: "Your answer should respond to each numbered paragraph of the complaint — admitting, denying, or stating you lack knowledge. You can also raise affirmative defenses (factual reasons why the plaintiff should not prevail). Follow the court's formatting rules, include the case caption, sign the document, and file it with the court clerk. Some courts also require a certificate of service.",
      },
      {
        question: "Do I need a lawyer to respond to a summons?",
        answer: "You are not required to have a lawyer — you can file a response yourself (pro se). However, court rules are strict, and legal mistakes can be costly. For complex cases or cases involving significant amounts, consulting an attorney is strongly recommended. Notice Respond helps you organize the facts and prepare a draft response, but does not provide legal advice or representation.",
      },
      {
        question: "What happens if I don't respond to a summons?",
        answer: "If you don't respond by the deadline, the plaintiff can request a default judgment, meaning they win automatically without a trial. Once a default judgment is entered, the plaintiff can pursue collection actions such as wage garnishment, bank account levies, or property liens. Responding — even minimally — prevents a default and preserves your right to be heard.",
      },
    ],
    keywords: ["respond to court summons", "summons response", "answer summons", "civil summons", "court summons deadline", "how to answer a complaint", "file answer to summons"],
    twitterCard: "summary_large_image",
    breadcrumb: [
      { name: "Notice Respond", path: "/" },
      { name: "Workflows", path: "/workflows" },
      { name: "Court Summons", path: "/workflows/court-summons" },
    ],
  },

  "agency-action": {
    faq: [
      {
        question: "What is a government agency action notice?",
        answer: "An agency action notice is a letter or decision from a federal, state, or local government agency that affects your rights, benefits, license, or status. Examples include denial of benefits, license suspension, code violations, or proposed penalties. Most agency actions include information about your right to respond or appeal.",
      },
      {
        question: "How do I respond to an agency action?",
        answer: "Read the notice carefully for the response deadline, required format, and where to send your response. Your response should address each issue raised, provide factual explanations, and include copies of supporting documents. Some agencies require specific forms; others accept a written letter. Follow the instructions in the notice exactly.",
      },
      {
        question: "What if I disagree with an agency decision?",
        answer: "Most agency decisions include appeal rights — typically a deadline and a process for requesting reconsideration or a hearing. The notice should explain your appeal options. If you disagree, respond by the deadline stating your disagreement, providing factual support, and requesting the specific appeal or hearing process described in the notice.",
      },
      {
        question: "How long do I have to respond to an agency notice?",
        answer: "Response deadlines vary by agency and action type. Some notices give 10 days; others give 30, 60, or 90 days. The deadline is always stated in the notice. Agency deadlines are typically strict — missing them can forfeit your right to appeal. Always check the notice for the exact deadline.",
      },
      {
        question: "Can Notice Respond help with any government agency?",
        answer: "Notice Respond can help you organize documents, identify deadlines, and prepare a written response for most government agency notices. It works best with notices that require a written response by mail. For complex regulatory or administrative proceedings, consult an attorney who specializes in that area of law.",
      },
    ],
    keywords: ["respond to agency action", "government agency notice", "agency decision appeal", "agency response letter", "administrative appeal", "agency notice deadline"],
    twitterCard: "summary_large_image",
    breadcrumb: [
      { name: "Notice Respond", path: "/" },
      { name: "Workflows", path: "/workflows" },
      { name: "Agency Action", path: "/workflows/agency-action" },
    ],
  },

  "file-appeal": {
    faq: [
      {
        question: "What is an administrative appeal?",
        answer: "An administrative appeal is a formal request to a government agency or institution to reconsider a decision. It's the first step after being denied a benefit, license, claim, or application. Most agencies have an internal appeals process that must be exhausted before you can take legal action in court.",
      },
      {
        question: "How long do I have to file an appeal?",
        answer: "Appeal deadlines are often short — typically 10 to 30 days from the date of the decision, sometimes up to 60 or 90 days. The deadline is always stated in the decision letter. Missing the deadline usually means you lose the right to appeal. File or mail your appeal by the deadline even if you're still gathering evidence.",
      },
      {
        question: "What should I include in my appeal letter?",
        answer: "Your appeal should: (1) identify the decision being appealed, (2) state the grounds for appeal — why the decision was wrong, (3) provide factual support with evidence, (4) cite any rules or regulations the agency violated, and (5) request the specific outcome you want (reversal, hearing, reconsideration). Be factual, organized, and concise.",
      },
      {
        question: "Do I need a lawyer for an administrative appeal?",
        answer: "You can file an administrative appeal yourself (pro se). Many appeals are decided on the written record without a hearing. However, for complex cases or cases involving significant rights or benefits, legal representation is advisable. Notice Respond helps you organize your case and draft the appeal letter, but does not provide legal advice.",
      },
      {
        question: "What happens after I file my appeal?",
        answer: "After you file, the agency reviews your appeal and may: (1) reverse the decision, (2) request additional information, (3) schedule a hearing, or (4) uphold the original decision. You'll receive a written decision. If the appeal is denied, the decision letter will explain any further appeal rights you have.",
      },
    ],
    keywords: ["file an appeal", "administrative appeal", "appeal letter", "appeal a decision", "how to write an appeal", "agency appeal deadline", "reconsideration request"],
    twitterCard: "summary_large_image",
    breadcrumb: [
      { name: "Notice Respond", path: "/" },
      { name: "Workflows", path: "/workflows" },
      { name: "File an Appeal", path: "/workflows/file-appeal" },
    ],
  },

  "transunion-dispute": {
    faq: [
      {
        question: "How do I dispute inaccurate information on my TransUnion credit report?",
        answer: "You can dispute by mail, online, or by phone. A written dispute by certified mail is the strongest method because it creates a paper trail. Your letter should identify each inaccurate item, explain why it's wrong, and include copies of supporting documents. TransUnion must investigate within 30 days (45 if you send additional information during the investigation).",
      },
      {
        question: "What information can I dispute on my TransUnion report?",
        answer: "You can dispute any information you believe is inaccurate, incomplete, or unverifiable. This includes incorrect account balances, wrong payment histories, accounts that don't belong to you, outdated negative information (over 7 years, or 10 for bankruptcies), incorrect personal information, and fraudulent accounts from identity theft.",
      },
      {
        question: "What happens after TransUnion investigates my dispute?",
        answer: "TransUnion must notify you of the results within 5 days of completing the investigation. If the disputed information is verified as accurate, it stays on your report. If it's found to be inaccurate or cannot be verified, TransUnion must remove or correct it and send you an updated copy of your report. If you disagree with the results, you can add a statement of dispute to your file.",
      },
      {
        question: "Where do I mail my TransUnion dispute letter?",
        answer: "Mail your dispute to: TransUnion LLC, P.O. Box 2000, Chester, PA 19022. Include your full name, address, Social Security number, date of birth, and a copy of your credit report with the disputed items circled. Send it by certified mail with return receipt for proof of delivery.",
      },
      {
        question: "Can I dispute items online instead of by mail?",
        answer: "Yes, TransUnion offers online disputes through their website. However, mailing a dispute letter gives you a physical paper trail and allows you to include detailed explanations and supporting documents. For serious disputes (identity theft, mixed files, multiple errors), a written letter is recommended over online disputes.",
      },
    ],
    keywords: ["dispute TransUnion credit report", "TransUnion dispute letter", "FCRA dispute", "credit report error", "TransUnion dispute address", "credit report dispute", "FCRA Section 611"],
    twitterCard: "summary_large_image",
    breadcrumb: [
      { name: "Notice Respond", path: "/" },
      { name: "Workflows", path: "/workflows" },
      { name: "TransUnion Dispute", path: "/workflows/transunion-dispute" },
    ],
  },

  "experian-dispute": {
    faq: [
      {
        question: "How do I dispute inaccurate information on my Experian credit report?",
        answer: "You can dispute by mail, online, or by phone. A written dispute by certified mail creates the strongest paper trail. Your letter should identify each inaccurate item, explain why it's wrong, and include copies of supporting documents. Experian must investigate within 30 days (45 if you send additional information during the investigation).",
      },
      {
        question: "Where do I mail my Experian dispute letter?",
        answer: "Mail your dispute to: Experian, P.O. Box 4500, Allen, TX 75013. Include your full name, address, Social Security number, date of birth, and a copy of your credit report with the disputed items circled. Send by certified mail with return receipt for proof of delivery.",
      },
      {
        question: "What information can I dispute on my Experian report?",
        answer: "You can dispute any information you believe is inaccurate, incomplete, or unverifiable — including incorrect account details, wrong payment histories, accounts that don't belong to you, outdated negative items, incorrect personal information, and fraudulent accounts from identity theft.",
      },
      {
        question: "How long does Experian have to investigate my dispute?",
        answer: "Under the FCRA, Experian must complete their investigation within 30 days of receiving your dispute. If you send additional information during the investigation period, they get 45 days. They must notify you of the results within 5 days of completing the investigation and provide an updated credit report if items were changed or removed.",
      },
      {
        question: "What if Experian verifies information I know is wrong?",
        answer: "If Experian verifies the disputed information as accurate, you can: (1) add a 100-word statement of dispute to your credit file explaining your side, (2) dispute directly with the furnisher (the company that reported the information), (3) file a complaint with the CFPB, or (4) consult a consumer law attorney about potential FCRA violations.",
      },
    ],
    keywords: ["dispute Experian credit report", "Experian dispute letter", "Experian dispute address", "FCRA dispute", "credit report error", "Experian dispute", "credit report correction"],
    twitterCard: "summary_large_image",
    breadcrumb: [
      { name: "Notice Respond", path: "/" },
      { name: "Workflows", path: "/workflows" },
      { name: "Experian Dispute", path: "/workflows/experian-dispute" },
    ],
  },

  "equifax-dispute": {
    faq: [
      {
        question: "How do I dispute inaccurate information on my Equifax credit report?",
        answer: "You can dispute by mail, online, or by phone. A written dispute by certified mail creates the strongest paper trail. Your letter should identify each inaccurate item, explain why it's wrong, and include copies of supporting documents. Equifax must investigate within 30 days (45 if you send additional information during the investigation).",
      },
      {
        question: "Where do I mail my Equifax dispute letter?",
        answer: "Mail your dispute to: Equifax Information Services LLC, P.O. Box 25022, Atlanta, GA 30307. Include your full name, address, Social Security number, date of birth, and a copy of your credit report with the disputed items circled. Send by certified mail with return receipt.",
      },
      {
        question: "What information can I dispute on my Equifax report?",
        answer: "You can dispute any information you believe is inaccurate, incomplete, or unverifiable — including incorrect account balances, wrong payment histories, accounts that don't belong to you, outdated negative items (over 7 years), incorrect personal information, and identity-theft-related accounts.",
      },
      {
        question: "How long does Equifax have to investigate my dispute?",
        answer: "Under the FCRA, Equifax must complete their investigation within 30 days of receiving your dispute. If you send additional information during the investigation, they get 45 days. They must notify you of the results within 5 days and provide a free updated credit report if items were changed or removed.",
      },
      {
        question: "Should I dispute with all three credit bureaus at once?",
        answer: "If the same error appears on all three reports (TransUnion, Experian, Equifax), you should dispute with all three separately — they don't share investigation results. Notice Respond has separate workflows for each bureau. Each dispute letter should reference the specific report from that bureau.",
      },
    ],
    keywords: ["dispute Equifax credit report", "Equifax dispute letter", "Equifax dispute address", "FCRA dispute", "credit report error", "Equifax dispute", "credit report correction"],
    twitterCard: "summary_large_image",
    breadcrumb: [
      { name: "Notice Respond", path: "/" },
      { name: "Workflows", path: "/workflows" },
      { name: "Equifax Dispute", path: "/workflows/equifax-dispute" },
    ],
  },  "tax-notice": {
    title: "Respond to a Tax Notice — Notice Respond",
    description: "Create a structured response to a tax authority notice without losing the notice deadline, reference number, or supporting evidence.",
    keywords: ["tax notice response", "tax authority letter", "tax correspondence response", "respond to a tax notice"],
    faq: [
    {
        "question": "How long do I have to respond to a tax notice?",
        "answer": "Most tax notices include a response deadline, typically 30 days from the notice date. If no deadline is stated, contact the issuing agency immediately to confirm the response window."
    },
    {
        "question": "What should I include in my response to a tax notice?",
        "answer": "Include the notice or reference number, the tax year in question, a point-by-point response to each issue raised, supporting documentation, and your contact information. Address every item the notice raises."
    },
    {
        "question": "Can I disagree with a tax notice?",
        "answer": "Yes. If you believe the notice is incorrect, state clearly which items you disagree with and provide evidence supporting your position. Include copies of relevant records, not originals."
    },
    {
        "question": "Should I send original documents with my tax notice response?",
        "answer": "No. Always send copies, not originals. Keep your original documents and proof of mailing in your records."
    },
    {
        "question": "What mail type should I use for a tax notice response?",
        "answer": "Certified mail is recommended for tax notice responses because it provides proof of timely delivery, which is important if you need to prove you met the deadline."
    }
],
  },
  "code-enforcement": {
    title: "Respond to a Code Enforcement Notice — Notice Respond",
    description: "Organize a code enforcement notice around the property, alleged violations, inspection dates, correction deadline, and evidence you want the agency to consider.",
    keywords: ["code enforcement response", "municipal violation notice", "property compliance notice", "respond to a code enforcement notice"],
    faq: [
    {
        "question": "What happens if I miss the correction deadline on a code enforcement notice?",
        "answer": "Missing a correction deadline can result in fines, liens, or additional enforcement action. If you cannot meet the deadline, respond before it expires to request an extension and show good-faith progress."
    },
    {
        "question": "Can I dispute a code enforcement violation?",
        "answer": "Yes. If you believe the violation is incorrect or has already been corrected, document your position with photos, permits, or inspection records and include them with your response."
    },
    {
        "question": "What evidence should I include with my code enforcement response?",
        "answer": "Include photos showing compliance, permits, inspection reports, prior correspondence with the agency, and any other records that support your position."
    },
    {
        "question": "How do I request an extension on a code enforcement deadline?",
        "answer": "State your request clearly in the response letter, explain why you need more time, describe the corrective steps already taken, and propose a specific completion date."
    }
],
  },
  "permit-correction": {
    title: "Respond to a Permit Correction Notice — Notice Respond",
    description: "Turn permit or planning corrections into a tracked response so each requested change is understood, answered, and supported.",
    keywords: ["permit correction response", "planning department notice", "building permit resubmission", "respond to a permit correction notice"],
    faq: [
    {
        "question": "How should I format my permit correction response?",
        "answer": "Address each correction item individually by number. For each item, state whether you agree, describe the corrective action taken, and reference the specific plan sheet or document that shows the correction."
    },
    {
        "question": "What if I disagree with a permit correction item?",
        "answer": "State your disagreement clearly, explain why the original submission meets code requirements, and cite the relevant code section or standard that supports your position."
    },
    {
        "question": "Do I need to resubmit the entire plan set with my correction response?",
        "answer": "Most jurisdictions require a full resubmission with corrected sheets highlighted. Check the correction notice for specific instructions on what to include."
    },
    {
        "question": "How long do I have to respond to a permit correction notice?",
        "answer": "Correction notices may or may not include a deadline. If no deadline is stated, respond promptly to keep your application active. Contact the permit office if you need clarification."
    }
],
  },
  "dmv-notice": {
    title: "Respond to a DMV Notice — Notice Respond",
    description: "Organize a DMV notice, identify the response or hearing date, and assemble the records needed for the written response.",
    keywords: ["DMV notice response", "license suspension response", "vehicle registration notice", "respond to a DMV notice"],
    faq: [
    {
        "question": "How do I request a DMV hearing?",
        "answer": "Most DMV notices that propose suspension or revocation include instructions for requesting a hearing. Follow the instructions exactly and submit your request before the deadline stated in the notice."
    },
    {
        "question": "What happens if I miss the response deadline on a DMV notice?",
        "answer": "Missing the deadline can result in automatic suspension, fines, or other enforcement action. If the deadline has passed, contact the DMV immediately to ask if a late response is possible."
    },
    {
        "question": "Can I respond to a DMV notice by mail?",
        "answer": "Yes, most DMV notices can be responded to by mail. Certified mail is recommended for proof of timely submission. Check the notice for the accepted response methods."
    },
    {
        "question": "What should I include in my DMV response?",
        "answer": "Include your license or ID number, the notice reference number, a clear statement of your position, supporting documents, and your contact information. Address every action the notice proposes."
    }
],
  },
  "ssa-notice": {
    title: "Respond to an SSA Notice — Notice Respond",
    description: "Organize a Social Security notice, its deadline, stated decision or request, and the records you need for a written response or next review step.",
    keywords: ["SSA notice response", "Social Security determination", "benefits appeal", "respond to an SSA notice"],
    faq: [
    {
        "question": "How long do I have to appeal an SSA decision?",
        "answer": "You typically have 60 days from the date you receive the notice to file an appeal. The SSA assumes you received the notice 5 days after the date on the notice unless you can show otherwise."
    },
    {
        "question": "What are the levels of SSA appeal?",
        "answer": "The SSA appeal process has four levels: reconsideration, hearing by an administrative law judge, review by the Appeals Council, and federal court. Your notice should tell you which level applies to you."
    },
    {
        "question": "What should I include in my SSA appeal letter?",
        "answer": "Include your name, Social Security number, the claim number, the decision you are appealing, why you disagree with the decision, and any new evidence that supports your claim."
    },
    {
        "question": "Can I request more time to respond to an SSA notice?",
        "answer": "The SSA may grant a good-cause extension if you have a valid reason for the delay. Contact the SSA as soon as possible to explain your situation and request more time."
    },
    {
        "question": "Should I send original documents to the SSA?",
        "answer": "No. Send copies, not originals. Keep your original documents and proof of mailing in your records."
    }
],
  },
  "uscis-notice": {
    title: "Respond to a USCIS Notice — Notice Respond",
    description: "Keep the USCIS notice, deadline, receipt number, requested evidence, and response package organized in one workflow.",
    keywords: ["USCIS RFE response", "USCIS notice response", "immigration evidence request", "respond to a USCIS notice"],
    faq: [
    {
        "question": "How long do I have to respond to a USCIS Request for Evidence?",
        "answer": "Most RFEs give you 87 days to respond. The exact deadline is stated on the RFE notice. If you miss the deadline, USCIS may deny your case based on the evidence already on file."
    },
    {
        "question": "What should I include in my RFE response package?",
        "answer": "Include the RFE notice, a cover letter listing each item of evidence requested, the evidence itself, and a copy of the receipt notice. Label everything clearly and organize by RFE item number."
    },
    {
        "question": "Can I get more time to respond to a USCIS RFE?",
        "answer": "USCIS generally does not grant extensions for RFE responses. If you cannot gather all evidence in time, submit what you have before the deadline with a letter explaining what is missing and when it will be available."
    },
    {
        "question": "Should I send original documents to USCIS?",
        "answer": "No. Send copies, not originals, unless USCIS specifically requests originals. USCIS may not return original documents."
    },
    {
        "question": "What mail type should I use for a USCIS response?",
        "answer": "Use certified mail with tracking or a courier service that provides a delivery confirmation. Keep the tracking number as proof of timely submission."
    }
],
  },
  "benefits-notice": {
    title: "Respond to a Benefits Notice — Notice Respond",
    description: "Understand a benefits notice, preserve the stated deadline, and prepare a factual response or request for review from your records.",
    keywords: ["benefits notice response", "overpayment notice", "eligibility determination response", "respond to a benefits notice"],
    faq: [
    {
        "question": "How do I appeal a benefits determination?",
        "answer": "Most benefits notices include appeal rights and a deadline, typically 30 to 90 days. Follow the instructions on the notice to request an appeal or fair hearing, and submit before the deadline."
    },
    {
        "question": "What should I include in my benefits appeal letter?",
        "answer": "Include your case number, the decision you are appealing, why you disagree, any new evidence, and a clear statement of the outcome you want."
    },
    {
        "question": "Can I request more time to respond to a benefits notice?",
        "answer": "Many programs allow extensions for good cause. Contact the agency as soon as possible, explain why you need more time, and document your request."
    },
    {
        "question": "What happens if I miss the response deadline?",
        "answer": "Missing the deadline may result in the decision becoming final, loss of benefits, or collection action. If the deadline has passed, contact the agency immediately to ask about late appeal options."
    }
],
  },

};

export function getWorkflowSEO(workflowId: string): WorkflowSEO | null {
  return WORKFLOW_SEO[workflowId] ?? null;
}
