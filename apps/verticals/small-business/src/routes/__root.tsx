import { createRootRoute, Outlet } from '@tanstack/react-router'
import '@mailmypdf/design-system/vertical-landing.css'
import '@mailmypdf/design-system/workspace.css'
import '../styles.css'

export const Route = createRootRoute({ component: () => <div data-mmp-theme="small-business"><Outlet /></div> })
