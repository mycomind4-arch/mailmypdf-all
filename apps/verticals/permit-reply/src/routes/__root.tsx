import { createRootRoute, Outlet } from '@tanstack/react-router'
import '@mailmypdf/design-system/vertical-landing.css'
import '../styles/globals.css'

export const Route = createRootRoute({ component: () => <div data-mmp-theme="permit-reply"><Outlet /></div> })
