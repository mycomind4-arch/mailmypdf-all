import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { decryptConfigSecret } from '@/lib/ecosystem-config-crypto.server';

const input = z.object({ verticalSlug: z.string().min(1), workflowSlug: z.string().optional(), task: z.enum(['analysis','extraction','draft','validation','revision']) });

export const Route = createFileRoute('/api/control-plane/ai')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const expected = process.env.MAILMYPDF_CONTROL_PLANE_TOKEN;
        if (!expected) return Response.json({ error: 'Control plane is not configured' }, { status: 503 });
        const authorization = request.headers.get('authorization');
        if (authorization !== `Bearer ${expected}`) return Response.json({ error: 'Unauthorized' }, { status: 401 });
        const parsed = input.parse(await request.json());
        const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
        const db = supabaseAdmin as any;
        const routeQuery = db.from('ai_workflow_routes').select('*').eq('vertical_slug', parsed.verticalSlug).eq('task', parsed.task).eq('enabled', true);
        const { data: routes, error: routeError } = parsed.workflowSlug ? await routeQuery.or(`workflow_slug.eq.${parsed.workflowSlug},workflow_slug.is.null`).order('workflow_slug',{ascending:false}).limit(1) : await routeQuery.is('workflow_slug',null).limit(1);
        if (routeError) return Response.json({ error: routeError.message }, { status: 500 });
        const route = routes?.[0];
        if (!route) return Response.json({ error: 'No AI route configured' }, { status: 404 });
        const { data: provider, error: providerError } = await db.from('ai_provider_configs').select('*').eq('id', route.provider_id).eq('enabled', true).single();
        if (providerError || !provider) return Response.json({ error: 'Configured provider unavailable' }, { status: 503 });
        let apiKey: string;
        try { apiKey = await decryptConfigSecret(provider.encrypted_api_key); } catch (error) { return Response.json({ error: error instanceof Error ? error.message : 'Unable to decrypt provider secret' }, { status: 500 }); }
        return Response.json({ provider: provider.provider, apiKey, apiBaseUrl: provider.api_base_url, model: route.model_override || provider.default_model, promptOverride: route.prompt_override, fallbackProviderId: route.fallback_provider_id });
      },
    },
  },
});
