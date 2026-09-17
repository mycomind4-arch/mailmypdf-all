-- Autonomous publication persistence.
-- Server/admin only: RLS is enabled and no client policies are granted.

create extension if not exists vector with schema extensions;

create table if not exists public.publication_runs (
  run_id text primary key,
  publication_id text not null,
  edition_id text,
  subject text,
  status text not null check (status in ('running', 'awaiting_approval', 'published', 'rejected', 'failed')),
  stage text not null,
  run_json jsonb not null,
  rendered_json jsonb,
  provider_id text,
  publication_url text,
  approved_by uuid references auth.users(id) on delete set null,
  approved_at timestamptz,
  rejected_by uuid references auth.users(id) on delete set null,
  rejected_at timestamptz,
  approval_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists publication_runs_publication_updated_idx
  on public.publication_runs (publication_id, updated_at desc);

create index if not exists publication_runs_status_updated_idx
  on public.publication_runs (status, updated_at desc);

create table if not exists public.publication_story_memory (
  publication_id text not null,
  publication_story_id text not null,
  url text not null,
  title text not null,
  published_at timestamptz not null,
  embedding extensions.vector(384),
  embedding_model text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  primary key (publication_id, publication_story_id)
);

create index if not exists publication_story_memory_published_at_idx
  on public.publication_story_memory (publication_id, published_at desc);

-- HNSW index for the planned 384-dimensional local FastEmbed model.
create index if not exists publication_story_memory_embedding_hnsw_idx
  on public.publication_story_memory
  using hnsw (embedding vector_cosine_ops)
  where embedding is not null;

alter table public.publication_runs enable row level security;
alter table public.publication_story_memory enable row level security;

comment on table public.publication_runs is
  'Durable Studio autonomous-publication runs, verified rendered artifacts, approval state, and delivery metadata.';

comment on table public.publication_story_memory is
  'Per-publication historical story memory used for repeat and semantic-near-duplicate detection.';


create table if not exists public.publication_schedule_claims (
  publication_id text not null,
  schedule_key text not null,
  status text not null default 'claimed' check (status in ('claimed', 'completed', 'failed')),
  run_id text references public.publication_runs(run_id) on delete set null,
  error text,
  claimed_at timestamptz not null default now(),
  completed_at timestamptz,
  primary key (publication_id, schedule_key)
);

alter table public.publication_schedule_claims enable row level security;

comment on table public.publication_schedule_claims is
  'Idempotency claims preventing duplicate autonomous publication runs for the same schedule window.';


create or replace function public.match_publication_story_memory(
  p_publication_id text,
  p_embedding extensions.vector(384),
  p_limit integer default 5
)
returns table (
  publication_story_id text,
  published_at timestamptz,
  similarity double precision
)
language sql
stable
security invoker
as $$
  select
    memory.publication_story_id,
    memory.published_at,
    1 - (memory.embedding <=> p_embedding) as similarity
  from public.publication_story_memory as memory
  where memory.publication_id = p_publication_id
    and memory.embedding is not null
  order by memory.embedding <=> p_embedding
  limit greatest(1, least(coalesce(p_limit, 5), 50));
$$;

revoke all on function public.match_publication_story_memory(text, extensions.vector, integer)
  from public, anon, authenticated;
grant execute on function public.match_publication_story_memory(text, extensions.vector, integer)
  to service_role;

comment on function public.match_publication_story_memory(text, extensions.vector, integer) is
  'Service-role-only cosine similarity search for autonomous publication story memory.';
