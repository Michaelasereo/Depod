-- Link each device row to its Supabase auth session, so "Sign out" on the Security page ends it.
alter table public.sessions add column auth_session_id uuid;

create or replace function public.revoke_auth_session(sid uuid)
returns void language sql security definer set search_path = public, auth as $$
  delete from auth.sessions where id = sid
$$;
revoke execute on function public.revoke_auth_session(uuid) from public, anon, authenticated;
