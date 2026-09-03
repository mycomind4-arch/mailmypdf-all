/**
 * Category Landing Pages
 * Grouping workflows by category for better discovery
 */

import { createFileRoute } from '@tanstack/react-router';
import { WORKFLOWS, WORKFLOW_CATEGORIES, WorkflowCategory, getWorkflowsByCategory } from '../../domain/workflows';
import { generateSEOMeta } from '../../lib/seo';

export const Route = createFileRoute('/workflows/$category')({
  component: CategoryPage,
});

function CategoryPage() {
  const { category } = Route.useParams();
  const categoryInfo = WORKFLOW_CATEGORIES[category as WorkflowCategory];
  const workflows = getWorkflowsByCategory(category as WorkflowCategory);

  if (!categoryInfo || workflows.length === 0) {
    return (
      <div className="min-h-screen bg-white py-12 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Category Not Found</h1>
          <a href="/workflows" className="text-indigo-600 hover:text-indigo-700 font-medium">
            ← Back to Workflows
          </a>
        </div>
      </div>
    );
  }

  const categoryContent = CATEGORY_CONTENT[category as WorkflowCategory];

  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <section className="bg-gradient-to-r from-indigo-600 to-blue-600 text-white py-12 px-4 md:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-4 mb-4">
            <span className="text-5xl">{categoryInfo.icon}</span>
            <div>
              <h1 className="text-4xl font-bold">{categoryInfo.name}</h1>
              <p className="text-lg opacity-90">{categoryInfo.description}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Workflows in Category */}
      <section className="max-w-4xl mx-auto px-4 md:px-8 py-12">
        <h2 className="text-3xl font-bold text-gray-900 mb-8">Workflows in This Category</h2>
        <div className="space-y-6">
          {workflows.map(workflow => (
            <a
              key={workflow.id}
              href={workflow.canonicalUrl}
              className="block border border-gray-200 rounded-lg p-6 hover:shadow-lg hover:border-indigo-300 transition-all"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start gap-4">
                  <span className="text-4xl">{workflow.icon}</span>
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900 hover:text-indigo-600">{workflow.name}</h3>
                    <p className="text-gray-600 mt-1">{workflow.description}</p>
                  </div>
                </div>
                <span className="inline-block px-3 py-1 bg-indigo-50 text-indigo-700 text-xs font-semibold rounded-full whitespace-nowrap">
                  {workflow.difficulty.toUpperCase()}
                </span>
              </div>

              <div className="flex items-center justify-between text-sm text-gray-500 mt-4 pt-4 border-t border-gray-100">
                <span>⏱️ {workflow.timeToComplete}</span>
                {workflow.searchVolume && <span>📈 {workflow.searchVolume.toLocaleString()} searches/mo</span>}
                <span className="text-indigo-600 font-medium">Start Workflow →</span>
              </div>
            </a>
          ))}
        </div>
      </section>

      {/* Category Info */}
      {categoryContent && (
        <section className="bg-gray-50 py-12 px-4 md:px-8">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold text-gray-900 mb-6">About {categoryInfo.name}</h2>
            <div className="prose prose-lg max-w-none">
              <p className="text-gray-700 mb-4">{categoryContent.overview}</p>

              {categoryContent.commonIssues && (
                <>
                  <h3 className="text-2xl font-bold text-gray-900 mt-8 mb-4">Common Issues</h3>
                  <ul className="space-y-2">
                    {categoryContent.commonIssues.map((issue, i) => (
                      <li key={i} className="text-gray-700 flex items-start gap-3">
                        <span className="text-indigo-600 mt-1">•</span>
                        <span>{issue}</span>
                      </li>
                    ))}
                  </ul>
                </>
              )}

              {categoryContent.tips && (
                <>
                  <h3 className="text-2xl font-bold text-gray-900 mt-8 mb-4">Tips & Best Practices</h3>
                  <ul className="space-y-2">
                    {categoryContent.tips.map((tip, i) => (
                      <li key={i} className="text-gray-700 flex items-start gap-3">
                        <span className="text-green-600 mt-1">✓</span>
                        <span>{tip}</span>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          </div>
        </section>
      )}

      {/* FAQ */}
      <section className="max-w-4xl mx-auto px-4 md:px-8 py-12">
        <h2 className="text-3xl font-bold text-gray-900 mb-8">Frequently Asked Questions</h2>
        <div className="space-y-4">
          {categoryContent?.faqs?.map((faq, i) => (
            <details key={i} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
              <summary className="font-bold text-gray-900 cursor-pointer">{faq.question}</summary>
              <p className="mt-3 text-gray-600">{faq.answer}</p>
            </details>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="bg-gradient-to-r from-indigo-600 to-blue-600 text-white py-12 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Get Started?</h2>
          <p className="text-lg opacity-90 mb-8">Choose a workflow above to begin automating your documents</p>
          <a
            href="/workflows"
            className="inline-block px-8 py-3 bg-white text-indigo-600 font-bold rounded-lg hover:bg-gray-100 transition-colors"
          >
            Browse All Workflows
          </a>
        </div>
      </section>
    </div>
  );
}

const CATEGORY_CONTENT: Record<
  WorkflowCategory,
  {
    overview: string;
    commonIssues?: string[];
    tips?: string[];
    faqs?: Array<{ question: string; answer: string }>;
  }
> = {
  appeals: {
    overview:
      'Appeals are formal requests to reconsider denied claims or benefits. Whether your insurance claim, unemployment benefits, or financial aid was denied, MailMyPDF helps you build a compelling case with documentation and persuasive arguments.',
    commonIssues: [
      'Insurance companies denying legitimate claims',
      'Unemployment agencies questioning job loss eligibility',
      'Financial aid offices withholding education funds',
      'Benefits programs denying entitled support',
    ],
    tips: [
      'Act quickly—most appeals have strict deadlines (30-60 days)',
      'Gather all supporting documentation immediately',
      'Follow the specific appeal instructions from the denial letter',
      'Address each reason for denial in your appeal',
      'Keep copies of everything you submit',
    ],
    faqs: [
      {
        question: 'How long does an appeal typically take?',
        answer: 'Most appeals take 30-90 days. Check your denial letter for the specific timeline.',
      },
      {
        question: 'Can I appeal if I miss the deadline?',
        answer: 'Some jurisdictions allow late appeals if you show good cause. Contact the issuing organization immediately if you missed the deadline.',
      },
      {
        question: 'Do I need a lawyer?',
        answer: 'Not necessarily, but complex appeals benefit from legal review. Many legal aid organizations offer free assistance.',
      },
    ],
  },

  disputes: {
    overview:
      'Debt disputes and credit challenges help you correct inaccuracies on credit reports and challenge invalid debts. Under the Fair Credit Reporting Act (FCRA), you have the right to dispute errors and demand proof of debt.',
    commonIssues: [
      'Credit report errors and inaccuracies',
      'Accounts opened through identity theft',
      'Debts past the statute of limitations',
      'Collections activity for invalid debts',
      'Incorrect payment histories',
    ],
    tips: [
      'Get your free credit report from AnnualCreditReport.com',
      'Document all errors before disputing',
      'Send disputes via certified mail with proof of delivery',
      'Keep detailed records of all communications',
      'Follow up if disputes aren\'t resolved within 30-45 days',
    ],
    faqs: [
      {
        question: 'How long does a credit dispute take?',
        answer: 'Credit bureaus typically have 30 days to investigate. Some issues resolve faster, others may take 45-60 days.',
      },
      {
        question: 'Will disputing hurt my credit?',
        answer: 'No. Disputing inaccuracies may actually improve your credit by removing negative items.',
      },
    ],
  },

  permits: {
    overview:
      'Permit and code enforcement issues require quick, informed responses. MailMyPDF helps you appeal permit denials, request variances, and respond to code violations with properly documented arguments.',
    commonIssues: [
      'Building permit denials',
      'Zoning violations',
      'Code enforcement citations',
      'Variance request rejections',
      'Municipal compliance issues',
    ],
    tips: [
      'Review the specific denial reasons carefully',
      'Research local zoning laws and precedents',
      'Gather engineering and architectural support',
      'Document compliance efforts',
      'Respond within required timeframes',
    ],
    faqs: [
      {
        question: 'Can I appeal a permit denial?',
        answer: 'Yes, most jurisdictions allow appeals. Follow the process outlined in your denial letter.',
      },
    ],
  },

  tenant: {
    overview:
      'Tenant rights are crucial when facing eviction or housing issues. MailMyPDF helps you respond to eviction notices, demand repairs, and protect your tenancy with legally sound documents.',
    commonIssues: [
      'Unlawful eviction notices',
      'Landlord retaliation',
      'Uninhabitable conditions',
      'Illegal lease terms',
      'Security deposit disputes',
    ],
    tips: [
      'Know your local tenant laws immediately',
      'Respond to eviction notices by the deadline',
      'Document all communications with your landlord',
      'Take photos of habitability issues',
      'Seek free legal aid if needed',
    ],
    faqs: [
      {
        question: 'What should I do if I receive an eviction notice?',
        answer: 'Act immediately. Review the type of notice, understand your local laws, and respond within the required timeframe (typically 5-10 days).',
      },
    ],
  },

  immigration: {
    overview:
      'Immigration processes are complex but manageable with proper guidance. MailMyPDF helps you prepare for USCIS appointments, respond to requests for evidence, and navigate the immigration system.',
    commonIssues: [
      'USCIS biometric appointment preparation',
      'Request for Evidence (RFE) responses',
      'I-485 adjustment of status preparation',
      'I-864 affidavit of support',
      'Green card application questions',
    ],
    tips: [
      'Keep all USCIS correspondence together',
      'Respond to RFEs quickly and completely',
      'Bring all required documents to appointments',
      'Use certified mail for submissions',
      'Keep copies of everything',
    ],
    faqs: [
      {
        question: 'What should I bring to my biometric appointment?',
        answer: 'Bring your notice of appointment, valid ID, and any documents USCIS requested.',
      },
    ],
  },

  requests: {
    overview:
      'Public records and FOIA requests give you access to government and corporate records. MailMyPDF automates the request process to ensure compliance with legal requirements.',
    commonIssues: [
      'Accessing government records',
      'Requesting personal data under CCPA',
      'FOIA request denials',
      'Missing or incomplete records',
      'Excessive fees for records',
    ],
    tips: [
      'Be specific about the records you\'re requesting',
      'Know your local deadlines (typically 20-30 days)',
      'Send requests via certified mail',
      'Document submission and responses',
      'Appeal if requests are denied',
    ],
    faqs: [
      {
        question: 'How long does a FOIA request take?',
        answer: 'Federal agencies typically have 20 business days. State and local times vary.',
      },
    ],
  },

  claims: {
    overview:
      'Insurance claims require organization and documentation. Whether filing a new claim or organizing evidence for a case, MailMyPDF helps you build comprehensive claim packages.',
    commonIssues: [
      'Underinsurance and coverage gaps',
      'Documentation requirements',
      'Claim organization challenges',
      'Evidence gathering for litigation',
      'Insurance disputes',
    ],
    tips: [
      'Document claims immediately with photos',
      'Keep receipts and estimates',
      'Report losses promptly to your insurer',
      'Follow claim filing procedures exactly',
      'Keep detailed records of all communications',
    ],
    faqs: [
      {
        question: 'What should I do immediately after a loss?',
        answer: 'Document the damage with photos, notify your insurance company, file a police report if needed, and gather receipts and estimates.',
      },
    ],
  },

  litigation: {
    overview:
      'Legal cases require thorough evidence organization. MailMyPDF helps you catalog evidence, create case summaries, and organize complex litigation materials.',
    commonIssues: [
      'Evidence management for cases',
      'Case timeline organization',
      'Document organization for discovery',
      'Evidence index creation',
      'Chronology compilation',
    ],
    tips: [
      'Organize evidence chronologically',
      'Create detailed indices',
      'Preserve original documents',
      'Document chain of custody',
      'Work with your attorney on organization',
    ],
    faqs: [
      {
        question: 'How should I organize evidence?',
        answer: 'Chronologically by date, with clear labeling and indexing. Create both physical and digital copies.',
      },
    ],
  },

  business: {
    overview:
      'Small businesses need reliable templates and documents. MailMyPDF provides business-ready templates for contracts, agreements, and operational documents.',
    commonIssues: [
      'Contract creation',
      'Terms and conditions drafting',
      'Employee agreements',
      'Policy development',
      'Operational documentation',
    ],
    tips: [
      'Customize all templates for your specific situation',
      'Have contracts reviewed by an attorney',
      'Keep updated versions of all documents',
      'Document policy implementations',
      'Train staff on policies and procedures',
    ],
    faqs: [
      {
        question: 'Should I have an attorney review these templates?',
        answer: 'Yes, especially for contracts and employment agreements. Templates provide a good starting point, but attorney review ensures legal compliance.',
      },
    ],
  },
};
