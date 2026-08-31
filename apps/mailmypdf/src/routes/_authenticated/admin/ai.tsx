import { createFileRoute } from '@tanstack/react-router';
import { useServerFn } from '@tanstack/react-start';
import { useEffect, useState } from 'react';
import { SiteHeader, SiteFooter } from '@/components/site-chrome';
import { listAIControlPlane, setEcosystemVariable, upsertAIProvider, upsertAIWorkflowRoute } from '@/lib/admin-ai.functions';
import { isCurrentUserAdmin } from '@/lib/admin.functions';

export const Route = createFileRoute('/_authenticated/admin/ai')({
  head: () => ({ meta: [{ title: 'AI Control Plane — MailMyPDF' }, { name: 'robots', content: 'noindex' }] }),
  component: AIControlPlane,
});

function AIControlPlane() {
  const checkAdmin = useServerFn(isCurrentUserAdmin);
  const load = useServerFn(listAIControlPlane);
  const saveProvider = useServerFn(upsertAIProvider);
  const saveRoute = useServerFn(upsertAIWorkflowRoute);
  const saveVariable = useServerFn(setEcosystemVariable);
  const [admin, setAdmin] = useState(false);
  const [data, setData] = useState<any>(null);
  const [provider, setProvider] = useState({ provider: 'anthropic', label: 'Claude', apiKey: '', apiBaseUrl: '', defaultModel: '', enabled: true, metadata: {} });
  const [variable, setVariable] = useState({ key: '', value: '', isSecret: true, description: '' });
  const [message, setMessage] = useState('');

  const refresh = async () => setData(await load());
  useEffect(() => { checkAdmin().then((r) => { setAdmin(r.isAdmin); if (r.isAdmin) refresh(); }); }, []);

  if (!admin) return <div className="min-h-screen"><SiteHeader /><main className="mx-auto max-w-5xl px-6 py-16"><div className="envelope-card p-8"><h1 className="font-serif text-3xl">Not authorized</h1><p className="mt-2 text-sm text-muted-foreground">AI control plane is restricted to administrators.</p></div></main><SiteFooter /></div>;

  const saveP = async () => { setMessage(''); await saveProvider({ data: provider as any }); setMessage('Provider saved.'); await refresh(); setProvider({ ...provider, apiKey: '' }); };
  const saveV = async () => { setMessage(''); await saveVariable({ data: variable }); setMessage('Variable saved.'); await refresh(); setVariable({ key: '', value: '', isSecret: true, description: '' }); };

  return <div className="min-h-screen"><SiteHeader /><main className="mx-auto max-w-6xl px-6 py-10">
    <div><div className="postmark w-fit">Ecosystem control plane</div><h1 className="mt-3 font-serif text-4xl">AI, Models &amp; Runtime Variables</h1><p className="mt-2 max-w-3xl text-sm text-muted-foreground">Configure providers once in MailMyPDF. Vertical repos consume server-side routing rather than carrying separate API-key sprawl.</p></div>
    {message && <div className="mt-6 rounded-md border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{message}</div>}

    <section className="mt-8 grid gap-6 lg:grid-cols-2">
      <div className="envelope-card p-6"><h2 className="font-serif text-2xl">AI Providers</h2><p className="mt-1 text-xs text-muted-foreground">Secrets are encrypted at rest and never returned to this page.</p><div className="mt-5 space-y-3"><select value={provider.provider} onChange={e=>setProvider({...provider,provider:e.target.value})} className="w-full rounded-md border border-rule p-2 text-sm"><option value="anthropic">Anthropic / Claude</option><option value="openai">OpenAI</option><option value="gemini">Google Gemini</option></select><input value={provider.label} onChange={e=>setProvider({...provider,label:e.target.value})} placeholder="Label" className="w-full rounded-md border border-rule p-2 text-sm"/><input value={provider.apiKey} onChange={e=>setProvider({...provider,apiKey:e.target.value})} placeholder="API key (never displayed after save)" type="password" className="w-full rounded-md border border-rule p-2 text-sm"/><input value={provider.defaultModel} onChange={e=>setProvider({...provider,defaultModel:e.target.value})} placeholder="Default model" className="w-full rounded-md border border-rule p-2 text-sm"/><input value={provider.apiBaseUrl} onChange={e=>setProvider({...provider,apiBaseUrl:e.target.value})} placeholder="Optional API base URL" className="w-full rounded-md border border-rule p-2 text-sm"/><button onClick={saveP} className="rounded-full border border-ink px-4 py-2 text-sm">Save provider</button></div><div className="mt-6 space-y-2 text-sm">{data?.providers?.map((p:any)=><div key={p.id} className="flex justify-between border-b border-rule py-2"><span>{p.label} <span className="text-muted-foreground">({p.provider})</span></span><span className="text-xs text-muted-foreground">{p.default_model} · {p.enabled?'enabled':'disabled'}</span></div>)}</div></div>
      <div className="envelope-card p-6"><h2 className="font-serif text-2xl">Ecosystem Variables</h2><p className="mt-1 text-xs text-muted-foreground">Use this for shared non-provider settings and secrets that verticals consume through the control plane.</p><div className="mt-5 space-y-3"><input value={variable.key} onChange={e=>setVariable({...variable,key:e.target.value.toUpperCase()})} placeholder="VARIABLE_NAME" className="w-full rounded-md border border-rule p-2 text-sm"/><input value={variable.value} onChange={e=>setVariable({...variable,value:e.target.value})} placeholder={variable.isSecret?'Secret value':'Value'} type={variable.isSecret?'password':'text'} className="w-full rounded-md border border-rule p-2 text-sm"/><input value={variable.description} onChange={e=>setVariable({...variable,description:e.target.value})} placeholder="Description" className="w-full rounded-md border border-rule p-2 text-sm"/><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={variable.isSecret} onChange={e=>setVariable({...variable,isSecret:e.target.checked})}/> Secret / encrypted at rest</label><button onClick={saveV} className="rounded-full border border-ink px-4 py-2 text-sm">Save variable</button></div><div className="mt-6 space-y-2 text-sm">{data?.variables?.map((v:any)=><div key={v.key} className="flex justify-between border-b border-rule py-2"><span>{v.key}</span><span className="text-xs text-muted-foreground">{v.is_secret?'secret':'value'} · {new Date(v.updated_at).toLocaleString()}</span></div>)}</div></div>
    </section>

    <section className="mt-8 envelope-card p-6"><h2 className="font-serif text-2xl">Workflow Routing</h2><p className="mt-1 text-xs text-muted-foreground">Routing is stored by vertical + workflow + task. This is where Appeal Mail, Notice Respond, Dispute Mail, and future workflows select Claude, Gemini, OpenAI, or a fallback.</p><div className="mt-5 overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b border-rule text-left text-xs text-muted-foreground"><th className="px-2 py-2">Vertical</th><th className="px-2 py-2">Workflow</th><th className="px-2 py-2">Task</th><th className="px-2 py-2">Provider</th><th className="px-2 py-2">Model</th></tr></thead><tbody>{data?.routes?.map((r:any)=><tr key={r.id} className="border-b border-rule/50"><td className="px-2 py-2">{r.vertical_slug}</td><td className="px-2 py-2">{r.workflow_slug ?? 'default'}</td><td className="px-2 py-2">{r.task}</td><td className="px-2 py-2">{data.providers.find((p:any)=>p.id===r.provider_id)?.label ?? r.provider_id}</td><td className="px-2 py-2">{r.model_override ?? 'provider default'}</td></tr>)}</tbody></table></div></section>

    <section className="mt-8 envelope-card p-6"><h2 className="font-serif text-2xl">Audit Log</h2><div className="mt-4 space-y-2 text-xs">{data?.audit?.slice(0,20).map((a:any)=><div key={a.id} className="flex gap-4 border-b border-rule/50 py-2"><span>{new Date(a.created_at).toLocaleString()}</span><span>{a.action}</span><span>{a.resource_type}</span><span className="text-muted-foreground">{a.resource_id ?? ''}</span></div>)}</div></section>
  </main><SiteFooter /></div>;
}
