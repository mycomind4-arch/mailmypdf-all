/**
 * Individual Workflow Page
 * Detailed guide, step-by-step instructions, and CTAs for each workflow
 * SEO optimized with schema.org HowTo markup
 */

import { createFileRoute } from '@tanstack/react-router';
import { getWorkflowById, WORKFLOWS } from '../../domain/workflows';
import { generateWorkflowSchema } from '../../lib/seo';

export const Route = createFileRoute('/workflows/$workflowId')({
  component: WorkflowPage,
  meta: ({ params }) => {
    const workflow = getWorkflowById(params.workflowId);
    if (!workflow) return [];
    return [
      { title: workflow.seoTitle },
      { name: 'description', content: workflow.seoDescription },
      { name: 'keywords', content: workflow.keywords.join(', ') },
      { name: 'canonical', content: workflow.canonicalUrl },
      { property: 'og:title', content: workflow.seoTitle },
      { property: 'og:description', content: workflow.seoDescription },
      {
        name: 'script',
        type: 'application/ld+json',
        innerHTML: JSON.stringify(generateWorkflowSchema(workflow)),
      },
    ];
  },
});

function WorkflowPage() {
  const { workflowId } = Route.useParams();
  const workflow = getWorkflowById(workflowId);

  if (!workflow) {
    return (
      <div className="min-h-screen bg-white py-12 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Workflow Not Found</h1>
          <p className="text-gray-600 mb-8">We couldn't find the workflow you're looking for.</p>
          <a href="/workflows" className="text-indigo-600 hover:text-indigo-700 font-medium">
            ← Back to Workflows
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-indigo-600 to-blue-600 text-white py-12 px-4 md:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-4 mb-4">
            <span className="text-5xl">{workflow.icon}</span>
            <div>
              <h1 className="text-4xl font-bold">{workflow.name}</h1>
              <p className="text-lg opacity-90">{workflow.description}</p>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-4 mt-8 pt-8 border-t border-indigo-400">
            <div>
              <div className="text-sm opacity-75">Time to Complete</div>
              <div className="text-2xl font-bold">{workflow.timeToComplete}</div>
            </div>
            <div>
              <div className="text-sm opacity-75">Difficulty</div>
              <div className="text-2xl font-bold capitalize">{workflow.difficulty}</div>
            </div>
            <div>
              <div className="text-sm opacity-75">Search Interest</div>
              <div className="text-2xl font-bold">
                {workflow.searchVolume ? `${(workflow.searchVolume / 1000).toFixed(1)}K/mo` : 'Growing'}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="max-w-4xl mx-auto px-4 md:px-8 py-12">
        {/* Overview */}
        <div className="mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">About This Workflow</h2>
          <p className="text-lg text-gray-700 mb-4">{workflow.longDescription}</p>

          {/* Key Benefits */}
          <div className="bg-indigo-50 border-l-4 border-indigo-600 p-6 rounded-r-lg">
            <h3 className="text-lg font-bold text-gray-900 mb-3">What You'll Get</h3>
            <ul className="space-y-2 text-gray-700">
              <li>✓ Professional documents tailored to your situation</li>
              <li>✓ Step-by-step guidance through the entire process</li>
              <li>✓ Expert-reviewed content and strategies</li>
              <li>✓ Mobile-friendly access from anywhere</li>
            </ul>
          </div>
        </div>

        {/* Step-by-Step Guide */}
        <div className="mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-8">How It Works</h2>
          <div className="space-y-6">
            {WORKFLOW_STEPS[workflowId]?.steps.map((step, index) => (
              <div key={index} className="flex gap-4">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 bg-indigo-600 text-white rounded-full flex items-center justify-center font-bold">
                    {index + 1}
                  </div>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">{step.title}</h3>
                  <p className="text-gray-700">{step.description}</p>
                </div>
              </div>
            )) || <p className="text-gray-600">Steps coming soon</p>}
          </div>
        </div>

        {/* FAQ */}
        <div className="mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-8">Frequently Asked Questions</h2>
          <div className="space-y-4">
            {WORKFLOW_FAQS[workflowId]?.map((faq, i) => (
              <details key={i} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                <summary className="font-bold text-gray-900 cursor-pointer">{faq.question}</summary>
                <p className="mt-3 text-gray-600">{faq.answer}</p>
              </details>
            )) || <p className="text-gray-600">FAQs coming soon</p>}
          </div>
        </div>

        {/* Who Needs This */}
        <div className="mb-12 bg-gray-50 p-8 rounded-lg">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Who Should Use This?</h2>
          <p className="text-gray-700">{WORKFLOW_PERSONAS[workflowId]?.description || 'Anyone dealing with this situation'}</p>
        </div>

        {/* Required Info */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">What You'll Need</h2>
          <ul className="space-y-2 text-gray-700">
            {WORKFLOW_REQUIREMENTS[workflowId]?.map((req, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="text-indigo-600 mt-1">•</span>
                <span>{req}</span>
              </li>
            )) || <li>Information gathering list coming soon</li>}
          </ul>
        </div>

        {/* CTA */}
        <div className="bg-gradient-to-r from-indigo-600 to-blue-600 text-white rounded-lg p-8 text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">Ready to Get Started?</h2>
          <p className="text-lg opacity-90 mb-8">
            Complete this {workflow.timeToComplete.toLowerCase()} workflow to generate professional documents
          </p>
          <button className="inline-block px-8 py-3 bg-white text-indigo-600 font-bold rounded-lg hover:bg-gray-100 transition-colors">
            Start Workflow
          </button>
        </div>

        {/* Related Workflows */}
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Related Workflows</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.values(WORKFLOWS)
              .filter(w => w.category === workflow.category && w.id !== workflow.id)
              .slice(0, 2)
              .map(related => (
                <a
                  key={related.id}
                  href={related.canonicalUrl}
                  className="block p-4 border border-gray-200 rounded-lg hover:shadow-lg hover:border-indigo-300 transition-all"
                >
                  <div className="flex items-start gap-3">
                    <span className="text-3xl">{related.icon}</span>
                    <div>
                      <h3 className="font-bold text-gray-900 hover:text-indigo-600">{related.name}</h3>
                      <p className="text-sm text-gray-600">{related.description}</p>
                    </div>
                  </div>
                </a>
              ))}
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="bg-gray-50 py-12 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Questions?</h2>
          <p className="text-gray-600 mb-6">Contact our support team for help with this workflow</p>
          <a href="/contact" className="text-indigo-600 hover:text-indigo-700 font-medium">
            Get Help →
          </a>
        </div>
      </section>
    </div>
  );
}

// Workflow-specific content (populated per workflow)
const WORKFLOW_STEPS: Record<string, { steps: Array<{ title: string; description: string }> }> = {
  'insurance-appeal': {
    steps: [
      {
        title: 'Gather Your Documents',
        description: 'Collect your original claim, denial letter, medical records, and any supporting evidence.',
      },
      {
        title: 'Document Your Appeal',
        description: 'Answer guided questions about your situation and the reasons for the denial.',
      },
      {
        title: 'Build Your Case',
        description: 'Organize evidence, timeline, and arguments into a compelling appeal package.',
      },
      {
        title: 'Generate Appeal Letter',
        description: 'Create a professional appeal letter addressing specific claim denial reasons.',
      },
    ],
  },
  'unemployment-appeal': {
    steps: [
      {
        title: 'Review Denial Notice',
        description: 'Understand the specific reasons for your unemployment benefits denial.',
      },
      {
        title: 'Document Your Employment',
        description: 'Provide employment history, separation details, and relevant employment records.',
      },
      {
        title: 'Build Your Defense',
        description: 'Gather evidence supporting your case (emails, contracts, witness statements).',
      },
      {
        title: 'Submit Appeal',
        description: 'File your formal appeal with supporting documentation through the proper channel.',
      },
    ],
  },
  'eviction-response': {
    steps: [
      {
        title: 'Review Eviction Notice',
        description: 'Understand the type of notice (Pay/Quit, Cure/Quit, Unconditional Quit) and deadline.',
      },
      {
        title: 'Research Your Rights',
        description: 'Review local tenant laws and potential defenses to the eviction.',
      },
      {
        title: 'Gather Evidence',
        description: 'Collect lease, payment records, communications, and proof of conditions.',
      },
      {
        title: 'File Your Response',
        description: 'Generate and file your formal legal response within the required timeframe.',
      },
    ],
  },
  'credit-dispute': {
    steps: [
      {
        title: 'Identify Errors',
        description: 'Review your credit report and identify inaccurate items you want to dispute.',
      },
      {
        title: 'Gather Documentation',
        description: 'Collect proof of correct information, payment records, or identity theft evidence.',
      },
      {
        title: 'Generate Dispute Letters',
        description: 'Create FCRA-compliant dispute letters for each inaccuracy.',
      },
      {
        title: 'Submit Disputes',
        description: 'Send disputes to credit bureaus via certified mail with proof of delivery.',
      },
    ],
  },
};

const WORKFLOW_FAQS: Record<string, Array<{ question: string; answer: string }>> = {
  'insurance-appeal': [
    {
      question: 'How long does an appeal usually take?',
      answer:
        'Most insurance appeals take 30-60 days after submission. Some insurers require a formal review process that can take up to 90 days. Check your denial letter for specific timelines.',
    },
    {
      question: 'Do I need a lawyer to appeal?',
      answer:
        'No, you can appeal on your own. However, for complex claims or high-value denials, consulting an attorney may increase your chances of success.',
    },
    {
      question: 'What if my appeal is denied again?',
      answer:
        'You may have additional appeal options, or can pursue external review through your state insurance commissioner or file a complaint with your state department of insurance.',
    },
  ],
  'eviction-response': [
    {
      question: 'How much time do I have to respond?',
      answer:
        'This depends on your state and type of notice. Most jurisdictions require a response within 5-10 days. Check your local laws immediately—missing the deadline can result in a default judgment.',
    },
    {
      question: 'Can I stay if I pay the rent?',
      answer:
        'If you received a Pay/Quit notice, yes—paying the full amount due (including late fees) may resolve the eviction. If you received an Unconditional Quit or Cure/Quit, it depends on your state laws.',
    },
    {
      question: 'What if I can\'t afford a lawyer?',
      answer:
        'Many areas have free legal aid services for eviction defense. Contact your local legal aid society or tenant rights organization for assistance.',
    },
  ],
};

const WORKFLOW_PERSONAS: Record<string, { description: string }> = {
  'insurance-appeal': {
    description:
      'Anyone who has received a claim denial from their health, auto, home, or other insurance provider and believes the denial was made in error or unfairly.',
  },
  'unemployment-appeal': {
    description:
      'Workers who have been denied unemployment benefits and believe they qualify. This includes those denied due to job loss, voluntary departure disputes, or eligibility questions.',
  },
  'eviction-response': {
    description:
      'Tenants who have received an eviction notice and want to fight the eviction or buy time to move. Includes those with valid defenses and those needing to negotiate with landlords.',
  },
  'credit-dispute': {
    description:
      'Anyone with errors on their credit report, including victims of identity theft, those disputing inaccurate accounts, or challenging incorrect payment histories.',
  },
};

const WORKFLOW_REQUIREMENTS: Record<string, string[]> = {
  'insurance-appeal': [
    'Original claim denial letter',
    'Claim number and policy information',
    'Relevant medical records or documentation',
    'Evidence supporting your appeal (emails, contracts, etc.)',
    'Previous correspondence with the insurer',
  ],
  'unemployment-appeal': [
    'Denial notice from unemployment office',
    'Employment termination letter or last pay stub',
    'Documentation of reason for job loss',
    'Employment contract or offer letter',
    'Any communications about the job separation',
  ],
  'eviction-response': [
    'Eviction notice document (entire notice)',
    'Lease agreement',
    'Payment records and history',
    'Any communications with landlord',
    'Proof of habitability issues (if applicable)',
    'Photos of unit condition',
  ],
  'credit-dispute': [
    'Copy of your credit report',
    'Identification and proof of address',
    'Documentation proving the error (statements, receipts, etc.)',
    'If identity theft: police report or FTC identity theft report',
    'Any previous correspondence with creditors',
  ],
};

export { WORKFLOWS };
