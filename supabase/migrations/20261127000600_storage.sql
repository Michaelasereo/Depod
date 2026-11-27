-- Private image storage. Paths: {workspace_id}/{moodboard_id}/{file}. Images are shown through signed URLs only.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('images', 'images', false, 20971520, array['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
on conflict (id) do nothing;

create or replace function public.path_ws(path text)
returns uuid language sql immutable as $$
  select case when (storage.foldername(path))[1] ~ '^[0-9a-f-]{36}$' then (storage.foldername(path))[1]::uuid end
$$;

create policy "members read images" on storage.objects for select to authenticated
  using (bucket_id = 'images' and public.is_member(public.path_ws(name)));
create policy "editors upload images" on storage.objects for insert to authenticated
  with check (bucket_id = 'images' and public.can_edit(public.path_ws(name)));
create policy "editors replace images" on storage.objects for update to authenticated
  using (bucket_id = 'images' and public.can_edit(public.path_ws(name)));
create policy "editors delete images" on storage.objects for delete to authenticated
  using (bucket_id = 'images' and public.can_edit(public.path_ws(name)));

-- Keep the image's file name for Image detail (29).
alter table public.images add column name text;
