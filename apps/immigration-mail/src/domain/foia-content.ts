export interface FoiaContentPage {
  slug: string;
  title: string;
  description: string;
  h1: string;
  canonical: string;
  body: string;
  faq: { question: string; answer: string }[];
}

export const FOIA_CONTENT_PAGES: FoiaContentPage[] = [
  {
    slug: 'uscis-foia-request',
    title: 'Request USCIS Records by FOIA — A-File, Immigration History | Immigration Mail',
    description: 'Request your USCIS A-File, immigration history, and case records through FOIA. We help you prepare, organize, and mail your FOIA request.',
    h1: 'Request USCIS Records by FOIA',
    canonical: 'https://immigrationmail.com/uscis-foia/uscis-foia-request',
    body: `## What Is a USCIS FOIA Request?\n\nA FOIA (Freedom of Information Act) request lets you ask USCIS for copies of your immigration records, including your A-File (alien file), case history, and supporting documents.\n\n## What You Can Request\n\n- Your complete A-File\n- Specific case records\n- Application/petition supporting documents\n- USCIS decision memoranda\n- RFE/NOID records\n- Interview transcripts\n\n## What You Need\n\n- Full name (and any prior names)\n- Date of birth\n- A-number (if you have one)\n- Form I-94 number (if applicable)\n- Specific records you want\n\n## How We Help\n\n1. Help you identify which records to request\n2. Prepare a proper FOIA request letter\n3. Include required identity verification\n4. Organize supporting documentation\n5. Mail to the correct USCIS address\n6. Track delivery and provide proof\n\n## Important: This Is Request Preparation, Not Instant Records\n\nWe prepare and mail your FOIA request. USCIS processes FOIA requests — response times can be months. We help you prepare the best possible request, not retrieve records instantly.`,
    faq: [
      { question: 'How long does USCIS take to respond to a FOIA request?', answer: 'USCIS FOIA processing times vary widely — typically several months. You can check current processing times on the USCIS FOIA status page.' },
      { question: 'What is an A-File?', answer: 'The A-File (Alien File) is the comprehensive record USCIS maintains for each immigrant. It contains all applications, decisions, evidence, and correspondence related to your case.' },
      { question: 'Do I need to pay for a FOIA request?', answer: 'FOIA requests are generally free for the first 100 pages. USCIS may charge fees for additional pages, but you can request a fee waiver.' },
      { question: 'Can I request records for someone else?', answer: 'Generally no. FOIA requests for immigration records require identity verification. You can only request your own records unless you have legal authority (e.g., attorney representing a client).' },
    ],
  },
  {
    slug: 'eoir-foia-request',
    title: 'Request EOIR Records by FOIA — Immigration Court Records | Immigration Mail',
    description: 'Request your immigration court records from EOIR. We help you prepare and mail your EOIR FOIA request with proper case numbers and identity verification.',
    h1: 'Request EOIR Records by FOIA',
    canonical: 'https://immigrationmail.com/uscis-foia/eoir-foia-request',
    body: `## What Is an EOIR FOIA Request?\n\nAn EOIR (Executive Office for Immigration Review) FOIA request lets you ask for your immigration court records, including charging documents, hearing transcripts, and court decisions.\n\n## What You Can Request\n\n- Notice to Appear (NTA)\n- Hearing transcripts\n- Court decisions/orders\n- Case scheduling information\n- Appeal records (BIA)\n\n## What You Need\n\n- Full name and any prior names\n- Date of birth\n- A-number\n- Case number (if known)\n- Court location (if known)\n\n## How We Help\n\nWe prepare a proper EOIR FOIA request with the correct identifying information, mail it to the right address, and provide tracking and proof.`,
    faq: [
      { question: 'How is an EOIR FOIA different from a USCIS FOIA?', answer: 'USCIS holds your A-File (applications, petitions, decisions). EOIR holds court records (hearings, transcripts, court decisions). You may need both to get a complete picture of your immigration history.' },
      { question: 'Where do I send an EOIR FOIA request?', answer: 'EOIR FOIA requests are sent to the EOIR FOIA Service Center, not to USCIS. We handle the correct addressing for you.' },
    ],
  },
  {
    slug: 'ice-foia-request',
    title: 'Request ICE Records by FOIA — Detention and Enforcement Records | Immigration Mail',
    description: 'Request your ICE records through FOIA — detention records, enforcement actions, and case files. We prepare and mail your request.',
    h1: 'Request ICE Records by FOIA',
    canonical: 'https://immigrationmail.com/uscis-foia/ice-foia-request',
    body: `## What Is an ICE FOIA Request?\n\nAn ICE (Immigration and Customs Enforcement) FOIA request lets you ask for records related to detention, enforcement actions, and ICE case files.\n\n## What You Can Request\n\n- Detention records\n- Arrest/detention records\n- Removal/deportation records\n- ICE case files\n- Bond proceedings\n\n## How We Help\n\nWe prepare your ICE FOIA request with proper identity verification and send it to the correct ICE FOIA office.`,
    faq: [
      { question: 'What records does ICE have that USCIS does not?', answer: 'ICE holds enforcement and detention records — arrest records, detention facility records, removal proceedings, and bond decisions. USCIS holds application/petition records.' },
      { question: 'Can I request ICE records for a family member?', answer: 'Generally only the individual or their legal representative can request these records. Identity verification is required.' },
    ],
  },
  {
    slug: 'g-639-foia-request',
    title: 'Form G-639 FOIA Request — Immigration Records Request Form | Immigration Mail',
    description: 'Prepare a Form G-639 FOIA/PA request for your immigration records. We help you complete the form correctly and mail it to the right agency.',
    h1: 'Request Records with Form G-639',
    canonical: 'https://immigrationmail.com/uscis-foia/g-639-foia-request',
    body: `## What Is Form G-639?\n\nForm G-639 is the official USCIS form for requesting immigration records under the Freedom of Information Act (FOIA) and Privacy Act (PA).\n\n## When to Use Form G-639\n\n- Requesting your own immigration records\n- Requesting records under Privacy Act\n- Some agencies accept G-639 as the FOIA request form\n\n## What You Need\n\n- Full name and any prior names\n- Date of birth\n- A-number (if applicable)\n- Specific records requested\n- Identity verification documentation\n\n## How We Help\n\nWe help you complete Form G-639 correctly, attach the required identity verification, and mail it to the appropriate agency with tracking and proof.`,
    faq: [
      { question: 'Is Form G-639 required for a FOIA request?', answer: 'USCIS accepts Form G-639 for record requests, but a written letter can also serve as a FOIA request. Some prefer the form for completeness.' },
      { question: 'Where do I mail Form G-639?', answer: 'The mailing address depends on which agency holds the records. USCIS, EOIR, and ICE each have different FOIA addresses. We handle the correct routing.' },
    ],
  },
];

export function getFoiaContent(slug: string): FoiaContentPage | undefined {
  return FOIA_CONTENT_PAGES.find(p => p.slug === slug);
}
