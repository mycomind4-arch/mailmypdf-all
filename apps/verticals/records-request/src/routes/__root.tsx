import { createRootRoute, Outlet } from '@tanstack/react-router'
import "../../../../../packages/design-system/src/tokens.css"
import "../../../../../packages/design-system/src/patterns.css"
import { AuthProvider } from '../lib/auth'
import '../styles.css'

export const Route=createRootRoute({component:Root})

function Root(){
  return <div data-mmp-theme="records-request"><AuthProvider><Outlet/></AuthProvider></div>
}
