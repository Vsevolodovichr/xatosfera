-- RealEstate CRM: Supabase schema, auth hooks, RLS and helper functions.

create extension if not exists "pgcrypto";

create type public.user_role as enum ('superuser', 'top_manager', 'manager');

create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  full_name text not null,
  phone text,
  avatar_url text,
  role public.user_role not null default 'manager',
  approved boolean not null default false,
  approved_at timestamptz,
  approved_by uuid references public.users(id),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.properties (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  address text not null,
  city text,
  price numeric(14,2),
  status text default 'draft',
  manager_id uuid references public.users(id),
  photos text[] not null default '{}',
  documents text[] not null default '{}',
  created_by uuid not null references public.users(id),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  report_type text,
  property_id uuid references public.properties(id) on delete set null,
  manager_id uuid references public.users(id),
  signed_at timestamptz,
  signature_url text,
  created_by uuid not null references public.users(id),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  content text,
  property_id uuid references public.properties(id) on delete cascade,
  created_by uuid not null references public.users(id),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.calendar_events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  starts_at timestamptz not null,
  ends_at timestamptz,
  property_id uuid references public.properties(id) on delete set null,
  user_id uuid not null references public.users(id),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.user_documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  file_name text not null,
  file_path text not null,
  file_size bigint,
  mime_type text,
  created_at timestamptz not null default timezone('utc', now())
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email, full_name, role, approved)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(coalesce(new.email, ''), '@', 1)),
    coalesce((new.raw_user_meta_data ->> 'role')::public.user_role, 'manager'),
    false
  )
  on conflict (id) do update
  set email = excluded.email,
      full_name = excluded.full_name,
      role = excluded.role;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_auth_user();

drop trigger if exists trg_users_updated_at on public.users;
create trigger trg_users_updated_at before update on public.users for each row execute procedure public.set_updated_at();
drop trigger if exists trg_properties_updated_at on public.properties;
create trigger trg_properties_updated_at before update on public.properties for each row execute procedure public.set_updated_at();
drop trigger if exists trg_reports_updated_at on public.reports;
create trigger trg_reports_updated_at before update on public.reports for each row execute procedure public.set_updated_at();
drop trigger if exists trg_notes_updated_at on public.notes;
create trigger trg_notes_updated_at before update on public.notes for each row execute procedure public.set_updated_at();
drop trigger if exists trg_calendar_events_updated_at on public.calendar_events;
create trigger trg_calendar_events_updated_at before update on public.calendar_events for each row execute procedure public.set_updated_at();

create or replace function public.has_role(required_role public.user_role)
returns boolean
language sql
stable
as $$
  select exists (
    select 1 from public.users u
    where u.id = auth.uid()
      and (
        u.role = 'superuser'
        or (required_role = 'manager' and u.role in ('manager', 'top_manager', 'superuser'))
        or (required_role = 'top_manager' and u.role in ('top_manager', 'superuser'))
      )
  );
$$;

alter table public.users enable row level security;
alter table public.properties enable row level security;
alter table public.reports enable row level security;
alter table public.notes enable row level security;
alter table public.calendar_events enable row level security;
alter table public.user_documents enable row level security;

create policy "users_read_own_or_admin" on public.users
for select using (id = auth.uid() or public.has_role('top_manager'));

create policy "users_update_own_or_admin" on public.users
for update using (id = auth.uid() or public.has_role('top_manager'))
with check (id = auth.uid() or public.has_role('top_manager'));

create policy "properties_select_for_authenticated" on public.properties
for select using (auth.uid() is not null);

create policy "properties_write_for_manager_up" on public.properties
for all using (public.has_role('manager'))
with check (public.has_role('manager'));

create policy "reports_select_for_authenticated" on public.reports
for select using (auth.uid() is not null);

create policy "reports_write_for_manager_up" on public.reports
for all using (public.has_role('manager'))
with check (public.has_role('manager'));

create policy "notes_owner_or_manager" on public.notes
for all using (created_by = auth.uid() or public.has_role('top_manager'))
with check (created_by = auth.uid() or public.has_role('top_manager'));

create policy "calendar_owner_or_manager" on public.calendar_events
for all using (user_id = auth.uid() or public.has_role('top_manager'))
with check (user_id = auth.uid() or public.has_role('top_manager'));

create policy "documents_owner_or_manager" on public.user_documents
for all using (user_id = auth.uid() or public.has_role('top_manager'))
with check (user_id = auth.uid() or public.has_role('top_manager'));

-- CRM extensions: clients, deals pipeline, tasks/events metadata
alter table public.notes add column if not exists priority text default 'medium';
alter table public.notes add column if not exists done boolean not null default false;

alter table public.calendar_events add column if not exists event_type text default 'meeting';
alter table public.calendar_events add column if not exists status text default 'planned';
alter table public.calendar_events add column if not exists google_event_id text;

create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  phone text,
  email text,
  segment text not null default 'buyer',
  age int,
  budget numeric(14,2),
  tags text[] not null default '{}',
  notes text,
  passport_doc_url text,
  lead_source text,
  created_by uuid not null references public.users(id),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.client_interactions (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  interaction_type text not null,
  details text,
  happened_at timestamptz not null default timezone('utc', now()),
  created_by uuid not null references public.users(id)
);

create table if not exists public.deals (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  stage text not null default 'lead',
  property_id uuid references public.properties(id) on delete set null,
  client_id uuid references public.clients(id) on delete set null,
  assigned_agent_id uuid references public.users(id) on delete set null,
  comments text,
  contract_url text,
  due_date timestamptz,
  created_by uuid not null references public.users(id),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

drop trigger if exists trg_clients_updated_at on public.clients;
create trigger trg_clients_updated_at before update on public.clients for each row execute procedure public.set_updated_at();
drop trigger if exists trg_deals_updated_at on public.deals;
create trigger trg_deals_updated_at before update on public.deals for each row execute procedure public.set_updated_at();

alter table public.clients enable row level security;
alter table public.client_interactions enable row level security;
alter table public.deals enable row level security;

create policy "clients_select_for_authenticated" on public.clients
for select using (auth.uid() is not null);
create policy "clients_write_for_manager_up" on public.clients
for all using (public.has_role('manager')) with check (public.has_role('manager'));

create policy "client_interactions_select_for_authenticated" on public.client_interactions
for select using (auth.uid() is not null);
create policy "client_interactions_write_for_manager_up" on public.client_interactions
for all using (public.has_role('manager')) with check (public.has_role('manager'));

create policy "deals_select_for_authenticated" on public.deals
for select using (auth.uid() is not null);
create policy "deals_write_for_manager_up" on public.deals
for all using (public.has_role('manager')) with check (public.has_role('manager'));

-- Extended properties structure for CRM object card/search requirements
alter table public.properties add column if not exists operation_type text default 'sale';
alter table public.properties add column if not exists category text default 'apartment';
alter table public.properties add column if not exists source text default 'owner';
alter table public.properties add column if not exists district text;
alter table public.properties add column if not exists street text;
alter table public.properties add column if not exists building_number text;
alter table public.properties add column if not exists block text;
alter table public.properties add column if not exists floor int;
alter table public.properties add column if not exists apartment text;
alter table public.properties add column if not exists latitude numeric(10,7);
alter table public.properties add column if not exists longitude numeric(10,7);
alter table public.properties add column if not exists rooms int;
alter table public.properties add column if not exists area_total numeric(10,2);
alter table public.properties add column if not exists area_living numeric(10,2);
alter table public.properties add column if not exists area_kitchen numeric(10,2);
alter table public.properties add column if not exists floors_total int;
alter table public.properties add column if not exists property_condition text;
alter table public.properties add column if not exists heating text;
alter table public.properties add column if not exists bathroom text;
alter table public.properties add column if not exists balcony_type text;
alter table public.properties add column if not exists currency text default 'UAH';
alter table public.properties add column if not exists price_per_sqm numeric(14,2);
alter table public.properties add column if not exists negotiable boolean not null default false;
alter table public.properties add column if not exists additional_costs text;
alter table public.properties add column if not exists owner_name text;
alter table public.properties add column if not exists owner_phones text[] not null default '{}';
alter table public.properties add column if not exists owner_email text;
alter table public.properties add column if not exists owner_notes text;
alter table public.properties add column if not exists tags text[] not null default '{}';
alter table public.properties add column if not exists agent_notes text;
alter table public.properties add column if not exists linked_client_id uuid references public.clients(id) on delete set null;
alter table public.properties add column if not exists linked_deal_id uuid references public.deals(id) on delete set null;

-- Additional client metadata for personalization
alter table public.clients add column if not exists documents text[] not null default '{}';
