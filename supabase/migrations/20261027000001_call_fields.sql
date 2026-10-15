-- F-084 A call for volunteers or donations carries a sign-up or donate link, an optional date
-- (when to show up, or give by) and, for donations, an optional goal. No "raised so far" bar:
-- imnet can't verify it. Orgs only (donor posts stay kind 'update').
alter table posts
  add column action_url  text check (action_url ~ '^https?://'),
  add column action_date date,
  add column goal_usd    integer check (goal_usd between 1 and 100000000),
  add constraint call_action_fields check (
    case when kind in ('call_volunteers', 'call_donations')
      then action_url is not null and (kind = 'call_donations' or goal_usd is null)
      else action_url is null and action_date is null and goal_usd is null
    end
  );
