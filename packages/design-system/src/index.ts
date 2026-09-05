export const mailMyPdfTokens = {
  color: {
    ink: '#142638',
    inkMuted: '#5f6973',
    paper: '#f8f4ec',
    paperDeep: '#efe8dc',
    surface: '#fffdf9',
    surfaceRaised: '#ffffff',
    border: '#ded6c8',
    borderStrong: '#c9bdab',
    navy: '#10283d',
    navyHover: '#0b2032',
    navySoft: '#e8eef2',
    brass: '#a27b3f',
    brassSoft: '#f2e8d5',
    success: '#26744b',
    successSoft: '#edf7f0',
    warning: '#a86216',
    warningSoft: '#fff4df',
    danger: '#a33a32',
    dangerSoft: '#fdf0ee',
    info: '#315f88',
    infoSoft: '#edf4f9',
    focus: '#7ba3c4'
  },
  typography: {
    display: '"Instrument Serif", ui-serif, Georgia, Cambria, "Times New Roman", serif',
    body: 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    mono: '"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
    size: { xs: '0.75rem', sm: '0.875rem', md: '1rem', lg: '1.125rem', xl: '1.375rem', xxl: '1.75rem', display: 'clamp(3rem, 7vw, 6.5rem)' },
    weight: { regular: 400, medium: 500, semibold: 600, bold: 700 }
  },
  radius: { sm: '0.375rem', md: '0.625rem', lg: '0.875rem', xl: '1.125rem', pill: '999px' },
  spacing: { xs: '0.25rem', sm: '0.5rem', md: '1rem', lg: '1.5rem', xl: '2rem', xxl: '3rem', xxxl: '4rem', section: 'clamp(4rem, 8vw, 8rem)' },
  shadow: { sm: '0 1px 2px rgba(16,40,61,.05)', md: '0 12px 32px -18px rgba(16,40,61,.22)', lg: '0 28px 64px -28px rgba(16,40,61,.30)' },
  motion: { fast: '120ms', normal: '180ms', slow: '260ms' },
  layout: { maxContent: '1320px', reading: '760px', sidebar: '256px', topbar: '64px' },
  z: { base: 0, sticky: 10, dropdown: 20, modal: 40, toast: 60 }
} as const;

export type EcosystemTheme =
  | 'mailmypdf'
  | 'appeal-mail'
  | 'benefits-appeal'
  | 'claim-proof'
  | 'code-enforcement'
  | 'dispute-mail'
  | 'immigration-mail'
  | 'insurance-claims'
  | 'notice-respond'
  | 'permit-reply'
  | 'private-office'
  | 'records-request'
  | 'small-business'
  | 'tenant-reply';

export type VerticalTone = 'core' | 'appeal' | 'civic' | 'correspondence' | 'dispute' | 'private' | 'business' | 'proof';

export interface VerticalThemeConfig {
  id: EcosystemTheme;
  accent: string;
  accentSoft: string;
  displayName: string;
  tone: VerticalTone;
}

export const ecosystemThemes: Record<EcosystemTheme, Omit<VerticalThemeConfig, 'id'>> = {
  mailmypdf: { accent: '#10283d', accentSoft: '#e8eef2', displayName: 'MailMyPDF', tone: 'core' },
  'appeal-mail': { accent: '#9a6a2f', accentSoft: '#f3e9d8', displayName: 'Appeal Mail', tone: 'appeal' },
  'benefits-appeal': { accent: '#7a6336', accentSoft: '#f3ecdc', displayName: 'Benefits Appeal', tone: 'appeal' },
  'claim-proof': { accent: '#466456', accentSoft: '#eaf1ed', displayName: 'Claim Proof', tone: 'proof' },
  'code-enforcement': { accent: '#7b5338', accentSoft: '#f2e7df', displayName: 'Code Enforcement', tone: 'civic' },
  'dispute-mail': { accent: '#6d526f', accentSoft: '#f0e9f1', displayName: 'Dispute Mail', tone: 'dispute' },
  'immigration-mail': { accent: '#8b6c39', accentSoft: '#f4ebdb', displayName: 'Immigration Mail', tone: 'correspondence' },
  'insurance-claims': { accent: '#3f6479', accentSoft: '#e8f0f4', displayName: 'Insurance Claims', tone: 'proof' },
  'notice-respond': { accent: '#315f75', accentSoft: '#e7f0f4', displayName: 'Notice Respond', tone: 'civic' },
  'permit-reply': { accent: '#6d6045', accentSoft: '#f1ede4', displayName: 'Permit Reply', tone: 'civic' },
  'private-office': { accent: '#705d48', accentSoft: '#efe9e1', displayName: 'Private Office', tone: 'private' },
  'records-request': { accent: '#426477', accentSoft: '#e7eff3', displayName: 'Records Requests', tone: 'civic' },
  'small-business': { accent: '#446b5b', accentSoft: '#e8f1ed', displayName: 'Small Business', tone: 'business' },
  'tenant-reply': { accent: '#76544b', accentSoft: '#f1e8e5', displayName: 'Tenant Reply', tone: 'civic' },
};

export function getVerticalTheme(id: EcosystemTheme): VerticalThemeConfig {
  return { id, ...ecosystemThemes[id] };
}

export const publicPagePrimitives = [
  'GlobalHeader',
  'VerticalHero',
  'TrustStrip',
  'FeaturedWorkflows',
  'WorkflowCategories',
  'DocumentIdentifier',
  'HowItWorks',
  'ProductDemonstration',
  'WhyThisProduct',
  'SecuritySection',
  'PricingSection',
  'FaqSection',
  'RelatedWorkflows',
  'FinalCta',
  'GlobalFooter',
] as const;

export const workspacePrimitives = [
  'AppShell',
  'ProductSidebar',
  'WorkspaceTopbar',
  'WorkflowHub',
  'MatterOverview',
  'SecureDocumentUpload',
  'DocumentViewer',
  'ExtractedFacts',
  'DeadlineCard',
  'EvidenceManager',
  'AiAnalysis',
  'DraftEditor',
  'PreflightReview',
  'PacketPreview',
  'ApprovalGate',
  'MailOptions',
  'Checkout',
  'TrackingTimeline',
  'ProofArchive',
] as const;

export * from './public-page.js'
export * from './workspace.js'
export * from './workflow-hub.js'
export * from './workflow-directory.js'
