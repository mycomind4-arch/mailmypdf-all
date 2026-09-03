import { QueryClient } from '@tanstack/react-query'
import { createRouter } from '@tanstack/react-router'
import { routeTree } from './routeTree.gen'
export const getRouter=()=>createRouter({routeTree,context:{queryClient:new QueryClient()},scrollRestoration:true,defaultPreload:'intent'})
declare module '@tanstack/react-router'{interface Register{router:ReturnType<typeof getRouter>}}
