#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const repoRoot=path.resolve(import.meta.dirname,"../..");
const pluginRoot=path.join(repoRoot,"plugins/mailmypdf");
const readJson=(name)=>JSON.parse(fs.readFileSync(path.join(pluginRoot,name),"utf8"));
const manifest=readJson("plugin.json");
const review=readJson("review-cases.json");
const submission=readJson("submission-materials.json");
const catalog=fs.readFileSync(path.join(repoRoot,"mailmypdf/src/lib/mcp/tool-catalog.ts"),"utf8");

const errors=[];
const ui=manifest?.extensions?.["com.openai"]?.interface??{};
const requireHttps=(label,value)=>{
  if(typeof value!=="string"||!/^https:\/\//.test(value)) errors.push(`${label} must be an HTTPS URL`);
};

if(typeof ui.displayName!=="string"||!ui.displayName.trim()||ui.displayName.length>30) errors.push("displayName must be 1-30 characters");
if(typeof ui.shortDescription!=="string"||!ui.shortDescription.trim()||ui.shortDescription.length>30) errors.push("shortDescription must be 1-30 characters");
if(typeof ui.longDescription!=="string"||!ui.longDescription.trim()||ui.longDescription.length>4000) errors.push("longDescription must be 1-4000 characters");
if(typeof ui.developerName!=="string"||!ui.developerName.trim()||ui.developerName.length>80) errors.push("developerName must be 1-80 characters");
for(const [label,value] of [
  ["websiteURL",ui.websiteURL],
  ["supportURL",ui.supportURL],
  ["privacyPolicyURL",ui.privacyPolicyURL],
  ["termsOfServiceURL",ui.termsOfServiceURL],
]) requireHttps(label,value);

const prompts=Array.isArray(ui.defaultPrompt)?ui.defaultPrompt:[ui.defaultPrompt].filter(Boolean);
if(prompts.length<1||prompts.length>3) errors.push("defaultPrompt must contain 1-3 starter prompts");
if(new Set(prompts.map((p)=>String(p).trim().replace(/\s+/g," "))).size!==prompts.length) errors.push("starter prompts must be unique");
for(const prompt of prompts){
  if(typeof prompt!=="string"||!prompt.trim()||prompt.length>128) errors.push("each starter prompt must be 1-128 characters");
  if(prompt.includes("@")) errors.push("starter prompts must not contain MCP @mentions");
}

if(!Array.isArray(review.positive)||review.positive.length!==5) errors.push("review-cases.json must contain exactly five positive cases");
if(!Array.isArray(review.negative)||review.negative.length!==3) errors.push("review-cases.json must contain exactly three negative cases");
for(const [kind,cases] of [["positive",review.positive??[]],["negative",review.negative??[]]]){
  for(const entry of cases){
    if(!entry?.name||!entry?.prompt||!Array.isArray(entry.expected)||entry.expected.length<1){
      errors.push(`${kind} review case is missing name, prompt, or expected behavior`);
    }
  }
}

const toolNames=[...catalog.matchAll(/^\s{4}name: "([^"]+)"/gm)].map((match)=>match[1]);
const annotationMatches=[...catalog.matchAll(/annotations: \{ readOnlyHint: (true|false), destructiveHint: (true|false), openWorldHint: (true|false) \}/g)];
if(toolNames.length!==15) errors.push(`expected 15 MCP tools, found ${toolNames.length}`);
if(annotationMatches.length!==toolNames.length) errors.push("every MCP tool must declare all three required annotation hints");

const justifications=submission.annotationJustifications??{};
for(const name of toolNames){
  const item=justifications[name];
  if(!item) {
    errors.push(`missing annotation justifications for ${name}`);
    continue;
  }
  for(const key of ["readOnlyHint","destructiveHint","openWorldHint"]){
    if(typeof item[key]!=="string"||item[key].trim().length<20) errors.push(`${name} is missing a detailed ${key} justification`);
  }
}
for(const extra of Object.keys(justifications)){
  if(!toolNames.includes(extra)) errors.push(`annotation justifications contain unknown tool ${extra}`);
}

const profileBlock=catalog.match(/name: "get_profile"[\s\S]*?_meta: \{ "openai\/profile": true \}/)?.[0]??"";
if(!profileBlock.includes("outputSchema:")) errors.push("get_profile must declare outputSchema");
if(!profileBlock.includes('["id"]')) errors.push("get_profile outputSchema must require id");

if(typeof submission.releaseNotes!=="string"||!submission.releaseNotes.trim()) errors.push("release notes are required");
if(!Array.isArray(submission.manualSubmissionRequirements)||submission.manualSubmissionRequirements.length<1) errors.push("manual submission requirements must remain explicit");

if(errors.length){
  console.error("❌ MailMyPDF plugin submission bundle is not repo-ready:");
  for(const error of errors) console.error(`  - ${error}`);
  process.exit(1);
}

console.log("✅ MailMyPDF plugin repository submission bundle is structurally ready");
console.log(`   tools: ${toolNames.length}`);
console.log(`   starter prompts: ${prompts.length}`);
console.log(`   review cases: ${review.positive.length} positive / ${review.negative.length} negative`);
console.log(`   annotation justifications: ${Object.keys(justifications).length}`);
console.log("");
console.log("Manual/deployment requirements still required before public submission:");
for(const item of submission.manualSubmissionRequirements) console.log(`  - ${item}`);
