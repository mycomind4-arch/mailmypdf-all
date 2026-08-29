/**
 * NOID Content/SEO Architecture
 *
 * Keyword-clustered pages (not one page per keyword).
 * Each page absorbs a cluster of related search intents.
 */

export interface NOIDPage {
  slug: string;
  path: string;
  title: string;
  description: string;
  h1: string;
  canonical: string;
  breadcrumbs: { label: string; path: string }[];
  content: string;
  faqSchema?: { question: string; answer: string }[];
  relatedPages: string[];
  keywordCluster: string[];
}

export const NOID_LANDING_PAGE: NOIDPage = {
  slug: '',
  path: '/noid',
  title: 'NOID Response — USCIS Notice of Intent to Deny | Immigration Mail',
  description: 'Received a USCIS Notice of Intent to Deny? We help you understand what USCIS is challenging, organize your evidence, and prepare an appropriate response. Mailed with tracking and proof.',
  h1: 'Received a USCIS Notice of Intent to Deny?',
  canonical: 'https://immigrationmail.com/noid',
  breadcrumbs: [{ label: 'Home', path: '/' }, { label: 'NOID Response', path: '/noid' }],
  content: `## What is a NOID?

A Notice of Intent to Deny (NOID) is a formal letter from USCIS stating that the agency intends to deny your application or petition. It is not a final denial — you have an opportunity to respond.

## Is a NOID the same as a denial?

No. A NOID means USCIS plans to deny your case but is giving you a chance to respond first. If you do not respond within the deadline, the agency will likely issue a final denial.

## Why was it issued?

USCIS issues a NOID when it finds one or more grounds for denial. Common reasons include insufficient evidence, inadmissibility findings, fraud or misrepresentation concerns, or eligibility issues.

## What happens if I do nothing?

If you do not respond by the deadline, USCIS will likely deny your application. The deadline in your notice is critical.

## How we help

Upload your NOID. We will read it, explain what USCIS is challenging, identify every denial ground, help you organize evidence, prepare a response, and mail it with tracking and proof of delivery.

Immigration Mail does not determine eligibility, guarantee an outcome, or replace legal advice. For complex or high-risk cases, an immigration attorney is strongly recommended.`,
  faqSchema: [
    {
      question: 'What is a Notice of Intent to Deny (NOID)?',
      answer: 'A NOID is a formal notice from USCIS stating that the agency intends to deny your application. It is not a final denial — you have an opportunity to respond with additional evidence or arguments before a final decision is made.',
    },
    {
      question: 'Is a NOID the same as a denial?',
      answer: 'No. A NOID means USCIS plans to deny your case but is giving you a chance to respond. If you do not respond within the deadline, the agency will likely issue a final denial.',
    },
    {
      question: 'How long do I have to respond to a NOID?',
      answer: 'The deadline is specified in your notice — typically 30 to 33 days from the date of the notice. You must respond by the deadline stated in your specific letter.',
    },
    {
      question: 'What happens if I miss the NOID deadline?',
      answer: 'If you do not respond by the deadline, USCIS will likely deny your application. In some cases, you may be able to file a motion to reopen or appeal, but your options become more limited after a final denial.',
    },
    {
      question: 'Can I mail my NOID response with tracking?',
      answer: 'Yes. Immigration Mail uses certified mail with tracking and proof of delivery so you have evidence that your response was received by the deadline.',
    },
    {
      question: 'What does the service cost?',
      answer: 'Pricing depends on the complexity of your case. Service fees start at $49, with postage calculated separately based on your chosen mailing method.',
    },
  ],
  relatedPages: [
    '/noid/what-is-a-noid',
    '/noid/how-to-respond',
    '/noid/deadline',
    '/noid/evidence',
    '/noid/response-letter',
    '/noid/checklist',
    '/noid/faq',
    '/noid/pricing',
  ],
  keywordCluster: [
    'noid uscis',
    'notice of intent to deny',
    'noid response',
    'uscis noid',
    'noid immigration',
    'noid letter',
    'respond to noid',
    'noid denial',
    'noid notice',
    'uscis notice of intent to deny',
  ],
};

export const NOID_SUPPORTING_PAGES: NOIDPage[] = [
  {
    slug: 'what-is-a-noid',
    path: '/noid/what-is-a-noid',
    title: 'What Is a USCIS Notice of Intent to Deny (NOID)? | Immigration Mail',
    description: 'A plain-language explanation of what a NOID is, how it differs from a denial, and what it means for your immigration case.',
    h1: 'What Is a Notice of Intent to Deny?',
    canonical: 'https://immigrationmail.com/noid/what-is-a-noid',
    breadcrumbs: [{ label: 'Home', path: '/' }, { label: 'NOID', path: '/noid' }, { label: 'What Is a NOID', path: '/noid/what-is-a-noid' }],
    content: `## Understanding the NOID

A Notice of Intent to Deny (NOID) is a formal communication from U.S. Citizenship and Immigration Services (USCIS) indicating that the agency intends to deny your application or petition.

## Key Distinction: NOID vs. Denial

A NOID is not a denial. It is a warning that a denial is coming unless you respond. You have a limited window — typically 30 to 33 days — to submit evidence or arguments that address the agency's concerns.

## Why USCIS Issues a NOID

USCIS issues a NOID when it has identified specific grounds for denial but is required to give you notice and an opportunity to respond before making a final decision.

## What a NOID Contains

A typical NOID includes:
- The specific denial grounds
- The evidence USCIS relied on
- The deadline for response
- Instructions for responding
- The mailing address for your response

## What You Should Do

Read the entire notice carefully. Identify every denial ground. Note the deadline. Consider whether you need an attorney.`,
    faqSchema: [
      {
        question: 'Is a NOID the same as being denied?',
        answer: 'No. A NOID means USCIS intends to deny but is giving you a chance to respond. If you respond with sufficient evidence, the agency may approve your case.',
      },
      {
        question: 'Does a NOID mean my case is over?',
        answer: 'No. You still have an opportunity to respond. Many cases are approved after a successful NOID response.',
      },
    ],
    relatedPages: ['/noid', '/noid/noid-vs-denial', '/noid/how-to-respond', '/noid/deadline'],
    keywordCluster: ['what is a noid', 'noid meaning', 'noid uscis', 'notice of intent to deny meaning', 'noid vs denial'],
  },
  {
    slug: 'noid-vs-denial',
    path: '/noid/noid-vs-denial',
    title: 'NOID vs. Denial: What Is the Difference? | Immigration Mail',
    description: 'A clear comparison of a Notice of Intent to Deny and a final denial, including what options you have at each stage.',
    h1: 'NOID vs. Denial: What Is the Difference?',
    canonical: 'https://immigrationmail.com/noid/noid-vs-denial',
    breadcrumbs: [{ label: 'Home', path: '/' }, { label: 'NOID', path: '/noid' }, { label: 'NOID vs. Denial', path: '/noid/noid-vs-denial' }],
    content: `## The Key Difference

A NOID is a notice that USCIS intends to deny. A denial is the actual denial. With a NOID, you still have a chance to respond. With a denial, you need to appeal or file a motion.

## NOID

- USCIS plans to deny but has not yet done so
- You have a deadline (typically 30-33 days) to respond
- You can submit additional evidence and arguments
- If your response is sufficient, USCIS may approve

## Final Denial

- USCIS has formally denied your application
- You must file an appeal (I-290B) or motion to reopen/reconsider
- The timeline is longer and more complex
- Legal representation is strongly recommended`,
    faqSchema: [
      {
        question: 'Can a NOID be overturned?',
        answer: 'Yes. If you respond to the NOID with sufficient evidence or arguments addressing the denial grounds, USCIS may approve your application.',
      },
    ],
    relatedPages: ['/noid', '/noid/what-is-a-noid', '/noid/how-to-respond'],
    keywordCluster: ['noid vs denial', 'difference between noid and denial', 'is a noid a denial', 'noid not a denial'],
  },
  {
    slug: 'how-to-respond',
    path: '/noid/how-to-respond',
    title: 'How to Respond to a USCIS NOID | Immigration Mail',
    description: 'A step-by-step guide to responding to a Notice of Intent to Deny, including organizing evidence and preparing your response packet.',
    h1: 'How to Respond to a Notice of Intent to Deny',
    canonical: 'https://immigrationmail.com/noid/how-to-respond',
    breadcrumbs: [{ label: 'Home', path: '/' }, { label: 'NOID', path: '/noid' }, { label: 'How to Respond', path: '/noid/how-to-respond' }],
    content: `## Step 1: Read the Entire Notice

Read every page of your NOID. Identify every denial ground — do not skip any.

## Step 2: Note the Deadline

The deadline is the most important piece of information. Mark it on your calendar. Plan to mail your response at least several days before it.

## Step 3: Identify Each Denial Ground

For each ground, ask:
- What is USCIS claiming?
- What evidence did USCIS rely on?
- What evidence do I have to rebut this?
- What evidence am I missing?

## Step 4: Gather Evidence

Collect documents, records, and supporting materials that address each denial ground. Organize them by ground.

## Step 5: Prepare Your Response

Write a cover letter that clearly addresses each denial ground. Include an evidence index. Organize your packet logically.

## Step 6: Mail with Proof

Use certified mail with tracking and return receipt. Keep the proof of delivery.`,
    faqSchema: [
      {
        question: 'How do I respond to a NOID?',
        answer: 'Read the notice, identify every denial ground, gather evidence addressing each ground, write a response letter, and mail it by the deadline with certified mail and tracking.',
      },
      {
        question: 'What should I include in my NOID response?',
        answer: 'Include a cover letter addressing each denial ground, supporting evidence organized by ground, and an evidence index listing every document you are submitting.',
      },
    ],
    relatedPages: ['/noid', '/noid/response-letter', '/noid/cover-letter', '/noid/evidence', '/noid/checklist'],
    keywordCluster: ['how to respond to noid', 'noid response', 'respond to notice of intent to deny', 'noid response letter', 'noid response packet'],
  },
  {
    slug: 'deadline',
    path: '/noid/deadline',
    title: 'NOID Deadlines: How Long Do You Have to Respond? | Immigration Mail',
    description: 'Understanding your NOID deadline, what happens if you miss it, and how to protect yourself with proof of timely mailing.',
    h1: 'NOID Deadlines',
    canonical: 'https://immigrationmail.com/noid/deadline',
    breadcrumbs: [{ label: 'Home', path: '/' }, { label: 'NOID', path: '/noid' }, { label: 'Deadline', path: '/noid/deadline' }],
    content: `## How Long Do You Have?

Most NOIDs give you 30 to 33 days to respond. The exact deadline is stated in your specific notice — always check the actual document.

## Counting the Days

The deadline is typically counted from the date of the notice, not the date you received it. Read the notice carefully to determine the exact deadline.

## If the Deadline Is Approaching

Do not wait. Gather what you have and respond on time. A partial response submitted on time is better than a complete response submitted late.

## If the Deadline Has Passed

If you missed the deadline, USCIS will likely deny your application. You may be able to file a motion to reopen or an appeal, but your options are more limited. Consult an attorney immediately.

## Proof of Timely Mailing

Always use certified mail with tracking and return receipt. The postmark date and delivery confirmation are your proof that you responded on time.`,
    faqSchema: [
      {
        question: 'How long do I have to respond to a NOID?',
        answer: 'Most NOIDs give 30 to 33 days, but the exact deadline is in your specific notice. Always check your actual document.',
      },
      {
        question: 'What if I miss the NOID deadline?',
        answer: 'If you miss the deadline, USCIS will likely deny your application. You may have options to appeal or file a motion, but consult an attorney immediately.',
      },
    ],
    relatedPages: ['/noid', '/noid/how-to-respond', '/noid/missed-deadline'],
    keywordCluster: ['noid deadline', 'noid response time', 'how long to respond to noid', 'noid 30 days', 'missed noid deadline'],
  },
  {
    slug: 'evidence',
    path: '/noid/evidence',
    title: 'Evidence for a NOID Response: What to Submit | Immigration Mail',
    description: 'A practical guide to gathering and organizing evidence for each denial ground in your NOID response.',
    h1: 'Evidence for Your NOID Response',
    canonical: 'https://immigrationmail.com/noid/evidence',
    breadcrumbs: [{ label: 'Home', path: '/' }, { label: 'NOID', path: '/noid' }, { label: 'Evidence', path: '/noid/evidence' }],
    content: `## Evidence Addresses Each Denial Ground

Your evidence should directly address each specific denial ground identified in the NOID. Generic evidence that does not address a ground is not helpful.

## Types of Evidence

Common types include:
- Original or certified documents
- Affidavits and witness statements
- Official records (court dispositions, marriage certificates, etc.)
- Financial records (tax returns, pay stubs, bank statements)
- Photographs and correspondence
- Expert opinions (where applicable)

## Organizing Evidence

Organize your evidence by denial ground. Label each exhibit. Create an evidence index that maps each exhibit to the ground it addresses.

## Missing Evidence

If you are missing evidence for a ground, explain why and what you have done to obtain it. Do not fabricate or submit fraudulent documents.

## Contradictory Evidence

If USCIS relies on evidence you believe is incorrect, provide evidence that contradicts the agency's finding and explain the discrepancy.`,
    faqSchema: [
      {
        question: 'What evidence should I submit with my NOID response?',
        answer: 'Submit evidence that directly addresses each denial ground. This may include original documents, affidavits, official records, financial records, and other supporting materials.',
      },
    ],
    relatedPages: ['/noid', '/noid/how-to-respond', '/noid/checklist', '/noid/response-letter'],
    keywordCluster: ['noid evidence', 'evidence for noid response', 'what to submit for noid', 'noid response documents'],
  },
  {
    slug: 'response-letter',
    path: '/noid/response-letter',
    title: 'Writing a NOID Response Letter | Immigration Mail',
    description: 'How to write an effective response letter that addresses each denial ground in your USCIS Notice of Intent to Deny.',
    h1: 'Writing a NOID Response Letter',
    canonical: 'https://immigrationmail.com/noid/response-letter',
    breadcrumbs: [{ label: 'Home', path: '/' }, { label: 'NOID', path: '/noid' }, { label: 'Response Letter', path: '/noid/response-letter' }],
    content: `## Structure of a Response Letter

A well-organized NOID response letter should:
1. State the receipt number and form type
2. Acknowledge the NOID and the deadline
3. Address each denial ground separately
4. Reference the evidence submitted for each ground
5. Request a favorable decision
6. Include your contact information

## Addressing Each Ground

For each denial ground:
- Restate the agency's finding
- State your response
- Cite the evidence (by exhibit number)
- Explain why the evidence rebuts the finding

## Tone

Be respectful, clear, and direct. Avoid emotional language. Stick to facts and evidence.

## What Not to Do

- Do not ignore any denial ground
- Do not submit irrelevant evidence
- Do not make legal arguments you are not qualified to make (consult an attorney)
- Do not miss the deadline`,
    relatedPages: ['/noid', '/noid/how-to-respond', '/noid/cover-letter', '/noid/evidence'],
    keywordCluster: ['noid response letter', 'noid response template', 'how to write noid response', 'noid letter sample'],
  },
  {
    slug: 'cover-letter',
    path: '/noid/cover-letter',
    title: 'NOID Cover Letter Guide | Immigration Mail',
    description: 'How to write an effective cover letter for your NOID response packet.',
    h1: 'NOID Cover Letter Guide',
    canonical: 'https://immigrationmail.com/noid/cover-letter',
    breadcrumbs: [{ label: 'Home', path: '/' }, { label: 'NOID', path: '/noid' }, { label: 'Cover Letter', path: '/noid/cover-letter' }],
    content: `## Purpose of the Cover Letter

The cover letter is the first page of your response packet. It introduces your response, lists the denial grounds you are addressing, and provides an evidence index.

## What to Include

- Your name and contact information
- Receipt number
- Form type
- Date
- A brief statement that you are responding to the NOID
- A numbered list of each denial ground and the evidence addressing it
- An evidence index (Exhibit A, B, C, etc.)
- Your signature

## Keep It Simple

The cover letter is an index, not an argument. Keep it clear and organized. The detailed arguments go in the response letter.`,
    relatedPages: ['/noid', '/noid/how-to-respond', '/noid/response-letter'],
    keywordCluster: ['noid cover letter', 'noid cover letter template', 'noid response cover letter'],
  },
  {
    slug: 'missed-deadline',
    path: '/noid/missed-deadline',
    title: 'Missed Your NOID Deadline? Options and Next Steps | Immigration Mail',
    description: 'What to do if you missed the deadline to respond to a USCIS Notice of Intent to Deny.',
    h1: 'Missed Your NOID Deadline?',
    canonical: 'https://immigrationmail.com/noid/missed-deadline',
    breadcrumbs: [{ label: 'Home', path: '/' }, { label: 'NOID', path: '/noid' }, { label: 'Missed Deadline', path: '/noid/missed-deadline' }],
    content: `## If the Deadline Has Passed

If you missed the deadline, USCIS will likely issue a final denial. However, you may still have options.

## File a Motion to Reopen

You may be able to file Form I-290B (Motion to Reopen or Reconsider) within 33 days of the denial decision. This requires a fee and a legal basis.

## File an Appeal

Depending on the form type, you may be able to appeal the denial to the Administrative Appeals Office (AAO) or the Board of Immigration Appeals (BIA).

## Consult an Attorney

If you have missed a NOID deadline, an immigration attorney can help you understand your options and the deadlines for appeals and motions. Time is critical.`,
    faqSchema: [
      {
        question: 'What happens if I miss my NOID deadline?',
        answer: 'USCIS will likely deny your application. You may be able to file a motion to reopen or an appeal, but consult an attorney immediately as deadlines for these are also strict.',
      },
    ],
    relatedPages: ['/noid', '/noid/deadline', '/noid/how-to-respond'],
    keywordCluster: ['missed noid deadline', 'noid deadline passed', 'late noid response', 'noid expired'],
  },
  {
    slug: 'i-485',
    path: '/noid/i-485',
    title: 'NOID for I-485 Adjustment of Status | Immigration Mail',
    description: 'Common denial grounds and response strategies for a NOID on Form I-485 Application to Register Permanent Residence.',
    h1: 'NOID for I-485 Adjustment of Status',
    canonical: 'https://immigrationmail.com/noid/i-485',
    breadcrumbs: [{ label: 'Home', path: '/' }, { label: 'NOID', path: '/noid' }, { label: 'I-485 NOID', path: '/noid/i-485' }],
    content: `## Common I-485 NOID Grounds

A NOID for Form I-485 may cite:
- Inadmissibility grounds (health, criminal, public charge, fraud)
- Insufficient evidence of bona fide marriage
- Unauthorized employment
- Unlawful presence
- Missing or insufficient Affidavit of Support

## Response Strategy

For each ground:
- Provide specific evidence addressing the finding
- Cite the correct legal standard
- Include original or certified documents
- Address any contradictory evidence

## High-Risk Grounds

Fraud/misrepresentation and criminal inadmissibility are high-risk grounds. An attorney is strongly recommended for these issues.`,
    relatedPages: ['/noid', '/noid/how-to-respond', '/noid/evidence'],
    keywordCluster: ['i-485 noid', 'adjustment of status noid', 'i-485 notice of intent to deny', 'green card noid'],
  },
  {
    slug: 'i-130',
    path: '/noid/i-130',
    title: 'NOID for I-130 Family Petition | Immigration Mail',
    description: 'Common denial grounds and response strategies for a NOID on Form I-130 Petition for Alien Relative.',
    h1: 'NOID for I-130 Family Petition',
    canonical: 'https://immigrationmail.com/noid/i-130',
    breadcrumbs: [{ label: 'Home', path: '/' }, { label: 'NOID', path: '/noid' }, { label: 'I-130 NOID', path: '/noid/i-130' }],
    content: `## Common I-130 NOID Grounds

A NOID for Form I-130 may cite:
- Insufficient evidence of bona fide marriage
- Evidence of marriage fraud
- Missing relationship evidence
- Prior petition denials
- Ineligibility of the petitioner

## Response Strategy

For marriage-based petitions, include:
- Joint financial documents
- Photographs and correspondence
- Affidavits from family and friends
- Evidence of shared residence
- Insurance and beneficiary documents

## If Fraud Is Alleged

If USCIS alleges marriage fraud, this is a critical issue. An attorney is strongly recommended. You will need substantial evidence of a bona fide relationship.`,
    relatedPages: ['/noid', '/noid/how-to-respond', '/noid/evidence'],
    keywordCluster: ['i-130 noid', 'family petition noid', 'i-130 notice of intent to deny', 'marriage petition noid'],
  },
  {
    slug: 'i-140',
    path: '/noid/i-140',
    title: 'NOID for I-140 Employment Petition | Immigration Mail',
    description: 'Common denial grounds and response strategies for a NOID on Form I-140 Immigrant Petition for Alien Worker.',
    h1: 'NOID for I-140 Employment Petition',
    canonical: 'https://immigrationmail.com/noid/i-140',
    breadcrumbs: [{ label: 'Home', path: '/' }, { label: 'NOID', path: '/noid' }, { label: 'I-140 NOID', path: '/noid/i-140' }],
    content: `## Common I-140 NOID Grounds

A NOID for Form I-140 may cite:
- Insufficient evidence of qualifying job offer
- Employer ability to pay
- Beneficiary qualifications (education, experience)
- Labor certification issues
- Category eligibility

## Response Strategy

Include:
- Updated employer financial records
- Evidence of beneficiary qualifications
- Updated job offer letter
- Educational credentials and evaluations
- Evidence of published work (for EB-1/EB-2 NIW)`,
    relatedPages: ['/noid', '/noid/how-to-respond', '/noid/evidence'],
    keywordCluster: ['i-140 noid', 'employment petition noid', 'i-140 notice of intent to deny', 'eb1 noid', 'eb2 noid'],
  },
  {
    slug: 'i-751',
    path: '/noid/i-751',
    title: 'NOID for I-751 Removal of Conditions | Immigration Mail',
    description: 'Common denial grounds and response strategies for a NOID on Form I-751 Petition to Remove Conditions.',
    h1: 'NOID for I-751 Removal of Conditions',
    canonical: 'https://immigrationmail.com/noid/i-751',
    breadcrumbs: [{ label: 'Home', path: '/' }, { label: 'NOID', path: '/noid' }, { label: 'I-751 NOID', path: '/noid/i-751' }],
    content: `## Common I-751 NOID Grounds

A NOID for Form I-751 may cite:
- Insufficient evidence of bona fide marriage
- Marriage was entered into for immigration purposes
- Failure to file jointly (if applicable)
- Criminal history
- Failure to appear for interview

## Response Strategy

Include:
- Extensive evidence of ongoing bona fide marriage
- Joint financial records spanning the entire marriage
- Birth certificates of children
- Photographs, correspondence, shared travel
- Affidavits from family and friends
- Evidence of shared residence and commingled finances

## If Marriage Fraud Is Alleged

This is one of the most serious allegations. An attorney is essential. A fraud finding can result in removal and a permanent bar.`,
    relatedPages: ['/noid', '/noid/how-to-respond', '/noid/evidence'],
    keywordCluster: ['i-751 noid', 'removal of conditions noid', 'i-751 notice of intent to deny', 'conditional resident noid'],
  },
  {
    slug: 'checklist',
    path: '/noid/checklist',
    title: 'NOID Response Checklist | Immigration Mail',
    description: 'A complete checklist for organizing your NOID response packet.',
    h1: 'NOID Response Checklist',
    canonical: 'https://immigrationmail.com/noid/checklist',
    breadcrumbs: [{ label: 'Home', path: '/' }, { label: 'NOID', path: '/noid' }, { label: 'Checklist', path: '/noid/checklist' }],
    content: `## Before You Start

- [ ] Read the entire NOID
- [ ] Identify every denial ground
- [ ] Note the deadline
- [ ] Determine if you need an attorney

## Evidence Collection

- [ ] Gather evidence for each denial ground
- [ ] Label each exhibit (Exhibit A, B, C...)
- [ ] Create an evidence index
- [ ] Make copies — never mail originals

## Response Packet

- [ ] Cover letter with receipt number and form type
- [ ] Response letter addressing each ground
- [ ] Evidence organized by ground
- [ ] Evidence index
- [ ] Copy of the NOID (first page)

## Mailing

- [ ] Use certified mail with tracking
- [ ] Add return receipt for proof of delivery
- [ ] Mail several days before the deadline
- [ ] Keep the tracking number and proof of delivery`,
    faqSchema: [
      {
        question: 'What should be in a NOID response packet?',
        answer: 'A cover letter, a response letter addressing each denial ground, organized evidence with an index, and a copy of the NOID. Mail with certified mail and tracking.',
      },
    ],
    relatedPages: ['/noid', '/noid/how-to-respond', '/noid/evidence', '/noid/cover-letter', '/noid/response-letter'],
    keywordCluster: ['noid checklist', 'noid response checklist', 'noid packet checklist', 'what to include in noid response'],
  },
  {
    slug: 'faq',
    path: '/noid/faq',
    title: 'NOID Frequently Asked Questions | Immigration Mail',
    description: 'Answers to common questions about USCIS Notices of Intent to Deny and how to respond.',
    h1: 'NOID Frequently Asked Questions',
    canonical: 'https://immigrationmail.com/noid/faq',
    breadcrumbs: [{ label: 'Home', path: '/' }, { label: 'NOID', path: '/noid' }, { label: 'FAQ', path: '/noid/faq' }],
    content: `## What is a NOID?

A Notice of Intent to Deny is a formal letter from USCIS stating that the agency intends to deny your application. You have a chance to respond.

## Is a NOID a denial?

No. A NOID is a warning that a denial is coming. If you respond with sufficient evidence, your case may be approved.

## How long do I have?

Typically 30 to 33 days. Check your specific notice for the exact deadline.

## What if USCIS is wrong?

If you believe USCIS made an error, you can submit evidence and arguments explaining why the finding is incorrect. Be specific and cite evidence.

## What if my records conflict with USCIS records?

Provide your records and explain the discrepancy. If the conflict involves official records, consider consulting an attorney.

## Can I get an extension?

Generally no. USCIS does not typically grant extensions for NOID responses. You must respond by the deadline.

## Do I need a lawyer?

For simple insufficient-evidence grounds, you may be able to respond on your own. For fraud, criminal, or complex legal issues, an attorney is strongly recommended.`,
    faqSchema: [
      {
        question: 'Can I get an extension on my NOID deadline?',
        answer: 'Generally no. USCIS does not typically grant extensions for NOID responses. You must respond by the deadline stated in your notice.',
      },
      {
        question: 'Do I need a lawyer for a NOID response?',
        answer: 'For simple insufficient-evidence grounds, you may respond on your own. For fraud, criminal, or complex legal issues, an attorney is strongly recommended.',
      },
    ],
    relatedPages: ['/noid', '/noid/what-is-a-noid', '/noid/deadline', '/noid/how-to-respond'],
    keywordCluster: ['noid faq', 'noid questions', 'noid help', 'noid information'],
  },
  {
    slug: 'pricing',
    path: '/noid/pricing',
    title: 'NOID Response Pricing | Immigration Mail',
    description: 'Transparent pricing for preparing and mailing your NOID response with tracking and proof of delivery.',
    h1: 'NOID Response Pricing',
    canonical: 'https://immigrationmail.com/noid/pricing',
    breadcrumbs: [{ label: 'Home', path: '/' }, { label: 'NOID', path: '/noid' }, { label: 'Pricing', path: '/noid/pricing' }],
    content: `## Transparent Pricing

Our pricing is based on case complexity and is separate from postage.

## Service Fees

- Standard NOID Response: $49
- Complex NOID (multiple grounds): $99
- Expedited Service (48-hour turnaround): $149

## Postage (Separate)

- Certified Mail: $7.09
- Certified Mail + Return Receipt: $9.94
- Priority Mail Express: $28.75

## What Is Included

- Document analysis and understanding
- Denial ground identification
- Evidence checklist
- Response letter drafting
- Cover letter drafting
- Evidence index
- Certified mailing with tracking
- Proof of delivery preserved

## What Is Not Included

- Legal advice or representation
- Guarantee of approval
- Filing of appeals or motions
- Translation services (available as add-on)`,
    relatedPages: ['/noid', '/noid/how-to-respond', '/noid/how-mailing-works'],
    keywordCluster: ['noid response cost', 'noid response price', 'noid service fee', 'how much is noid response'],
  },
  {
    slug: 'how-mailing-works',
    path: '/noid/how-mailing-works',
    title: 'How NOID Response Mailing Works | Immigration Mail',
    description: 'How we mail your NOID response with certified mail, tracking, and proof of delivery.',
    h1: 'How NOID Response Mailing Works',
    canonical: 'https://immigrationmail.com/noid/how-mailing-works',
    breadcrumbs: [{ label: 'Home', path: '/' }, { label: 'NOID', path: '/noid' }, { label: 'How Mailing Works', path: '/noid/how-mailing-works' }],
    content: `## Certified Mail with Tracking

Your NOID response is mailed via USPS Certified Mail. You receive a tracking number and can monitor delivery status.

## Proof of Delivery

We preserve:
- The certified mail tracking number
- The delivery confirmation
- The return receipt (if selected)
- A digital record of your entire packet

## Why This Matters

Proof of timely delivery is critical for NOID responses. If USCIS later claims your response was not received or was late, you have documentation showing otherwise.

## Mailing Timeline

- Your packet is mailed within 1 business day of approval
- Certified mail typically arrives in 3-5 business days
- You receive tracking information immediately after mailing`,
    relatedPages: ['/noid', '/noid/pricing', '/noid/deadline'],
    keywordCluster: ['noid mailing', 'mail noid response', 'certified mail noid', 'noid proof of delivery'],
  },
  {
    slug: 'examples',
    path: '/noid/examples',
    title: 'NOID Examples: Common Scenarios | Immigration Mail',
    description: 'Real-world examples of common NOID scenarios and how they were addressed.',
    h1: 'NOID Examples',
    canonical: 'https://immigrationmail.com/noid/examples',
    breadcrumbs: [{ label: 'Home', path: '/' }, { label: 'NOID', path: '/noid' }, { label: 'Examples', path: '/noid/examples' }],
    content: `## Example 1: Insufficient Evidence of Bona Fide Marriage

USCIS issued a NOID for an I-485 application, finding that the evidence of a bona fide marriage was insufficient. The response included joint bank statements, lease agreement, photographs spanning the relationship, affidavits from family, and insurance beneficiary documents. The case was approved.

## Example 2: Public Charge Finding

USCIS issued a NOID finding the applicant likely to become a public charge. The response included an updated Affidavit of Support with supporting tax returns, proof of employment, and bank statements showing sufficient assets. The case was approved.

## Example 3: Unauthorized Employment

USCIS issued a NOID citing unauthorized employment. The response included proof that the applicant had valid work authorization at the time of employment, an I-765 approval notice, and pay stubs. The case was approved.

## Important Note

These examples are for illustration only. Every case is different. Your response must address the specific findings in your notice.`,
    relatedPages: ['/noid', '/noid/how-to-respond', '/noid/evidence', '/noid/i-485'],
    keywordCluster: ['noid examples', 'noid sample', 'noid case examples', 'noid scenarios'],
  },
  {
    slug: 'h-1b',
    path: '/noid/h-1b',
    title: 'NOID for H-1B Petition | Immigration Mail',
    description: 'Common denial grounds and response strategies for a NOID on an H-1B specialty occupation petition.',
    h1: 'NOID for H-1B Petition',
    canonical: 'https://immigrationmail.com/noid/h-1b',
    breadcrumbs: [{ label: 'Home', path: '/' }, { label: 'NOID', path: '/noid' }, { label: 'H-1B NOID', path: '/noid/h-1b' }],
    content: `## Common H-1B NOID Grounds

A NOID for an H-1B petition may cite:
- Specialty occupation qualification issues
- Employer-employee relationship concerns
- Beneficiary qualifications (degree, experience)
- Insufficient wage documentation
- Itinerary or work location issues

## Response Strategy

Include:
- Detailed job duties showing the position requires specialized knowledge
- Educational credentials and evaluations
- Employer organizational chart
- Proof of employer-employee relationship (right to control)
- Wage documentation (LCA, pay records)
- Detailed itinerary of work locations

## When to Get Help

H-1B NOIDs involving employer-employee relationship or specialty occupation issues can be complex. Consider consulting an immigration attorney.`,
    relatedPages: ['/noid', '/noid/how-to-respond', '/noid/evidence'],
    keywordCluster: ['h-1b noid', 'h1b notice of intent to deny', 'h1b noid response', 'specialty occupation noid'],
  },
];

export function findNOIDPage(path: string): NOIDPage | undefined {
  if (path === '/noid') return NOID_LANDING_PAGE;
  return NOID_SUPPORTING_PAGES.find(p => p.path === path);
}

export const ALL_NOID_PAGES = [NOID_LANDING_PAGE, ...NOID_SUPPORTING_PAGES];
