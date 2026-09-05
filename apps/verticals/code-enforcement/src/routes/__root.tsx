import { createRootRoute, Outlet } from '@tanstack/react-router'
import { AuthProvider } from '../lib/auth'
import '../../../../../packages/design-system/src/tokens.css'
import '../../../../../packages/design-system/src/patterns.css'
import '../styles.css'

export const Route=createRootRoute({component:Root})
function Root(){return <AuthProvider><div data-mmp-theme='code-enforcement'><Outlet/></div></AuthProvider>}
