import { createRootRoute, Outlet } from '@tanstack/react-router'
import { AuthProvider } from '../lib/auth'
import '../styles.css'
export const Route=createRootRoute({component:Root})
function Root(){return <AuthProvider><Outlet/></AuthProvider>}
