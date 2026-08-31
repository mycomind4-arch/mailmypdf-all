/**
 * RFE Content & SEO Architecture
 *
 * Structured content for the RFE knowledge hub:
 * - Landing page (/rfe)
 * - Supporting pages (what-is, how-to-respond, deadline, evidence, etc.)
 * - FAQ schema for structured data
 * - Keyword cluster metadata
 * - Canonical URLs
 * - Breadcrumbs
 * - Internal linking
 *
 * Content is genuinely useful — not keyword spam.
 * Every page answers the user's actual question.
 */

export interface SEOPage {
  slug: string;
  path: string;
  title: string;
  description: string;
  canonical: string;
  h1: string;
  keywords: string[];
  breadcrumbs: { label: string; path: string }[];
  faqSchema?: { question: string; answer: string }[];
  relatedPages: string[];
  content: string;
  contentEs?: string;
}

// ─── Landing Page ────────────────────────────────────────────────────────────

export const RFE_LANDING_PAGE: SEOPage = {
  slug: 'rfe',
  path: '/rfe',
  title: 'USCIS Request for Evidence (RFE) — Understand, Respond & Mail',
  description: 'Received a USCIS Request for Evidence? Upload your letter, understand what USCIS is asking, organize your evidence, prepare your response, and mail it — all in one place.',
  canonical: '/rfe',
  h1: 'Received a USCIS Request for Evidence?',
  keywords: ['rfe uscis', 'request for evidence', 'uscis rfe', 'rfe response', 'responding to rfe', 'what is an rfe', 'rfe response deadline'],
  breadcrumbs: [{ label: 'Home', path: '/' }, { label: 'RFE', path: '/rfe' }],
  relatedPages: ['/rfe/what-is-an-rfe', '/rfe/how-to-respond', '/rfe/deadline', '/rfe/evidence', '/rfe/pricing'],
  faqSchema: [
    { question: 'What is a USCIS RFE?', answer: 'A Request for Evidence (RFE) is a letter from USCIS asking you to submit additional documents or information to support your immigration application. It means USCIS is still reviewing your case and needs more information to make a decision.' },
    { question: 'Does an RFE mean my case will be denied?', answer: 'No. An RFE means USCIS needs more information before deciding. Many applications that receive RFEs are ultimately approved once the requested evidence is provided.' },
    { question: 'What happens if I do not respond to an RFE?', answer: 'If you do not respond by the deadline, USCIS may deny your application based on the evidence they already have. You would then need to file a motion to reopen or appeal, which is more difficult and costly.' },
    { question: 'How do I find the RFE deadline?', answer: 'The response deadline is printed on your RFE notice, usually in a highlighted section near the top. It is typically 30, 60, or 87 days from the date of the notice. The exact date will be stated — do not calculate it yourself.' },
    { question: 'Can I respond to an RFE online?', answer: 'Some RFEs can be responded to online through your myUSCIS account, while others require mailing physical documents. The RFE itself will state whether online response is available and provide instructions.' },
    { question: 'How much does it cost to respond to an RFE?', answer: 'There is no USCIS fee to respond to an RFE. However, you may need to pay for obtaining documents (like translations or medical exams) and for mailing. Immigration Mail charges a service fee for document preparation and mailing assistance.' },
    { question: 'Should I include a cover letter with my RFE response?', answer: 'Yes. A cover letter helps USCIS understand what you are submitting and why. It should reference your receipt number, list the enclosed documents, and briefly address each item requested in the RFE.' },
  ],
  content: `Received a USCIS Request for Evidence?

We will help you understand what USCIS is asking, organize your evidence, prepare your response, and mail it.

## What is a USCIS RFE?

A Request for Evidence (RFE) is a letter from U.S. Citizenship and Immigration Services asking you to submit additional documents or information to support your immigration application. It means USCIS is still reviewing your case and needs more information to make a decision.

An RFE is not a denial. It is an opportunity to strengthen your case.

## Why did USCIS send an RFE?

USCIS sends an RFE when they need more evidence to determine whether you qualify for the immigration benefit you requested. Common reasons include:

- Missing documents from your original filing
- Documents that need to be updated (e.g., expired medical exam)
- Insufficient proof of a relationship, income, or eligibility
- Need for certified translations of foreign-language documents
- Clarification of discrepancies in your application

## Does an RFE mean my case will be denied?

No. An RFE means USCIS is giving you a chance to provide more evidence before they make a decision. Many applications that receive RFEs are approved once the requested evidence is submitted.

## What happens if I do not respond?

If you do not respond by the deadline, USCIS may deny your application based on the evidence they already have. This denial could be difficult to undo.

## How do I find the deadline?

The response deadline is printed on your RFE notice. It is usually 30, 60, or 87 days from the date of the notice. The exact date will be stated in the letter — do not calculate it yourself.

## How do I respond?

1. Read the RFE carefully to understand what is being requested.
2. Gather the requested documents.
3. Write a cover letter referencing your receipt number.
4. Organize documents clearly with an evidence index.
5. Mail your response to the address listed on the RFE.
6. Use certified mail to preserve proof of delivery.

## What documents do I need?

The RFE will list exactly what documents USCIS needs. Common requests include passports, birth certificates, marriage certificates, tax returns, medical exams, and certified translations.

## What if I do not have the requested evidence?

If you cannot obtain a requested document, explain why in your cover letter and provide alternative evidence if possible. USCIS may consider alternative evidence in some cases.

## What if the RFE is wrong?

If you believe the RFE was issued in error (e.g., you already submitted the requested documents), you can explain this in your response with evidence of your prior submission.

## Can I respond online or do I have to mail it?

Some RFEs can be responded to online through your myUSCIS account. The RFE itself will state whether online response is available. If physical documents are required (like a sealed medical envelope), you must mail them.

## Should I include a cover letter?

Yes. A cover letter helps USCIS understand what you are submitting. Reference your receipt number, list enclosed documents, and briefly address each RFE item.

## How should documents be organized?

Use a cover letter, an evidence index listing each document, paperclips (not staples), and two-hole punching at the top of each page. Label each exhibit.

## What if my RFE concerns a specific form?

Different form types (I-485, I-130, I-140, H-1B, I-751, medical) have different evidence requirements. Upload your RFE and we will identify the form type and tailor our guidance.

## What if I missed the deadline?

If you missed the deadline, your application may have been denied. You may be able to file a motion to reopen (Form I-290B) or refile the application. Consider consulting an immigration attorney.

## What if I already sent something?

If you already sent some documents, mention this in your cover letter and include copies of what you sent. USCIS may still need additional evidence.

## What if I received multiple RFEs?

If you received multiple RFEs, respond to each one separately. Each RFE will have its own deadline and list of requested items.

## What if USCIS sent the RFE to an old address?

If USCIS sent the RFE to an old address, you may not have received it. Update your address with USCIS immediately (Form AR-11) and check your case status online.

## How can I prove that I responded?

Use certified mail with a return receipt. This gives you a tracking number and proof of delivery. Keep copies of everything you send.

## Why use Immigration Mail?

We help you understand your RFE, organize your evidence, prepare your response, and mail it — with proof of delivery. You stay in control and approve everything before it is sent.

## What information do I need to get started?

You need your RFE letter and any documents you think might be relevant. If you do not have all the documents, you can still start — we will help you identify what is missing.`,
  contentEs: `¿Recibió una Solicitud de Evidencia de USCIS?

Le ayudaremos a entender lo que USCIS está pidiendo, organizar su evidencia, preparar su respuesta y enviarla por correo.

## ¿Qué es un RFE de USCIS?

Una Solicitud de Evidencia (RFE) es una carta de los Servicios de Ciudadanía e Inmigración de EE.UU. pidiéndole que presente documentos o información adicional para respaldar su solicitud de inmigración. Significa que USCIS aún está revisando su caso y necesita más información para tomar una decisión.

Un RFE no es una denegación. Es una oportunidad para fortalecer su caso.`,
};

// ─── Supporting Pages ────────────────────────────────────────────────────────

export const RFE_SUPPORTING_PAGES: SEOPage[] = [
  {
    slug: 'what-is-an-rfe',
    path: '/rfe/what-is-an-rfe',
    title: 'What is a USCIS Request for Evidence (RFE)?',
    description: 'A plain-language explanation of what an RFE is, why USCIS sends it, and what it means for your immigration case.',
    canonical: '/rfe/what-is-an-rfe',
    h1: 'What is a Request for Evidence?',
    keywords: ['what is an rfe', 'what is a request for evidence', 'uscis rfe meaning', 'rfe immigration'],
    breadcrumbs: [{ label: 'Home', path: '/' }, { label: 'RFE', path: '/rfe' }, { label: 'What is an RFE', path: '/rfe/what-is-an-rfe' }],
    relatedPages: ['/rfe/how-to-respond', '/rfe/deadline', '/rfe/evidence'],
    faqSchema: [
      { question: 'What does RFE stand for?', answer: 'RFE stands for Request for Evidence. It is a formal letter from USCIS requesting additional documents or information.' },
      { question: 'Is an RFE the same as a denial?', answer: 'No. An RFE is not a denial. It is a request for more information before a decision is made.' },
    ],
    content: `A Request for Evidence (RFE) is a formal letter from U.S. Citizenship and Immigration Services asking you to provide additional documents or information to support your immigration application.

## What it means

When USCIS receives your application, they review it to determine if you qualify. If they need more evidence to make a decision, they send an RFE. This is a normal part of the process and does not mean your case is in trouble.

## What an RFE includes

An RFE typically includes:
- Your name and receipt number
- The form type (e.g., I-485, I-130)
- A list of specific documents or information requested
- A response deadline (usually 30-87 days)
- Instructions on where to send your response
- The consequences of not responding

## What an RFE does NOT mean

- It is not a denial
- It does not mean your application is doomed
- It does not mean USCIS suspects fraud
- It simply means they need more information

## How to get started

Upload your RFE and we will read it, explain what USCIS is asking for, and help you build your response.`,
  },
  {
    slug: 'how-to-respond',
    path: '/rfe/how-to-respond',
    title: 'How to Respond to a USCIS RFE — Step by Step',
    description: 'A clear, step-by-step guide to responding to a USCIS Request for Evidence, from reading the letter to mailing your response.',
    canonical: '/rfe/how-to-respond',
    h1: 'How to Respond to an RFE',
    keywords: ['how to respond to rfe', 'rfe response', 'responding to rfe', 'rfe response letter', 'rfe response steps'],
    breadcrumbs: [{ label: 'Home', path: '/' }, { label: 'RFE', path: '/rfe' }, { label: 'How to Respond', path: '/rfe/how-to-respond' }],
    relatedPages: ['/rfe/cover-letter', '/rfe/evidence', '/rfe/deadline', '/rfe/checklist'],
    faqSchema: [
      { question: 'How do I respond to an RFE?', answer: 'Read the RFE, gather the requested documents, write a cover letter, organize everything with an evidence index, and mail it to the address on the notice before the deadline.' },
      { question: 'How long do I have to respond to an RFE?', answer: 'The deadline is stated on the RFE, typically 30, 60, or 87 days. Do not calculate it yourself — the notice states the actual date.' },
    ],
    content: `Responding to an RFE involves several steps. Here is how to do it.

## Step 1: Read the RFE carefully

Read the entire notice. Identify:
- The deadline
- What documents or information USCIS is requesting
- Where to send your response
- Any special instructions (e.g., sealed medical envelope)

## Step 2: Gather the requested documents

For each item listed in the RFE:
- Locate the document
- Ensure it is current and legible
- Get certified translations for foreign-language documents
- Make copies (keep originals unless USCIS asks for them)

## Step 3: Write a cover letter

Your cover letter should:
- Reference your receipt number
- List each enclosed document
- Briefly address each RFE item
- Explain any missing or substitute evidence

## Step 4: Organize your documents

- Place the cover letter first
- Create an evidence index listing each document
- Label each exhibit (Exhibit A, B, C, etc.)
- Use paperclips, not staples
- Use two-hole punching at the top of each page

## Step 5: Mail your response

- Send to the address listed on the RFE
- Use certified mail with return receipt
- Mail well before the deadline (at least one week early)
- Keep copies of everything

## Step 6: Preserve proof

- Keep the certified mail receipt
- Keep the return receipt when it comes back
- Keep copies of all documents sent

Upload your RFE and we will walk you through each step automatically.`,
  },
  {
    slug: 'deadline',
    path: '/rfe/deadline',
    title: 'RFE Response Deadline — How to Find It and What It Means',
    description: 'Understand your RFE deadline, how to find it on the notice, what happens if you miss it, and what to do if the deadline is near.',
    canonical: '/rfe/deadline',
    h1: 'Your RFE Deadline',
    keywords: ['rfe response deadline', 'rfe deadline', 'uscis rfe deadline', 'rfe due date', 'how long to respond to rfe'],
    breadcrumbs: [{ label: 'Home', path: '/' }, { label: 'RFE', path: '/rfe' }, { label: 'Deadline', path: '/rfe/deadline' }],
    relatedPages: ['/rfe/missed-deadline', '/rfe/how-to-respond', '/rfe/how-mailing-works'],
    faqSchema: [
      { question: 'How long do I have to respond to an RFE?', answer: 'The deadline is stated on the RFE, typically 30, 60, or 87 days from the date of the notice. The exact date will be printed on the letter.' },
      { question: 'Can I get an extension on my RFE deadline?', answer: 'USCIS rarely grants extensions. You must respond by the deadline or risk denial. In very limited circumstances, you can request an extension, but it is not guaranteed.' },
    ],
    content: `Your RFE deadline is the most important date on the notice. Missing it can result in automatic denial.

## Where to find the deadline

The deadline is printed on the RFE notice, usually in a highlighted section. It will state the exact date (e.g., "You must respond no later than December 15, 2026") and may also state the number of days (e.g., "within 87 days of the date of this notice").

## How deadlines work

USCIS deadlines are strict. Your response must be received (not just postmarked) by the deadline in most cases. Do not wait until the last day.

## Common deadline periods

- 30 days (for simpler requests)
- 60 days (standard)
- 87 days (for more complex requests, like medical exams)

## If the deadline is near

If your deadline is approaching:
- Mail your response immediately using expedited mail
- Do not wait for additional documents you do not have
- Include what you have and explain what is missing

## If you missed the deadline

If you missed the deadline, your application may have been denied. You may be able to file a motion to reopen (Form I-290B) within 30 days of the denial. Consider consulting an immigration attorney.

Upload your RFE and we will extract the deadline for you automatically.`,
  },
  {
    slug: 'evidence',
    path: '/rfe/evidence',
    title: 'RFE Evidence — What to Submit and How to Organize It',
    description: 'Learn what evidence USCIS may request in an RFE, how to organize your documents, and what to do if you do not have everything.',
    canonical: '/rfe/evidence',
    h1: 'RFE Evidence Guide',
    keywords: ['rfe evidence', 'rfe documents', 'what documents for rfe', 'rfe evidence checklist', 'organize rfe evidence'],
    breadcrumbs: [{ label: 'Home', path: '/' }, { label: 'RFE', path: '/rfe' }, { label: 'Evidence', path: '/rfe/evidence' }],
    relatedPages: ['/rfe/checklist', '/rfe/not-enough-evidence', '/rfe/how-to-respond', '/rfe/cover-letter'],
    faqSchema: [
      { question: 'What documents do I need for an RFE?', answer: 'The RFE itself lists exactly what documents USCIS needs. Common requests include passports, birth certificates, marriage certificates, tax returns, medical exams, and certified translations.' },
      { question: 'What if I do not have a requested document?', answer: 'Explain why you cannot obtain it in your cover letter and provide alternative evidence if possible. USCIS may consider substitutes in some cases.' },
    ],
    content: `The RFE lists exactly what evidence USCIS needs. Here is how to handle it.

## Common evidence types

- **Identity documents**: Passports, birth certificates, national IDs
- **Relationship evidence**: Marriage certificates, photos, joint accounts
- **Financial evidence**: Tax returns, pay stubs, bank statements
- **Employment evidence**: Employment letters, offer letters, pay records
- **Medical evidence**: Form I-693 in a sealed envelope
- **Educational evidence**: Degrees, transcripts, credential evaluations
- **Translations**: Certified English translations of all foreign-language documents

## How to organize

1. Cover letter (with receipt number)
2. Evidence index listing each document
3. Documents in the order requested in the RFE
4. Each document labeled (Exhibit A, B, C...)
5. Paperclips, not staples
6. Two-hole punching at top

## What if I do not have a document?

If you cannot obtain a requested document:
- Explain why in your cover letter
- Provide alternative evidence if possible
- Do not submit irrelevant documents as substitutes

## Certified translations

Any document not in English must include a certified translation. The translator must sign a statement that they are competent to translate and that the translation is accurate.

Upload your RFE and we will create a customized evidence checklist for you.`,
  },
  {
    slug: 'cover-letter',
    path: '/rfe/cover-letter',
    title: 'RFE Cover Letter — How to Write One with Example',
    description: 'A guide to writing an effective RFE cover letter, with an example template and tips for addressing each requested item.',
    canonical: '/rfe/cover-letter',
    h1: 'RFE Cover Letter Guide',
    keywords: ['rfe cover letter', 'cover letter for rfe', 'rfe response cover letter', 'uscis rfe cover letter template'],
    breadcrumbs: [{ label: 'Home', path: '/' }, { label: 'RFE', path: '/rfe' }, { label: 'Cover Letter', path: '/rfe/cover-letter' }],
    relatedPages: ['/rfe/response-letter', '/rfe/how-to-respond', '/rfe/evidence'],
    faqSchema: [
      { question: 'Do I need a cover letter for my RFE response?', answer: 'Yes. A cover letter helps USCIS understand what you are submitting and why. It should reference your receipt number and list each enclosed document.' },
    ],
    content: `A cover letter is essential for your RFE response. It tells USCIS exactly what you are sending and why.

## What to include

- Your name and the beneficiary's name (if different)
- Your receipt number
- The form type (e.g., I-485)
- A list of enclosed documents
- A brief response to each RFE item
- Your contact information
- Your signature

## Example template

Dear U.S. Citizenship and Immigration Services,

I am writing in response to the Request for Evidence received regarding my [Form type] application (Receipt: [number]).

Please find enclosed the following documents:

1. [Document name] — In response to Item 1
2. [Document name] — In response to Item 2
3. [Document name] — In response to Item 3

Respectfully submitted,
[Your name, address, phone, email]

## Tips

- Keep it concise
- Reference each RFE item by number
- Explain any missing or substitute evidence
- Do not make legal arguments — stick to facts

Upload your RFE and we will generate a customized cover letter for you.`,
  },
  {
    slug: 'response-letter',
    path: '/rfe/response-letter',
    title: 'RFE Response Letter — How to Write It and What to Include',
    description: 'How to write a complete RFE response letter that addresses every item USCIS requested.',
    canonical: '/rfe/response-letter',
    h1: 'RFE Response Letter',
    keywords: ['rfe response letter', 'rfe response template', 'how to write rfe response', 'uscis rfe response letter'],
    breadcrumbs: [{ label: 'Home', path: '/' }, { label: 'RFE', path: '/rfe' }, { label: 'Response Letter', path: '/rfe/response-letter' }],
    relatedPages: ['/rfe/cover-letter', '/rfe/how-to-respond', '/rfe/examples'],
    faqSchema: [
      { question: 'What is the difference between a cover letter and a response letter?', answer: 'A cover letter is a brief transmittal that lists enclosed documents. A response letter addresses the substance of each RFE item, explaining what evidence you are providing and why.' },
    ],
    content: `Your RFE response letter addresses the substance of each item USCIS requested.

## Structure

RE: Response to Request for Evidence — [Form type] — Receipt: [number]

Dear U.S. Citizenship and Immigration Services,

I am submitting this response to the Request for Evidence issued by your office.

**Regarding Item 1:** [Explanation and reference to enclosed evidence]

**Regarding Item 2:** [Explanation and reference to enclosed evidence]

**Regarding Item 3:** [Explanation and reference to enclosed evidence]

Respectfully submitted,
[Your name]

## Key principles

- Address every item requested
- Reference specific enclosed documents
- Do not make unsupported legal claims
- Be honest about what you can and cannot provide
- Keep it professional and concise

Upload your RFE and we will generate a complete response letter addressing each item.`,
  },
  {
    slug: 'missed-deadline',
    path: '/rfe/missed-deadline',
    title: 'Missed Your RFE Deadline? What to Do Next',
    description: 'If you missed your USCIS RFE deadline, learn your options including motions to reopen, refiling, and when to consult an attorney.',
    canonical: '/rfe/missed-deadline',
    h1: 'Missed Your RFE Deadline?',
    keywords: ['missed rfe deadline', 'rfe deadline passed', 'uscis rfe missed', 'motion to reopen rfe', 'rfe late response'],
    breadcrumbs: [{ label: 'Home', path: '/' }, { label: 'RFE', path: '/rfe' }, { label: 'Missed Deadline', path: '/rfe/missed-deadline' }],
    relatedPages: ['/rfe/deadline', '/rfe/how-to-respond', '/rfe/faq'],
    faqSchema: [
      { question: 'What happens if I miss my RFE deadline?', answer: 'USCIS may deny your application. You may be able to file a motion to reopen (Form I-290B) within 30 days, or refile the application.' },
      { question: 'Can I still submit my RFE response after the deadline?', answer: 'USCIS may still accept a late response in limited circumstances, but it is not guaranteed. It is better to respond on time.' },
    ],
    content: `Missing your RFE deadline is serious, but you still have options.

## What likely happened

If you missed the deadline, USCIS likely denied your application based on the evidence they already had. You should receive a denial notice explaining the decision.

## Your options

### 1. File a motion to reopen (Form I-290B)

You can file a motion to reopen within 30 days of the denial (33 days if by mail). You must explain why you missed the deadline and include the requested evidence. There is a filing fee ($675 as of 2025, subject to change).

### 2. Refile the application

You can refile the entire application with the correct evidence. This means starting over and paying the filing fee again.

### 3. Consult an immigration attorney

If you missed the deadline, an attorney can help you determine the best path forward, especially if you had a good reason for missing it (e.g., you never received the RFE).

## If you never received the RFE

If USCIS sent the RFE to an old address, you may not have received it. Update your address with USCIS (Form AR-11) and check your case status online. You may have grounds for a motion to reopen.`,
  },
  {
    slug: 'not-enough-evidence',
    path: '/rfe/not-enough-evidence',
    title: 'What If You Do Not Have the Requested Evidence?',
    description: 'Strategies for responding to an RFE when you cannot obtain all the requested documents, including alternative evidence and explanations.',
    canonical: '/rfe/not-enough-evidence',
    h1: 'What If You Do Not Have the Evidence?',
    keywords: ['rfe not enough evidence', 'rfe missing documents', 'cannot provide evidence rfe', 'alternative evidence rfe'],
    breadcrumbs: [{ label: 'Home', path: '/' }, { label: 'RFE', path: '/rfe' }, { label: 'Not Enough Evidence', path: '/rfe/not-enough-evidence' }],
    relatedPages: ['/rfe/evidence', '/rfe/cover-letter', '/rfe/how-to-respond'],
    faqSchema: [
      { question: 'What if I do not have a document USCIS is requesting?', answer: 'Explain why in your cover letter and provide alternative evidence if possible. Do not submit irrelevant documents or leave the request unanswered.' },
    ],
    content: `Not having every requested document does not mean your case is lost. Here is what to do.

## Be honest

Never fabricate or alter documents. This is fraud and can result in permanent immigration consequences.

## Explain why

In your cover letter, explain clearly why you cannot provide a specific document. Valid reasons include:
- The document was lost or destroyed
- The issuing authority cannot provide it
- The document is from a country with limited document access
- You are still trying to obtain it

## Provide alternative evidence

If you cannot provide the exact document, provide alternative evidence that serves the same purpose:
- Instead of a birth certificate: baptismal records, school records, or affidavits from family members
- Instead of a marriage certificate: photos, joint accounts, shared lease
- Instead of tax transcripts: pay stubs, employer letters, bank statements

## Partial responses

If you have some but not all evidence, submit what you have with an explanation. A partial response is better than no response.

## When to get help

If you are missing critical evidence, consider consulting an immigration attorney who can advise on alternative strategies.`,
  },
  {
    slug: 'medical',
    path: '/rfe/medical',
    title: 'Medical RFE — Form I-693 and Vaccination Requirements',
    description: 'How to respond to a medical RFE, including Form I-693 requirements, sealed envelopes, and common issues.',
    canonical: '/rfe/medical',
    h1: 'Medical RFE Guide',
    keywords: ['medical rfe', 'i-693 rfe', 'uscis medical examination', 'rfe medical exam', 'vaccination rfe'],
    breadcrumbs: [{ label: 'Home', path: '/' }, { label: 'RFE', path: '/rfe' }, { label: 'Medical RFE', path: '/rfe/medical' }],
    relatedPages: ['/rfe/evidence', '/rfe/how-to-respond', '/rfe/i-485'],
    faqSchema: [
      { question: 'What is Form I-693?', answer: 'Form I-693 is the Report of Medical Examination and Vaccination Record. It must be completed by a USCIS-designated civil surgeon and submitted in a sealed envelope.' },
      { question: 'Can I open the sealed medical envelope?', answer: 'No. If you open the sealed envelope, USCIS will not accept it. You must submit it exactly as the civil surgeon gave it to you.' },
    ],
    content: `A medical RFE asks you to submit Form I-693 (Medical Examination and Vaccination Record) or additional medical evidence.

## Form I-693 basics

- Must be completed by a USCIS-designated civil surgeon (not your regular doctor)
- Must be submitted in a sealed, signed envelope
- Must not be opened by you — USCIS will reject it if opened
- Includes vaccination records and test results

## Common medical RFE issues

- Missing vaccinations (you may need to get additional shots)
- Expired medical exam (exams are valid for 2 years)
- Incomplete form (the civil surgeon missed a section)
- Missing vaccination supplement

## How to respond

1. Find a USCIS-designated civil surgeon near you
2. Bring your vaccination records and the RFE notice
3. The civil surgeon completes Form I-693
4. They seal it in an envelope and sign across the seal
5. Submit the unopened envelope with your RFE response

## Important

- Do NOT open the sealed envelope
- Do NOT make copies of the sealed form
- Submit the original sealed envelope
- Include a cover letter referencing your receipt number`,
  },
  {
    slug: 'i-485',
    path: '/rfe/i-485',
    title: 'I-485 RFE — Adjustment of Status Request for Evidence',
    description: 'Common RFEs for Form I-485 (Adjustment of Status) applications, including medical exams, birth certificates, and financial evidence.',
    canonical: '/rfe/i-485',
    h1: 'I-485 RFE Guide',
    keywords: ['i-485 rfe', 'adjustment of status rfe', 'green card rfe', 'i-485 request for evidence', 'i-485 rfe medical'],
    breadcrumbs: [{ label: 'Home', path: '/' }, { label: 'RFE', path: '/rfe' }, { label: 'I-485 RFE', path: '/rfe/i-485' }],
    relatedPages: ['/rfe/medical', '/rfe/evidence', '/rfe/green-card', '/rfe/how-to-respond'],
    faqSchema: [
      { question: 'What are common I-485 RFE reasons?', answer: 'Common reasons include missing Form I-693 medical exam, missing or insufficient Affidavit of Support (I-864), birth certificate issues, and missing photographs.' },
    ],
    content: `Form I-485 (Application to Register Permanent Residence or Adjust Status) is one of the most common forms to receive an RFE.

## Common I-485 RFE requests

- **Medical examination (Form I-693)**: Must be in a sealed envelope from a civil surgeon
- **Birth certificate**: With certified English translation if not in English
- **Affidavit of Support (Form I-864)**: Proof of financial sponsorship
- **Passport-style photographs**: As specified in the instructions
- **Marriage certificate**: If applying through marriage
- **Proof of lawful entry**: I-94, passport stamps, or parole documents
- **Medical vaccination supplement**: Updated vaccination records

## How to respond

1. Read the RFE to identify exactly which items are requested
2. Gather the documents
3. Get certified translations for foreign-language documents
4. Write a cover letter referencing your receipt number
5. Organize documents with an evidence index
6. Mail with certified mail before the deadline

Upload your I-485 RFE and we will identify what USCIS is asking for and create a customized checklist.`,
  },
  {
    slug: 'i-130',
    path: '/rfe/i-130',
    title: 'I-130 RFE — Family Petition Request for Evidence',
    description: 'Common RFEs for Form I-130 family petition applications, including relationship evidence and beneficiary documentation.',
    canonical: '/rfe/i-130',
    h1: 'I-130 RFE Guide',
    keywords: ['i-130 rfe', 'family petition rfe', 'i-130 request for evidence', 'i-130 rfe evidence', 'marriage petition rfe'],
    breadcrumbs: [{ label: 'Home', path: '/' }, { label: 'RFE', path: '/rfe' }, { label: 'I-130 RFE', path: '/rfe/i-130' }],
    relatedPages: ['/rfe/evidence', '/rfe/green-card', '/rfe/how-to-respond'],
    faqSchema: [
      { question: 'What are common I-130 RFE reasons?', answer: 'Common reasons include insufficient proof of relationship (marriage, birth), missing beneficiary documents, and missing petitioner status evidence.' },
    ],
    content: `Form I-130 (Petition for Alien Relative) RFEs usually ask for proof of the relationship between the petitioner and beneficiary.

## Common I-130 RFE requests

- **Proof of relationship**: Marriage certificate, birth certificate, photos, joint accounts
- **Proof of petitioner's citizenship**: U.S. passport, birth certificate, or naturalization certificate
- **Beneficiary documents**: Passport, birth certificate, national ID
- **Marriage evidence**: Joint bank accounts, lease, photos, affidavits from family and friends
- **Prior marriage termination**: Divorce decrees or death certificates
- **Certified translations**: For all foreign-language documents

## Tips for I-130 RFE responses

- Provide original or certified copies of relationship documents
- Include multiple types of evidence for relationships (not just one document)
- For marriage cases, show the marriage is bona fide (real, not just for immigration)
- Label each document as an exhibit

Upload your I-130 RFE and we will create a customized response plan.`,
  },
  {
    slug: 'i-140',
    path: '/rfe/i-140',
    title: 'I-140 RFE — Employment Petition Request for Evidence',
    description: 'Common RFEs for Form I-140 employment-based immigration petitions, including ability to pay and credential evaluations.',
    canonical: '/rfe/i-140',
    h1: 'I-140 RFE Guide',
    keywords: ['i-140 rfe', 'employment petition rfe', 'i-140 request for evidence', 'ability to pay rfe', 'eb rfe'],
    breadcrumbs: [{ label: 'Home', path: '/' }, { label: 'RFE', path: '/rfe' }, { label: 'I-140 RFE', path: '/rfe/i-140' }],
    relatedPages: ['/rfe/evidence', '/rfe/h-1b', '/rfe/how-to-respond'],
    faqSchema: [
      { question: 'What are common I-140 RFE reasons?', answer: 'Common reasons include employer ability to pay, beneficiary qualifications, credential evaluations, and insufficient evidence of the position requirements.' },
    ],
    content: `Form I-140 (Immigrant Petition for Alien Worker) RFEs typically focus on the employer's ability to pay and the beneficiary's qualifications.

## Common I-140 RFE requests

- **Employer ability to pay**: Tax returns, financial statements, proof of income
- **Beneficiary qualifications**: Degrees, transcripts, credential evaluations
- **Position requirements**: Job description, industry standards, precedent cases
- **Credential evaluations**: For foreign education equivalency
- **Experience letters**: From previous employers
- **Company information**: Business formation documents, number of employees

## EB categories

Different employment-based categories have different evidence requirements:
- **EB-1**: Extraordinary ability, outstanding researcher
- **EB-2**: Advanced degree, national interest waiver
- **EB-3**: Skilled worker, professional

Upload your I-140 RFE and we will identify the specific category and requirements.`,
  },
  {
    slug: 'i-751',
    path: '/rfe/i-751',
    title: 'I-751 RFE — Removal of Conditions Request for Evidence',
    description: 'Common RFEs for Form I-751 (Removal of Conditions on Permanent Residence), including bona fide marriage evidence.',
    canonical: '/rfe/i-751',
    h1: 'I-751 RFE Guide',
    keywords: ['i-751 rfe', 'removal of conditions rfe', 'i-751 request for evidence', 'conditional resident rfe', 'i-751 evidence'],
    breadcrumbs: [{ label: 'Home', path: '/' }, { label: 'RFE', path: '/rfe' }, { label: 'I-751 RFE', path: '/rfe/i-751' }],
    relatedPages: ['/rfe/evidence', '/rfe/green-card', '/rfe/how-to-respond'],
    faqSchema: [
      { question: 'What are common I-751 RFE reasons?', answer: 'Common reasons include insufficient evidence of a bona fide marriage, missing joint documents, and incomplete financial evidence.' },
    ],
    content: `Form I-751 (Petition to Remove Conditions on Permanent Residence) RFEs usually ask for more evidence that your marriage was entered in good faith.

## Common I-751 RFE requests

- **Bona fide marriage evidence**: Joint bank accounts, leases, insurance, photos
- **Financial commingling**: Joint tax returns, shared assets
- **Birth certificates of children**: If applicable
- **Affidavits**: From friends and family who can attest to the marriage
- **Proof of cohabitation**: Utility bills, mail at the same address

## Tips for I-751 responses

- Provide multiple types of evidence showing a shared life
- Include documents spanning the entire marriage period
- Organize chronologically
- Label and explain each document

Upload your I-751 RFE and we will create a customized evidence checklist.`,
  },
  {
    slug: 'h-1b',
    path: '/rfe/h-1b',
    title: 'H-1B RFE — Specialty Occupation Request for Evidence',
    description: 'Common RFEs for H-1B (I-129) petitions, including specialty occupation, employer-employee relationship, and wage requirements.',
    canonical: '/rfe/h-1b',
    h1: 'H-1B RFE Guide',
    keywords: ['h-1b rfe', 'h1b rfe', 'specialty occupation rfe', 'i-129 rfe', 'h-1b request for evidence'],
    breadcrumbs: [{ label: 'Home', path: '/' }, { label: 'RFE', path: '/rfe' }, { label: 'H-1B RFE', path: '/rfe/h-1b' }],
    relatedPages: ['/rfe/i-140', '/rfe/evidence', '/rfe/how-to-respond'],
    faqSchema: [
      { question: 'What are common H-1B RFE reasons?', answer: 'Common reasons include specialty occupation qualification, employer-employee relationship, beneficiary qualifications, and wage level disputes.' },
    ],
    content: `H-1B (Form I-129) RFEs are common and often focus on whether the position qualifies as a specialty occupation.

## Common H-1B RFE requests

- **Specialty occupation**: Evidence that the position requires a bachelor's degree
- **Employer-employee relationship**: Proof that the employer has the right to control the employee's work
- **Beneficiary qualifications**: Degree, transcripts, credential evaluation
- **Wage level**: Evidence supporting the wage level on the LCA
- **End-client letter**: If working through a staffing agency
- **Itinerary**: If working at multiple locations

## Tips for H-1B responses

- Provide a detailed job description showing degree requirement
- Include industry evidence showing the position requires specialized knowledge
- If using a staffing model, include end-client letters and organizational charts
- Ensure credential evaluations are from reputable evaluators

Upload your H-1B RFE and we will identify the specific issues raised.`,
  },
  {
    slug: 'green-card',
    path: '/rfe/green-card',
    title: 'Green Card RFE — Common Requests and How to Respond',
    description: 'RFEs related to green card applications, covering I-485, I-130, medical exams, and adjustment of status evidence.',
    canonical: '/rfe/green-card',
    h1: 'Green Card RFE Guide',
    keywords: ['green card rfe', 'green card request for evidence', 'rfe green card', 'adjustment of status rfe'],
    breadcrumbs: [{ label: 'Home', path: '/' }, { label: 'RFE', path: '/rfe' }, { label: 'Green Card RFE', path: '/rfe/green-card' }],
    relatedPages: ['/rfe/i-485', '/rfe/i-130', '/rfe/medical', '/rfe/evidence'],
    faqSchema: [
      { question: 'What is a green card RFE?', answer: 'A green card RFE is a Request for Evidence related to any application that leads to permanent residence, including I-485, I-130, and I-751 applications.' },
    ],
    content: `A green card RFE can come from any of several forms in the green card process. The most common are I-485 (Adjustment of Status) and I-130 (Family Petition).

## Which form received the RFE?

- **I-485** (Adjustment of Status): Usually medical exam, financial evidence
- **I-130** (Family Petition): Usually relationship evidence
- **I-140** (Employment Petition): Usually ability to pay, qualifications
- **I-751** (Removal of Conditions): Usually bona fide marriage evidence

## What to do

1. Identify which form received the RFE
2. Read the specific requests
3. Gather the requested evidence
4. Write a cover letter
5. Organize and mail

Upload your RFE and we will identify the form type and create a customized response plan.`,
  },
  {
    slug: 'examples',
    path: '/rfe/examples',
    title: 'RFE Examples — Common Scenarios and Sample Responses',
    description: 'Real-world RFE examples with explanations of what USCIS asked for and how to respond to each.',
    canonical: '/rfe/examples',
    h1: 'RFE Examples',
    keywords: ['rfe examples', 'sample rfe', 'rfe response examples', 'uscis rfe sample'],
    breadcrumbs: [{ label: 'Home', path: '/' }, { label: 'RFE', path: '/rfe' }, { label: 'Examples', path: '/rfe/examples' }],
    relatedPages: ['/rfe/how-to-respond', '/rfe/cover-letter', '/rfe/evidence'],
    content: `Here are common RFE scenarios and how to approach each.

## Example 1: Missing Medical Exam (I-485)

**What USCIS asks for:** Form I-693 Medical Examination in a sealed envelope.

**How to respond:** Visit a USCIS-designated civil surgeon, complete the exam, and submit the sealed envelope with your response.

## Example 2: Insufficient Marriage Evidence (I-130)

**What USCIS asks for:** Evidence that the marriage was entered in good faith.

**How to respond:** Submit joint bank statements, lease, insurance, photos, and affidavits from friends and family.

## Example 3: Missing Translation

**What USCIS asks for:** Certified English translation of a foreign-language birth certificate.

**How to respond:** Have a competent translator translate the document and sign a certification statement.

## Example 4: Ability to Pay (I-140)

**What USCIS asks for:** Evidence that the employer can pay the offered wage.

**How to respond:** Submit tax returns, financial statements, and payroll records.

Upload your RFE and we will analyze it and create a customized response.`,
  },
  {
    slug: 'checklist',
    path: '/rfe/checklist',
    title: 'RFE Response Checklist — Everything You Need to Submit',
    description: 'A complete checklist for your RFE response, covering documents, cover letter, organization, and mailing.',
    canonical: '/rfe/checklist',
    h1: 'RFE Response Checklist',
    keywords: ['rfe checklist', 'rfe response checklist', 'rfe document checklist', 'what to include in rfe response'],
    breadcrumbs: [{ label: 'Home', path: '/' }, { label: 'RFE', path: '/rfe' }, { label: 'Checklist', path: '/rfe/checklist' }],
    relatedPages: ['/rfe/evidence', '/rfe/cover-letter', '/rfe/how-to-respond', '/rfe/how-mailing-works'],
    faqSchema: [
      { question: 'What should I include in my RFE response?', answer: 'Include a cover letter, all requested documents, an evidence index, and certified translations if applicable. Mail with certified mail and keep proof of delivery.' },
    ],
    content: `Use this checklist to make sure your RFE response is complete.

## Before you mail

- [ ] Read the entire RFE
- [ ] Identify the deadline
- [ ] List all requested items
- [ ] Gather each requested document
- [ ] Get certified translations for foreign-language documents
- [ ] Write a cover letter referencing your receipt number
- [ ] Create an evidence index
- [ ] Label each document (Exhibit A, B, C...)
- [ ] Organize documents in the order requested
- [ ] Use paperclips (not staples)
- [ ] Make copies of everything for your records

## Mailing

- [ ] Use certified mail with return receipt
- [ ] Mail at least one week before the deadline
- [ ] Send to the address listed on the RFE
- [ ] Keep the certified mail receipt

## After mailing

- [ ] Keep the return receipt when it arrives
- [ ] Check your case status online
- [ ] Keep all copies in a safe place

Upload your RFE and we will create this checklist automatically based on what USCIS is asking for.`,
  },
  {
    slug: 'faq',
    path: '/rfe/faq',
    title: 'RFE Frequently Asked Questions',
    description: 'Answers to the most common questions about USCIS Requests for Evidence.',
    canonical: '/rfe/faq',
    h1: 'RFE FAQ',
    keywords: ['rfe faq', 'rfe questions', 'uscis rfe frequently asked questions', 'rfe help'],
    breadcrumbs: [{ label: 'Home', path: '/' }, { label: 'RFE', path: '/rfe' }, { label: 'FAQ', path: '/rfe/faq' }],
    relatedPages: ['/rfe/what-is-an-rfe', '/rfe/how-to-respond', '/rfe/deadline', '/rfe/evidence'],
    faqSchema: [
      { question: 'Is an RFE bad?', answer: 'No. An RFE is a normal part of the process. It means USCIS needs more information, not that your case is being denied.' },
      { question: 'Can I respond to an RFE myself?', answer: 'Yes. You can respond to an RFE without an attorney. However, if your case is complex, an attorney can help.' },
      { question: 'What is the difference between an RFE and a NOID?', answer: 'An RFE asks for more evidence before a decision. A NOID (Notice of Intent to Deny) means USCIS intends to deny your case unless you provide compelling evidence.' },
      { question: 'Does USCIS confirm receipt of my RFE response?', answer: 'USCIS typically updates your case status online when they receive your response. You can also check using your receipt number.' },
      { question: 'How long does it take USCIS to review my RFE response?', answer: 'Processing times vary. Check your case status online and the USCIS processing time estimates for your form type.' },
    ],
    content: `Common questions about USCIS Requests for Evidence.

## Is an RFE bad?

No. An RFE is a normal part of the immigration process. It means USCIS is reviewing your case and needs more information. Many RFE responses lead to approval.

## Can I respond to an RFE myself?

Yes. You can respond without an attorney. However, if your case is complex or you are unsure about the evidence, consulting an attorney is a good idea.

## What is the difference between an RFE and a NOID?

An RFE asks for additional evidence before a decision. A NOID (Notice of Intent to Deny) means USCIS has reviewed your evidence and intends to deny — you get one last chance to respond.

## How long does USCIS take to review my response?

Processing times vary by form type and USCIS office. Check your case status online at USCIS.gov using your receipt number.

## What if I already sent some of the requested documents?

If you already sent documents, mention this in your cover letter and include copies of what you sent. USCIS may still need additional or updated evidence.

## Can I respond online?

Some RFEs can be responded to online through your myUSCIS account. The RFE itself will state whether online response is available.`,
  },
  {
    slug: 'pricing',
    path: '/rfe/pricing',
    title: 'RFE Response Pricing — How Much It Costs',
    description: 'Transparent pricing for RFE response preparation and mailing services. No hidden fees.',
    canonical: '/rfe/pricing',
    h1: 'RFE Response Pricing',
    keywords: ['rfe pricing', 'rfe response cost', 'how much to respond to rfe', 'rfe service price'],
    breadcrumbs: [{ label: 'Home', path: '/' }, { label: 'RFE', path: '/rfe' }, { label: 'Pricing', path: '/rfe/pricing' }],
    relatedPages: ['/rfe/how-mailing-works', '/rfe/how-to-respond'],
    faqSchema: [
      { question: 'Is there a USCIS fee to respond to an RFE?', answer: 'No. There is no USCIS filing fee for an RFE response. You only pay for obtaining documents, mailing, and any services you choose to use.' },
      { question: 'How much does Immigration Mail charge?', answer: 'Our service fee depends on the complexity of your RFE response. We separate the service price from postage — you always know exactly what you are paying for.' },
    ],
    content: `Transparent pricing for RFE response preparation and mailing.

## Service Pricing

We charge a flat service fee based on the complexity of your RFE:

- **Basic** ($39): 1-3 evidence items, simple response
- **Standard** ($59): 4-10 evidence items, standard response
- **Complex** ($99): 10+ evidence items or multiple issues

## Postage (Separate from Service Fee)

Postage is charged at cost — we do not mark it up:

- **First-Class Mail**: From $0.73 (no tracking)
- **Certified Mail**: From $4.85 (includes tracking and proof of mailing)
- **Registered Mail**: From $17.50 (maximum security)

## Optional Add-Ons

- Return Receipt: $2.85
- Restricted Delivery: $7.10
- Insurance: $3.50
- Expedited Review: $20
- Additional Copies: $5

## What is NOT included

- USCIS filing fees (there are none for RFE responses)
- Costs of obtaining documents (medical exams, translations, etc.)
- Legal fees (we are not a law firm)

Upload your RFE and we will determine the complexity and give you an exact price.`,
  },
  {
    slug: 'how-mailing-works',
    path: '/rfe/how-mailing-works',
    title: 'How RFE Mailing Works — From Approval to Proof of Delivery',
    description: 'How Immigration Mail handles the physical mailing of your RFE response, including tracking and proof of delivery.',
    canonical: '/rfe/how-mailing-works',
    h1: 'How Mailing Works',
    keywords: ['rfe mailing', 'mail rfe response', 'how to mail rfe', 'rfe certified mail', 'proof of mailing rfe'],
    breadcrumbs: [{ label: 'Home', path: '/' }, { label: 'RFE', path: '/rfe' }, { label: 'How Mailing Works', path: '/rfe/how-mailing-works' }],
    relatedPages: ['/rfe/pricing', '/rfe/how-to-respond', '/rfe/checklist'],
    faqSchema: [
      { question: 'How does Immigration Mail mail my RFE response?', answer: 'After you approve your response, we print, package, and mail it using your chosen method (First-Class, Certified, or Registered Mail). You receive tracking and proof of mailing.' },
      { question: 'Can I track my RFE response?', answer: 'Yes. If you choose Certified or Registered Mail, you receive a tracking number and can track delivery through USPS.' },
    ],
    content: `Here is how your RFE response gets from your screen to USCIS.

## The process

1. **You approve** your response — nothing is mailed without your explicit approval
2. **We print** your cover letter, response letter, and all uploaded documents
3. **We package** everything with your evidence index, organized and labeled
4. **We mail** using your chosen method (Certified Mail recommended)
5. **You receive** a tracking number and proof of mailing
6. **We preserve** the mailing record permanently

## Mailing methods

- **First-Class Mail**: Delivers in 1-5 days. No tracking. Not recommended for time-sensitive RFEs.
- **Certified Mail**: Delivers in 1-5 days. Includes tracking and proof of mailing. Recommended for most RFEs.
- **Registered Mail**: Delivers in 1-10 days. Maximum security and insurance. For valuable original documents.

## Proof of mailing

After your response is mailed, you receive:
- A certified mail receipt number
- A tracking number (if using Certified or Registered)
- A permanent record of what was sent
- Proof of delivery when USPS confirms

## Important

- We do NOT mail without your explicit approval
- We do NOT mail to the wrong address — the address comes from your RFE
- We prevent duplicate mailings using idempotency

Upload your RFE to get started.`,
  },
];

// ─── All RFE pages ─────────────────────────────────────────────────────────────

export const ALL_RFE_PAGES: SEOPage[] = [RFE_LANDING_PAGE, ...RFE_SUPPORTING_PAGES];

export function findRFEPage(path: string): SEOPage | undefined {
  return ALL_RFE_PAGES.find(p => p.path === path || p.path === `/${path}`);
}

// ─── Keyword cluster mapping ─────────────────────────────────────────────────

export const KEYWORD_CLUSTERS: { keywords: string[]; canonicalPage: string }[] = [
  { keywords: ['rfe uscis', 'uscis rfe', 'request for evidence', 'what is an rfe', 'request for additional evidence'], canonicalPage: '/rfe/what-is-an-rfe' },
  { keywords: ['rfe response', 'responding to rfe', 'how to respond to rfe', 'rfe response letter', 'rfe response steps'], canonicalPage: '/rfe/how-to-respond' },
  { keywords: ['rfe response deadline', 'rfe deadline', 'rfe due date', 'how long to respond to rfe'], canonicalPage: '/rfe/deadline' },
  { keywords: ['rfe evidence', 'rfe documents', 'what documents for rfe', 'rfe evidence checklist'], canonicalPage: '/rfe/evidence' },
  { keywords: ['rfe cover letter', 'cover letter for rfe', 'rfe response cover letter'], canonicalPage: '/rfe/cover-letter' },
  { keywords: ['rfe response letter', 'how to write rfe response'], canonicalPage: '/rfe/response-letter' },
  { keywords: ['missed rfe deadline', 'rfe deadline passed', 'late rfe response'], canonicalPage: '/rfe/missed-deadline' },
  { keywords: ['rfe not enough evidence', 'rfe missing documents'], canonicalPage: '/rfe/not-enough-evidence' },
  { keywords: ['medical rfe', 'i-693 rfe', 'uscis medical examination', 'vaccination rfe'], canonicalPage: '/rfe/medical' },
  { keywords: ['i-485 rfe', 'adjustment of status rfe', 'green card rfe'], canonicalPage: '/rfe/i-485' },
  { keywords: ['i-130 rfe', 'family petition rfe', 'marriage petition rfe'], canonicalPage: '/rfe/i-130' },
  { keywords: ['i-140 rfe', 'employment petition rfe', 'ability to pay rfe'], canonicalPage: '/rfe/i-140' },
  { keywords: ['i-751 rfe', 'removal of conditions rfe', 'conditional resident rfe'], canonicalPage: '/rfe/i-751' },
  { keywords: ['h-1b rfe', 'h1b rfe', 'specialty occupation rfe', 'i-129 rfe'], canonicalPage: '/rfe/h-1b' },
  { keywords: ['green card rfe', 'adjustment of status rfe'], canonicalPage: '/rfe/green-card' },
  { keywords: ['rfe examples', 'sample rfe', 'rfe response examples'], canonicalPage: '/rfe/examples' },
  { keywords: ['rfe checklist', 'rfe response checklist', 'what to include in rfe response'], canonicalPage: '/rfe/checklist' },
  { keywords: ['rfe faq', 'rfe questions', 'rfe help'], canonicalPage: '/rfe/faq' },
  { keywords: ['rfe pricing', 'rfe response cost', 'how much to respond to rfe'], canonicalPage: '/rfe/pricing' },
  { keywords: ['rfe mailing', 'mail rfe response', 'proof of mailing rfe'], canonicalPage: '/rfe/how-mailing-works' },
];
