import { createRootRoute, Outlet } from '@tanstack/react-router'
import { AuthProvider } from '../lib/auth'
import '@mailmypdf/design-system/vertical-landing.css'
import '../styles.css'

export const Route=createRootRoute({component:Root})
function Root(){return <AuthProvider><div data-mmp-theme='code-enforcement'><Outlet/></div></AuthProvider>}
