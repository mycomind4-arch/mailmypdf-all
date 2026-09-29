#!/usr/bin/env node

const baseUrl=(process.env.MCP_BASE_URL||process.argv[2]||"http://127.0.0.1:3000").replace(/\/$/,"");
const endpoint=`${baseUrl}/api/mcp`;
const token=process.env.MCP_BEARER_TOKEN?.trim();
const orderId=process.env.MCP_E2E_ORDER_ID?.trim();
const expectedStage=(process.env.MCP_E2E_EXPECT_STAGE||"submitted").trim();
const allowedStages=new Set(["draft","paid","submitted","mailed","delivered"]);
const progress={
  draft:0,
  uploaded:0,
  checkout_created:0,
  failed_payment:0,
  paid_pending_manual_fulfillment:1,
  manual_fulfillment_in_progress:1,
  failed_fulfillment:1,
  submitted_to_provider:2,
  provider_processing:2,
  failed_provider_submission:2,
  mailed:3,
  in_transit:3,
  delivered:4,
  returned:4,
  refunded:4,
};
const expectedProgress={draft:0,paid:1,submitted:2,mailed:3,delivered:4};

if(!token){
  console.error("❌ MCP_BEARER_TOKEN is required.");
  process.exit(1);
}
if(!orderId||!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(orderId)){
  console.error("❌ MCP_E2E_ORDER_ID must be a valid order UUID.");
  process.exit(1);
}
if(!allowedStages.has(expectedStage)){
  console.error("❌ MCP_E2E_EXPECT_STAGE must be draft, paid, submitted, mailed, or delivered.");
  process.exit(1);
}

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

console.log(`MailMyPDF read-only MCP order verifier: ${endpoint}`);
console.log(`Order: ${orderId}; expected stage: ${expectedStage}`);

const status=await callTool("get_order_status",{order_id:orderId});
const order=status?.order;
if(!order||order.id!==orderId) fail("get_order_status returned the wrong order",status);
if(order?.directMail?.source!=="conversational_letter"){
  fail("order is not a conversational-letter mailing",order?.directMail);
}
const actualStatus=order.status;
const actualProgress=typeof progress[actualStatus]==="number"?progress[actualStatus]:-1;
if(actualProgress<expectedProgress[expectedStage]){
  fail(`order has not reached expected stage ${expectedStage}`,{actualStatus,expectedStage});
}
ok(`order reached ${actualStatus}`);

if(expectedProgress[expectedStage]>=2&&!order?.tracking?.providerReference){
  fail("submitted-or-later order has no provider reference",order?.tracking);
}
if(expectedProgress[expectedStage]>=2) ok("provider submission reference is present");

console.log("\nResult");
console.log(JSON.stringify({
  orderId,
  status:actualStatus,
  expectedStage,
  providerReference:order?.tracking?.providerReference??null,
  trackingNumber:order?.tracking?.trackingNumber??null,
  paidAt:order?.timeline?.paidAt??null,
  mailedAt:order?.timeline?.mailedAt??null,
  expectedDeliveryDate:order?.timeline?.expectedDeliveryDate??null,
},null,2));
console.log("\n✅ Read-only MCP order resume verification passed");
