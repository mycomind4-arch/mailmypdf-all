import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { HeadContent, Outlet, Scripts, createRootRouteWithContext, Link, useLocation } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import '../../../../../packages/design-system/src/tokens.css'
import '../../../../../packages/design-system/src/patterns.css'
import { AuthProvider, useAuth } from '@/lib/auth'

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'Benefits Appeal | MailMyPDF' },
      { name: 'description', content: 'Structured workflows for appealing denied benefits, organizing evidence, preparing a supported response, and mailing it with proof.' },
      { name: 'robots', content: 'index,follow' },
    ],
    links: [
      { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
      { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossOrigin: 'anonymous' },
      { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Inter:wght@400;500;600;700;800&display=swap' },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
})

function RootShell({ children }: { children: ReactNode }) {
  return <html lang='en'><head><HeadContent /></head><body data-mmp-theme='benefits-appeal'>{children}<Scripts /></body></html>
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext()
  return <QueryClientProvider client={queryClient}><AuthProvider><ProtectedContent /></AuthProvider></QueryClientProvider>
}

function ProtectedContent() {
  const { user, loading, isConfigured } = useAuth()
  const location = useLocation()
  const path = location.pathname
  const isWorkflowLanding = /^\/workflows\/[^/]+\/?$/.test(path)
  const needsAuth = (path.startsWith('/workflows/') && !isWorkflowLanding) || path === '/dashboard'
  if (!needsAuth) return <Outlet />
  if (loading) return <Gate loading />
  if (!isConfigured || !user) return <Gate />
  return <Outlet />
}

function Gate({ loading = false }: { loading?: boolean }) {
  const location = useLocation()
  const returnTo = encodeURIComponent(location.pathname + location.search)
  return <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24, background: 'var(--mmp-paper)', color: 'var(--mmp-ink)' }}><section className='card' style={{ maxWidth: 620, width: '100%', padding: 40, textAlign: 'center' }}><div className='eyebrow'>MailMyPDF Account</div><h1 style={{ fontFamily: 'var(--mmp-font-display)', fontSize: 48, margin: '16px 0 8px' }}>{loading ? 'Loading your account…' : 'Sign in to start this workflow'}</h1><p className='muted' style={{ lineHeight: 1.7 }}>{loading ? 'Checking your account session.' : 'Workflow intake, uploaded documents, analysis, drafts, and mailing records are private to your account.'}</p>{!loading && <Link className='btn btn-primary' style={{ marginTop: 24 }} to={`/auth?returnTo=${returnTo}` as never}>Sign in or create an account →</Link>}</section></main>
}
