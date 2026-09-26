#!/usr/bin/env node

const baseUrl=(process.env.MCP_BASE_URL||process.argv[2]||"http://127.0.0.1:3000").replace(/\/$/,"");
const endpoint=`${baseUrl}/api/mcp`;
const token=process.env.MCP_BEARER_TOKEN?.trim();
const fileUrl=process.env.MCP_TEST_FILE_URL?.trim();
const fileId=process.env.MCP_TEST_FILE_ID?.trim()||"mcp-e2e-document";
const fileName=process.env.MCP_TEST_FILE_NAME?.trim()||"cp14-notice.pdf";
const fileMime=process.env.MCP_TEST_FILE_MIME?.trim()||"application/pdf";
const workflowId=process.env.MCP_TEST_WORKFLOW_ID?.trim()||"cp14-response";
const sectionId=process.env.MCP_TEST_SECTION_ID?.trim()||"notice-respond";
const pollMs=Number(process.env.MCP_SCAN_POLL_MS||3000);
const maxWaitMs=Number(process.env.MCP_SCAN_MAX_WAIT_MS||90000);

if(process.env.MCP_E2E_ALLOW_WRITES!=="true"){
  console.error("❌ Refusing to create test data. Set MCP_E2E_ALLOW_WRITES=true explicitly.");
  process.exit(1);
}
if(!token){
  console.error("❌ MCP_BEARER_TOKEN is required.");
  process.exit(1);
}
if(!fileUrl){
  console.error("❌ MCP_TEST_FILE_URL is required and must point to a public HTTPS test document.");
  process.exit(1);
}
if(baseUrl==="https://mailmypdf.ai"&&process.env.MCP_E2E_ALLOW_PRODUCTION!=="true"){
  console.error("❌ Refusing to write test data to production. Set MCP_E2E_ALLOW_PRODUCTION=true only when intentionally running against production.");
  process.exit(1);
}
if(!Number.isFinite(pollMs)||pollMs<500||!Number.isFinite(maxWaitMs)||maxWaitMs<1000){
  console.error("❌ Invalid scan polling configuration.");
  process.exit(1);
}

let nextId=1;

function fail(message,details){
  console.error(`❌ ${message}`);
  if(details!==undefined) console.error(typeof details==="string"?details:JSON.stringify(details,null,2));
  process.exit(1);
}
function ok(message){ console.log(`✅ ${message}`); }
function sleep(ms){ return new Promise(resolve=>setTimeout(resolve,ms)); }

async function rpc(name,args){
  const headers=new Headers({
    "content-type":"application/json",
    "authorization":`Bearer ${token}`,
    "mcp-protocol-version":"2026-07-28",
    "mcp-method":"tools/call",
    "mcp-name":name,
  });
  const response=await fetch(endpoint,{
    method:"POST",
    headers,
    body:JSON.stringify({
      jsonrpc:"2.0",
      id:nextId++,
      method:"tools/call",
      params:{name,arguments:args},
    }),
  });
  const text=await response.text();
  let body;
  try{body=text?JSON.parse(text):null;}catch{fail(`${name} returned non-JSON`,text.slice(0,1000));}
  if(!response.ok) fail(`${name} returned HTTP ${response.status}`,body);
  if(body?.error) fail(`${name} returned JSON-RPC error`,body.error);
  if(body?.result?.isError) fail(`${name} failed`,body.result.structuredContent||body.result.content);
  return body?.result?.structuredContent;
}

console.log(`MailMyPDF document E2E harness: ${endpoint}`);
console.log(`Workflow: ${sectionId}/${workflowId}`);

const workflow=await rpc("get_workflow",{workflow_id:workflowId});
if(workflow?.workflow?.sectionId!==sectionId){
  fail("Workflow/section mismatch",workflow);
}
ok("workflow resolved");

const created=await rpc("create_matter",{workflow_id:workflowId,section_id:sectionId});
const matterId=
  created?.matter?.id||
  created?.matterId||
  created?.id;
if(typeof matterId!=="string"||!matterId){
  fail("create_matter returned no matter id",created);
}
ok(`created matter ${matterId}`);

const ingested=await rpc("ingest_document",{
  matter_id:matterId,
  file:{
    download_url:fileUrl,
    file_id:fileId,
    mime_type:fileMime,
    file_name:fileName,
  },
  role:"subject_notice",
  processing_consent:true,
});
const documentId=ingested?.document?.id;
if(typeof documentId!=="string"||!documentId){
  fail("ingest_document returned no document id",ingested);
}
ok(`ingested document ${documentId} (${ingested.document.securityStatus})`);

const deadline=Date.now()+maxWaitMs;
let readiness;
while(Date.now()<deadline){
  const status=await rpc("get_document_status",{matter_id:matterId,document_id:documentId});
  readiness=status?.document?.readiness;
  console.log(`… document readiness: ${readiness||"unknown"}`);
  if(readiness==="ready"){
    ok("document cleared security scanning");
    break;
  }
  if(readiness==="rejected"||readiness==="unavailable"){
    fail(`document became ${readiness}`,status);
  }
  await sleep(pollMs);
}
if(readiness!=="ready"){
  fail(`document did not become ready within ${maxWaitMs}ms`,{matterId,documentId});
}

const analysis=await rpc("analyze_matter",{matter_id:matterId});
ok("workflow analysis completed");

console.log("\nResult");
console.log(JSON.stringify({
  matterId,
  documentId,
  workflowId,
  sectionId,
  analysisVersion:analysis?.analysis?.version??analysis?.version??null,
  analysisDocumentId:analysis?.analysis?.documentId??analysis?.documentId??null,
},null,2));

console.log("\n✅ End-to-end document path passed");
console.log("ℹ️ This harness intentionally stops before draft approval, checkout, payment, or mailing.");
