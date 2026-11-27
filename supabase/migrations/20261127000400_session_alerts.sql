-- Sign-in alerts go out once per new device, after the second step.
alter table public.sessions add column alerted_at timestamptz;
