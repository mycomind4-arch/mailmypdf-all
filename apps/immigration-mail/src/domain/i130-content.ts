/**
 * I-130 Family Petition Content/SEO Architecture
 */

export interface I130Page {
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

export const I130_LANDING_PAGE: I130Page = {
  slug: '',
  path: '/i-130',
  title: 'I-130 Family Petition Response — USCIS Evidence, RFE, NOID | Immigration Mail',
  description: 'Filed an I-130 family petition? We help you understand what USCIS is asking, organize relationship evidence, prepare your response, and mail it with tracking and proof.',
  h1: 'I-130 Family Petition Response',
  canonical: 'https://immigrationmail.com/i-130',
  breadcrumbs: [{ label: 'Home', path: '/' }, { label: 'I-130', path: '/i-130' }],
  content: `## What is an I-130 Petition?

Form I-130 is a Petition for Alien Relative. It is the first step in sponsoring a family member for U.S. immigration. A U.S. citizen or lawful permanent resident files it to establish a qualifying family relationship.

## What relationships qualify?

- Spouse
- Parent (if the petitioner is 21 or older)
- Child (unmarried, under 21, or married son/daughter)
- Sibling (if the petitioner is 21 or older)

## What happens after filing?

USCIS reviews the petition. They may send a receipt notice, request additional evidence (RFE), issue a Notice of Intent to Deny (NOID), or approve or deny the petition.

## What if USCIS asks for more evidence?

You will receive a Request for Evidence (RFE) listing what is needed. Common requests include birth certificates, marriage certificates, proof of bona fide marriage, translations, and identity documents.

## How we help

Upload your I-130 notice. We will identify the relationship type, explain what USCIS is asking, build an evidence checklist, help you organize documents, prepare a response, and mail it with tracking and proof.

Immigration Mail does not determine eligibility, guarantee approval, or replace legal advice.`,
  faqSchema: [
    { question: 'What is Form I-130?', answer: 'Form I-130 is a Petition for Alien Relative. A U.S. citizen or permanent resident files it to establish a qualifying family relationship with a foreign national.' },
    { question: 'What relationships can I petition for with I-130?', answer: 'You can petition for a spouse, parent, child, or sibling. Some categories have annual visa limits and longer wait times.' },
    { question: 'What happens if USCIS sends an RFE for my I-130?', answer: 'A Request for Evidence means USCIS needs more documents. You must submit the requested evidence by the deadline in the notice.' },
    { question: 'What evidence do I need for an I-130?', answer: 'It depends on the relationship. Common evidence includes birth certificates, marriage certificates, proof of bona fide marriage, identity documents, and certified translations of foreign documents.' },
    { question: 'What is a bona fide marriage?', answer: 'A bona fide marriage is one entered into in good faith, not solely for immigration purposes. USCIS may request evidence of shared finances, residence, and life together.' },
    { question: 'What if I received a NOID for my I-130?', answer: 'A Notice of Intent to Deny means USCIS plans to deny your petition. You have a limited time to respond with evidence addressing the denial grounds. An attorney is recommended.' },
  ],
  relatedPages: [
    '/i-130/how-it-works', '/i-130/evidence', '/i-130/checklist', '/i-130/spouse',
    '/i-130/parent', '/i-130/child', '/i-130/sibling', '/i-130/rfe', '/i-130/noid',
    '/i-130/denial', '/i-130/translations', '/i-130/cover-letter', '/i-130/faq', '/i-130/pricing',
  ],
  keywordCluster: ['i-130', 'i130 petition', 'i-130 response', 'i-130 evidence', 'i-130 supporting documents', 'i-130 uscis', 'family petition', 'petition for alien relative'],
};

export const I130_SUPPORTING_PAGES: I130Page[] = [
  {
    slug: 'how-it-works',
    path: '/i-130/how-it-works',
    title: 'How I-130 Response Works | Immigration Mail',
    description: 'A step-by-step guide to responding to USCIS about your I-130 family petition.',
    h1: 'How I-130 Response Works',
    canonical: 'https://immigrationmail.com/i-130/how-it-works',
    breadcrumbs: [{ label: 'Home', path: '/' }, { label: 'I-130', path: '/i-130' }, { label: 'How It Works', path: '/i-130/how-it-works' }],
    content: `## Step 1: Upload Your Notice

Upload the letter USCIS sent you. We will read it and identify whether it is an RFE, NOID, denial, or receipt notice.

## Step 2: Understand What USCIS Is Asking

We explain in plain language what USCIS is requesting and why.

## Step 3: Build Your Evidence Checklist

We create a checklist of evidence needed for your specific relationship type — spouse, parent, child, or sibling.

## Step 4: Upload Evidence

Upload documents for each checklist item. Mark items you do not have.

## Step 5: Review and Approve

We generate your response packet with a cover letter, evidence index, and any discrepancy explanations. You review and explicitly approve before anything is mailed.

## Step 6: Mail with Proof

After approval and payment, your packet is mailed via certified mail with tracking and proof of delivery.`,
    relatedPages: ['/i-130', '/i-130/evidence', '/i-130/checklist', '/i-130/pricing'],
    keywordCluster: ['i-130 process', 'how to respond i-130', 'i-130 response process', 'i-130 steps'],
  },
  {
    slug: 'evidence',
    path: '/i-130/evidence',
    title: 'I-130 Evidence Requirements | Immigration Mail',
    description: 'What evidence you need for an I-130 family petition by relationship type.',
    h1: 'I-130 Evidence Requirements',
    canonical: 'https://immigrationmail.com/i-130/evidence',
    breadcrumbs: [{ label: 'Home', path: '/' }, { label: 'I-130', path: '/i-130' }, { label: 'Evidence', path: '/i-130/evidence' }],
    content: `## Evidence Depends on Relationship Type

### For Spouse

- Marriage certificate
- Proof of termination of any prior marriages
- Proof of bona fide marriage: shared residence, joint finances, insurance, tax returns, photographs, correspondence, affidavits
- Children's birth certificates (if applicable)

### For Parent

- Petitioner's birth certificate showing parent's name
- Parent's identity and birth documentation
- Proof of legal parent-child relationship (adoption records if applicable)

### For Child

- Child's birth certificate showing petitioner as parent
- Adoption records (if applicable)
- Child's identity documents

### For Sibling

- Birth certificates showing common parent(s)
- Identity documents for both siblings
- Name change records if applicable

## Foreign Documents

Foreign-language documents must include a certified English translation.`,
    faqSchema: [
      { question: 'What evidence do I need for an I-130 spouse petition?', answer: 'Marriage certificate, proof of prior marriage termination, and evidence of bona fide marriage such as joint finances, shared residence, photographs, and affidavits.' },
    ],
    relatedPages: ['/i-130', '/i-130/spouse', '/i-130/parent', '/i-130/child', '/i-130/sibling', '/i-130/translations'],
    keywordCluster: ['i-130 evidence', 'i-130 supporting documents', 'i-130 proof of relationship', 'what documents for i-130'],
  },
  {
    slug: 'checklist',
    path: '/i-130/checklist',
    title: 'I-130 Evidence Checklist | Immigration Mail',
    description: 'A complete checklist for organizing your I-130 response packet.',
    h1: 'I-130 Response Checklist',
    canonical: 'https://immigrationmail.com/i-130/checklist',
    breadcrumbs: [{ label: 'Home', path: '/' }, { label: 'I-130', path: '/i-130' }, { label: 'Checklist', path: '/i-130/checklist' }],
    content: `## Before You Start

- [ ] Read the entire USCIS notice
- [ ] Identify the notice type (RFE, NOID, denial)
- [ ] Note the deadline
- [ ] Identify your relationship type

## Identity Evidence

- [ ] Petitioner's passport or government ID
- [ ] Beneficiary's passport or government ID
- [ ] Proof of petitioner's citizenship/LPR status

## Relationship Evidence

- [ ] Marriage certificate (spouse)
- [ ] Birth certificate (parent/child/sibling)
- [ ] Prior marriage termination documents (spouse)
- [ ] Adoption records (if applicable)

## Bona Fide Evidence (Spouse)

- [ ] Joint bank statements
- [ ] Lease or mortgage showing shared residence
- [ ] Insurance documents
- [ ] Joint tax returns
- [ ] Photographs
- [ ] Affidavits from family/friends

## Foreign Documents

- [ ] Certified English translations for all foreign-language documents

## Mailing

- [ ] Cover letter with receipt number
- [ ] Evidence index
- [ ] Certified mail with tracking`,
    relatedPages: ['/i-130', '/i-130/evidence', '/i-130/cover-letter', '/i-130/how-it-works'],
    keywordCluster: ['i-130 checklist', 'i-130 evidence checklist', 'i-130 document checklist', 'i-130 response checklist'],
  },
  {
    slug: 'spouse',
    path: '/i-130/spouse',
    title: 'I-130 Spouse Petition Evidence | Immigration Mail',
    description: 'Evidence requirements and strategies for I-130 spouse petitions.',
    h1: 'I-130 Spouse Petition',
    canonical: 'https://immigrationmail.com/i-130/spouse',
    breadcrumbs: [{ label: 'Home', path: '/' }, { label: 'I-130', path: '/i-130' }, { label: 'Spouse', path: '/i-130/spouse' }],
    content: `## I-130 for a Spouse

A spouse petition requires proof of two things: (1) a legally valid marriage, and (2) that the marriage is bona fide (entered in good faith).

## Proof of Valid Marriage

- Marriage certificate
- Proof of termination of any prior marriages (divorce decrees, death certificates)

## Proof of Bona Fide Marriage

USCIS wants to see that the marriage is real, not just for immigration purposes:
- Joint bank accounts and financial records
- Shared residence (lease, mortgage, utility bills)
- Insurance policies showing spouse as beneficiary
- Joint tax returns
- Photographs spanning the relationship
- Correspondence and communications
- Affidavits from family and friends
- Children's birth certificates (if applicable)

## Common RFE Issues

- Missing marriage certificate
- Insufficient bona fide evidence
- Prior marriage not properly terminated
- Name discrepancies between documents
- Missing translations of foreign documents`,
    faqSchema: [
      { question: 'What is a bona fide marriage?', answer: 'A bona fide marriage is one entered into in good faith, not solely for immigration purposes. USCIS looks for evidence of shared life, finances, and residence.' },
    ],
    relatedPages: ['/i-130', '/i-130/evidence', '/i-130/checklist', '/i-130/rfe'],
    keywordCluster: ['i-130 spouse', 'i-130 marriage', 'bona fide marriage', 'i-130 spouse evidence', 'i-130 husband', 'i-130 wife'],
  },
  {
    slug: 'parent',
    path: '/i-130/parent',
    title: 'I-130 Parent Petition Evidence | Immigration Mail',
    description: 'Evidence requirements for I-130 parent petitions.',
    h1: 'I-130 Parent Petition',
    canonical: 'https://immigrationmail.com/i-130/parent',
    breadcrumbs: [{ label: 'Home', path: '/' }, { label: 'I-130', path: '/i-130' }, { label: 'Parent', path: '/i-130/parent' }],
    content: `## I-130 for a Parent

A U.S. citizen (21 or older) can petition for a parent. The key evidence is proof of the parent-child relationship.

## Required Evidence

- Petitioner's birth certificate showing the parent's name
- Parent's birth certificate and identity documents
- Proof of petitioner's U.S. citizenship

## Common Issues

- Birth certificate not available (especially from older records or conflict zones)
- Name discrepancies between documents
- Foreign documents requiring certified English translations
- Legitimation or adoption situations requiring additional legal documentation`,
    relatedPages: ['/i-130', '/i-130/evidence', '/i-130/translations'],
    keywordCluster: ['i-130 parent', 'i-130 for parent', 'parent petition evidence', 'i-130 father', 'i-130 mother'],
  },
  {
    slug: 'child',
    path: '/i-130/child',
    title: 'I-130 Child Petition Evidence | Immigration Mail',
    description: 'Evidence requirements for I-130 child petitions.',
    h1: 'I-130 Child Petition',
    canonical: 'https://immigrationmail.com/i-130/child',
    breadcrumbs: [{ label: 'Home', path: '/' }, { label: 'I-130', path: '/i-130' }, { label: 'Child', path: '/i-130/child' }],
    content: `## I-130 for a Child

A U.S. citizen or permanent resident can petition for a child. The definition of "child" under immigration law includes legitimate, legitimated, adopted, and step-children in certain circumstances.

## Required Evidence

- Child's birth certificate showing petitioner as parent
- Proof of petitioner's citizenship or LPR status
- Adoption records (if applicable)
- Proof of legal custody (for step-child or adoption cases)

## Common Issues

- Birth certificate discrepancies
- Foreign birth certificates requiring translation
- Step-child cases requiring proof of marriage to the child's parent
- Adoption cases requiring proof of legal adoption`,
    relatedPages: ['/i-130', '/i-130/evidence', '/i-130/translations'],
    keywordCluster: ['i-130 child', 'i-130 for child', 'child petition evidence', 'i-130 son', 'i-130 daughter'],
  },
  {
    slug: 'sibling',
    path: '/i-130/sibling',
    title: 'I-130 Sibling Petition Evidence | Immigration Mail',
    description: 'Evidence requirements for I-130 sibling petitions.',
    h1: 'I-130 Sibling Petition',
    canonical: 'https://immigrationmail.com/i-130/sibling',
    breadcrumbs: [{ label: 'Home', path: '/' }, { label: 'I-130', path: '/i-130' }, { label: 'Sibling', path: '/i-130/sibling' }],
    content: `## I-130 for a Sibling

A U.S. citizen (21 or older) can petition for a sibling. The key evidence is proof of common parentage.

## Required Evidence

- Birth certificates showing common parent(s)
- Identity documents for both siblings
- Name change records (if either sibling changed their name)
- Proof of petitioner's U.S. citizenship

## Common Issues

- Birth certificates from different countries or jurisdictions
- Name changes requiring explanation
- Foreign documents requiring certified English translations
- Long processing times for sibling category`,
    relatedPages: ['/i-130', '/i-130/evidence', '/i-130/translations'],
    keywordCluster: ['i-130 sibling', 'i-130 brother', 'i-130 sister', 'sibling petition evidence'],
  },
  {
    slug: 'rfe',
    path: '/i-130/rfe',
    title: 'I-130 RFE Response | Immigration Mail',
    description: 'How to respond to a Request for Evidence for an I-130 family petition.',
    h1: 'I-130 RFE Response',
    canonical: 'https://immigrationmail.com/i-130/rfe',
    breadcrumbs: [{ label: 'Home', path: '/' }, { label: 'I-130', path: '/i-130' }, { label: 'RFE', path: '/i-130/rfe' }],
    content: `## What Is an I-130 RFE?

A Request for Evidence means USCIS needs more documents to make a decision on your I-130 petition. The RFE will list exactly what is needed and the deadline for responding.

## Common I-130 RFE Requests

- Marriage certificate (if missing)
- Proof of bona fide marriage
- Birth certificates
- Proof of prior marriage termination
- Certified translations of foreign documents
- Identity documents
- Proof of petitioner's citizenship status

## How to Respond

1. Read the RFE carefully — identify every item requested
2. Gather the requested documents
3. Organize with a cover letter and evidence index
4. Mail by the deadline with certified mail and tracking

## If You Do Not Have a Requested Document

Explain why and provide the best alternative evidence available. Do not fabricate documents.`,
    faqSchema: [
      { question: 'What happens if I get an RFE for my I-130?', answer: 'USCIS needs more evidence. Gather the requested documents, organize them with a cover letter, and mail by the deadline with certified mail.' },
    ],
    relatedPages: ['/i-130', '/i-130/evidence', '/i-130/checklist', '/i-130/cover-letter'],
    keywordCluster: ['i-130 rfe', 'i-130 request for evidence', 'i-130 rfe response', 'i-130 additional evidence'],
  },
  {
    slug: 'noid',
    path: '/i-130/noid',
    title: 'I-130 NOID Response | Immigration Mail',
    description: 'How to respond to a Notice of Intent to Deny for an I-130 family petition.',
    h1: 'I-130 NOID Response',
    canonical: 'https://immigrationmail.com/i-130/noid',
    breadcrumbs: [{ label: 'Home', path: '/' }, { label: 'I-130', path: '/i-130' }, { label: 'NOID', path: '/i-130/noid' }],
    content: `## What Is an I-130 NOID?

A Notice of Intent to Deny means USCIS plans to deny your I-130 petition. You have a limited time to respond with evidence addressing every denial ground.

## Common I-130 NOID Grounds

- Insufficient evidence of bona fide marriage
- Marriage fraud concerns
- Missing relationship evidence
- Discrepancies in names, dates, or other information
- Insufficient evidence of qualifying relationship

## How to Respond

1. Read every denial ground carefully
2. Address each ground with specific evidence
3. Explain any discrepancies
4. Include an evidence index
5. Mail by the deadline with certified mail

## When to Get an Attorney

If the NOID involves fraud, marriage fraud, or complex legal issues, an attorney is strongly recommended.`,
    relatedPages: ['/i-130', '/i-130/rfe', '/i-130/denial', '/i-130/evidence'],
    keywordCluster: ['i-130 noid', 'i-130 notice of intent to deny', 'i-130 noid response', 'i-130 intent to deny'],
  },
  {
    slug: 'denial',
    path: '/i-130/denial',
    title: 'I-130 Denied — What to Do | Immigration Mail',
    description: 'Options after an I-130 petition denial, including appeals and refiling.',
    h1: 'I-130 Denied — What to Do',
    canonical: 'https://immigrationmail.com/i-130/denial',
    breadcrumbs: [{ label: 'Home', path: '/' }, { label: 'I-130', path: '/i-130' }, { label: 'Denial', path: '/i-130/denial' }],
    content: `## If Your I-130 Was Denied

A denial is not the end. You have options:

## Appeal (I-290B)

You may file Form I-290B to appeal the denial to the Administrative Appeals Office (AAO). The deadline is typically 33 days from the denial.

## Motion to Reopen

If you have new evidence, you can file a motion to reopen with the same form (I-290B).

## Motion to Reconsider

If you believe USCIS made a legal error, you can file a motion to reconsider.

## Refile

In some cases, it may be better to refile the I-130 with stronger evidence rather than appeal.

## Consult an Attorney

I-130 denials involving marriage fraud, relationship disputes, or complex legal issues should be handled by an immigration attorney.`,
    relatedPages: ['/i-130', '/i-130/noid', '/i-130/evidence'],
    keywordCluster: ['i-130 denied', 'i-130 denial', 'i-130 appeal', 'i-130 denied what to do', 'i-130 denied options'],
  },
  {
    slug: 'translations',
    path: '/i-130/translations',
    title: 'I-130 Translation Requirements | Immigration Mail',
    description: 'Certified translation requirements for foreign documents in I-130 petitions.',
    h1: 'I-130 Translation Requirements',
    canonical: 'https://immigrationmail.com/i-130/translations',
    breadcrumbs: [{ label: 'Home', path: '/' }, { label: 'I-130', path: '/i-130' }, { label: 'Translations', path: '/i-130/translations' }],
    content: `## Certified English Translations

USCIS requires a certified English translation for any foreign-language document submitted with an I-130 petition.

## What Is a Certified Translation?

A certified translation includes a statement from the translator certifying that they are competent to translate and that the translation is accurate and complete.

## Who Can Be a Translator?

Anyone who is competent in both English and the original language can provide a certified translation. It does not need to be a professional translation service, but it must include the certification statement.

## What Needs Translation?

- Foreign marriage certificates
- Foreign birth certificates
- Foreign divorce decrees
- Any other foreign-language document

## What Does Not Need Translation

- Passports (English portions)
- Documents already in English
- International documents with English certificates of authenticity`,
    faqSchema: [
      { question: 'Do I need a certified translation for I-130 documents?', answer: 'Yes. Any foreign-language document submitted to USCIS must include a certified English translation with a translator certification statement.' },
    ],
    relatedPages: ['/i-130', '/i-130/evidence', '/i-130/checklist'],
    keywordCluster: ['i-130 translation', 'i-130 certified translation', 'i-130 foreign documents', 'i-130 document translation'],
  },
  {
    slug: 'cover-letter',
    path: '/i-130/cover-letter',
    title: 'I-130 Cover Letter Guide | Immigration Mail',
    description: 'How to write an effective cover letter for your I-130 response packet.',
    h1: 'I-130 Cover Letter Guide',
    canonical: 'https://immigrationmail.com/i-130/cover-letter',
    breadcrumbs: [{ label: 'Home', path: '/' }, { label: 'I-130', path: '/i-130' }, { label: 'Cover Letter', path: '/i-130/cover-letter' }],
    content: `## Purpose of the Cover Letter

The cover letter introduces your I-130 response, lists what you are submitting, and maps each exhibit to the USCIS request.

## What to Include

- Your name and contact information
- Receipt number
- Form type (I-130)
- Date
- Relationship type (spouse, parent, child, sibling)
- List of each requested item and the exhibit addressing it
- Evidence index
- Your signature

## Keep It Organized

The cover letter is an index, not an argument. Keep it clear and organized. Detailed explanations go in a separate response letter if needed.`,
    relatedPages: ['/i-130', '/i-130/evidence', '/i-130/checklist', '/i-130/how-it-works'],
    keywordCluster: ['i-130 cover letter', 'i-130 response cover letter', 'i-130 cover letter template'],
  },
  {
    slug: 'faq',
    path: '/i-130/faq',
    title: 'I-130 Frequently Asked Questions | Immigration Mail',
    description: 'Answers to common questions about I-130 family petitions and responses.',
    h1: 'I-130 FAQ',
    canonical: 'https://immigrationmail.com/i-130/faq',
    breadcrumbs: [{ label: 'Home', path: '/' }, { label: 'I-130', path: '/i-130' }, { label: 'FAQ', path: '/i-130/faq' }],
    content: `## What is the difference between I-130 and I-485?

I-130 establishes the family relationship. I-485 is the application for permanent residence. Both may be filed concurrently if a visa is immediately available.

## How long does I-130 processing take?

Processing times vary by service center and category. Immediate relatives (spouse, parent, unmarried child under 21 of U.S. citizens) typically process faster than preference categories.

## Can I file I-130 online?

Yes, USCIS allows online filing of I-130. However, supporting evidence must still be uploaded or mailed.

## What if my I-130 is approved?

Approval means USCIS recognized the family relationship. The beneficiary then needs a visa to become available (for preference categories) and may file I-485 or go through consular processing.

## Do I need a lawyer for I-130?

Many I-130 petitions are filed without a lawyer. However, if there are prior denials, fraud concerns, criminal history, or complex family situations, an attorney is recommended.`,
    faqSchema: [
      { question: 'What is the difference between I-130 and I-485?', answer: 'I-130 establishes the family relationship. I-485 is the application for permanent residence (green card). Both may be filed together if a visa is immediately available.' },
      { question: 'Can I file I-130 online?', answer: 'Yes, USCIS allows online filing. Supporting evidence can be uploaded or mailed.' },
    ],
    relatedPages: ['/i-130', '/i-130/evidence', '/i-130/rfe', '/i-130/noid', '/i-130/denial'],
    keywordCluster: ['i-130 faq', 'i-130 questions', 'i-130 help', 'i-130 information'],
  },
  {
    slug: 'pricing',
    path: '/i-130/pricing',
    title: 'I-130 Response Pricing | Immigration Mail',
    description: 'Transparent pricing for preparing and mailing your I-130 response.',
    h1: 'I-130 Response Pricing',
    canonical: 'https://immigrationmail.com/i-130/pricing',
    breadcrumbs: [{ label: 'Home', path: '/' }, { label: 'I-130', path: '/i-130' }, { label: 'Pricing', path: '/i-130/pricing' }],
    content: `## Transparent Pricing

Service fees are separate from postage.

## Service Fees

- Standard I-130 Evidence Response: $49
- Complex I-130 (RFE with multiple items): $79
- I-130 NOID Response: $99
- Expedited Service (48 hours): $149

## Postage (Separate)

- Certified Mail: $7.09
- Certified Mail + Return Receipt: $9.94
- Priority Mail Express: $28.75

## What Is Included

- Document analysis
- Relationship classification
- Evidence checklist
- Response letter drafting
- Cover letter drafting
- Evidence index
- Discrepancy explanations
- Certified mailing with tracking
- Proof of delivery

## What Is Not Included

- Legal advice or representation
- Guarantee of approval
- Government filing fees`,
    relatedPages: ['/i-130', '/i-130/how-it-works', '/i-130/evidence'],
    keywordCluster: ['i-130 response cost', 'i-130 service price', 'i-130 response fee', 'how much i-130 response'],
  },
  {
    slug: 'documents',
    path: '/i-130/documents',
    title: 'I-130 Document Requirements | Immigration Mail',
    description: 'A complete guide to documents needed for an I-130 family petition response.',
    h1: 'I-130 Document Requirements',
    canonical: 'https://immigrationmail.com/i-130/documents',
    breadcrumbs: [{ label: 'Home', path: '/' }, { label: 'I-130', path: '/i-130' }, { label: 'Documents', path: '/i-130/documents' }],
    content: `## Primary Documents

### For the Petitioner

- Proof of U.S. citizenship (birth certificate, passport, naturalization certificate) or LPR status (green card)
- Government-issued photo ID

### For the Beneficiary

- Passport
- Government-issued ID
- Birth certificate

## Relationship Documents

### Spouse

- Marriage certificate
- Divorce decrees / death certificates for all prior marriages

### Parent/Child

- Birth certificates establishing the relationship
- Adoption records (if applicable)

### Sibling

- Birth certificates showing common parent(s)
- Name change records (if applicable)

## Supporting Documents

- Certified English translations for all foreign-language documents
- Evidence of bona fide marriage (spouse cases)
- Photographs, correspondence, financial records`,
    relatedPages: ['/i-130', '/i-130/evidence', '/i-130/translations', '/i-130/checklist'],
    keywordCluster: ['i-130 documents', 'i-130 required documents', 'i-130 what to submit', 'i-130 filing documents'],
  },
  {
    slug: 'how-mailing-works',
    path: '/i-130/how-mailing-works',
    title: 'How I-130 Response Mailing Works | Immigration Mail',
    description: 'How we mail your I-130 response with certified mail, tracking, and proof of delivery.',
    h1: 'How I-130 Response Mailing Works',
    canonical: 'https://immigrationmail.com/i-130/how-mailing-works',
    breadcrumbs: [{ label: 'Home', path: '/' }, { label: 'I-130', path: '/i-130' }, { label: 'How Mailing Works', path: '/i-130/how-mailing-works' }],
    content: `## Certified Mail with Tracking

Your I-130 response is mailed via USPS Certified Mail. You receive a tracking number and can monitor delivery status.

## Proof of Delivery

We preserve the tracking number, delivery confirmation, return receipt (if selected), and a digital record of your packet.

## Mailing Timeline

- Your packet is mailed within 1 business day of approval and payment
- Certified mail typically arrives in 3-5 business days
- You receive tracking information immediately after mailing

## Why This Matters

Proof of timely delivery is critical. If USCIS claims your response was not received or was late, you have documentation showing otherwise.`,
    relatedPages: ['/i-130', '/i-130/pricing', '/i-130/how-it-works'],
    keywordCluster: ['i-130 mailing', 'mail i-130 response', 'certified mail i-130', 'i-130 proof of delivery'],
  },
];

export function findI130Page(path: string): I130Page | undefined {
  if (path === '/i-130') return I130_LANDING_PAGE;
  return I130_SUPPORTING_PAGES.find(p => p.path === path);
}

export const ALL_I130_PAGES = [I130_LANDING_PAGE, ...I130_SUPPORTING_PAGES];
