import { createFileRoute } from '@tanstack/react-router'
import { PermitWorkflowDirectory } from '../WorkflowDirectory'

export const Route = createFileRoute('/workflows')({ component: PermitWorkflowDirectory })
