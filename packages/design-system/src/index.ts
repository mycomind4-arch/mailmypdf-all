export const mailMyPdfTokens = {
  color: {
    ink: '#111827',
    inkMuted: '#667085',
    surface: '#ffffff',
    surfaceMuted: '#f7f8fa',
    surfaceRaised: '#ffffff',
    border: '#e4e7ec',
    borderStrong: '#cfd4dc',
    brand: '#315efb',
    brandHover: '#2449d8',
    brandSoft: '#eef2ff',
    success: '#16834b',
    successSoft: '#ecfdf3',
    warning: '#b54708',
    warningSoft: '#fffaeb',
    danger: '#b42318',
    dangerSoft: '#fef3f2',
    info: '#175cd3',
    infoSoft: '#eff8ff',
    focus: '#84a9ff'
  },
  typography: {
    display: 'ui-serif, Georgia, Cambria, "Times New Roman", serif',
    body: 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    mono: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
    size: { xs: '0.75rem', sm: '0.875rem', md: '1rem', lg: '1.125rem', xl: '1.375rem', xxl: '1.75rem', display: '2.5rem' },
    weight: { regular: 400, medium: 500, semibold: 600, bold: 700 }
  },
  radius: { sm: '0.375rem', md: '0.625rem', lg: '0.875rem', xl: '1.125rem', pill: '999px' },
  spacing: { xs: '0.25rem', sm: '0.5rem', md: '1rem', lg: '1.5rem', xl: '2rem', xxl: '3rem', xxxl: '4rem' },
  shadow: { sm: '0 1px 2px rgba(16,24,40,.06)', md: '0 8px 24px rgba(16,24,40,.08)', lg: '0 20px 50px rgba(16,24,40,.10)' },
  motion: { fast: '120ms', normal: '180ms', slow: '260ms' },
  layout: { maxContent: '1200px', sidebar: '256px', topbar: '64px' },
  z: { base: 0, sticky: 10, dropdown: 20, modal: 40, toast: 60 }
} as const;

export type EcosystemTheme = 'mailmypdf' | 'immigration-mail' | 'small-business' | 'government';

export const ecosystemThemes = {
  'mailmypdf': { accent: mailMyPdfTokens.color.brand, accentSoft: mailMyPdfTokens.color.brandSoft },
  'immigration-mail': { accent: '#6941c6', accentSoft: '#f4f3ff' },
  'small-business': { accent: '#0e9384', accentSoft: '#ecfdf3' },
  'government': { accent: '#175cd3', accentSoft: '#eff8ff' }
} as const;

export interface VerticalThemeConfig {
  id: EcosystemTheme;
  accent: string;
  accentSoft: string;
  displayName: string;
  tone: 'core' | 'professional' | 'civic';
}

export function getVerticalTheme(id: EcosystemTheme): VerticalThemeConfig {
  const theme = ecosystemThemes[id];
  const displayName = id === 'mailmypdf' ? 'MailMyPDF' : id === 'small-business' ? 'MailMyPDF Small Business' : id === 'immigration-mail' ? 'Immigration Mail' : 'Government';
  const tone = id === 'mailmypdf' ? 'core' : id === 'government' ? 'civic' : 'professional';
  return { id, ...theme, displayName, tone };
}
