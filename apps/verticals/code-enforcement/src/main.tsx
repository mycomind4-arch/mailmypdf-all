import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from '@tanstack/react-router'
import { getRouter } from './router'
createRoot(document.getElementById('app')!).render(<StrictMode><RouterProvider router={getRouter()}/></StrictMode>)
