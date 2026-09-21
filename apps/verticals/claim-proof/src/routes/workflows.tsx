import { createFileRoute } from '@tanstack/react-router'
import { ClaimProofWorkflowDirectory } from '../WorkflowDirectory'

export const Route = createFileRoute('/workflows')({ component: ClaimProofWorkflowDirectory })
