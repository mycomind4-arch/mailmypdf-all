import { createRootRouteWithContext, HeadContent, Outlet, Scripts, Link, useLocation } from '@tanstack/react-router'
import type { QueryClient } from '@tanstack/react-query'
import { QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider, useAuth } from '@/src/lib/auth'
import '../../../../../packages/design-system/src/tokens.css'
import '../../../../../packages/design-system/src/patterns.css'
import '../styles.css'

export const Route=createRootRouteWithContext<{queryClient:QueryClient}>()({head:()=>({meta:[{title:'Insurance Claims | MailMyPDF'},{name:'description',content:'Structured insurance claim, denial, dispute and appeal workflows.'},{name:'robots',content:'index,follow'}]}),shellComponent:({children})=><html><head><HeadContent/></head><body>{children}<Scripts/></body></html>,component:Root})
function Root(){const{queryClient}=Route.useRouteContext();return <QueryClientProvider client={queryClient}><AuthProvider><div data-mmp-theme='insurance-claims'><Guarded/></div></AuthProvider></QueryClientProvider>}
function Guarded(){const{user,loading,isConfigured}=useAuth();const{pathname}=useLocation();const landing=/^\/workflows\/[^/]+\/?$/.test(pathname);const hub=pathname==='/workflows'||pathname==='/workflows/';const protectedPath=pathname==='/dashboard'||(pathname.startsWith('/workflows/')&&!landing&&!hub);if(!protectedPath)return <Outlet/>;if(loading)return <div className="gate">Checking account…</div>;if(!isConfigured||!user)return <div className="gate"><h1>Sign in to continue</h1><p>Your claim workspace and documents are private to your account.</p><Link className="btn" to="/auth" search={{returnTo:pathname}}>Sign in or create an account →</Link></div>;return <Outlet/>}
