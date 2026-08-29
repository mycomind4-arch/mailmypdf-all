import { createFileRoute } from "@tanstack/react-router";
import { requireAuthenticatedUser, getSupabaseServer } from "@/platform/supabase";
import { calculateQuote } from "@mailmypdf/pricing";

export const Route = createFileRoute("/api/workflows/administrative-decision/approve")({ server: { handlers: { POST: async ({ request }) => {
  try {
    const user = await requireAuthenticatedUser(request); const input = await request.json() as { appealId?:string; recipient?:{name?:string;address1?:string;address2?:string;city?:string;state?:string;zip?:string}; mailingMethod?:"standard"|"certified"|"registered"; responseSheets?:number; supportingSheets?:number; envelopeSurcharge?:boolean };
    if (!input.appealId) return Response.json({error:"Appeal id is required."},{status:400});
    const r=input.recipient; if(!r?.name||!r.address1||!r.city||!r.state||!r.zip) return Response.json({error:"A complete mailing recipient is required."},{status:400}); if(!input.mailingMethod) return Response.json({error:"Mailing method is required."},{status:400});
    const supabase=await getSupabaseServer(); const {data:appeal,error}=await supabase.from("appeals").select("*").eq("id",input.appealId).single(); if(error||!appeal)return Response.json({error:"Appeal case not found."},{status:404}); if(appeal.user_id!==user.id)return Response.json({error:"You do not own this appeal."},{status:403}); if(appeal.workflow_id!=="administrative-decision-appeal")return Response.json({error:"Workflow mismatch."},{status:409}); if(!appeal.draft?.trim())return Response.json({error:"Draft is required before approval."},{status:409});
    const decision=appeal.decision||{}; const unresolved=[...(decision.authoritySources||[])].filter((s:any)=>s.verificationState==="unverified"||s.verificationState==="conflicting"); const materialGaps=decision.evidenceGaps||[]; const contradictions=decision.contradictions||[];
    const review={ score: Math.max(0,100-unresolved.length*10-materialGaps.length*5-contradictions.length*5), authorityClaims:decision.authoritySources||[], unresolvedAuthority:unresolved, evidenceGaps:materialGaps, contradictions, humanApprovalRequired:true, approvedAt:new Date().toISOString() };
    if(review.score<70) return Response.json({error:"Administrative appeal is not ready for approval.",review},{status:409});
    const responseSheets=Math.max(1,Math.floor(input.responseSheets ?? 3));
    const supportingSheets=Math.max(0,Math.floor(input.supportingSheets ?? 0));
    const pricing=calculateAdministrativeDecisionTotal({responseSheets,supportingSheets,mailingMethod:input.mailingMethod,envelopeSurcharge:Boolean(input.envelopeSurcharge)});
    const packet={id:crypto.randomUUID(),recipientName:r.name,recipientAddress1:r.address1,recipientAddress2:r.address2,recipientCity:r.city,recipientState:r.state,recipientZip:r.zip,mailingMethod:input.mailingMethod,workflowId:"administrative-decision-appeal",finalDocumentType:"response-pdf",responseSheets:sresponseSheetsSafe(responseSheets),supportingSheets,pricing};
    const {error:updateError}=await supabase.from("appeals").update({status:"ready",review,packet,version:(appeal.version||1)+1,updated_at:new Date().toISOString()}).eq("id",input.appealId).eq("user_id",user.id).eq("version",appeal.version||1); if(updateError)throw new Error(updateError.message);
    return Response.json({ok:true,appealId:input.appealId,status:"ready",review,packet,pricing});
  }catch(error){const message=error instanceof Error?error.message:"Unable to approve appeal.";return Response.json({error:message},{status:/authentication|required|token/i.test(message)?401:502});}
} } } });

function sresponseSheetsSafe(value:number){ return value; }
