export interface DenialContentPage {
  slug: string;
  title: string;
  description: string;
  h1: string;
  canonical: string;
  body: string;
  faq: { question: string; answer: string }[];
}

export const DENIAL_CONTENT_PAGES: DenialContentPage[] = [
  {
    slug: 'uscis-denial-response',
    title: 'Respond to a USCIS Denial — Appeal, Motion to Reopen, or Reapply | Immigration Mail',
    description: 'USCIS denied your case? We help you understand the denial, evaluate your options (appeal, motion to reopen, motion to reconsider, or reapply), and prepare and mail your response.',
    h1: 'Respond to a USCIS Denial',
    canonical: 'https://immigrationmail.com/uscis-denial/uscis-denial-response',
    body: `## What Is a USCIS Denial?\n\nA denial is a formal decision by USCIS to refuse the benefit you requested. It is more serious than an RFE or NOID — it is the end of adjudication unless you take action.\n\n## Your Options After a Denial\n\n- **Appeal**: Ask the Administrative Appeals Office (AAO) or Board of Immigration Appeals (BIA) to review the decision.\n- **Motion to Reopen**: Ask USCIS to reconsider based on new facts or evidence.\n- **Motion to Reconsider**: Ask USCIS to reconsider based on an error in law or fact.\n- **Reapply**: File a new petition or application with better evidence.\n- **Do nothing**: Accept the decision and stop pursuing the benefit.\n\n## Deadlines Matter\n\nMost appeals must be filed within 30 days of the denial. Motions to reopen/reconsider must be filed within 30 days. Missing the deadline can permanently bar your challenge.\n\n## How We Help\n\nUpload your denial notice and we'll:\n1. Identify the denial grounds\n2. Evaluate which option is viable\n3. Assess the strength of your case\n4. Draft your appeal or motion\n5. Mail it with tracking and proof\n\n## You Don't Need to Know the Legal Term\n\nJust upload the denial letter. We'll figure out what happened and what to do.`,
    faq: [
      { question: 'Can I appeal any USCIS denial?', answer: 'No. Some decisions are not appealable. You may be able to file a motion to reopen or reconsider instead, or reapply with better evidence.' },
      { question: 'How long do I have to appeal a USCIS denial?', answer: 'Most appeals must be filed within 30 days of the decision. Some give 33 days if mailed. Missing the deadline usually means losing the right to challenge.' },
      { question: 'What is the difference between an appeal and a motion to reopen?', answer: 'An appeal asks a higher authority to review the decision for error. A motion to reopen asks the original office to reconsider based on new facts or evidence.' },
      { question: 'Should I reapply instead of appealing?', answer: 'Sometimes. If your case was denied for insufficient evidence and the appeal is weak, filing a new application with better evidence may be more effective. We help you evaluate both paths.' },
    ],
  },
  {
    slug: 'motion-to-reopen',
    title: 'Motion to Reopen a USCIS Case — Requirements and Process | Immigration Mail',
    description: 'Need to file a motion to reopen your USCIS case? We help you identify new evidence, meet the 30-day deadline, and prepare and mail your motion.',
    h1: 'Motion to Reopen a USCIS Case',
    canonical: 'https://immigrationmail.com/uscis-denial/motion-to-reopen',
    body: `## What Is a Motion to Reopen?\n\nA motion to reopen asks USCIS to reconsider a denied case based on new facts or evidence that were not available at the time of the original decision.\n\n## Requirements\n\n- New evidence that was not available previously\n- Filed within 30 days of the denial\n- Filed on the correct form (usually Form I-290B)\n- Proper fee paid\n\n## When to Use It\n\n- New evidence became available after the denial\n- Your circumstances changed\n- You can now meet the requirements\n\n## We Help You Prepare\n\nUpload your denial notice and any new evidence. We'll evaluate whether a motion to reopen is viable and help you prepare and mail it.`,
    faq: [
      { question: 'What is the deadline for a motion to reopen?', answer: 'Generally 30 days from the denial decision. Missing this deadline usually means you cannot reopen the case.' },
      { question: 'What form do I need for a motion to reopen?', answer: 'Most motions to reopen are filed on Form I-290B, Notice of Appeal or Motion.' },
    ],
  },
  {
    slug: 'motion-to-reconsider',
    title: 'Motion to Reconsider a USCIS Decision — Legal or Factual Error | Immigration Mail',
    description: 'USCIS made an error in your denial? File a motion to reconsider. We help you identify the error, cite the correct law, and prepare and mail your motion.',
    h1: 'Motion to Reconsider a USCIS Decision',
    canonical: 'https://immigrationmail.com/uscis-denial/motion-to-reconsider',
    body: `## What Is a Motion to Reconsider?\n\nA motion to reconsider asks USCIS to reconsider a decision because they made an error in applying the law or evaluating the facts. Unlike a motion to reopen, you do not need new evidence — you need to show the original decision was wrong.\n\n## When to Use It\n\n- USCIS misapplied the law\n- USCIS ignored evidence you submitted\n- USCIS cited the wrong legal standard\n- The decision contains a factual error\n\n## We Help You Prepare\n\nUpload your denial notice. We'll analyze the legal reasoning, identify errors, and draft a motion to reconsider that cites the correct authorities.`,
    faq: [
      { question: 'What is the difference between a motion to reopen and a motion to reconsider?', answer: 'A motion to reopen requires new evidence. A motion to reconsider argues the original decision was wrong based on the existing record.' },
      { question: 'How long do I have to file a motion to reconsider?', answer: 'Generally 30 days from the decision, same as a motion to reopen.' },
    ],
  },
];

export function getDenialContent(slug: string): DenialContentPage | undefined {
  return DENIAL_CONTENT_PAGES.find(p => p.slug === slug);
}
