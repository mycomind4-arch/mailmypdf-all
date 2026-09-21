import { createFileRoute } from '@tanstack/react-router'
import { BusinessWorkflowDirectory } from '../WorkflowDirectory'

export const Route = createFileRoute('/workflows')({ component: BusinessWorkflowDirectory })
