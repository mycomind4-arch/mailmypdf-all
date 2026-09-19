export type LetterTemplate = {
  id: string;
  title: string;
  description: string;
  category: "Legal" | "Personal" | "Business" | "Official";
  icon: string; // lucide icon name
  subject?: string;
  bodyText: string;
};

export const letterTemplates: LetterTemplate[] = [
  {
    id: "demand-letter",
    title: "Demand Letter",
    description:
      "A formal demand for payment of an outstanding debt, outlining the steps that will be taken if payment is not received.",
    category: "Legal",
    icon: "Scale",
    subject: "DEMAND FOR PAYMENT OF OUTSTANDING DEBT - [INVOICE/AGREEMENT NUMBER]",
    bodyText: `[YOUR NAME]
[YOUR STREET ADDRESS]
[YOUR CITY, STATE, ZIP]
[YOUR PHONE NUMBER]
[YOUR EMAIL ADDRESS]

[DATE]

[DEBTOR NAME]
[DEBTOR STREET ADDRESS]
[DEBTOR CITY, STATE, ZIP]

Subject: DEMAND FOR PAYMENT OF OUTSTANDING DEBT - [INVOICE/AGREEMENT NUMBER]

Dear [DEBTOR NAME],

This letter serves as a formal demand for payment of the outstanding debt owed to me, totaling [AMOUNT OWED]. This balance is currently past due according to our agreed-upon payment terms for [DESCRIPTION OF SERVICES OR GOODS PROVIDED] which were completed/delivered on [DATE OF WORK/DELIVERY].

I have made multiple prior attempts to resolve this balance with you, including sending statements and contacting you via phone and email on [DATES OF PRIOR ATTEMPTS]. To date, I have not received payment or a satisfactory proposal to settle this account. 

Please be advised that if the full amount of [AMOUNT OWED] is not received by [DEADLINE DATE, e.g., 10 DAYS FROM TODAY], I will have no alternative but to pursue all available legal remedies to recover these funds. This may include filing a lawsuit in small claims court, reporting the outstanding debt to major credit bureaus, or retaining a professional collections agency. Such actions may incur additional costs, interest, and legal fees for which you will be held responsible.

I expect your prompt cooperation to resolve this matter amicably. Please remit payment immediately via [PAYMENT METHOD, e.g., BANK WIRE, CHECK, PAYPAL].

Sincerely,

[YOUR SIGNATURE]

[YOUR TYPED NAME]`,
  },
  {
    id: "cease-and-desist",
    title: "Cease and Desist Letter",
    description:
      "A formal warning to stop harassing behavior, defamation, or infringement of rights.",
    category: "Legal",
    icon: "ShieldAlert",
    subject: "FORMAL CEASE AND DESIST ORDER - [NATURE OF ACTIVITY, e.g., HARASSMENT / DEFAMATION]",
    bodyText: `[YOUR NAME]
[YOUR STREET ADDRESS]
[YOUR CITY, STATE, ZIP]
[YOUR PHONE NUMBER]
[YOUR EMAIL ADDRESS]

[DATE]

[RECIPIENT NAME]
[RECIPIENT STREET ADDRESS]
[RECIPIENT CITY, STATE, ZIP]

Subject: FORMAL CEASE AND DESIST ORDER - [NATURE OF ACTIVITY, e.g., HARASSMENT / DEFAMATION]

Dear [RECIPIENT NAME],

This letter is a formal notice that your ongoing actions, specifically [DESCRIBE ACTIONS IN DETAIL, e.g., contacting me repeatedly, publishing false statements, using my intellectual property], are unlawful and unacceptable. Your conduct has caused significant distress, financial harm, and damage to my personal and professional reputation.

Specifically, on [DATE/DATES OF INCIDENTS], you engaged in [DETAILS OF INCIDENT OR SPECIFIC BEHAVIORS]. These actions constitute a direct violation of my rights, including but not limited to [SPECIFIC LEGAL RIGHTS, e.g., right to privacy, intellectual property rights, protection against harassment].

You are hereby ordered to immediately cease and desist from any further actions of this nature. This includes, but is not limited to, stopping all direct and indirect communication with me, removing any false or defamatory online postings, and halting any unauthorized use of my proprietary materials.

If you fail to comply with this demand by [DEADLINE DATE, e.g., 7 DAYS FROM TODAY], I will immediately consult with legal counsel to initiate formal legal proceedings against you. I am fully prepared to seek emergency injunctive relief, monetary damages, and recovery of all legal fees incurred as a result of your non-compliance. This is your final warning to stop these activities.

Sincerely,

[YOUR SIGNATURE]

[YOUR TYPED NAME]`,
  },
  {
    id: "complaint-letter",
    title: "Complaint Letter (to a business)",
    description:
      "A formal complaint to a business regarding poor quality of service or products, requesting a remedy.",
    category: "Legal",
    icon: "MessageSquareWarning",
    subject: "FORMAL COMPLAINT REGARDING [PRODUCT/SERVICE NAME] - [ORDER/ACCOUNT NUMBER]",
    bodyText: `[YOUR NAME]
[YOUR STREET ADDRESS]
[YOUR CITY, STATE, ZIP]
[YOUR PHONE NUMBER]
[YOUR EMAIL ADDRESS]

[DATE]

[BUSINESS NAME]
[CUSTOMER SERVICE DEPARTMENT OR EXECUTIVE'S NAME]
[BUSINESS STREET ADDRESS]
[BUSINESS CITY, STATE, ZIP]

Subject: FORMAL COMPLAINT REGARDING [PRODUCT/SERVICE NAME] - [ORDER/ACCOUNT NUMBER]

Dear Customer Service Manager,

I am writing to formally log a complaint regarding my recent experience with [PRODUCT OR SERVICE NAME] purchased on [DATE OF PURCHASE]. I am extremely disappointed with the quality of the [PRODUCT/SERVICE] and the subsequent service I have received, which have failed to meet reasonable standards.

The specific issues I encountered are as follows: [DETAILED DESCRIPTION OF THE ISSUES, e.g., the device stopped working after two days, the service was not delivered as described]. Despite contacting your support team on [DATES OF PRIOR CONTACT] and speaking with [REPRESENTATIVE NAME], the problem remains entirely unresolved.

As a consumer, I expected a level of service and quality that aligns with your brand's reputation and advertisements. Since this expectation was not met, I am requesting that your company immediately [SPECIFY DESIRED RESOLUTION, e.g., issue a full refund of AMOUNT, replace the defective product, cancel my contract without penalty].

If this matter is not resolved to my satisfaction by [DATE, e.g., 14 DAYS FROM TODAY], I will escalate this complaint by filing formal reports with the Better Business Bureau (BBB), the Federal Trade Commission (FTC), and my state's Consumer Protection Division. I hope we can resolve this matter directly and quickly.

Sincerely,

[YOUR SIGNATURE]

[YOUR TYPED NAME]`,
  },
  {
    id: "small-claims-filing",
    title: "Small Claims Court Filing Letter",
    description:
      "A final notice and demand for payment or settlement before officially filing a small claims court lawsuit.",
    category: "Legal",
    icon: "Gavel",
    subject: "NOTICE OF INTENT TO SUE AND FINAL DEMAND BEFORE SMALL CLAIMS FILING",
    bodyText: `[YOUR NAME]
[YOUR STREET ADDRESS]
[YOUR CITY, STATE, ZIP]
[YOUR PHONE NUMBER]
[YOUR EMAIL ADDRESS]

[DATE]

[DEFENDANT NAME]
[DEFENDANT STREET ADDRESS]
[DEFENDANT CITY, STATE, ZIP]

Subject: NOTICE OF INTENT TO SUE AND FINAL DEMAND BEFORE SMALL CLAIMS FILING

Dear [DEFENDANT NAME],

Please accept this letter as a formal pre-suit demand and notice of intent to file a claim against you in [NAME OF COUNTY] Small Claims Court. This step has become necessary due to your persistent failure to resolve the outstanding dispute regarding [BRIEF DESCRIPTION OF DISPUTE, e.g., unpaid rent, damage to property, breach of contract].

On [DATE OF ORIGINAL DISPUTE/AGREEMENT], we entered into an agreement where you agreed to [TERMS OF AGREEMENT]. To date, you have failed to fulfill your obligations, resulting in a direct financial loss to me in the amount of [AMOUNT OF LOSS/DAMAGES]. Despite multiple requests for payment, the last being on [DATE OF LAST CONTACT], you have refused to make things right.

I have drafted the necessary court documents and am prepared to file them. However, in a final effort to avoid litigation and the associated public records, court fees, and time, I am offering you one last opportunity to settle this matter. I demand that you pay the sum of [AMOUNT OF LOSS/DAMAGES] by [DATE, e.g., 10 DAYS FROM TODAY].

If payment is not received in full by the deadline, I will proceed with filing the small claims lawsuit without further notice. Please be aware that I will also seek recovery of court costs and any interest permitted by law.

Sincerely,

[YOUR SIGNATURE]

[YOUR TYPED NAME]`,
  },
  {
    id: "dispute-resolution",
    title: "Dispute Resolution Letter",
    description:
      "A professional and amicable offer of compromise or settlement to resolve a dispute without litigation.",
    category: "Legal",
    icon: "Handshake",
    subject: "OFFER OF SETTLEMENT AND DISPUTE RESOLUTION - [DISPUTE CASE/CONTRACT ID]",
    bodyText: `[YOUR NAME]
[YOUR STREET ADDRESS]
[YOUR CITY, STATE, ZIP]
[YOUR PHONE NUMBER]
[YOUR EMAIL ADDRESS]

[DATE]

[RECIPIENT NAME]
[RECIPIENT STREET ADDRESS]
[RECIPIENT CITY, STATE, ZIP]

Subject: OFFER OF SETTLEMENT AND DISPUTE RESOLUTION - [DISPUTE CASE/CONTRACT ID]

Dear [RECIPIENT NAME],

I am writing this letter in the spirit of compromise to propose an amicable resolution to our ongoing dispute regarding [DESCRIPTION OF DISPUTE, e.g., the final payment for the renovation project, terms of our business agreement]. It is my belief that a mutual, out-of-court settlement is in the best interest of both parties to save time, stress, and mounting legal expenses.

To recap, the core of our disagreement lies in [SUMMARY OF DISPUTE DETAILS, e.g., the quality of the finish work, the interpretation of clause 4 in our contract]. While I stand firm in my position that [YOUR STANCE, e.g., the work was not completed as agreed], I recognize that continuing this dispute in court will be highly costly and disruptive.

Therefore, without admitting any liability or waiving any of my legal rights, I propose the following settlement terms: [PROPOSED SETTLEMENT TERMS, e.g., I will pay a reduced final sum of AMOUNT in full satisfaction of all claims, we agree to mutually release each other from the contract]. 

This offer is valid until [DATE, e.g., 14 DAYS FROM TODAY]. If we can agree on these terms, I will have a formal Settlement and Release Agreement drafted for both of our signatures. I look forward to your positive response so we can resolve this matter once and for all.

Sincerely,

[YOUR SIGNATURE]

[YOUR TYPED NAME]`,
  },
  {
    id: "love-letter",
    title: "Love Letter",
    description: "A deep, warm, and sentimental expression of love, appreciation, and partnership.",
    category: "Personal",
    icon: "Heart",
    subject: "With All My Love",
    bodyText: `[YOUR NAME]
[YOUR STREET ADDRESS]
[YOUR CITY, STATE, ZIP]

[DATE]

[RECIPIENT NAME]
[RECIPIENT STREET ADDRESS]
[RECIPIENT CITY, STATE, ZIP]

Subject: With All My Love

Dearest [RECIPIENT NAME],

I wanted to take a quiet moment to write this letter to you, to express some of the feelings that are so deeply rooted in my heart but which I do not always find the perfect words to say in our day-to-day lives. From the moment you entered my life on [DATE OR SIGNIFICANT MEMORY], everything has felt brighter, warmer, and infinitely more meaningful.

Your smile, your laughter, and your incredible kindness are things that inspire me every single day. I cherish every memory we have made together, from the quiet, simple evenings we share at home to the adventures we embark on. You have a beautiful way of bringing peace to my mind and joy to my soul, and I cannot imagine my life without you by my side.

Thank you for being my partner, my confidant, and my absolute best friend. Thank you for your endless support, your patience, and the unconditional love you give me. As we look toward the future, I want you to know that my love for you only continues to grow stronger with each passing day. 

You are my home, my heart, and my greatest adventure. I love you more than words can fully capture, and I look forward to all the beautiful moments we have yet to share.

Forever and always,

[YOUR SIGNATURE]

[YOUR TYPED NAME]`,
  },
  {
    id: "birthday-letter",
    title: "Birthday Letter",
    description:
      "A celebratory and heartfelt birthday letter wishing happiness, success, and reflecting on cherished memories.",
    category: "Personal",
    icon: "Cake",
    subject: "Wishing You the Happiest of Birthdays!",
    bodyText: `[YOUR NAME]
[YOUR STREET ADDRESS]
[YOUR CITY, STATE, ZIP]

[DATE]

[RECIPIENT NAME]
[RECIPIENT STREET ADDRESS]
[RECIPIENT CITY, STATE, ZIP]

Subject: Wishing You the Happiest of Birthdays!

Dearest [RECIPIENT NAME],

I am writing this letter to send you my warmest wishes on your birthday! Today is a special day to celebrate the incredible person you are and to reflect on the immense joy and light you bring into the lives of everyone around you.

Another year has passed, and I have loved watching you grow, achieve your goals, and face life’s challenges with such grace and strength. You have a rare gift for making the world a better, kinder place, whether through your quick wit, your generous spirit, or your endless capacity to care for others. I feel incredibly lucky and grateful to count myself as one of your [RELATIONSHIP, e.g., friends, family members].

My hope for you in this coming year is that it brings you closer to your dreams, fills your days with laughter, and surrounds you with peace. May you be blessed with good health, exciting new opportunities, and plenty of moments of quiet happiness. 

Take some time today to pamper yourself, eat too much cake, and celebrate exactly how wonderful you are. Happy Birthday, [RECIPIENT NAME]! I hope this year is your best one yet.

With love and warmest wishes,

[YOUR SIGNATURE]

[YOUR TYPED NAME]`,
  },
  {
    id: "thank-you-letter",
    title: "Thank You Letter",
    description:
      "A warm and sincere letter expressing gratitude for a friend or family member's help or kindness.",
    category: "Personal",
    icon: "Gift",
    subject: "With My Sincerest Gratitude",
    bodyText: `[YOUR NAME]
[YOUR STREET ADDRESS]
[YOUR CITY, STATE, ZIP]

[DATE]

[RECIPIENT NAME]
[RECIPIENT STREET ADDRESS]
[RECIPIENT CITY, STATE, ZIP]

Subject: With My Sincerest Gratitude

Dear [RECIPIENT NAME],

I am writing this letter to express my deepest and most sincere gratitude for your incredible kindness and support. Recently, when I was facing [SITUATION/CHALLENGE, e.g., moving to my new apartment, navigating a difficult career transition], you went completely out of your way to help me, and it meant more to me than I can put into words.

Your generosity, whether it was [SPECIFIC ACTION, e.g., lending me your truck, giving me such valuable advice, checking in on me daily], made an immense difference in my life during a time when I really needed it. It is rare to find someone who is so willing to give of their time and energy to support others, and your thoughtfulness is a beautiful reflection of your character.

Please know that your help did not go unnoticed, and I will always remember your kindness. I feel incredibly blessed to have you in my life. If there is ever anything you need, or if there is ever any way I can return the favor, please do not hesitate to ask.

Thank you once again for your warmth, your guidance, and your friendship. You are a wonderful person, and I am deeply grateful for you.

With heartfelt thanks,

[YOUR SIGNATURE]

[YOUR TYPED NAME]`,
  },
  {
    id: "congratulations-letter",
    title: "Congratulations Letter",
    description:
      "A proud and joyful letter congratulating someone on a major life event or professional achievement.",
    category: "Personal",
    icon: "Award",
    subject: "Congratulations on Your Amazing Achievement!",
    bodyText: `[YOUR NAME]
[YOUR STREET ADDRESS]
[YOUR CITY, STATE, ZIP]

[DATE]

[RECIPIENT NAME]
[RECIPIENT STREET ADDRESS]
[RECIPIENT CITY, STATE, ZIP]

Subject: Congratulations on Your Amazing Achievement!

Dear [RECIPIENT NAME],

I was absolutely thrilled to hear the wonderful news about your recent achievement, specifically [ACHIEVEMENT, e.g., your graduation from university, your new job promotion, the birth of your child]! I am writing to send you my warmest and most enthusiastic congratulations on this fantastic milestone.

Knowing how hard you have worked for this over the past [TIME PERIOD, e.g., several years, few months], I can say with certainty that nobody deserves this success more than you do. Your dedication, perseverance, and passion have paid off in the most spectacular way. I have watched you overcome obstacles and stay focused on your goals, and your success is a true testament to your character.

This is a momentous occasion, and I hope you are taking the time to fully celebrate and take pride in what you have accomplished. It is a stepping stone to even greater things, and I have no doubt that your future will continue to be filled with brilliant successes.

I am so incredibly proud of you, and I look forward to celebrating with you in person very soon. Congratulations again, [RECIPIENT NAME]! Wishing you all the very best as you begin this exciting new chapter.

With great pride and affection,

[YOUR SIGNATURE]

[YOUR TYPED NAME]`,
  },
  {
    id: "apology-letter",
    title: "Apology Letter",
    description:
      "A thoughtful and sincere personal apology letter expressing regret and a desire to make amends.",
    category: "Personal",
    icon: "Frown",
    subject: "Please Accept My Sincerest Apology",
    bodyText: `[YOUR NAME]
[YOUR STREET ADDRESS]
[YOUR CITY, STATE, ZIP]

[DATE]

[RECIPIENT NAME]
[RECIPIENT STREET ADDRESS]
[RECIPIENT CITY, STATE, ZIP]

Subject: Please Accept My Sincerest Apology

Dear [RECIPIENT NAME],

I am writing this letter to offer you my deepest and most sincere apology for my recent behavior, specifically [DESCRIBE INCIDENT, e.g., what I said during our argument last Tuesday, forgetting our scheduled meeting]. Looking back on the situation, I realize that my actions were entirely wrong, and I feel a great deal of regret for the hurt and disappointment I have caused you.

There is no excuse for my behavior. I failed to communicate respectfully and fell short of the standards of a good friend/partner. I deeply regret that my words/actions made you feel [FEELING, e.g., disrespected, unappreciated, let down]. Your friendship and feelings are incredibly important to me, and it pains me to know that I am the reason you were upset.

I want to assure you that I am taking steps to reflect on my behavior and ensure this does not happen again. I highly value our relationship and hope that over time, I can earn back your trust and repair the damage I have done.

I understand if you need some time and space before you are ready to talk. Whenever you feel comfortable, I would welcome the opportunity to speak with you in person to apologize directly. Thank you for reading this, and please know that I am truly sorry.

With love and regret,

[YOUR SIGNATURE]

[YOUR TYPED NAME]`,
  },
  {
    id: "resignation-letter",
    title: "Resignation Letter",
    description:
      "A formal and professional resignation letter outlining notice and transition assistance.",
    category: "Business",
    icon: "Briefcase",
    subject: "NOTICE OF RESIGNATION - [YOUR TITLE]",
    bodyText: `[YOUR NAME]
[YOUR STREET ADDRESS]
[YOUR CITY, STATE, ZIP]
[YOUR PHONE NUMBER]
[YOUR EMAIL ADDRESS]

[DATE]

[MANAGER NAME]
[MANAGER TITLE]
[COMPANY NAME]
[COMPANY STREET ADDRESS]
[COMPANY CITY, STATE, ZIP]

Subject: NOTICE OF RESIGNATION - [YOUR TITLE]

Dear [MANAGER NAME],

Please accept this letter as formal notification that I am resigning from my position as [YOUR TITLE] at [COMPANY NAME]. In accordance with my employment agreement, my final day of employment with the company will be [YOUR LAST DAY OF WORK, e.g., two weeks from today].

This was a difficult decision to make, but I have decided to take this step in order to pursue a new professional opportunity that aligns with my long-term career goals. I am incredibly grateful for the opportunities I have had during my time with [COMPANY NAME], and I want to thank you for your guidance, mentorship, and support during my tenure.

During my remaining time here, I am fully committed to ensuring a smooth and seamless transition of my duties. I will complete my outstanding projects and organize my files so that they are easily accessible to the team. I am also more than happy to assist in training other team members or helping to onboard my replacement in any way possible.

I wish you, the team, and [COMPANY NAME] continued success in all future endeavors. I hope we can stay in touch as our professional paths cross in the future.

Sincerely,

[YOUR SIGNATURE]

[YOUR TYPED NAME]`,
  },
  {
    id: "termination-notice",
    title: "Termination Notice (to employee)",
    description:
      "A formal notification of the termination of employment, outlining final pay and returning property.",
    category: "Business",
    icon: "UserMinus",
    subject: "NOTICE OF TERMINATION OF EMPLOYMENT",
    bodyText: `[COMPANY NAME]
[SENDER NAME/HR DEPT]
[COMPANY STREET ADDRESS]
[COMPANY CITY, STATE, ZIP]
[COMPANY PHONE NUMBER]

[DATE]

[EMPLOYEE NAME]
[EMPLOYEE TITLE]
[EMPLOYEE STREET ADDRESS]
[EMPLOYEE CITY, STATE, ZIP]

Subject: NOTICE OF TERMINATION OF EMPLOYMENT

Dear [EMPLOYEE NAME],

This letter serves as formal notification that your employment with [COMPANY NAME] is being terminated, effective [EFFECTIVE DATE OF TERMINATION]. This decision was reached after careful consideration and is final.

The reason for this termination is [REASON FOR TERMINATION, e.g., ongoing performance issues that were not resolved during your performance improvement plan, restructuring of our department]. Despite prior discussions and support provided to you, we have not seen the necessary improvements required for your role.

On your final day, you are required to return all company property in your possession, including your laptop, building keys, security badge, and any proprietary documents or files. Your final paycheck, which will include payment for all hours worked up to [EFFECTIVE DATE OF TERMINATION] along with any accrued but unused paid time off (PTO), will be paid to you on [PAYMENT DATE] via [PAYMENT METHOD, e.g., direct deposit].

You will receive a separate communication from our Human Resources department regarding your rights to continue your health insurance coverage under COBRA and other post-employment benefits. If you have any questions regarding your final paycheck or benefits, please contact [HR CONTACT NAME] at [HR PHONE/EMAIL]. We wish you the best in your future endeavors.

Sincerely,

[YOUR SIGNATURE]

[YOUR TYPED NAME]
[YOUR TITLE]`,
  },
  {
    id: "invoice-cover",
    title: "Invoice Cover Letter",
    description: "A professional cover letter to accompany an invoice for services completed.",
    category: "Business",
    icon: "Receipt",
    subject: "INVOICE FOR COMPLETED SERVICES - INVOICE #[INVOICE NUMBER]",
    bodyText: `[YOUR NAME/COMPANY NAME]
[YOUR STREET ADDRESS]
[YOUR CITY, STATE, ZIP]
[YOUR PHONE NUMBER]
[YOUR EMAIL ADDRESS]

[DATE]

[CLIENT NAME]
[CLIENT TITLE]
[CLIENT COMPANY NAME]
[CLIENT STREET ADDRESS]
[CLIENT CITY, STATE, ZIP]

Subject: INVOICE FOR COMPLETED SERVICES - INVOICE #[INVOICE NUMBER]

Dear [CLIENT NAME],

I hope this letter finds you well. I am writing to formally submit invoice #[INVOICE NUMBER] for the [SERVICES/PROJECT NAME] completed during the period of [START DATE] to [END DATE]. It was an absolute pleasure working with you and your team on this project.

The enclosed invoice detail outlines the specific tasks completed, which include [SUMMARY OF TASKS, e.g., initial website design, backend integration, and final deployment]. The total amount due for these services is [TOTAL AMOUNT DUE], and the payment term is [PAYMENT TERM, e.g., Net 30 days], making the payment due on or before [DUE DATE].

Please review the attached invoice at your earliest convenience. You can remit payment using our standard methods, including [PAYMENT METHODS, e.g., bank transfer to bank details listed on invoice, credit card, or check]. 

If you have any questions, require additional clarification on any line items, or need further documentation, please feel free to reach out to me directly at [YOUR PHONE NUMBER] or via email at [YOUR EMAIL ADDRESS]. Thank you once again for your business, and I look forward to working together on future projects.

Sincerely,

[YOUR SIGNATURE]

[YOUR TYPED NAME]
[YOUR TITLE]`,
  },
  {
    id: "client-follow-up",
    title: "Client Follow-up Letter",
    description:
      "A polite follow-up after a client meeting, summarizing discussions and outlining next steps.",
    category: "Business",
    icon: "Send",
    subject: "FOLLOW-UP REGARDING [PROJECT/DISCUSSION NAME] - NEXT STEPS",
    bodyText: `[YOUR NAME/COMPANY NAME]
[YOUR STREET ADDRESS]
[YOUR CITY, STATE, ZIP]
[YOUR PHONE NUMBER]
[YOUR EMAIL ADDRESS]

[DATE]

[CLIENT NAME]
[CLIENT TITLE]
[CLIENT COMPANY NAME]
[CLIENT STREET ADDRESS]
[CLIENT CITY, STATE, ZIP]

Subject: FOLLOW-UP REGARDING [PROJECT/DISCUSSION NAME] - NEXT STEPS

Dear [CLIENT NAME],

I wanted to follow up with you regarding our recent meeting on [DATE OF MEETING] where we discussed [TOPIC OF MEETING, e.g., your upcoming marketing campaign, the software development proposal]. I really enjoyed our conversation and am very excited about the potential opportunity to collaborate with [CLIENT COMPANY NAME].

During our discussion, we identified several key goals for your project, including [LIST GOALS, e.g., increasing online traffic, automating your inventory management]. Based on these goals, my team has put together a draft strategy that we believe will deliver excellent results for you.

To help you review, I have enclosed a brief outline of our recommended approach and timeline. We are fully prepared to tailor this plan to better fit your specific needs and budget. Our next step would be to schedule a brief 15-minute call next week to gather your feedback and answer any initial questions you might have.

Could you let me know if you are available for a call on [PROPOSED DATE/TIME] or if another time works better for you? Thank you again for your time, and I look forward to hearing from you.

Sincerely,

[YOUR SIGNATURE]

[YOUR TYPED NAME]
[YOUR TITLE]`,
  },
  {
    id: "business-proposal-cover",
    title: "Business Proposal Cover Letter",
    description:
      "A highly professional cover letter to introduce a detailed business proposal to a potential partner.",
    category: "Business",
    icon: "FileText",
    subject: "BUSINESS PROPOSAL FOR [PROJECT NAME] - [SENDER COMPANY NAME]",
    bodyText: `[YOUR NAME/COMPANY NAME]
[YOUR STREET ADDRESS]
[YOUR CITY, STATE, ZIP]
[YOUR PHONE NUMBER]
[YOUR EMAIL ADDRESS]

[DATE]

[RECIPIENT NAME]
[RECIPIENT TITLE]
[RECIPIENT COMPANY NAME]
[RECIPIENT STREET ADDRESS]
[RECIPIENT CITY, STATE, ZIP]

Subject: BUSINESS PROPOSAL FOR [PROJECT NAME] - [SENDER COMPANY NAME]

Dear [RECIPIENT NAME],

I am pleased to submit the enclosed business proposal from [SENDER COMPANY NAME] in response to your request for [PROJECT OR SERVICE NEED, e.g., IT consulting services, commercial cleaning services]. We are extremely interested in partnering with [RECIPIENT COMPANY NAME] to help you achieve your business objectives.

Our team has extensive experience in [YOUR INDUSTRY/EXPERTISE], and we have successfully delivered similar solutions for clients facing challenges like yours. We understand that your primary goals for this project are to [RECIPIENT GOALS, e.g., reduce operational costs, increase productivity, scale your infrastructure]. Our proposed solution has been specifically designed to address these needs efficiently and cost-effectively.

Within this proposal, you will find a detailed description of our scope of work, project timeline, deliverables, and a transparent pricing structure. We pride ourselves on our high standards of quality, reliability, and dedicated customer support, which we are excited to bring to your project.

Thank you for considering [SENDER COMPANY NAME] as your partner. We welcome the opportunity to discuss this proposal in more detail and answer any questions you may have. Please feel free to contact me directly at [YOUR PHONE NUMBER] or [YOUR EMAIL ADDRESS].

Sincerely,

[YOUR SIGNATURE]

[YOUR TYPED NAME]
[YOUR TITLE]`,
  },
  {
    id: "letter-to-irs",
    title: "Letter to the IRS",
    description:
      "A formal inquiry or clarification request sent to the Internal Revenue Service regarding notices or tax transcripts.",
    category: "Official",
    icon: "Building2",
    subject: "REQUEST FOR TAX ACCOUNT TRANSCRIPT / INQUIRY ON NOTICE [NOTICE NUMBER]",
    bodyText: `[YOUR NAME]
[YOUR SOCIAL SECURITY NUMBER OR TIN]
[YOUR STREET ADDRESS]
[YOUR CITY, STATE, ZIP]
[YOUR PHONE NUMBER]
[YOUR EMAIL ADDRESS]

[DATE]

INTERNAL REVENUE SERVICE
[IRS DEPARTMENT NAME, e.g., Technical Support Division]
[IRS STREET ADDRESS]
[IRS CITY, STATE, ZIP]

Subject: REQUEST FOR TAX ACCOUNT TRANSCRIPT / INQUIRY ON NOTICE [NOTICE NUMBER]

Dear IRS Representative,

I am writing to formally request assistance regarding my federal tax account for the tax year [TAX YEAR, e.g., 2024]. Specifically, I am responding to IRS Notice [NOTICE NUMBER] dated [DATE OF NOTICE], or requesting a copy of my official tax transcript for this period.

I want to clarify an issue regarding [SUMMARY OF ISSUE, e.g., a discrepancy in my reported income, an outstanding balance, a missing refund payment]. According to my records, [EXPLANATION OF YOUR STANCE, e.g., I filed my return on April 15 and paid the full amount due of AMOUNT, which is verified by the enclosed bank statement]. I believe there may have been an administrative error or a miscommunication in processing my file.

Enclosed with this letter, you will find copies of supporting documentation, including [LIST ENCLOSURES, e.g., copy of Form 1040, canceled check, bank statement] which verify the details of my filing and payments.

I request that you review my file in light of this information, make any necessary adjustments to my account, and send me a written confirmation of the resolution. If there are any outstanding steps I need to take, please contact me immediately at [YOUR PHONE NUMBER] or in writing at the address above. Thank you for your time and assistance in resolving this matter.

Sincerely,

[YOUR SIGNATURE]

[YOUR TYPED NAME]`,
  },
  {
    id: "letter-to-court-clerk",
    title: "Letter to a Court Clerk",
    description:
      "A professional cover letter to submit legal documents, filing fees, and request stamped copies from a Court Clerk.",
    category: "Official",
    icon: "FileBadge",
    subject: "FILING OF DOCUMENTS FOR CASE NO. [CASE NUMBER] - [CASE NAME]",
    bodyText: `[YOUR NAME]
[YOUR STREET ADDRESS]
[YOUR CITY, STATE, ZIP]
[YOUR PHONE NUMBER]
[YOUR EMAIL ADDRESS]

[DATE]

Office of the Court Clerk
[NAME OF COURT, e.g., King County Superior Court]
[COURT STREET ADDRESS]
[COURT CITY, STATE, ZIP]

Subject: FILING OF DOCUMENTS FOR CASE NO. [CASE NUMBER] - [CASE NAME]

Dear Court Clerk,

I am writing to submit the enclosed legal documents for filing in connection with Case No. [CASE NUMBER], titled [CASE NAME, e.g., Smith v. Jones], currently pending before this honorable Court. I am filing these documents as the [YOUR ROLE, e.g., Plaintiff, Defendant] in this matter.

Specifically, I am submitting the following documents for filing:
1. [NAME OF FIRST DOCUMENT, e.g., Answer to Complaint]
2. [NAME OF SECOND DOCUMENT, e.g., Motion for Extension of Time]
3. [NAME OF THIRD DOCUMENT, e.g., Certificate of Service]

I have also enclosed the required filing fee of [FILING FEE AMOUNT] in the form of a [PAYMENT METHOD, e.g., cashier's check, money order] made payable to the Clerk of the Court, as well as a self-addressed, stamped envelope.

Please file the original documents and return a file-stamped copy of each document to me in the enclosed envelope for my records. If there are any issues with this filing, or if additional fees or documentation are required, please contact me immediately at [YOUR PHONE NUMBER] or via email at [YOUR EMAIL ADDRESS]. Thank you for your assistance with this filing.

Sincerely,

[YOUR SIGNATURE]

[YOUR TYPED NAME]`,
  },
  {
    id: "letter-to-landlord",
    title: "Letter to a Landlord (repair request)",
    description:
      "A formal request for necessary repairs to a rental unit, outlining landlord obligations and repair timelines.",
    category: "Official",
    icon: "Home",
    subject: "FORMAL REQUEST FOR NECESSARY REPAIRS - UNIT [UNIT NUMBER]",
    bodyText: `[YOUR NAME]
[YOUR UNIT NUMBER]
[YOUR STREET ADDRESS]
[YOUR CITY, STATE, ZIP]
[YOUR PHONE NUMBER]
[YOUR EMAIL ADDRESS]

[DATE]

[LANDLORD/PROPERTY MANAGER NAME]
[COMPANY NAME, IF APPLICABLE]
[LANDLORD STREET ADDRESS]
[LANDLORD CITY, STATE, ZIP]

Subject: FORMAL REQUEST FOR NECESSARY REPAIRS - UNIT [UNIT NUMBER]

Dear [LANDLORD/PROPERTY MANAGER NAME],

I am writing to formally request repairs to my rental unit located at [YOUR STREET ADDRESS, UNIT NUMBER]. As my landlord, you have a legal obligation to maintain the premises in a safe, habitable condition, and there are currently several issues that require your immediate attention.

Specifically, the following items are in need of urgent repair: [DESCRIBE REPAIR ISSUES IN DETAIL, e.g., the water heater is not producing hot water, there is a persistent leak in the bathroom ceiling, the kitchen window lock is broken]. These issues first arose on [DATE WHEN ISSUE STARTED] and have significantly impacted my ability to safely and comfortably use the rental property.

I have previously notified you of these issues via [PREVIOUS METHOD, e.g., phone call on July 10, text message to the maintenance line], but as of today, no repairs have been scheduled or completed.

Please contact me immediately to schedule a time for a qualified technician or repair person to inspect and resolve these issues. I expect these repairs to be completed within [NUMBER, e.g., 5] days of this notice, as required by our lease agreement and local tenant laws. Thank you for your prompt attention to this matter.

Sincerely,

[YOUR SIGNATURE]

[YOUR TYPED NAME]`,
  },
  {
    id: "letter-to-insurance",
    title: "Letter to Insurance Company (claim)",
    description:
      "A formal inquiry or appeal regarding an insurance claim, providing supporting documentation and requesting re-assessment.",
    category: "Official",
    icon: "Shield",
    subject: "FORMAL CLAIM INQUIRY / APPEAL OF CLAIM NO. [CLAIM NUMBER]",
    bodyText: `[YOUR NAME]
[YOUR POLICY NUMBER]
[YOUR STREET ADDRESS]
[YOUR CITY, STATE, ZIP]
[YOUR PHONE NUMBER]
[YOUR EMAIL ADDRESS]

[DATE]

[INSURANCE COMPANY NAME]
[CLAIMS DEPARTMENT OR ADJUSTER'S NAME]
[COMPANY STREET ADDRESS]
[COMPANY CITY, STATE, ZIP]

Subject: FORMAL CLAIM INQUIRY / APPEAL OF CLAIM NO. [CLAIM NUMBER]

Dear Claims Administrator,

I am writing to formally submit a claim/appeal regarding Claim No. [CLAIM NUMBER] under Policy No. [YOUR POLICY NUMBER]. This claim is in connection with an incident that occurred on [DATE OF INCIDENT] involving [DESCRIPTION OF INCIDENT, e.g., a multi-car auto accident, water damage from a burst pipe in my home].

According to the policy terms, this type of incident is covered under [SECTION/TYPE OF COVERAGE, e.g., comprehensive auto coverage, homeowner's hazard insurance]. I believe the assessment provided by your adjuster or the recent denial of my claim is incorrect because [REASON FOR DISPUTING, e.g., the repair estimate from my certified mechanic is significantly higher than the adjuster's estimate, the damage was not pre-existing].

Enclosed with this letter, you will find comprehensive supporting documentation, including:
1. [LIST DOCUMENTATION 1, e.g., photos of the damage]
2. [LIST DOCUMENTATION 2, e.g., independent repair estimates]
3. [LIST DOCUMENTATION 3, e.g., copy of the official police report]

I request that you review this claim in detail and re-evaluate the payout amount or reverse the denial. I look forward to your prompt written response within [NUMBER, e.g., 14] days of this letter. Please contact me if you require any additional information.

Sincerely,

[YOUR SIGNATURE]

[YOUR TYPED NAME]`,
  },
  {
    id: "letter-to-dmv",
    title: "Letter to DMV",
    description:
      "A formal request to the DMV for vehicle registration or license status verification, resolving processing discrepancies.",
    category: "Official",
    icon: "FileQuestion",
    subject: "INQUIRY REGARDING VEHICLE REGISTRATION / LICENSE STATUS - [LICENSE/VIN NUMBER]",
    bodyText: `[YOUR NAME]
[YOUR DRIVER'S LICENSE OR VIN NUMBER]
[YOUR STREET ADDRESS]
[YOUR CITY, STATE, ZIP]
[YOUR PHONE NUMBER]
[YOUR EMAIL ADDRESS]

[DATE]

Department of Motor Vehicles
[DMV BRANCH OR OFFICE NAME]
[DMV STREET ADDRESS]
[DMV CITY, STATE, ZIP]

Subject: INQUIRY REGARDING VEHICLE REGISTRATION / LICENSE STATUS - [LICENSE/VIN NUMBER]

Dear DMV Representative,

I am writing to formally request clarification and assistance regarding the status of my [DRIVING LICENSE / VEHICLE REGISTRATION] for my vehicle, a [VEHICLE MAKE, MODEL, AND YEAR], with License Plate No. [PLATE NUMBER] and VIN [VIN NUMBER].

Recently, on [DATE OF ISSUE OR NOTICE], I received a notice or encountered an issue regarding [SUMMARY OF ISSUE, e.g., an outstanding registration renewal fee, a notice of license suspension, or a delay in receiving my new title]. My records indicate that I have met all necessary requirements, including [EXPLANATION OF STEPS TAKEN, e.g., completing the emissions test on June 1 and paying the renewal fee online on June 5].

I believe there may be a processing delay or an error in my file. To assist in resolving this, I have enclosed copies of my [ENCLOSED DOCUMENTS, e.g., online payment receipt, emissions certificate, copy of current driver's license].

I request that you review this information and update my record accordingly. Please send a written confirmation of the updated status or let me know if I need to visit a branch office to complete this transaction. Thank you for your assistance.

Sincerely,

[YOUR SIGNATURE]

[YOUR TYPED NAME]`,
  },
];
