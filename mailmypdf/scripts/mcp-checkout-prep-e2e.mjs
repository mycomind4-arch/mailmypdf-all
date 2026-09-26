#!/usr/bin/env node

const baseUrl=(process.env.MCP_BASE_URL||process.argv[2]||"http://127.0.0.1:3000").replace(/\/$/,"");
const endpoint=`${baseUrl}/api/mcp`;
const token=process.env.MCP_BEARER_TOKEN?.trim();
const fileUrl=process.env.MCP_TEST_FILE_URL?.trim();
const fileId=process.env.MCP_TEST_FILE_ID?.trim()||"mcp-checkout-e2e-cp14";
const fileName=process.env.MCP_TEST_FILE_NAME?.trim()||"cp14-test-notice.pdf";
const fileMime=process.env.MCP_TEST_FILE_MIME?.trim()||"application/pdf";
const pollMs=Number(process.env.MCP_SCAN_POLL_MS||3000);
const maxWaitMs=Number(process.env.MCP_SCAN_MAX_WAIT_MS||90000);

function fail(message,details){
  console.error(`❌ ${message}`);
  if(details!==undefined) console.error(typeof details==="string"?details:JSON.stringify(details,null,2));
  process.exit(1);
}
function ok(message){console.log(`✅ ${message}`);}
function sleep(ms){return new Promise(resolve=>setTimeout(resolve,ms));}

if(process.env.MCP_E2E_ALLOW_WRITES!=="true"){
  fail("Refusing to create test data. Set MCP_E2E_ALLOW_WRITES=true explicitly.");
}
if(process.env.MCP_E2E_ALLOW_CHECKOUT_PREP!=="true"){
  fail("Refusing to create a Stripe checkout session. Set MCP_E2E_ALLOW_CHECKOUT_PREP=true explicitly.");
}
if(baseUrl==="https://mailmypdf.ai"){
  fail("This harness is staging/local only and refuses the production MailMyPDF origin.");
}
if(!token) fail("MCP_BEARER_TOKEN is required.");
if(!fileUrl) fail("MCP_TEST_FILE_URL is required.");
if(!Number.isFinite(pollMs)||pollMs<500||!Number.isFinite(maxWaitMs)||maxWaitMs<1000){
  fail("Invalid scan polling configuration.");
}

function parseAddress(envName){
  const raw=process.env[envName]?.trim();
  if(!raw) fail(`${envName} is required as JSON.`);
  let value;
  try{value=JSON.parse(raw);}catch{fail(`${envName} must be valid JSON.`);}
  for(const key of ["name","line1","city","state","postal"]){
    if(typeof value?.[key]!=="string"||!value[key].trim()){
      fail(`${envName}.${key} is required.`);
    }
  }
  return {
    name:value.name.trim(),
    line1:value.line1.trim(),
    line2:typeof value.line2==="string"&&value.line2.trim()?value.line2.trim():null,
    city:value.city.trim(),
    state:value.state.trim(),
    postal:value.postal.trim(),
  };
}

const recipient=parseAddress("MCP_TEST_RECIPIENT_JSON");
const sender=parseAddress("MCP_TEST_SENDER_JSON");

let nextId=1;
async function rpc(name,args){
  const response=await fetch(endpoint,{
    method:"POST",
    headers:{
      "content-type":"application/json",
      "authorization":`Bearer ${token}`,
      "mcp-protocol-version":"2026-07-28",
      "mcp-method":"tools/call",
      "mcp-name":name,
    },
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

console.log(`MailMyPDF checkout-prep E2E: ${endpoint}`);

const workflow=await rpc("get_workflow",{workflow_id:"cp14-response"});
if(workflow?.workflow?.sectionId!=="notice-respond") fail("CP14 workflow identity mismatch",workflow);
ok("CP14 workflow resolved");

const created=await rpc("create_matter",{workflow_id:"cp14-response",section_id:"notice-respond"});
const matterId=created?.matter?.id||created?.matterId||created?.id;
if(typeof matterId!=="string"||!matterId) fail("create_matter returned no matter id",created);
ok(`created matter ${matterId}`);

const ingested=await rpc("ingest_document",{
  matter_id:matterId,
  file:{download_url:fileUrl,file_id:fileId,mime_type:fileMime,file_name:fileName},
  role:"subject_notice",
  processing_consent:true,
});
const documentId=ingested?.document?.id;
if(typeof documentId!=="string"||!documentId) fail("ingest_document returned no document id",ingested);
ok(`ingested source document ${documentId}`);

const deadline=Date.now()+maxWaitMs;
let readiness=null;
while(Date.now()<deadline){
  const status=await rpc("get_document_status",{matter_id:matterId,document_id:documentId});
  readiness=status?.document?.readiness??null;
  console.log(`… document readiness: ${readiness||"unknown"}`);
  if(readiness==="ready") break;
  if(readiness==="rejected"||readiness==="unavailable") fail(`document became ${readiness}`,status);
  await sleep(pollMs);
}
if(readiness!=="ready") fail("document did not become ready before timeout",{matterId,documentId});
ok("document cleared security scanning");

const analysis=await rpc("analyze_matter",{matter_id:matterId});
ok("notice analysis completed");

await rpc("save_matter_input",{
  matter_id:matterId,
  input:{
    taxpayerName:"MAILMYPDF MCP TEST USER",
    taxpayerAddress:"TEST DATA - NOT FOR DELIVERY",
    phone:"",
    noticeNumber:
      analysis?.analysis?.result?.referenceNumber||
      analysis?.result?.referenceNumber||
      "TEST-CP14",
    taxPeriod:
      analysis?.analysis?.result?.workflowDetails?.taxPeriod||
      analysis?.result?.workflowDetails?.taxPeriod||
      "TEST PERIOD",
    responseMode:"agree",
    responseExplanation:"",
    requestedAction:"Please review this test account record. This is automated staging test data and is not for delivery.",
    additionalFacts:"Automated MailMyPDF MCP staging checkout-preparation test. Do not mail.",
    evidenceReviewComplete:true,
  },
});
ok("validated CP14 test facts saved");

const generated=await rpc("generate_draft",{matter_id:matterId});
const draftText=generated?.bodyText||generated?.draft?.bodyText;
if(typeof draftText!=="string"||!draftText.trim()) fail("generate_draft returned no body text",generated);
ok("draft generated");

await rpc("save_draft",{matter_id:matterId,body_text:draftText});
ok("exact generated draft saved");

const preview=await rpc("preview_packet",{
  matter_id:matterId,
  mail_class:"certified",
  recipient,
});
const packet=preview?.packet;
const review=preview?.review;
if(!packet?.packetSha256||!Number.isSafeInteger(packet?.quote?.totalCents)||!review?.recipientSha256){
  fail("preview_packet returned incomplete immutable review data",preview);
}
if(typeof review.previewResourceUri!=="string"||!review.previewResourceUri){
  fail("preview_packet returned no exact PDF resource URI",review);
}
ok(`exact packet preview built at ${packet.quote.totalCents} cents`);

const approved=await rpc("approve_packet",{
  matter_id:matterId,
  expected_packet_sha256:packet.packetSha256,
  expected_total_cents:packet.quote.totalCents,
  expected_recipient_sha256:review.recipientSha256,
  recipient,
  mail_class:"certified",
});
const approvalId=approved?.approvalId;
if(typeof approvalId!=="string"||!approvalId) fail("approve_packet returned no approval id",approved);
ok(`exact packet approved (${approvalId})`);

const checkout=await rpc("prepare_checkout",{
  matter_id:matterId,
  approval_id:approvalId,
  sender,
});
const checkoutUrl=checkout?.checkoutUrl;
if(typeof checkoutUrl!=="string"||!checkoutUrl.startsWith("https://checkout.stripe.com/")){
  fail("prepare_checkout did not return a Stripe-hosted checkout URL",checkout);
}
if(!checkoutUrl.includes("cs_test_")){
  fail("Checkout URL does not appear to be Stripe test mode; refusing to continue.",checkoutUrl);
}
ok("Stripe TEST checkout session created");

console.log("\nResult");
console.log(JSON.stringify({
  matterId,
  documentId,
  packetSha256:packet.packetSha256,
  totalCents:packet.quote.totalCents,
  recipientSha256:review.recipientSha256,
  previewResourceUri:review.previewResourceUri,
  approvalId,
  orderId:checkout?.orderId??null,
  checkoutHost:new URL(checkoutUrl).hostname,
  stripeMode:"test",
},null,2));

console.log("\n✅ Checkout-preparation E2E passed");
console.log("ℹ️ The harness intentionally does not open checkout, pay, call Lob, or claim the item was mailed.");
