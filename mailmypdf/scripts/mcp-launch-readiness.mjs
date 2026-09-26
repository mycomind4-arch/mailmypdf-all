#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const baseUrl=(process.env.MCP_BASE_URL||process.argv[2]||"http://127.0.0.1:3000").replace(/\/$/,"");
const endpoint=`${baseUrl}/api/mcp`;
const protectedResource=`${baseUrl}/.well-known/oauth-protected-resource`;
const challengeUrl=`${baseUrl}/.well-known/openai-apps-challenge`;
const expectedChallenge=process.env.OPENAI_CHALLENGE_EXPECTED_TOKEN?.trim()||null;
const token=process.env.MCP_BEARER_TOKEN?.trim()||null;
const protocolVersion="2026-07-28";
const reviewResourceUri="ui://mailmypdf/packet-review-v1.html";

const requiredTools=[
  "find_workflow",
  "get_workflow",
  "get_profile",
  "create_matter",
  "get_matter",
  "get_order_status",
  "get_document_status",
  "ingest_document",
  "save_matter_input",
  "analyze_matter",
  "generate_draft",
  "save_draft",
  "preview_packet",
  "approve_packet",
  "prepare_checkout",
];

let nextId=1;
let failures=0;
let warnings=0;

function pass(message){ console.log(`✅ ${message}`); }
function warn(message){ warnings+=1; console.warn(`⚠️  ${message}`); }
function fail(message,details){
  failures+=1;
  console.error(`❌ ${message}`);
  if(details!==undefined) console.error(typeof details==="string"?details:JSON.stringify(details,null,2));
}
function isLocalHost(hostname){
  return hostname==="localhost"||hostname==="127.0.0.1"||hostname==="::1";
}
async function parseJson(response,label){
  const text=await response.text();
  try{return text?JSON.parse(text):null;}
  catch{fail(`${label} returned non-JSON`,text.slice(0,1000));return null;}
}
async function rpc(method,params,options={}){
  const headers=new Headers({
    "content-type":"application/json",
    "mcp-protocol-version":protocolVersion,
    "mcp-method":method,
  });
  if(options.name) headers.set("mcp-name",options.name);
  if(options.token) headers.set("authorization",`Bearer ${options.token}`);
  const response=await fetch(endpoint,{
    method:"POST",
    headers,
    body:JSON.stringify({
      jsonrpc:"2.0",
      id:nextId++,
      method,
      ...(params?{params}:{}),
    }),
  });
  return {response,body:await parseJson(response,method)};
}
async function callTool(name,args,options={}){
  return rpc("tools/call",{name,arguments:args},{name,...options});
}

console.log(`MailMyPDF connector launch readiness: ${baseUrl}`);

let parsedBase;
try{parsedBase=new URL(baseUrl);}
catch{console.error("❌ MCP_BASE_URL must be an absolute URL");process.exit(1);}
if(!isLocalHost(parsedBase.hostname)&&parsedBase.protocol!=="https:"){
  fail("non-local connector deployments must use HTTPS");
}else{
  pass(isLocalHost(parsedBase.hostname)?"local base URL accepted":"production-style HTTPS base URL");
}

{
  try{
    const response=await fetch(endpoint);
    if(response.status===405) pass("MCP endpoint is reachable and POST-only");
    else fail("GET /api/mcp should return 405",response.status);
  }catch(error){fail("MCP endpoint is unreachable",error instanceof Error?error.message:String(error));}
}

{
  try{
    const response=await fetch(protectedResource);
    const body=await parseJson(response,"protected-resource metadata");
    if(response.status!==200){
      fail("OAuth protected-resource metadata is not launch-ready",{status:response.status,body});
    }else if(!body||typeof body!=="object"){
      fail("OAuth protected-resource metadata is empty");
    }else{
      const expectedResource=`${baseUrl}/api/mcp`;
      if(body.resource!==expectedResource) fail("OAuth resource identifier does not match MCP endpoint",body.resource);
      else pass("OAuth resource identifier matches MCP endpoint");

      const servers=Array.isArray(body.authorization_servers)?body.authorization_servers:[];
      if(servers.length<1) fail("OAuth metadata advertises no authorization server");
      else if(!servers.every(value=>typeof value==="string"&&value.startsWith("https://"))&&!isLocalHost(parsedBase.hostname)){
        fail("OAuth authorization server must use HTTPS",servers);
      }else pass("OAuth authorization server is advertised");

      const scopes=Array.isArray(body.scopes_supported)?body.scopes_supported:[];
      for(const scope of ["email","profile"]){
        if(!scopes.includes(scope)) fail(`OAuth metadata is missing ${scope} scope`);
      }
      if(["email","profile"].every(scope=>scopes.includes(scope))) pass("OAuth scopes are compatible with MailMyPDF connector");
    }
  }catch(error){fail("OAuth protected-resource metadata check failed",error instanceof Error?error.message:String(error));}
}

{
  const {response,body}=await rpc("server/discover");
  if(!response.ok) fail("server/discover failed",body);
  else{
    const versions=body?.result?.supportedVersions;
    const serverInfo=body?.result?._meta?.["io.modelcontextprotocol/serverInfo"];
    if(!Array.isArray(versions)||!versions.includes(protocolVersion)){
      fail("server/discover does not advertise the current protocol",body);
    }else pass(`server/discover advertises ${protocolVersion}`);
    if(serverInfo?.name!=="MailMyPDF") fail("server/discover returned unexpected server identity",serverInfo);
    else pass("server/discover identifies MailMyPDF");
    if(body?.result?.capabilities?.tools&&body?.result?.capabilities?.resources) pass("server advertises tools and resources");
    else fail("server/discover is missing tools/resources capabilities",body?.result?.capabilities);
  }
}

{
  const {response,body}=await rpc("tools/list");
  if(!response.ok) fail("tools/list failed",body);
  else{
    const tools=Array.isArray(body?.result?.tools)?body.result.tools:[];
    const names=new Set(tools.map(tool=>tool?.name).filter(Boolean));
    const missing=requiredTools.filter(name=>!names.has(name));
    if(missing.length) fail("tool catalog is missing required tools",missing);
    else pass(`all ${requiredTools.length} expected tools are exposed`);
    if(tools.length!==requiredTools.length) warn(`tool catalog contains ${tools.length} tools; readiness contract expects ${requiredTools.length}`);
  }
}

{
  const {response,body}=await rpc("resources/list");
  if(!response.ok) fail("resources/list failed",body);
  else{
    const resources=Array.isArray(body?.result?.resources)?body.result.resources:[];
    const review=resources.find(resource=>resource?.uri===reviewResourceUri);
    if(!review) fail("packet review MCP Apps resource is missing",resources);
    else if(review.mimeType!=="text/html;profile=mcp-app") fail("packet review resource has unexpected MIME type",review);
    else pass("packet review MCP Apps resource is advertised");
  }
}

{
  const {response,body}=await rpc("resources/read",{uri:reviewResourceUri},{name:reviewResourceUri});
  if(!response.ok) fail("packet review resource could not be read",body);
  else{
    const content=body?.result?.contents?.[0];
    const html=typeof content?.text==="string"?content.text:"";
    for(const marker of ["Review before approval","View exact PDF","Approve this exact packet"]){
      if(!html.includes(marker)) fail(`packet review UI is missing: ${marker}`);
    }
    if(["Review before approval","View exact PDF","Approve this exact packet"].every(marker=>html.includes(marker))){
      pass("packet review UI includes exact-PDF and approval controls");
    }
  }
}

{
  const {response,body}=await callTool("find_workflow",{query:"IRS CP14 notice",limit:8});
  if(!response.ok) fail("public workflow discovery call failed",body);
  else{
    const workflows=body?.result?.structuredContent?.workflows??[];
    if(workflows.some(item=>item?.workflowId==="cp14-response")) pass("public workflow discovery resolves CP14");
    else fail("public workflow discovery did not resolve CP14",workflows);
  }
}

{
  const {response}=await callTool("get_profile",{});
  const challenge=response.headers.get("www-authenticate")||"";
  if(response.status!==401) fail("protected tools do not require OAuth",response.status);
  else if(!challenge.includes("resource_metadata=")) fail("OAuth challenge is missing resource_metadata",challenge);
  else pass("protected tools issue an OAuth protected-resource challenge");
}

if(token){
  const {response,body}=await callTool("get_profile",{}, {token});
  if(!response.ok) fail("authenticated profile check failed",body);
  else if(!body?.result?.structuredContent?.profile?.id) fail("authenticated profile check returned no user identity",body);
  else pass("authenticated MailMyPDF profile resolves through MCP");
}else{
  warn("MCP_BEARER_TOKEN not set; live account-link token verification was skipped");
}

for(const route of ["/support","/privacy","/terms","/security"]){
  try{
    const response=await fetch(`${baseUrl}${route}`,{redirect:"follow"});
    const type=response.headers.get("content-type")||"";
    if(!response.ok) fail(`${route} is not publicly reachable`,response.status);
    else if(!type.includes("text/html")) fail(`${route} did not return HTML`,type);
    else pass(`${route} is public`);
  }catch(error){fail(`${route} check failed`,error instanceof Error?error.message:String(error));}
}

if(expectedChallenge){
  try{
    const response=await fetch(challengeUrl);
    const text=await response.text();
    if(response.status!==200) fail("OpenAI domain challenge is not active",response.status);
    else if(text!==expectedChallenge) fail("OpenAI domain challenge token does not match the expected portal token");
    else pass("OpenAI domain challenge returns the exact expected token");
  }catch(error){fail("OpenAI domain challenge check failed",error instanceof Error?error.message:String(error));}
}else{
  try{
    const response=await fetch(challengeUrl);
    if(response.status===200) warn("OpenAI domain challenge is active, but OPENAI_CHALLENGE_EXPECTED_TOKEN was not supplied for exact verification");
    else warn("OpenAI domain challenge exact-token check skipped; supply OPENAI_CHALLENGE_EXPECTED_TOKEN during submission");
  }catch{
    warn("OpenAI domain challenge check skipped because the route could not be reached");
  }
}

{
  const here=path.dirname(fileURLToPath(import.meta.url));
  const repoPlugin=path.resolve(here,"../../plugins/mailmypdf/plugin.json");
  const repoMcp=path.resolve(here,"../../plugins/mailmypdf/mcp.json");
  if(fs.existsSync(repoPlugin)&&fs.existsSync(repoMcp)){
    try{
      const plugin=JSON.parse(fs.readFileSync(repoPlugin,"utf8"));
      const mcp=JSON.parse(fs.readFileSync(repoMcp,"utf8"));
      const openai=plugin?.extensions?.["com.openai"]?.interface;
      if(openai?.websiteURL!=="https://mailmypdf.ai"||openai?.privacyPolicyURL!=="https://mailmypdf.ai/privacy"||openai?.termsOfServiceURL!=="https://mailmypdf.ai/terms"){
        fail("portable plugin install metadata is incomplete",openai);
      }else pass("portable plugin install metadata is complete");
      if(mcp?.mcpServers?.mailmypdf?.url!=="https://mailmypdf.ai/api/mcp") fail("portable plugin points at the wrong MCP endpoint",mcp);
      else pass("portable plugin points at canonical production MCP endpoint");
    }catch(error){fail("portable plugin package could not be validated",error instanceof Error?error.message:String(error));}
  }else warn("portable plugin files were not found from this script location");
}

console.log("\nLaunch readiness summary");
console.log(`Failures: ${failures}`);
console.log(`Warnings: ${warnings}`);

if(failures>0){
  console.error("\n❌ MailMyPDF connector is not launch-ready.");
  process.exit(1);
}
if(warnings>0){
  console.warn("\n⚠️  Core launch checks passed with warnings. Resolve warnings before public submission.");
  process.exit(0);
}
console.log("\n✅ MailMyPDF connector passed all launch-readiness checks.");
