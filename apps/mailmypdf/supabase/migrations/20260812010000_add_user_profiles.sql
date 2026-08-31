-- User profiles for customer accounts.
-- Extends Supabase auth.users with customer-specific data.
-- Orders are linked to users by email (orders.email = auth.users.email).

create table if not exists public.user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  company text,
  marketing_opt_in boolean not null default false,
  default_sender_name text,
  default_sender_line1 text,
  default_sender_line2 text,
  default_sender_city text,
  default_sender_state text,
  default_sender_postal text,
  default_recipient_name text,
  default_recipient_line1 text,
  default_recipient_line2 text,
  default_recipient_city text,
  default_recipient_state text,
  default_recipient_postal text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Row-level security: users can only read/update their own profile
alter table public.user_profiles enable row level security;

drop policy if exists "user_profiles_self_select" on public.user_profiles;
create policy "user_profiles_self_select" on public.user_profiles
  for select using (auth.uid() = id);

drop policy if exists "user_profiles_self_insert" on public.user_profiles;
create policy "user_profiles_self_insert" on public.user_profiles
  for insert with check (auth.uid() = id);

drop policy if exists "user_profiles_self_update" on public.user_profiles;
create policy "user_profiles_self_update" on public.user_profiles
  for update using (auth.uid() = id);

-- Auto-create a profile row when a new auth user signs up
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.user_profiles (id, full_name, marketing_opt_in)
  values (new.id, new.raw_user_meta_data->>'full_name', coalesce((new.raw_user_meta_data->>'marketing_opt_in')::boolean, false))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Allow users to read their own orders (by matching email)
drop policy if exists "orders_owner_select" on public.orders;
create policy "orders_owner_select" on public.orders
  for select using (
    exists (
      select 1 from auth.users
      where auth.users.email = orders.email
      and auth.users.id = auth.uid()
    )
  );

-- Index for looking up orders by user email
create index if not exists orders_email_idx on public.orders (email);

comment on table public.user_profiles is 'Customer profile data extending auth.users. Linked to orders by email address.';
