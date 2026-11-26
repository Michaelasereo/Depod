-- Row-level security. Mirrors the PRD permissions table:
--   view: any member · comment and react: any member · add/arrange/replace: owner, editor
--   lock the project bento: owner (trigger) · invite/remove members, billing, delete project: owner
-- Share-link (signed-out) access goes through server code with the service key, never these policies.

alter table public.organizations  enable row level security;
alter table public.org_admins     enable row level security;
alter table public.workspaces     enable row level security;
alter table public.profiles       enable row level security;
alter table public.members        enable row level security;
alter table public.invites        enable row level security;
alter table public.projects       enable row level security;
alter table public.moodboards     enable row level security;
alter table public.images         enable row level security;
alter table public.bentos         enable row level security;
alter table public.bento_versions enable row level security;
alter table public.comments       enable row level security;
alter table public.reactions      enable row level security;
alter table public.share_links    enable row level security;
alter table public.sessions       enable row level security;
alter table public.email_codes    enable row level security;
alter table public.code_lockouts  enable row level security;
alter table public.recovery_codes enable row level security;

-- Organisations: admins read their own. Writes are server-only (sales-led Enterprise).
create policy "org admins read" on public.organizations for select to authenticated
  using (exists (select 1 from public.org_admins a where a.org_id = id and a.user_id = auth.uid()));
create policy "org admins read own rows" on public.org_admins for select to authenticated
  using (user_id = auth.uid());

-- Workspaces: members read; anyone creates a team workspace they own; owners rename.
-- plan, seat_limit, org_id and trial_ends_at are changed only by billing on the server.
create policy "members read workspace" on public.workspaces for select to authenticated
  using (public.is_member(id));
create policy "create own team workspace" on public.workspaces for insert to authenticated
  with check (owner_id = auth.uid() and kind = 'team' and plan = 'free' and org_id is null and seat_limit is null);
create policy "owners update workspace" on public.workspaces for update to authenticated
  using (public.is_owner(id)) with check (public.is_owner(id));
revoke update on public.workspaces from authenticated;
grant update (name) on public.workspaces to authenticated;

-- Profiles: you edit your own; you can see people you share a workspace with.
create policy "read own and teammates' profiles" on public.profiles for select to authenticated
  using (
    user_id = auth.uid()
    or exists (
      select 1 from public.members me join public.members them on them.workspace_id = me.workspace_id
      where me.user_id = auth.uid() and them.user_id = profiles.user_id
    )
  );
create policy "update own profile" on public.profiles for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Members: members see the list; owners change roles and remove; anyone may leave.
-- New members arrive only by accepting an invite (server) or creating a workspace (trigger).
create policy "members read members" on public.members for select to authenticated
  using (public.is_member(workspace_id));
create policy "owners change roles" on public.members for update to authenticated
  using (public.is_owner(workspace_id)) with check (public.is_owner(workspace_id));
create policy "owners remove, anyone leaves" on public.members for delete to authenticated
  using (public.is_owner(workspace_id) or user_id = auth.uid());

-- Invites: owners only. Accepting runs on the server by token.
create policy "owners manage invites" on public.invites for all to authenticated
  using (public.is_owner(workspace_id)) with check (public.is_owner(workspace_id) and invited_by = auth.uid());

-- Projects: members read; editors create and rename; only owners delete.
create policy "members read projects" on public.projects for select to authenticated
  using (public.is_member(workspace_id));
create policy "editors create projects" on public.projects for insert to authenticated
  with check (public.can_edit(workspace_id) and created_by = auth.uid());
create policy "editors update projects" on public.projects for update to authenticated
  using (public.can_edit(workspace_id)) with check (public.can_edit(workspace_id));
create policy "owners delete projects" on public.projects for delete to authenticated
  using (public.is_owner(workspace_id));

-- Moodboards: members read; editors create, edit and delete.
create policy "members read moodboards" on public.moodboards for select to authenticated
  using (public.is_member(workspace_id));
create policy "editors create moodboards" on public.moodboards for insert to authenticated
  with check (
    public.can_edit(workspace_id) and created_by = auth.uid()
    and (project_id is null or public.project_ws(project_id) = workspace_id)
  );
create policy "editors update moodboards" on public.moodboards for update to authenticated
  using (public.can_edit(workspace_id))
  with check (public.can_edit(workspace_id) and (project_id is null or public.project_ws(project_id) = workspace_id));
create policy "editors delete moodboards" on public.moodboards for delete to authenticated
  using (public.can_edit(workspace_id));

-- Images: follow their moodboard.
create policy "members read images" on public.images for select to authenticated
  using (public.is_member(public.moodboard_ws(moodboard_id)));
create policy "editors add images" on public.images for insert to authenticated
  with check (public.can_edit(public.moodboard_ws(moodboard_id)) and added_by = auth.uid());
create policy "editors move images" on public.images for update to authenticated
  using (public.can_edit(public.moodboard_ws(moodboard_id)))
  with check (public.can_edit(public.moodboard_ws(moodboard_id)));
create policy "editors delete images" on public.images for delete to authenticated
  using (public.can_edit(public.moodboard_ws(moodboard_id)));

-- Bentos: created by trigger; members read; editors arrange (lock rules in the trigger).
create policy "members read bentos" on public.bentos for select to authenticated
  using (public.is_member(public.bento_ws(id)));
create policy "editors arrange bentos" on public.bentos for update to authenticated
  using (public.can_edit(public.bento_ws(id))) with check (public.can_edit(public.bento_ws(id)));

-- Versions of the chosen direction: members read; owners write (when they lock).
create policy "members read versions" on public.bento_versions for select to authenticated
  using (public.is_member(public.bento_ws(bento_id)));
create policy "owners save versions" on public.bento_versions for insert to authenticated
  with check (public.is_owner(public.bento_ws(bento_id)) and locked_by = auth.uid());

-- Comments: every member, viewers included, can comment; authors edit their own; anyone resolves.
create policy "members read comments" on public.comments for select to authenticated
  using (public.is_member(public.bento_ws(bento_id)));
create policy "members comment" on public.comments for insert to authenticated
  with check (public.is_member(public.bento_ws(bento_id)) and author_id = auth.uid());
create policy "members resolve, authors edit" on public.comments for update to authenticated
  using (public.is_member(public.bento_ws(bento_id)))
  with check (public.is_member(public.bento_ws(bento_id)));
create policy "authors and owners delete comments" on public.comments for delete to authenticated
  using (author_id = auth.uid() or public.is_owner(public.bento_ws(bento_id)));

-- Reactions: every member reacts as themselves.
create policy "members read reactions" on public.reactions for select to authenticated
  using (public.is_member(public.moodboard_ws(moodboard_id)));
create policy "members react" on public.reactions for insert to authenticated
  with check (public.is_member(public.moodboard_ws(moodboard_id)) and user_id = auth.uid());
create policy "remove own reaction" on public.reactions for delete to authenticated
  using (user_id = auth.uid());

-- Share links: editors create and revoke; members see them.
create policy "members read share links" on public.share_links for select to authenticated
  using (public.is_member(coalesce(public.moodboard_ws(moodboard_id), public.project_ws(project_id))));
create policy "editors create share links" on public.share_links for insert to authenticated
  with check (public.can_edit(coalesce(public.moodboard_ws(moodboard_id), public.project_ws(project_id))) and created_by = auth.uid());
create policy "editors revoke share links" on public.share_links for update to authenticated
  using (public.can_edit(coalesce(public.moodboard_ws(moodboard_id), public.project_ws(project_id))))
  with check (public.can_edit(coalesce(public.moodboard_ws(moodboard_id), public.project_ws(project_id))));

-- Sessions: you see and sign out your own devices. Created by the server at sign-in.
create policy "read own sessions" on public.sessions for select to authenticated
  using (user_id = auth.uid());
create policy "revoke own sessions" on public.sessions for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
revoke update on public.sessions from authenticated;
grant update (revoked_at, trusted_until) on public.sessions to authenticated;

-- email_codes, code_lockouts, recovery_codes: no policies, so only the server (service key) touches them.

-- Hide server-only workspace and security columns from anonymous users entirely.
revoke all on all tables in schema public from anon;
