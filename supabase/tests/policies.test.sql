-- Access-rule tests. Runs in one transaction and rolls back, so it leaves no data.
-- Every check raises an exception on failure; the final select returns 'all passed'.
-- Run: npm run test:db  (or paste into the Supabase SQL editor).

begin;

create function pg_temp.act_as(uid uuid) returns void language plpgsql as $$
begin
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
end $$;

create function pg_temp.act_as_server() returns void language plpgsql as $$
begin
  perform set_config('role', 'postgres', true);
  perform set_config('request.jwt.claims', '', true);
end $$;

create function pg_temp.expect_denied(label text, stmt text) returns void language plpgsql as $$
declare n int;
begin
  begin
    execute stmt;
    get diagnostics n = row_count;
  exception when insufficient_privilege or check_violation or others then
    return; -- denied, as expected
  end;
  if n > 0 then
    raise exception 'FAILED (should be denied): %', label;
  end if;
end $$;

create function pg_temp.expect_ok(label text, stmt text) returns void language plpgsql as $$
declare n int;
begin
  execute stmt;
  get diagnostics n = row_count;
  if n = 0 then raise exception 'FAILED (changed nothing): %', label; end if;
exception when others then
  raise exception 'FAILED (%): %', sqlerrm, label;
end $$;

create function pg_temp.expect_count(label text, q text, want int) returns void language plpgsql as $$
declare got int;
begin
  execute 'select count(*) from (' || q || ') t' into got;
  if got <> want then raise exception 'FAILED: % (got %, want %)', label, got, want; end if;
end $$;

-- People: Alice owns a team; Carol edits; Dave views; Bob is a stranger.
insert into auth.users (id, email, aud, role) values
  ('00000000-0000-0000-0000-00000000000a', 'alice@test.depod', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-00000000000b', 'bob@test.depod',   'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-00000000000c', 'carol@test.depod', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-00000000000d', 'dave@test.depod',  'authenticated', 'authenticated');

do $$
declare
  alice uuid := '00000000-0000-0000-0000-00000000000a';
  bob   uuid := '00000000-0000-0000-0000-00000000000b';
  carol uuid := '00000000-0000-0000-0000-00000000000c';
  dave  uuid := '00000000-0000-0000-0000-00000000000d';
  team uuid; bob_ws uuid; bob_mb uuid; bob_proj uuid; proj uuid; mb uuid; pbento uuid; bento uuid; cmt uuid;
begin
  -- Sign-up gave everyone a profile and a personal workspace they own.
  perform pg_temp.expect_count('sign-up creates a personal workspace',
    'select 1 from public.members m join public.workspaces w on w.id = m.workspace_id where m.user_id = ''' || bob || ''' and w.kind = ''personal'' and m.role = ''owner''', 1);
  select workspace_id into bob_ws from public.members where user_id = bob;

  -- Bob makes a private moodboard.
  perform pg_temp.act_as(bob);
  insert into public.moodboards (workspace_id, name, created_by) values (bob_ws, 'Bob private', bob) returning id into bob_mb;
  insert into public.projects (workspace_id, name, created_by) values (bob_ws, 'Bob project', bob) returning id into bob_proj;

  -- 1. A user can't read another workspace (the Phase 1 "done when" test).
  perform pg_temp.act_as(alice);
  perform pg_temp.expect_count('stranger sees no other workspace', 'select 1 from public.workspaces where id = ''' || bob_ws || '''', 0);
  perform pg_temp.expect_count('stranger sees no other moodboards', 'select 1 from public.moodboards where id = ''' || bob_mb || '''', 0);
  perform pg_temp.expect_count('stranger sees no other bentos', 'select 1 from public.bentos where moodboard_id = ''' || bob_mb || '''', 0);
  perform pg_temp.expect_denied('stranger adds a moodboard to another workspace',
    'insert into public.moodboards (workspace_id, name, created_by) values (''' || bob_ws || ''', ''x'', ''' || alice || ''')');
  perform pg_temp.expect_denied('stranger renames another moodboard', 'update public.moodboards set name = ''hacked'' where id = ''' || bob_mb || '''');

  -- Alice creates a team workspace and becomes its owner.
  insert into public.workspaces (name, kind, owner_id) values ('Studio', 'team', alice) returning id into team;
  perform pg_temp.expect_count('creator owns the team', 'select 1 from public.members where workspace_id = ''' || team || ''' and user_id = ''' || alice || ''' and role = ''owner''', 1);
  perform pg_temp.expect_denied('nobody creates a paid workspace directly',
    'insert into public.workspaces (name, kind, owner_id, plan) values (''Free lunch'', ''team'', ''' || alice || ''', ''team'')');
  perform pg_temp.expect_denied('owners can''t change their own plan', 'update public.workspaces set plan = ''enterprise'' where id = ''' || team || '''');

  -- Invites are accepted on the server; here the server adds Carol (editor) and Dave (viewer).
  perform pg_temp.act_as_server();
  insert into public.members (workspace_id, user_id, role) values (team, carol, 'editor'), (team, dave, 'viewer');

  -- 2. Invite and remove members: owner only.
  perform pg_temp.act_as(carol);
  perform pg_temp.expect_denied('editor invites', 'insert into public.invites (workspace_id, email, role, invited_by) values (''' || team || ''', ''x@test.depod'', ''editor'', ''' || carol || ''')');
  perform pg_temp.expect_denied('editor makes themselves owner', 'update public.members set role = ''owner'' where workspace_id = ''' || team || ''' and user_id = ''' || carol || '''');
  perform pg_temp.expect_denied('editor removes the viewer', 'delete from public.members where workspace_id = ''' || team || ''' and user_id = ''' || dave || '''');
  perform pg_temp.act_as(alice);
  perform pg_temp.expect_ok('owner invites', 'insert into public.invites (workspace_id, email, role, invited_by) values (''' || team || ''', ''x@test.depod'', ''editor'', ''' || alice || ''')');
  perform pg_temp.expect_denied('the last owner can''t leave', 'delete from public.members where workspace_id = ''' || team || ''' and user_id = ''' || alice || '''');

  -- 3. Add images, arrange bentos: owner and editor, not viewer.
  perform pg_temp.act_as(carol);
  insert into public.projects (workspace_id, name, created_by) values (team, 'Brand refresh', carol) returning id into proj;
  insert into public.moodboards (workspace_id, project_id, name, created_by) values (team, proj, 'Warm', carol) returning id into mb;
  select id into bento from public.bentos where moodboard_id = mb;
  select id into pbento from public.bentos where project_id = proj;
  perform pg_temp.expect_ok('editor adds an image', 'insert into public.images (moodboard_id, file_path, width, height, hash, added_by) values (''' || mb || ''', ''a.jpg'', 10, 10, ''h'', ''' || carol || ''')');
  perform pg_temp.expect_ok('editor arranges the bento', 'update public.bentos set layout = ''[{"slot":0}]'' where id = ''' || bento || '''');
  perform pg_temp.expect_denied('moodboard can''t join another workspace''s project',
    'update public.moodboards set project_id = ''' || bob_proj || ''' where id = ''' || mb || '''');

  perform pg_temp.act_as(dave);
  perform pg_temp.expect_count('viewer sees the moodboard', 'select 1 from public.moodboards where id = ''' || mb || '''', 1);
  perform pg_temp.expect_denied('viewer adds an image', 'insert into public.images (moodboard_id, file_path, width, height, hash, added_by) values (''' || mb || ''', ''b.jpg'', 10, 10, ''h'', ''' || dave || ''')');
  perform pg_temp.expect_denied('viewer arranges the bento', 'update public.bentos set layout = ''[]'' where id = ''' || bento || '''');
  perform pg_temp.expect_denied('viewer renames the moodboard', 'update public.moodboards set name = ''x'' where id = ''' || mb || '''');
  perform pg_temp.expect_denied('viewer deletes the moodboard', 'delete from public.moodboards where id = ''' || mb || '''');

  -- 4. Comment and react: every member, viewers too.
  perform pg_temp.act_as(carol);
  insert into public.comments (bento_id, body, author_id) values (bento, 'Love the warm tones', carol) returning id into cmt;
  perform pg_temp.act_as(dave);
  perform pg_temp.expect_ok('viewer comments', 'insert into public.comments (bento_id, body, author_id) values (''' || bento || ''', ''Agree'', ''' || dave || ''')');
  perform pg_temp.expect_ok('viewer reacts', 'insert into public.reactions (moodboard_id, user_id, emoji) values (''' || mb || ''', ''' || dave || ''', ''🔥'')');
  perform pg_temp.expect_denied('viewer reacts as someone else', 'insert into public.reactions (moodboard_id, user_id, emoji) values (''' || mb || ''', ''' || carol || ''', ''👍'')');
  perform pg_temp.expect_denied('viewer comments as someone else', 'insert into public.comments (bento_id, body, author_id) values (''' || bento || ''', ''x'', ''' || carol || ''')');
  perform pg_temp.expect_denied('only the author edits a comment', 'update public.comments set body = ''changed'' where id = ''' || cmt || '''');
  perform pg_temp.expect_ok('any member resolves a comment', 'update public.comments set resolved = true where id = ''' || cmt || '''');
  perform pg_temp.act_as(bob);
  perform pg_temp.expect_count('stranger sees no comments', 'select 1 from public.comments where bento_id = ''' || bento || '''', 0);
  perform pg_temp.expect_denied('stranger comments', 'insert into public.comments (bento_id, body, author_id) values (''' || bento || ''', ''x'', ''' || bob || ''')');

  -- 5. Lock the project bento (chosen direction): owner only; a locked bento can't change.
  perform pg_temp.act_as(carol);
  perform pg_temp.expect_denied('editor locks the direction', 'update public.bentos set locked = true where id = ''' || pbento || '''');
  perform pg_temp.act_as(alice);
  perform pg_temp.expect_ok('owner locks the direction', 'update public.bentos set locked = true where id = ''' || pbento || '''');
  perform pg_temp.expect_ok('owner saves a version', 'insert into public.bento_versions (bento_id, layout, locked_by) values (''' || pbento || ''', ''[]'', ''' || alice || ''')');
  perform pg_temp.act_as(carol);
  perform pg_temp.expect_denied('a locked direction can''t be rearranged', 'update public.bentos set layout = ''[{"slot":1}]'' where id = ''' || pbento || '''');
  perform pg_temp.expect_denied('editor saves a version', 'insert into public.bento_versions (bento_id, layout, locked_by) values (''' || pbento || ''', ''[]'', ''' || carol || ''')');
  perform pg_temp.expect_denied('a moodboard bento can''t be locked', 'update public.bentos set locked = true where id = ''' || bento || '''');

  -- 6. Delete a project: owner only.
  perform pg_temp.expect_denied('editor deletes the project', 'delete from public.projects where id = ''' || proj || '''');
  perform pg_temp.act_as(alice);
  perform pg_temp.expect_ok('owner deletes the project', 'delete from public.projects where id = ''' || proj || '''');

  -- 7. Security tables are server-only.
  perform pg_temp.act_as_server();
  insert into public.email_codes (user_id, code_hash, expires_at) values (alice, 'x', now() + interval '10 minutes');
  insert into public.sessions (user_id, device_token_hash) values (alice, 'x');
  perform pg_temp.act_as(alice);
  perform pg_temp.expect_count('users can''t read sign-in codes', 'select 1 from public.email_codes', 0);
  perform pg_temp.expect_denied('users can''t trust their own device', 'update public.sessions set trusted_until = now() + interval ''1 year''');
  perform pg_temp.expect_ok('users can sign out a device', 'update public.sessions set revoked_at = now()');
  perform pg_temp.act_as(bob);
  perform pg_temp.expect_count('users can''t see others'' devices', 'select 1 from public.sessions', 0);

  -- 8. Signed-out visitors read nothing.
  perform set_config('role', 'anon', true);
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
  perform pg_temp.expect_denied('anon reads moodboards', 'select * from public.moodboards');
  perform pg_temp.act_as_server();
end $$;

select 'all passed' as result;

rollback;
