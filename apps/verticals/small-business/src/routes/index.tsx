import { createFileRoute } from '@tanstack/react-router'
import { PublicLanding } from '../PublicLanding'

export const Route = createFileRoute('/')({ component: PublicLanding })
