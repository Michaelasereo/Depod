-- Users may sign out a device, but only the server marks a device as trusted.
revoke update on public.sessions from authenticated;
grant update (revoked_at) on public.sessions to authenticated;

-- Anyone in the workspace can resolve a comment; only its author can change the words.
create or replace function public.guard_comment_update()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (new.body is distinct from old.body
      or new.author_id is distinct from old.author_id
      or new.bento_id is distinct from old.bento_id
      or new.parent_id is distinct from old.parent_id
      or new.image_id is distinct from old.image_id)
     and auth.uid() is not null and old.author_id <> auth.uid() then
    raise exception 'Only the author can edit a comment' using errcode = '42501';
  end if;
  return new;
end $$;

create trigger guard_comment before update on public.comments
  for each row execute function public.guard_comment_update();

-- Helpers are for policies, not for calling directly over the API.
revoke execute on function public.role_in(uuid), public.is_member(uuid), public.can_edit(uuid), public.is_owner(uuid),
  public.moodboard_ws(uuid), public.project_ws(uuid), public.bento_ws(uuid) from anon;
