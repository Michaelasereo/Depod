-- Free plan limits (PRD → Pricing): 3 moodboards per workspace, 50 images per moodboard.
-- Pro: unlimited moodboards, 500 images each. Team: 2,000 each. Enterprise: unlimited.
-- Enforced in the database so no client can go around them; the app shows Figma 19 when it hits one.
create or replace function public.plan_of(ws uuid)
returns text language sql stable security definer set search_path = public as $$
  select plan from public.workspaces where id = ws
$$;

create or replace function public.enforce_moodboard_limit()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if public.plan_of(new.workspace_id) = 'free'
     and (select count(*) from public.moodboards where workspace_id = new.workspace_id) >= 3 then
    raise exception 'plan_limit_moodboards' using errcode = 'P0001';
  end if;
  return new;
end $$;

create trigger moodboard_limit before insert on public.moodboards
  for each row execute function public.enforce_moodboard_limit();

create or replace function public.enforce_image_limit()
returns trigger language plpgsql security definer set search_path = public as $$
declare cap int;
begin
  cap := case public.plan_of(public.moodboard_ws(new.moodboard_id))
    when 'free' then 50 when 'pro' then 500 when 'team' then 2000 else null end;
  if cap is not null and (select count(*) from public.images where moodboard_id = new.moodboard_id) >= cap then
    raise exception 'plan_limit_images' using errcode = 'P0001';
  end if;
  return new;
end $$;

create trigger image_limit before insert on public.images
  for each row execute function public.enforce_image_limit();
