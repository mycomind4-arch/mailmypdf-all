import { createFileRoute } from "@tanstack/react-router";
import { getWorkflow } from "@/domain/workflows";
export const Route=createFileRoute("/api/workflows/fafsa-appeal/certify")({server:{handlers:{GET:async()=>{const workflow=getWorkflow("fafsa-appeal");return Response.json({workflowId:workflow.id,experienceStages:workflow.experienceStages,acceptsDocuments:workflow.acceptsDocuments,primaryKeyword:workflow.primaryKeyword,ai:"Gemini",upload:workflow.acceptsDocuments?["application/pdf","image/png","image/jpeg"]:[]});}}}});
