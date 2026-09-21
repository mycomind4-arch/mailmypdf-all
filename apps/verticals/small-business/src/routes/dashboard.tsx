import { createFileRoute } from '@tanstack/react-router'
import { App } from '../main'

export const Route = createFileRoute('/dashboard')({ component: App })
