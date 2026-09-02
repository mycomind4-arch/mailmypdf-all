import Link from 'next/link'
import { notFound } from 'next/navigation'
import { workflowMap, type WorkflowId } from '@/domain/benefits-workflows'
import WorkflowStartClient from './WorkflowStartClient'

export default async function WorkflowStartPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const workflow = workflowMap[id as WorkflowId]
  if (!workflow) notFound()
  return <WorkflowStartClient id={id} workflow={{ name: workflow.name, family: workflow.family, description: workflow.description }} />
}
