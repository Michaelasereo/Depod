-- Light is the default theme (Michael, 27 Nov). People can still pick Dark or System in Preferences.
alter table public.profiles alter column theme set default 'light';
update public.profiles set theme = 'light' where theme = 'system';
