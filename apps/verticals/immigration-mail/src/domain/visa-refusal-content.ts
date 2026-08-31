/**
 * Visa Refusal Content/SEO Architecture
 * Keyword-clustered pages for consular visa refusal responses.
 */

export interface VisaPage {
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

export const VISA_LANDING_PAGE: VisaPage = {
  slug: '',
  path: '/visa-refusal',
  title: 'Visa Refusal Response — 221(g), 214(b), Consular Denial | Immigration Mail',
  description: 'Received a visa refusal from a U.S. consulate? We help you understand the refusal type, identify what the consular officer found, organize evidence, and prepare an appropriate response.',
  h1: 'Received a U.S. Visa Refusal?',
  canonical: 'https://immigrationmail.com/visa-refusal',
  breadcrumbs: [{ label: 'Home', path: '/' }, { label: 'Visa Refusal', path: '/visa-refusal' }],
  content: `## What is a visa refusal?

A visa refusal means a U.S. consular officer has denied your visa application. There are several types of refusals, each with different implications and response options.

## Is a refusal the same as a denial?

The terms are often used interchangeably, but they can mean different things. A 221(g) refusal means additional documents are needed. A 214(b) refusal means you did not overcome the presumption of immigrant intent. A 212(a) refusal means an inadmissibility ground was found.

## What is 221(g)?

Section 221(g) of the Immigration and Nationality Act allows a consular officer to refuse a visa when additional documents or information are needed. This is not a final denial — you have one year to submit the requested documents.

## What is 214(b)?

Section 214(b) is the most common nonimmigrant visa refusal. The consular officer was not satisfied that you intend to return to your home country. You may reapply with stronger evidence of your ties.

## Can I appeal a visa refusal?

Most consular visa refusals cannot be appealed. However, you may be able to reapply, submit additional documents (for 221(g)), apply for a waiver (for some 212(a) grounds), or request reconsideration. An attorney can help you understand your options.

## How we help

Upload your refusal letter. We will identify the refusal type, explain what the consular officer found, help you organize evidence, prepare a response, and mail it with tracking and proof.

Immigration Mail does not determine eligibility, guarantee visa approval, or replace legal advice. For complex or high-risk cases, an immigration attorney is strongly recommended.`,
  faqSchema: [
    { question: 'What is a 221(g) visa refusal?', answer: 'A 221(g) refusal means the consular officer needs additional documents or information before making a final decision. You have one year to submit what is requested.' },
    { question: 'What is a 214(b) visa refusal?', answer: 'A 214(b) refusal means you did not overcome the presumption of immigrant intent. The officer was not convinced you plan to return home. You may reapply with stronger evidence of your ties.' },
    { question: 'Can I appeal a visa refusal?', answer: 'Most consular visa refusals cannot be formally appealed. Your options depend on the refusal type — reapply, submit documents, apply for a waiver, or request reconsideration.' },
    { question: 'How long do I have to respond to a 221(g) refusal?', answer: 'You have one year from the refusal date to submit the requested documents. After one year, you must file a new application and pay a new fee.' },
    { question: 'What does administrative processing mean?', answer: 'Administrative processing means the consulate is conducting additional checks. No action is needed from you. Processing typically takes 60-180 days.' },
    { question: 'Can my visa refusal be overcome?', answer: 'It depends on the refusal type. 221(g) refusals are often resolved with documents. 214(b) refusals may be overcome with stronger ties evidence. Some 212(a) grounds require a waiver or are permanent.' },
  ],
  relatedPages: [
    '/visa-refusal/what-is-221g', '/visa-refusal/what-is-214b', '/visa-refusal/how-to-respond',
    '/visa-refusal/evidence', '/visa-refusal/appeal', '/visa-refusal/faq', '/visa-refusal/pricing',
  ],
  keywordCluster: ['visa refusal', 'visa denial', '221g refusal', '214b refusal', 'visa rejected', 'consular refusal', 'visa application denied', 'us visa refusal'],
};

export const VISA_SUPPORTING_PAGES: VisaPage[] = [
  {
    slug: 'what-is-221g',
    path: '/visa-refusal/what-is-221g',
    title: 'What Is a 221(g) Visa Refusal? | Immigration Mail',
    description: 'A plain-language explanation of Section 221(g) visa refusals, what they mean, and how to respond.',
    h1: 'What Is a 221(g) Visa Refusal?',
    canonical: 'https://immigrationmail.com/visa-refusal/what-is-221g',
    breadcrumbs: [{ label: 'Home', path: '/' }, { label: 'Visa Refusal', path: '/visa-refusal' }, { label: '221(g)', path: '/visa-refusal/what-is-221g' }],
    content: `## Understanding 221(g)

Section 221(g) of the Immigration and Nationality Act allows a consular officer to refuse a visa application when additional documents or information are needed before a final decision can be made.

## Is 221(g) a denial?

No. A 221(g) refusal is a temporary refusal — the officer needs more information. If you submit the requested documents within one year, the officer will reconsider your application.

## What happens next?

The refusal letter will list the specific documents or information you need to submit. You must provide these within one year of the refusal date.

## If you do not respond within one year

After one year, the refusal becomes final. You will need to file a completely new application and pay a new fee.`,
    faqSchema: [
      { question: 'Is a 221(g) refusal permanent?', answer: 'No. You have one year to submit the requested documents. If you do, the officer will reconsider your application.' },
    ],
    relatedPages: ['/visa-refusal', '/visa-refusal/how-to-respond', '/visa-refusal/evidence'],
    keywordCluster: ['221g', 'section 221g', '221g refusal', '221g visa', '221g additional documents', '221g meaning'],
  },
  {
    slug: 'what-is-214b',
    path: '/visa-refusal/what-is-214b',
    title: 'What Is a 214(b) Visa Refusal? | Immigration Mail',
    description: 'Understanding Section 214(b) nonimmigrant visa refusals and how to overcome them.',
    h1: 'What Is a 214(b) Visa Refusal?',
    canonical: 'https://immigrationmail.com/visa-refusal/what-is-214b',
    breadcrumbs: [{ label: 'Home', path: '/' }, { label: 'Visa Refusal', path: '/visa-refusal' }, { label: '214(b)', path: '/visa-refusal/what-is-214b' }],
    content: `## Understanding 214(b)

Section 214(b) is the most common reason for nonimmigrant visa refusals. The consular officer was not satisfied that you intend to return to your home country after your temporary stay.

## The Presumption of Immigrant Intent

Under U.S. immigration law, every visa applicant is presumed to be an intending immigrant. You must overcome this presumption by showing strong ties to your home country.

## What counts as strong ties?

- Employment and career prospects in your home country
- Property ownership
- Bank accounts and financial assets
- Close family relationships
- Academic enrollment or prospects
- Social and community ties

## Can I reapply?

Yes. You may reapply at any time with a new application and fee. However, simply reapplying without stronger evidence is unlikely to succeed. You need to show what has changed or provide evidence you did not have before.`,
    faqSchema: [
      { question: 'Can I reapply after a 214(b) refusal?', answer: 'Yes. You may reapply at any time with a new application and fee. Bring stronger evidence of your ties to your home country.' },
    ],
    relatedPages: ['/visa-refusal', '/visa-refusal/how-to-respond', '/visa-refusal/evidence'],
    keywordCluster: ['214b', 'section 214b', '214b refusal', 'immigrant intent', 'nonimmigrant intent', 'visa ties'],
  },
  {
    slug: 'how-to-respond',
    path: '/visa-refusal/how-to-respond',
    title: 'How to Respond to a Visa Refusal | Immigration Mail',
    description: 'A step-by-step guide to responding to different types of U.S. visa refusals.',
    h1: 'How to Respond to a Visa Refusal',
    canonical: 'https://immigrationmail.com/visa-refusal/how-to-respond',
    breadcrumbs: [{ label: 'Home', path: '/' }, { label: 'Visa Refusal', path: '/visa-refusal' }, { label: 'How to Respond', path: '/visa-refusal/how-to-respond' }],
    content: `## Step 1: Identify the Refusal Type

Read your refusal letter carefully. The section cited (221(g), 214(b), 212(a)) determines your response options.

## Step 2: For 221(g) — Submit Documents

Gather the specific documents listed in the refusal letter and submit them to the consulate within one year.

## Step 3: For 214(b) — Strengthen Your Case

Identify what evidence of ties to your home country you can provide. Consider whether your circumstances have changed since the last application.

## Step 4: For 212(a) — Consult an Attorney

If the refusal is based on an inadmissibility ground, consult an immigration attorney. Some grounds may be waivable; others may be permanent.

## Step 5: Prepare Your Response

Organize your evidence clearly. Write a cover letter explaining what you are submitting and why it addresses the refusal.

## Step 6: Mail with Proof

Use tracked mail. Keep proof of delivery and copies of everything you submit.`,
    relatedPages: ['/visa-refusal', '/visa-refusal/evidence', '/visa-refusal/pricing'],
    keywordCluster: ['visa refusal response', 'respond to visa denial', 'visa refusal help', 'what to do after visa refusal'],
  },
  {
    slug: 'evidence',
    path: '/visa-refusal/evidence',
    title: 'Evidence for Visa Refusal Response | Immigration Mail',
    description: 'What evidence to gather for different types of visa refusals.',
    h1: 'Evidence for Your Visa Refusal Response',
    canonical: 'https://immigrationmail.com/visa-refusal/evidence',
    breadcrumbs: [{ label: 'Home', path: '/' }, { label: 'Visa Refusal', path: '/visa-refusal' }, { label: 'Evidence', path: '/visa-refusal/evidence' }],
    content: `## Evidence Depends on Refusal Type

The evidence you need depends on why your visa was refused.

## For 221(g) — Requested Documents

Submit exactly what the consular officer requested. This may include employment letters, bank statements, property documents, or other specific items.

## For 214(b) — Ties Evidence

- Employment letter showing position, salary, and leave approval
- Property ownership documents
- Bank statements showing financial ties
- Family relationship evidence
- School enrollment or prospects
- Travel history showing prior compliance

## For 212(a) — Address the Specific Ground

Each inadmissibility ground requires specific evidence. Some grounds require a waiver application. Consult an attorney for complex grounds.

## Organizing Evidence

Label each exhibit. Write a cover letter explaining what each document shows and how it addresses the refusal.`,
    relatedPages: ['/visa-refusal', '/visa-refusal/how-to-respond'],
    keywordCluster: ['visa refusal evidence', 'visa denial evidence', 'what to bring visa refusal', 'visa ties evidence'],
  },
  {
    slug: 'appeal',
    path: '/visa-refusal/appeal',
    title: 'Can You Appeal a Visa Refusal? | Immigration Mail',
    description: 'Understanding your options after a consular visa refusal, including reapplication, waivers, and reconsideration.',
    h1: 'Can You Appeal a Visa Refusal?',
    canonical: 'https://immigrationmail.com/visa-refusal/appeal',
    breadcrumbs: [{ label: 'Home', path: '/' }, { label: 'Visa Refusal', path: '/visa-refusal' }, { label: 'Appeal Options', path: '/visa-refusal/appeal' }],
    content: `## Most Consular Refusals Cannot Be Formally Appealed

Unlike USCIS denials, most consular visa refusals cannot be appealed to an administrative body. However, you have other options.

## Reapplication

For 214(b) refusals, you may reapply with a new application and fee. You should bring stronger evidence than your previous application.

## Submitting Documents (221(g))

For 221(g) refusals, simply submit the requested documents within one year. No new application or fee is needed.

## Waiver Application

For certain 212(a) inadmissibility grounds, a waiver may be available. The waiver process depends on the specific ground and the visa category.

## Requesting Reconsideration

In limited circumstances, you may ask the consular officer to reconsider the decision. This is most effective when you can show the officer made an error of fact.

## Legal Counsel

An immigration attorney can help you determine which option is best for your situation.`,
    faqSchema: [
      { question: 'Can I appeal a visa refusal?', answer: 'Most consular visa refusals cannot be formally appealed. Your options include reapplying, submitting documents (for 221(g)), applying for a waiver, or requesting reconsideration.' },
    ],
    relatedPages: ['/visa-refusal', '/visa-refusal/how-to-respond'],
    keywordCluster: ['visa refusal appeal', 'appeal visa denial', 'can you appeal visa refusal', 'visa denial options'],
  },
  {
    slug: 'faq',
    path: '/visa-refusal/faq',
    title: 'Visa Refusal FAQ | Immigration Mail',
    description: 'Frequently asked questions about U.S. visa refusals and responses.',
    h1: 'Visa Refusal FAQ',
    canonical: 'https://immigrationmail.com/visa-refusal/faq',
    breadcrumbs: [{ label: 'Home', path: '/' }, { label: 'Visa Refusal', path: '/visa-refusal' }, { label: 'FAQ', path: '/visa-refusal/faq' }],
    content: `## What is the difference between 221(g) and 214(b)?

221(g) means the officer needs more documents. 214(b) means you did not overcome the presumption of immigrant intent. 221(g) is often resolvable; 214(b) requires a new application with stronger evidence.

## How long does administrative processing take?

Typically 60-180 days, but it can take longer. No action is needed from you during this time.

## Can a 214(b) refusal be overcome?

Yes. You may reapply with stronger evidence of your ties to your home country. Many applicants succeed on reapplication.

## Is a fraud finding permanent?

A finding of willful misrepresentation under 212(a)(6)(C)(i) can result in a lifetime bar. A waiver may be available in some circumstances. Consult an attorney.

## Do I need a lawyer for a visa refusal?

For simple 221(g) document submissions, you may not need a lawyer. For 214(b) reapplications, guidance can help. For 212(a) grounds, an attorney is strongly recommended.`,
    faqSchema: [
      { question: 'How long does administrative processing take?', answer: 'Typically 60-180 days. No action is needed from you during this time.' },
      { question: 'Is a fraud finding permanent?', answer: 'A finding of willful misrepresentation can result in a lifetime bar. A waiver may be available. Consult an attorney immediately.' },
    ],
    relatedPages: ['/visa-refusal', '/visa-refusal/what-is-221g', '/visa-refusal/what-is-214b'],
    keywordCluster: ['visa refusal faq', 'visa denial questions', 'visa refusal help', 'visa refusal information'],
  },
  {
    slug: 'pricing',
    path: '/visa-refusal/pricing',
    title: 'Visa Refusal Response Pricing | Immigration Mail',
    description: 'Transparent pricing for preparing and mailing your visa refusal response.',
    h1: 'Visa Refusal Response Pricing',
    canonical: 'https://immigrationmail.com/visa-refusal/pricing',
    breadcrumbs: [{ label: 'Home', path: '/' }, { label: 'Visa Refusal', path: '/visa-refusal' }, { label: 'Pricing', path: '/visa-refusal/pricing' }],
    content: `## Transparent Pricing

Service fees are separate from postage.

## Service Fees

- Standard Refusal Response: $49
- Complex Refusal (inadmissibility): $99
- Expedited Service (48 hours): $149

## Postage (Separate)

- Certified Mail: $7.09
- Certified Mail + Return Receipt: $9.94
- Priority Mail Express: $28.75

## What Is Included

- Refusal type identification
- Finding analysis
- Evidence checklist
- Response letter drafting
- Cover letter drafting
- Certified mailing with tracking
- Proof of delivery

## What Is Not Included

- Legal advice or representation
- Guarantee of visa approval
- Government filing fees (visa application, waiver fees)`,
    relatedPages: ['/visa-refusal', '/visa-refusal/how-to-respond'],
    keywordCluster: ['visa refusal response cost', 'visa refusal service price', 'visa response fee'],
  },
  {
    slug: 'checklist',
    path: '/visa-refusal/checklist',
    title: 'Visa Refusal Response Checklist | Immigration Mail',
    description: 'A complete checklist for organizing your visa refusal response.',
    h1: 'Visa Refusal Response Checklist',
    canonical: 'https://immigrationmail.com/visa-refusal/checklist',
    breadcrumbs: [{ label: 'Home', path: '/' }, { label: 'Visa Refusal', path: '/visa-refusal' }, { label: 'Checklist', path: '/visa-refusal/checklist' }],
    content: `## Before You Start

- [ ] Read the refusal letter completely
- [ ] Identify the refusal type (221(g), 214(b), 212(a))
- [ ] Note the deadline (1 year for 221(g))
- [ ] Determine if you need an attorney

## Evidence Collection

- [ ] Gather evidence addressing each finding
- [ ] Label each exhibit
- [ ] Create an evidence index
- [ ] Make copies — keep originals

## Response Packet

- [ ] Cover letter with case number
- [ ] Response letter addressing each finding
- [ ] Evidence organized by finding
- [ ] Evidence index

## Mailing

- [ ] Use certified mail with tracking
- [ ] Mail before any deadline
- [ ] Keep tracking number and proof of delivery`,
    relatedPages: ['/visa-refusal', '/visa-refusal/how-to-respond', '/visa-refusal/evidence'],
    keywordCluster: ['visa refusal checklist', 'visa response checklist', 'what to include visa refusal response'],
  },
  {
    slug: 'administrative-processing',
    path: '/visa-refusal/administrative-processing',
    title: 'Visa Administrative Processing Explained | Immigration Mail',
    description: 'What administrative processing means, how long it takes, and what to do while you wait.',
    h1: 'Visa Administrative Processing',
    canonical: 'https://immigrationmail.com/visa-refusal/administrative-processing',
    breadcrumbs: [{ label: 'Home', path: '/' }, { label: 'Visa Refusal', path: '/visa-refusal' }, { label: 'Administrative Processing', path: '/visa-refusal/administrative-processing' }],
    content: `## What Is Administrative Processing?

Administrative processing is an additional review conducted by the consulate after your visa interview. It is typically based on Section 221(g) and involves background or security checks.

## How Long Does It Take?

Processing typically takes 60-180 days, but it can take longer. The consulate will contact you when processing is complete.

## What Should I Do?

In most cases, no action is needed. Wait for the consulate to complete processing. You can check your status online using your case number.

## When to Be Concerned

If processing takes significantly longer than 180 days, or if you have an urgent need to travel, consider contacting the consulate or consulting an attorney.`,
    faqSchema: [
      { question: 'How long does administrative processing take?', answer: 'Typically 60-180 days. No action is needed from you. Check your status online using your case number.' },
    ],
    relatedPages: ['/visa-refusal', '/visa-refusal/what-is-221g', '/visa-refusal/faq'],
    keywordCluster: ['administrative processing', 'visa admin processing', '221g processing time', 'visa background check'],
  },
];

export function findVisaPage(path: string): VisaPage | undefined {
  if (path === '/visa-refusal') return VISA_LANDING_PAGE;
  return VISA_SUPPORTING_PAGES.find(p => p.path === path);
}

export const ALL_VISA_PAGES = [VISA_LANDING_PAGE, ...VISA_SUPPORTING_PAGES];
