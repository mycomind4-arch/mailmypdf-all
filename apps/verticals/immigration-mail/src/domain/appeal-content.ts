/**
 * Appeal Content — SEO and landing page content for immigration appeals
 */

export interface AppealContentPage {
  slug: string;
  title: string;
  description: string;
  h1: string;
  canonical: string;
  body: string;
  faq: { question: string; answer: string }[];
}

export const APPEAL_CONTENT_PAGES: AppealContentPage[] = [
  {
    slug: 'i-290b-appeal',
    title: 'I-290B Appeal — USCIS Decision Appeal | Immigration Mail',
    description: 'File an I-290B appeal to the Administrative Appeals Office. We help you understand the decision, build your argument, and prepare your appeal letter.',
    h1: 'USCIS Appeal (Form I-290B)',
    canonical: 'https://immigrationmail.com/appeal/i-290b-appeal',
    body: `## What Is Form I-290B?\n\nForm I-290B is used to appeal a USCIS denial or revocation to the Administrative Appeals Office (AAO), or to file a motion to reopen or reconsider.\n\n## Deadlines\n\nYou have 30 days from the date of the decision to file an appeal. If you received the decision by mail, you may have 33 days.\n\n## When to Appeal vs. File a Motion\n\n- **Appeal**: You argue USCIS made the wrong decision based on the evidence already submitted.\n- **Motion to Reopen**: You have new evidence that was not available before.\n- **Motion to Reconsider**: You argue USCIS erred in applying the law or facts.\n\n## Filing Fee\n\nThe I-290B filing fee is $675. Some motions may have no fee.\n\n## How We Help\n\nUpload your denial notice. We analyze the decision, identify appeal grounds, build your argument, draft your appeal letter, and mail it with tracking and proof.`,
    faq: [
      { question: 'How long do I have to file an I-290B appeal?', answer: 'You have 30 days from the decision date, or 33 days if you received it by mail.' },
      { question: 'What is the difference between an appeal and a motion to reopen?', answer: 'An appeal argues the decision was wrong based on existing evidence. A motion to reopen submits new evidence.' },
      { question: 'Can I appeal any USCIS denial?', answer: 'Most USCIS denials are appealable to the AAO, but some are not. Check your denial notice for appeal rights.' },
    ],
  },
  {
    slug: 'bia-appeal',
    title: 'BIA Appeal — Immigration Court Appeal | Immigration Mail',
    description: 'Appeal an immigration judge decision to the Board of Immigration Appeals. We help you understand the decision and prepare your appeal.',
    h1: 'BIA Appeal (Board of Immigration Appeals)',
    canonical: 'https://immigrationmail.com/appeal/bia-appeal',
    body: `## What Is a BIA Appeal?\n\nIf an immigration judge denied your case, you can appeal to the Board of Immigration Appeals (BIA). The BIA reviews the judge's decision.\n\n## Deadlines\n\nYou have 30 days from the immigration judge's decision to file a BIA appeal.\n\n## Filing\n\nFile Form EOIR-26 with the BIA. The filing fee is $110.\n\n## Attorney Recommended\n\nBIA appeals are complex. An attorney is strongly recommended, especially for removal orders.\n\n## How We Help\n\nUpload your immigration court decision. We analyze the judge's findings, identify appeal grounds, and help you prepare your appeal brief.`,
    faq: [
      { question: 'How long do I have to file a BIA appeal?', answer: 'You have 30 days from the date of the immigration judge\'s decision.' },
      { question: 'Do I need an attorney for a BIA appeal?', answer: 'An attorney is strongly recommended, especially for removal order appeals.' },
      { question: 'What form do I file for a BIA appeal?', answer: 'File Form EOIR-26 (Notice of Appeal) with the Board of Immigration Appeals.' },
    ],
  },
  {
    slug: 'motion-to-reopen',
    title: 'Motion to Reopen — USCIS or EOIR | Immigration Mail',
    description: 'File a motion to reopen with new evidence. We help you prepare and file your motion with the right authority.',
    h1: 'Motion to Reopen',
    canonical: 'https://immigrationmail.com/appeal/motion-to-reopen',
    body: `## What Is a Motion to Reopen?\n\nA motion to reopen asks USCIS or the immigration court to reconsider your case based on new evidence that was not available at the time of the original decision.\n\n## Deadlines\n\n- USCIS motions: 33 days from the decision\n- EOIR motions to reopen: 90 days (with exceptions)\n\n## Form\n\nFile Form I-290B for USCIS motions. For EOIR, file the appropriate motion with the immigration court.\n\n## How We Help\n\nUpload your denial notice and new evidence. We analyze the decision, identify what changed, and prepare your motion.`,
    faq: [
      { question: 'What is the difference between a motion to reopen and a motion to reconsider?', answer: 'A motion to reopen presents new evidence. A motion to reconsider argues the decision was based on incorrect law or facts.' },
      { question: 'Is there a filing fee for a motion to reopen?', answer: 'USCIS I-290B motions may not require a fee in some cases. Check current USCIS guidance.' },
    ],
  },
];

export function getAppealContent(slug: string): AppealContentPage | undefined {
  return APPEAL_CONTENT_PAGES.find(p => p.slug === slug);
}
