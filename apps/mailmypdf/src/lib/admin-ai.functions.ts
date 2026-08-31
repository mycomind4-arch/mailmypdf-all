import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { encryptConfigSecret, decryptConfigSecret } from './ecosystem-config-crypto.server';

async function assertAdmin(userId: string) {
  const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
  const { data, error } = await supabaseAdmin.from('user_roles').select('role').eq('user_id', userId).eq('role', 'admin').maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error('Forbidden: admin access required');
}

const providerInput = z.object({
  provider: z.enum(['anthropic','openai','gemini']),
  label: z.string().min(1).max(100),
  apiKey: z.string().min(1).optional(),
  apiBaseUrl: z.string().url().optional().or(z.literal('')),
  defaultModel: z.string().min(1).max(150),
  enabled: z.boolean().default(true),
  metadata: z.record(z.string(), z.unknown()).default({}),
});

const routeInput = z.object({
  verticalSlug: z.string().min(1).max(120),
  workflowSlug: z.string().max(160).nullable().optional(),
  task: z.enum(['analysis','extraction','draft','validation','revision']),
  providerId: z.string().uuid(),
  modelOverride: z.string().max(150).nullable().optional(),
  promptOverride: z.string().max(20000).nullable().optional(),
  fallbackProviderId: z.string().uuid().nullable().optional(),
  enabled: z.boolean().default(true),
});

export const listAIControlPlane = createServerFn({ method: 'GET' }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  await assertAdmin(context.userId);
  const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
  const db = supabaseAdmin as any;
  const [{ data: providers, error: pErr }, { data: routes, error: rErr }, { data: variables, error: vErr }, { data: audit, error: aErr }] = await Promise.all([
    db.from('ai_provider_configs').select('id,provider,label,api_base_url,default_model,enabled,metadata,updated_at').order('provider'),
    db.from('ai_workflow_routes').select('id,vertical_slug,workflow_slug,task,provider_id,model_override,prompt_override,fallback_provider_id,enabled,updated_at').order('vertical_slug'),
    db.from('ecosystem_runtime_variables').select('key,is_secret,description,updated_at').order('key'),
    db.from('ecosystem_config_audit').select('id,actor_user_id,action,resource_type,resource_id,metadata,created_at').order('created_at',{ascending:false}).limit(100),
  ]);
  if (pErr) throw new Error(pErr.message); if (rErr) throw new Error(rErr.message); if (vErr) throw new Error(vErr.message); if (aErr) throw new Error(aErr.message);
  return { providers: providers ?? [], routes: routes ?? [], variables: variables ?? [], audit: audit ?? [] };
});

export const upsertAIProvider = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth]).inputValidator((d: unknown) => z.object({ id: z.string().uuid().optional(), ...providerInput.shape }).parse(d)).handler(async ({ data, context }) => {
  await assertAdmin(context.userId);
  const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
  const db = supabaseAdmin as any;
  const payload: Record<string, unknown> = { provider: data.provider, label: data.label, api_base_url: data.apiBaseUrl || null, default_model: data.defaultModel, enabled: data.enabled, metadata: data.metadata, updated_by: context.userId, updated_at: new Date().toISOString() };
  if (data.apiKey) payload.encrypted_api_key = await encryptConfigSecret(data.apiKey);
  let result;
  if (data.id) result = await db.from('ai_provider_configs').update(payload).eq('id', data.id).select('id').single();
  else {
    if (!data.apiKey) throw new Error('API key is required when creating a provider');
    result = await db.from('ai_provider_configs').insert({ ...payload, encrypted_api_key: await encryptConfigSecret(data.apiKey), created_by: context.userId }).select('id').single();
  }
  if (result.error) throw new Error(result.error.message);
  await db.from('ecosystem_config_audit').insert({ actor_user_id: context.userId, action: data.id ? 'update' : 'create', resource_type: 'ai_provider', resource_id: result.data.id, metadata: { provider: data.provider, label: data.label, default_model: data.defaultModel } });
  return { ok: true, id: result.data.id };
});

export const upsertAIWorkflowRoute = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth]).inputValidator((d: unknown) => z.object({ id: z.string().uuid().optional(), ...routeInput.shape }).parse(d)).handler(async ({ data, context }) => {
  await assertAdmin(context.userId);
  const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
  const db = supabaseAdmin as any;
  const payload = { vertical_slug: data.verticalSlug, workflow_slug: data.workflowSlug ?? null, task: data.task, provider_id: data.providerId, model_override: data.modelOverride ?? null, prompt_override: data.promptOverride ?? null, fallback_provider_id: data.fallbackProviderId ?? null, enabled: data.enabled, updated_at: new Date().toISOString() };
  let result = data.id ? await db.from('ai_workflow_routes').update(payload).eq('id', data.id).select('id').single() : await db.from('ai_workflow_routes').upsert(payload,{onConflict:'vertical_slug,workflow_slug,task'}).select('id').single();
  if (result.error) throw new Error(result.error.message);
  await db.from('ecosystem_config_audit').insert({ actor_user_id: context.userId, action: data.id ? 'update' : 'upsert', resource_type: 'ai_workflow_route', resource_id: result.data.id, metadata: { verticalSlug: data.verticalSlug, workflowSlug: data.workflowSlug, task: data.task, providerId: data.providerId } });
  return { ok: true, id: result.data.id };
});

export const setEcosystemVariable = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth]).inputValidator((d: unknown) => z.object({ key: z.string().regex(/^[A-Z0-9_]+$/), value: z.string(), isSecret: z.boolean(), description: z.string().max(500).default('') }).parse(d)).handler(async ({ data, context }) => {
  await assertAdmin(context.userId);
  const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
  const db = supabaseAdmin as any;
  const payload = data.isSecret ? { key: data.key, plaintext_value: null, encrypted_value: await encryptConfigSecret(data.value), is_secret: true, description: data.description, updated_by: context.userId, updated_at: new Date().toISOString() } : { key: data.key, plaintext_value: data.value, encrypted_value: null, is_secret: false, description: data.description, updated_by: context.userId, updated_at: new Date().toISOString() };
  const result = await db.from('ecosystem_runtime_variables').upsert(payload,{onConflict:'key'}).select('key').single();
  if (result.error) throw new Error(result.error.message);
  await db.from('ecosystem_config_audit').insert({ actor_user_id: context.userId, action: 'upsert', resource_type: 'runtime_variable', resource_id: data.key, metadata: { isSecret: data.isSecret } });
  return { ok: true };
});

export const resolveAIConfigForService = createServerFn({ method: 'POST' }).inputValidator((d: unknown) => z.object({ token: z.string(), verticalSlug: z.string(), workflowSlug: z.string().nullable().optional(), task: z.enum(['analysis','extraction','draft','validation','revision']) }).parse(d)).handler(async ({ data }) => {
  const expected = process.env.MAILMYPDF_CONTROL_PLANE_TOKEN;
  if (!expected || data.token !== expected) throw new Error('Unauthorized control-plane request');
  const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
  const db = supabaseAdmin as any;
  const { data: route } = await db.from('ai_workflow_routes').select('*').eq('vertical_slug',data.verticalSlug).eq('task',data.task).eq('enabled',true).or(`workflow_slug.eq.${data.workflowSlug ?? '__null__'},workflow_slug.is.null`).order('workflow_slug',{ascending:false,nullsFirst:false}).limit(1).maybeSingle();
  if (!route) throw new Error('No AI route configured');
  const { data: provider, error } = await db.from('ai_provider_configs').select('*').eq('id',route.provider_id).eq('enabled',true).single();
  if (error || !provider) throw new Error('Configured AI provider unavailable');
  const apiKey = await decryptConfigSecret(provider.encrypted_api_key);
  return { provider: provider.provider, apiKey, apiBaseUrl: provider.api_base_url, model: route.model_override || provider.default_model, promptOverride: route.prompt_override, fallbackProviderId: route.fallback_provider_id };
});
