#!/usr/bin/env node

const baseUrl=(process.env.MCP_BASE_URL||process.argv[2]||"http://127.0.0.1:3000").replace(/\/$/,"");
const endpoint=`${baseUrl}/api/mcp`;
const token=process.env.MCP_BEARER_TOKEN?.trim();
const runId=crypto.randomUUID();
const allowAddressReview=process.env.MCP_E2E_ALLOW_ADDRESS_REVIEW==="true";
const allowApproval=process.env.MCP_E2E_ALLOW_APPROVAL==="true";
const allowCheckout=process.env.MCP_E2E_ALLOW_CHECKOUT==="true";
const mailClass=(process.env.MCP_E2E_MAIL_CLASS||"standard").trim();
const color=process.env.MCP_E2E_COLOR==="true";
const letterText=(process.env.MCP_E2E_LETTER_TEXT||`MailMyPDF conversational-letter acceptance test ${runId}.\n\nThis disposable draft verifies chat-to-PDF review continuity. Do not treat it as real correspondence.`).trim();

if(process.env.MCP_E2E_ALLOW_WRITES!=="true"){
  console.error("❌ Refusing to create test data. Set MCP_E2E_ALLOW_WRITES=true explicitly.");
  process.exit(1);
}
if(!token){
  console.error("❌ MCP_BEARER_TOKEN is required.");
  process.exit(1);
}
if(!["standard","certified","registered"].includes(mailClass)){
  console.error("❌ MCP_E2E_MAIL_CLASS must be standard, certified, or registered.");
  process.exit(1);
}
if(!["localhost","127.0.0.1","[::1]"].includes(new URL(baseUrl).hostname)&&process.env.MCP_E2E_ALLOW_PRODUCTION!=="true"){
  console.error("❌ Refusing to write test data to production. Set MCP_E2E_ALLOW_PRODUCTION=true only for an intentional disposable-account acceptance run.");
  process.exit(1);
}
if(allowApproval&&!allowAddressReview){
  console.error("❌ MCP_E2E_ALLOW_APPROVAL=true requires MCP_E2E_ALLOW_ADDRESS_REVIEW=true.");
  process.exit(1);
}
if(allowCheckout&&!allowApproval){
  console.error("❌ MCP_E2E_ALLOW_CHECKOUT=true requires MCP_E2E_ALLOW_APPROVAL=true.");
  process.exit(1);
}

function parseAddress(name){
  const raw=process.env[name]?.trim();
  if(!raw){
    console.error(`❌ ${name} is required as JSON with name,line1,city,state,postal.`);
    process.exit(1);
  }
  let value;
  try{value=JSON.parse(raw);}catch{
    console.error(`❌ ${name} must be valid JSON.`);
    process.exit(1);
  }
  for(const field of ["name","line1","city","state","postal"]){
    if(typeof value?.[field]!=="string"||!value[field].trim()){
      console.error(`❌ ${name}.${field} is required.`);
      process.exit(1);
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

const sender=parseAddress("MCP_E2E_SENDER_JSON");
const recipient=parseAddress("MCP_E2E_RECIPIENT_JSON");

let nextId=1;
function fail(message,details){
  console.error(`❌ ${message}`);
  if(details!==undefined) console.error(typeof details==="string"?details:JSON.stringify(details,null,2));
  process.exit(1);
}
function ok(message){console.log(`✅ ${message}`);}

async function rpc(method,params,options={}){
  const headers=new Headers({
    "content-type":"application/json",
    "authorization":`Bearer ${token}`,
    "mcp-protocol-version":"2026-07-28",
    "mcp-method":method,
  });
  if(options.name) headers.set("mcp-name",options.name);
  const response=await fetch(endpoint,{
    method:"POST",
    headers,
    body:JSON.stringify({
      jsonrpc:"2.0",
      id:nextId++,
      method,
      params:{...params,_meta:{"io.modelcontextprotocol/protocolVersion":"2026-07-28"}},
    }),
  });
  const text=await response.text();
  let body;
  try{body=text?JSON.parse(text):null;}catch{fail(`${method} returned non-JSON`,text.slice(0,1000));}
  if(!response.ok) fail(`${method} returned HTTP ${response.status}`,body);
  if(body?.error) fail(`${method} returned JSON-RPC error`,body.error);
  return body?.result;
}

async function callTool(name,args){
  const result=await rpc("tools/call",{name,arguments:args},{name});
  if(result?.isError) fail(`${name} failed`,result.structuredContent||result.content);
  return result?.structuredContent;
}

console.log(`MailMyPDF conversational-letter E2E harness: ${endpoint}`);
console.log(`Mail class: ${mailClass}; color: ${color}; address review: ${allowAddressReview}; approval: ${allowApproval}; checkout: ${allowCheckout}`);

const prepared=await callTool("prepare_conversational_letter",{
  letter_text:letterText,
  sender,
  recipient,
  mail_class:mailClass,
  color,
  idempotency_key:`letter-e2e.${runId}`,
});
const orderId=prepared?.order?.orderId;
if(typeof orderId!=="string"||!orderId) fail("prepare_conversational_letter returned no order id",prepared);
if(prepared?.order?.status&&prepared.order.status!=="draft") fail("new conversational letter was not a draft",prepared);
ok(`prepared unpaid conversational-letter draft ${orderId}`);

const context=await callTool("get_mailing_context",{});
const recent=context?.recentMailings?.find((item)=>item?.orderId===orderId);
if(!recent) fail("new direct mailing was not discoverable through get_mailing_context",context);
if(recent.source!=="conversational_letter") fail("recent mailing did not retain conversational source identity",recent);
if(recent.resumeWith!=="get_order_status") fail("recent mailing did not advertise the resume tool",recent);
ok("recent mailing is discoverable for conversational resume");

let status=await callTool("get_order_status",{order_id:orderId});
if(status?.order?.directMail?.source!=="conversational_letter") fail("order status did not expose conversational direct-mail state",status);
if(status?.order?.directMail?.nextAction?.toolName!=="review_direct_pdf_mail"){
  fail("unapproved conversational draft did not resume at exact review",status);
}
ok("order status resumes safely at exact PDF/envelope review");

if(!allowAddressReview){
  console.log("\nResult");
  console.log(JSON.stringify({
    orderId,
    packetSha256:prepared?.order?.packetSha256??null,
    source:status?.order?.directMail?.source??null,
    nextTool:status?.order?.directMail?.nextAction?.toolName??null,
  },null,2));
  console.log("\n✅ Conversational-letter preparation/resume path passed");
  console.log("ℹ️ Postal review was intentionally skipped. Set MCP_E2E_ALLOW_ADDRESS_REVIEW=true to verify the exact review resource.");
  process.exit(0);
}

const review=await callTool("review_direct_pdf_mail",{order_id:orderId});
if(review?.order?.orderId!==orderId) fail("review returned the wrong order",review);
if(review?.draft?.readyForApproval!==true) fail("postal review did not produce an approval-ready draft",review);
const previewUri=review?.review?.previewResourceUri;
if(typeof previewUri!=="string"||!previewUri.startsWith("mailmypdf://direct-pdf/")){
  fail("review returned no exact direct-PDF resource",review);
}
ok("postal review produced an exact PDF/envelope review");

const resource=await rpc("resources/read",{uri:previewUri});
const pdf=resource?.contents?.[0];
if(pdf?.mimeType!=="application/pdf"||typeof pdf?.blob!=="string") fail("exact PDF resource was not readable",resource);
const decoded=Buffer.from(pdf.blob,"base64");
if(decoded.subarray(0,4).toString()!=="%PDF") fail("exact review resource is not a PDF");
ok("exact owner-scoped PDF bytes are readable from the review resource");

status=await callTool("get_order_status",{order_id:orderId});
if(status?.order?.directMail?.review?.status!=="current") fail("fresh review was not recoverable from order status",status);
if(status?.order?.directMail?.approval?.status!=="missing") fail("review unexpectedly created approval",status);
ok("fresh postal review is recoverable without approval");

if(!allowApproval){
  console.log("\nResult");
  console.log(JSON.stringify({
    orderId,
    packetSha256:review?.packet?.packetSha256??null,
    reviewStatus:status?.order?.directMail?.review?.status??null,
    approvalStatus:status?.order?.directMail?.approval?.status??null,
    previewResourceUri:previewUri,
  },null,2));
  console.log("\n✅ Conversational-letter exact-review path passed");
  console.log("ℹ️ Approval was intentionally skipped. This harness never creates checkout, charges, or submits mail.");
  process.exit(0);
}

const approval=await callTool("approve_direct_pdf_mail",{
  order_id:orderId,
  expected_packet_sha256:review.packet.packetSha256,
  expected_total_cents:review.packet.quote.totalCents,
  expected_sender:review.draft.sender,
  expected_recipient:review.draft.recipient,
  expected_mail_class:review.review.mailClass,
  expected_color:review.draft.color,
});
if(approval?.approval?.approved!==true) fail("exact direct-mail approval was not recorded",approval);
ok("exact reviewed draft approval was recorded");

status=await callTool("get_order_status",{order_id:orderId});
if(status?.order?.directMail?.approval?.status!=="current") fail("approval was not recoverable from order status",status);
if(status?.order?.directMail?.nextAction?.toolName!=="prepare_direct_pdf_checkout"){
  fail("approved draft did not resume at checkout preparation",status);
}
ok("approved draft resumes at checkout preparation without creating checkout");

if(!allowCheckout){
  console.log("\nResult");
  console.log(JSON.stringify({
    orderId,
    packetSha256:approval.approval.packetSha256,
    totalCents:approval.approval.totalCents,
    reviewStatus:status.order.directMail.review.status,
    approvalStatus:status.order.directMail.approval.status,
    nextTool:status.order.directMail.nextAction.toolName,
  },null,2));
  console.log("\n✅ Conversational-letter approval-continuity path passed");
  console.log("ℹ️ Checkout was intentionally skipped. Set MCP_E2E_ALLOW_CHECKOUT=true to create an idempotent hosted checkout. The harness never enters payment credentials, charges a card, or submits mail.");
  process.exit(0);
}

const checkout=await callTool("prepare_direct_pdf_checkout",{order_id:orderId});
if(checkout?.orderId!==orderId) fail("checkout returned the wrong order",checkout);
if(checkout?.packetSha256!==approval.approval.packetSha256) fail("checkout packet hash does not match approval",checkout);
if(checkout?.totalCents!==approval.approval.totalCents) fail("checkout total does not match approval",checkout);
let checkoutUrl;
try{checkoutUrl=new URL(checkout.checkoutUrl);}catch{fail("checkout did not return a valid URL",checkout);}
if(checkoutUrl.protocol!=="https:") fail("checkout URL is not HTTPS",checkout);
ok("idempotent hosted checkout was created for the exact approved mailing");

status=await callTool("get_order_status",{order_id:orderId});
if(status?.order?.directMail?.approval?.status!=="current") fail("checkout invalidated the recorded approval",status);

console.log("\nResult");
console.log(JSON.stringify({
  orderId,
  packetSha256:checkout.packetSha256,
  totalCents:checkout.totalCents,
  checkoutUrl:checkout.checkoutUrl,
  checkoutReused:checkout.reused===true,
  orderStatus:status?.order?.status??null,
  reviewStatus:status?.order?.directMail?.review?.status??null,
  approvalStatus:status?.order?.directMail?.approval?.status??null,
},null,2));
console.log("\n✅ Conversational-letter checkout-continuity path passed");
console.log("ℹ️ No payment credentials were entered and no charge or Lob submission was performed by this harness. Complete the hosted checkout separately, then verify the order with the read-only MCP resume verifier and verify:canary.");
