-- F-124 First-week path: when someone finished (or skipped) the welcome steps.
alter table profiles add column onboarded_at timestamptz;
grant update (onboarded_at) on profiles to authenticated;
-- Everyone who already exists has, in effect, been onboarded.
update profiles set onboarded_at = now() where onboarded_at is null;
