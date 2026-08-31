import { createFileRoute } from "@tanstack/react-router";
import { requireAuthenticatedUser, getSupabaseServer } from "@/platform/supabase";
import { uploadDocument } from "@/platform/mailmypdf";

export const Route = createFileRoute("/api/workflows/ssdi-appeal/analyze")({ server: { handlers: { POST: async ({ request }) => {
  try {
    const user = await requireAuthenticatedUser(request); const form = await request.formData(); const file = form.get("document");
    if (!(file instanceof File)) return Response.json({ error: "An SSDI decision is required." }, { status: 400 });
    if (file.size === 0) return Response.json({ error: "The source document is empty." }, { status: 400 });
    if (file.size > 20 * 1024 * 1024) return Response.json({ error: "Source documents must be 20 MB or smaller." }, { status: 413 });
    if (!["application/pdf","image/png","image/jpeg"].includes(file.type)) return Response.json({ error: "SSDI Appeal accepts PDF, PNG, and JPEG source documents." }, { status: 415 });
    const token = process.env.MAILMYPDF_CONTROL_PLANE_TOKEN; const base = process.env.MAILMYPDF_CONTROL_PLANE_URL || "https://mailmypdf.com"; if (!token) throw new Error("MailMyPDF control-plane token is not configured.");
    const cfgRes = await fetch(`${base.replace(/\/$/,"")}/api/control-plane/ai`, { method:"POST", headers:{"content-type":"application/json",authorization:`Bearer ${token}`}, body:JSON.stringify({verticalSlug:"appeal-mail",workflowSlug:"ssdi-appeal",task:"analysis"}) });
    const cfg = await cfgRes.json().catch(()=>null) as any; if (!cfgRes.ok) throw new Error(cfg?.error || `Control plane error (${cfgRes.status}).`); if (cfg.provider !== "gemini") throw new Error("SSDI Appeal is currently configured for Gemini.");
    const prompt = cfg.promptOverride || [
      "You are the authority-first analyst for an SSDI appeal workflow.",
      "Return strict JSON only. Extract only information supported by the decision notice.",
      "Never invent diagnoses, symptoms, medical evidence, work history, deadlines, appeal levels, forms, filing methods, legal rules, or outcomes.",
      "Separate document facts from procedural conclusions and unknowns.",
      '{"summary":"","issuer":"","jurisdiction":"","referenceNumber":"","decisionDate":"","deadline":"","deadlineStatus":"extracted|verified|unverified","appealInstructions":"","findings":[],"medicalEvidenceMentioned":[],"workEvidenceMentioned":[],"disputedFacts":[],"evidenceGaps":[],"contradictions":[],"citedAuthority":[],"authoritySources":[],"uncertainties":[],"confidence":"high|medium|low"}',
      "Use empty strings and arrays for unknown values.",
    ].join("\n");
    const bytes = Buffer.from(await file.arrayBuffer()).toString("base64");
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(cfg.model)}:generateContent?key=${encodeURIComponent(cfg.apiKey)}`, { method:"POST", headers:{"content-type":"application/json"}, body:JSON.stringify({contents:[{role:"user",parts:[{inlineData:{mimeType:file.type,data:bytes}},{text:prompt}]}],generationConfig:{responseMimeType:"application/json",temperature:0.1}}) });
    const body = await response.json().catch(()=>null) as any; if(!response.ok) throw new Error(body?.error?.message || `Gemini analysis failed (${response.status}).`);
    const text=body?.candidates?.[0]?.content?.parts?.map((p:{text?:string})=>p.text||"").join("").trim(); if(!text)throw new Error("Gemini returned no analysis."); const analysis=JSON.parse(text) as Record<string,unknown>;
    const sourceDocument=await uploadDocument(file); const appealId=crypto.randomUUID(); const now=new Date().toISOString();
    const decision={id:crypto.randomUUID(),type:"ssdi_decision",documentId:sourceDocument.id,documentFilename:file.name,agency:analysis.issuer||"",jurisdiction:analysis.jurisdiction||"",referenceNumber:analysis.referenceNumber||"",decisionDate:analysis.decisionDate||"",deadline:analysis.deadline?{date:analysis.deadline,status:analysis.deadlineStatus||"unverified",source:"extracted"}:undefined,findings:Array.isArray(analysis.findings)?analysis.findings:[],medicalEvidenceMentioned:Array.isArray(analysis.medicalEvidenceMentioned)?analysis.medicalEvidenceMentioned:[],workEvidenceMentioned:Array.isArray(analysis.workEvidenceMentioned)?analysis.workEvidenceMentioned:[],disputedFacts:Array.isArray(analysis.disputedFacts)?analysis.disputedFacts:[],evidenceGaps:Array.isArray(analysis.evidenceGaps)?analysis.evidenceGaps:[],contradictions:Array.isArray(analysis.contradictions)?analysis.contradictions:[],citedAuthority:Array.isArray(analysis.citedAuthority)?analysis.citedAuthority:[],authoritySources:Array.isArray(analysis.authoritySources)?analysis.authoritySources:[],uncertainties:Array.isArray(analysis.uncertainties)?analysis.uncertainties:[],appealInstructions:analysis.appealInstructions||"",extractedAt:now};
    const supabase=await getSupabaseServer(); const {error}=await supabase.from("appeals").insert({id:appealId,user_id:user.id,workflow_id:"ssdi-appeal",status:"in_progress",decision,grounds:[],evidence:[{id:crypto.randomUUID(),type:"document",label:file.name,documentId:sourceDocument.id,uploadedAt:now}],arguments:[],draft:"",review:null,packet:null,proof:null,timeline:[],version:1,created_at:now,updated_at:now}); if(error)throw new Error(`Unable to save appeal: ${error.message}`);
    return Response.json({ok:true,appealId,documentId:sourceDocument.id,analysis});
  } catch(error) { const message=error instanceof Error?error.message:"Unable to analyze SSDI decision."; return Response.json({error:message},{status:/authentication|required|token/i.test(message)?401:502}); }
} } } });
