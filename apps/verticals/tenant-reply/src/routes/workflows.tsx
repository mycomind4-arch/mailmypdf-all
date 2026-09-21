import { createFileRoute } from '@tanstack/react-router'
import { TenantWorkflowDirectory } from '../WorkflowDirectory'

export const Route = createFileRoute('/workflows')({ component: TenantWorkflowDirectory })
