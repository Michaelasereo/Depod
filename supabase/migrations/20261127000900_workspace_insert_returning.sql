-- Creating a team workspace with `insert ... returning` failed: RETURNING checks the select policy,
-- and the owner's membership is only added by the after-insert trigger. The creator may read it too.
drop policy "members read workspace" on public.workspaces;
create policy "members read workspace" on public.workspaces for select to authenticated
  using (public.is_member(id) or owner_id = (select auth.uid()));
