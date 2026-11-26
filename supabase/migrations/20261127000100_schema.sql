-- Depod v1 schema. Source: PRD "Data model" and "Permissions".
-- Every table has row-level security; access goes through the helpers at the bottom.

create extension if not exists pgcrypto;

-- ───────────────────────── Organisations (Enterprise) ─────────────────────────
create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  verified_domain text,
  sso_config jsonb,
  seat_limit int,
  contract_ends_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.org_admins (
  org_id uuid not null references public.organizations on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  primary key (org_id, user_id)
);

-- ───────────────────────── Workspaces and people ─────────────────────────
create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  kind text not null check (kind in ('personal', 'team')),
  plan text not null default 'free' check (plan in ('free', 'pro', 'team', 'enterprise')),
  seat_limit int,
  owner_id uuid not null references auth.users on delete restrict,
  org_id uuid references public.organizations on delete set null,
  trial_ends_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.profiles (
  user_id uuid primary key references auth.users on delete cascade,
  name text,
  avatar text,
  theme text not null default 'system' check (theme in ('light', 'dark', 'system')),
  daily_summary boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.members (
  workspace_id uuid not null references public.workspaces on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  role text not null check (role in ('owner', 'editor', 'viewer')),
  invited_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);

create table public.invites (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces on delete cascade,
  email text not null,
  role text not null check (role in ('editor', 'viewer')),
  token text not null unique default encode(gen_random_bytes(24), 'hex'),
  invited_by uuid references auth.users on delete set null,
  expires_at timestamptz not null default now() + interval '7 days',
  accepted_at timestamptz,
  created_at timestamptz not null default now()
);

-- ───────────────────────── Projects, moodboards, images ─────────────────────────
create table public.projects (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces on delete cascade,
  name text not null,
  created_by uuid references auth.users on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.moodboards (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces on delete cascade,
  project_id uuid references public.projects on delete set null,
  name text not null,
  starter_layout text not null default 'hero-left' check (starter_layout in ('hero-left', 'hero-top', 'even-grid', 'mosaic')),
  canvas_x real not null default 0,
  canvas_y real not null default 0,
  created_by uuid references auth.users on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.images (
  id uuid primary key default gen_random_uuid(),
  moodboard_id uuid not null references public.moodboards on delete cascade,
  file_path text not null,
  width int not null check (width > 0),
  height int not null check (height > 0),
  hash text not null,
  canvas_x real not null default 0,
  canvas_y real not null default 0,
  added_by uuid references auth.users on delete set null,
  created_at timestamptz not null default now()
);
create index on public.images (moodboard_id);
create index on public.images (moodboard_id, hash);

-- One bento per moodboard, one project bento per project.
create table public.bentos (
  id uuid primary key default gen_random_uuid(),
  moodboard_id uuid unique references public.moodboards on delete cascade,
  project_id uuid unique references public.projects on delete cascade,
  layout jsonb not null default '[]'::jsonb, -- [{ image_id, slot, order, locked }]
  locked boolean not null default false,      -- project bento: the chosen direction
  created_by uuid references auth.users on delete set null,
  updated_at timestamptz not null default now(),
  check ((moodboard_id is null) <> (project_id is null)),
  check (not locked or project_id is not null)
);

create table public.bento_versions (
  id uuid primary key default gen_random_uuid(),
  bento_id uuid not null references public.bentos on delete cascade,
  layout jsonb not null,
  locked_at timestamptz not null default now(),
  locked_by uuid references auth.users on delete set null
);

-- ───────────────────────── Collaboration ─────────────────────────
create table public.comments (
  id uuid primary key default gen_random_uuid(),
  bento_id uuid not null references public.bentos on delete cascade,
  image_id uuid references public.images on delete set null,
  body text not null check (length(body) between 1 and 4000),
  parent_id uuid references public.comments on delete cascade,
  author_id uuid not null references auth.users on delete cascade,
  resolved boolean not null default false,
  created_at timestamptz not null default now()
);
create index on public.comments (bento_id);

create table public.reactions (
  moodboard_id uuid not null references public.moodboards on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  emoji text not null check (length(emoji) between 1 and 16),
  created_at timestamptz not null default now(),
  primary key (moodboard_id, user_id, emoji)
);

create table public.share_links (
  id uuid primary key default gen_random_uuid(),
  moodboard_id uuid references public.moodboards on delete cascade,
  project_id uuid references public.projects on delete cascade,
  token text not null unique default encode(gen_random_bytes(24), 'hex'),
  created_by uuid references auth.users on delete set null,
  revoked boolean not null default false,
  created_at timestamptz not null default now(),
  check ((moodboard_id is null) <> (project_id is null))
);

-- ───────────────────────── Security ─────────────────────────
-- Signed-in devices; trusted_until skips email codes for 30 days.
create table public.sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  device_token_hash text not null,
  device text,
  browser text,
  ip inet,
  city text,
  country text,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  trusted_until timestamptz,
  revoked_at timestamptz
);
create index on public.sessions (user_id);

-- Email sign-in codes (second step). Only the server writes or reads these.
create table public.email_codes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  code_hash text not null,
  attempts int not null default 0,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);
create index on public.email_codes (user_id, created_at desc);

-- 5 wrong codes lock the attempt for 15 minutes.
create table public.code_lockouts (
  user_id uuid primary key references auth.users on delete cascade,
  failures int not null default 0,
  locked_until timestamptz
);

create table public.recovery_codes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  code_hash text not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);
create index on public.recovery_codes (user_id);

-- ───────────────────────── Access helpers ─────────────────────────
create or replace function public.role_in(ws uuid)
returns text language sql stable security definer set search_path = public as $$
  select role from public.members where workspace_id = ws and user_id = auth.uid()
$$;

create or replace function public.is_member(ws uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.members where workspace_id = ws and user_id = auth.uid())
$$;

create or replace function public.can_edit(ws uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(public.role_in(ws) in ('owner', 'editor'), false)
$$;

create or replace function public.is_owner(ws uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(public.role_in(ws) = 'owner', false)
$$;

create or replace function public.moodboard_ws(mb uuid)
returns uuid language sql stable security definer set search_path = public as $$
  select workspace_id from public.moodboards where id = mb
$$;

create or replace function public.project_ws(p uuid)
returns uuid language sql stable security definer set search_path = public as $$
  select workspace_id from public.projects where id = p
$$;

create or replace function public.bento_ws(b uuid)
returns uuid language sql stable security definer set search_path = public as $$
  select coalesce(public.moodboard_ws(moodboard_id), public.project_ws(project_id)) from public.bentos where id = b
$$;

-- ───────────────────────── New users ─────────────────────────
-- Every user gets a profile and a personal workspace they own.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare ws uuid;
begin
  insert into public.profiles (user_id, name, avatar)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'), new.raw_user_meta_data->>'avatar_url');
  insert into public.workspaces (name, kind, owner_id) values ('Personal', 'personal', new.id) returning id into ws;
  insert into public.members (workspace_id, user_id, role) values (ws, new.id, 'owner');
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- A new team workspace makes its creator the owner.
create or replace function public.handle_new_workspace()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.kind = 'team' then
    insert into public.members (workspace_id, user_id, role) values (new.id, new.owner_id, 'owner')
    on conflict do nothing;
  end if;
  return new;
end $$;

create trigger on_workspace_created after insert on public.workspaces
  for each row execute function public.handle_new_workspace();

-- A new moodboard gets its bento; a new project gets its project bento.
create or replace function public.handle_new_board()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_table_name = 'moodboards' then
    insert into public.bentos (moodboard_id, created_by) values (new.id, new.created_by);
  else
    insert into public.bentos (project_id, created_by) values (new.id, new.created_by);
  end if;
  return new;
end $$;

create trigger on_moodboard_created after insert on public.moodboards
  for each row execute function public.handle_new_board();
create trigger on_project_created after insert on public.projects
  for each row execute function public.handle_new_board();

-- Only owners lock or unlock the project bento; a locked bento's layout can't change.
create or replace function public.guard_bento_update()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.locked is distinct from old.locked and not public.is_owner(public.bento_ws(old.id)) then
    raise exception 'Only owners can lock or unlock the chosen direction' using errcode = '42501';
  end if;
  if old.locked and new.locked and new.layout is distinct from old.layout then
    raise exception 'The chosen direction is locked' using errcode = '42501';
  end if;
  new.updated_at := now();
  return new;
end $$;

create trigger guard_bento before update on public.bentos
  for each row execute function public.guard_bento_update();

-- Members can't change their own role, and the last owner can't be removed.
create or replace function public.guard_member_change()
returns trigger language plpgsql security definer set search_path = public as $$
declare ws uuid := coalesce(old.workspace_id, new.workspace_id);
begin
  -- Server code (no signed-in user) and cascades from a deleted workspace are allowed.
  if auth.uid() is null or not exists (select 1 from public.workspaces where id = ws) then
    return coalesce(new, old);
  end if;
  if (tg_op = 'DELETE' or new.role <> 'owner') and old.role = 'owner'
     and (select count(*) from public.members where workspace_id = ws and role = 'owner') <= 1 then
    raise exception 'Hand ownership to someone else first' using errcode = '42501';
  end if;
  return coalesce(new, old);
end $$;

create trigger guard_member before update or delete on public.members
  for each row execute function public.guard_member_change();
