export interface I797ContentPage {
  slug: string;
  title: string;
  description: string;
  h1: string;
  canonical: string;
  body: string;
  faq: { question: string; answer: string }[];
}

export const I797_CONTENT_PAGES: I797ContentPage[] = [
  {
    slug: 'understand-i-797',
    title: 'Understand Your I-797 Notice — USCIS Notice of Action | Immigration Mail',
    description: 'Got a USCIS I-797 Notice of Action? We help you understand what it means and what to do next — whether it\'s an RFE, approval, denial, or interview notice.',
    h1: 'Understand Your USCIS I-797 Notice',
    canonical: 'https://immigrationmail.com/i-797-notice/understand-i-797',
    body: `## What Is an I-797?\n\nForm I-797 is a USCIS Notice of Action. It tells you something happened with your immigration case — but the letter itself doesn't always make it clear what you need to do.\n\n## I-797 Subtypes\n\n- **I-797**: Original notice (various purposes)\n- **I-797A**: Contains a replacement I-94 (arrived in person)\n- **I-797B**: Approval for consular processing\n- **I-797C**: Most common — receipts, RFEs, rejections, transfers, appointments\n- **I-797D**: Benefit card notice (e.g., EAD)\n- **I-797E**: NACARA-related\n- **I-797F**: Fingerprint/interview appointment\n\n## What to Do\n\nUpload your I-797 and we'll identify the subtype, explain what it means, and route you to the right next step — whether that's responding to an RFE, preparing for an interview, or appealing a denial.\n\n## You Don't Need to Know the Subtype\n\nJust upload the notice. We figure out the rest.`,
    faq: [
      { question: 'What does I-797C mean?', answer: 'I-797C is the most common Notice of Action. It can be a receipt, RFE, rejection, transfer, appointment, or reopening notice. The content determines what you need to do.' },
      { question: 'Is an I-797 an approval?', answer: 'Not necessarily. An I-797 can be many things — a receipt, RFE, denial, interview notice, or approval. Read the content to determine which.' },
      { question: 'Do I need to respond to every I-797?', answer: 'No. Some I-797 notices require action (RFE, NOID, denial) while others are informational (receipt, approval, transfer). Upload your notice to find out what to do.' },
    ],
  },
];

export function getI797Content(slug: string): I797ContentPage | undefined {
  return I797_CONTENT_PAGES.find(p => p.slug === slug);
}
