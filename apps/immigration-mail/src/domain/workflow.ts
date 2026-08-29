export type WorkflowKind = 'understand'|'respond'|'prepare'|'review'|'mail';
export type WorkflowStep = { id: string; title: string; status: 'pending'|'active'|'complete'|'blocked'; required?: boolean };
export type ImmigrationWorkflow = { kind: WorkflowKind; title: string; steps: WorkflowStep[] };

export function createWorkflow(kind: WorkflowKind): ImmigrationWorkflow {
  const common: Record<WorkflowKind, WorkflowStep[]> = {
    understand: [
      { id:'upload', title:'Upload or photograph the document', status:'pending', required:true },
      { id:'analyze', title:'Understand the document', status:'pending', required:true },
      { id:'confirm', title:'Confirm important facts', status:'pending', required:true },
    ],
    respond: [
      { id:'understand', title:'Understand what the notice asks for', status:'pending', required:true },
      { id:'checklist', title:'Build the response checklist', status:'pending', required:true },
      { id:'draft', title:'Prepare response', status:'pending', required:true },
      { id:'review', title:'Review response', status:'pending', required:true },
    ],
    prepare: [
      { id:'facts', title:'Confirm case facts', status:'pending', required:true },
      { id:'evidence', title:'Organize supporting documents', status:'pending', required:true },
      { id:'draft', title:'Prepare correspondence package', status:'pending', required:true },
    ],
    review: [
      { id:'quality', title:'Run response quality checks', status:'pending', required:true },
      { id:'evidence', title:'Verify evidence and attachments', status:'pending', required:true },
      { id:'approve', title:'Approve final package', status:'pending', required:true },
    ],
    mail: [
      { id:'preview', title:'Preview final mailing package', status:'pending', required:true },
      { id:'approve', title:'Explicitly approve mailing', status:'pending', required:true },
      { id:'send', title:'Send through MailMyPDF', status:'pending', required:true },
      { id:'proof', title:'Track and preserve proof', status:'pending', required:true },
    ],
  };
  return { kind, title: kind[0].toUpperCase()+kind.slice(1), steps: common[kind] };
}
