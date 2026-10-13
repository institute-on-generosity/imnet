-- Open calls: a foundation invites nonprofits to apply. imnet links out to the application.

alter table posts
  add column call_deadline  date,
  add column call_apply_url text check (call_apply_url ~ '^https?://'),
  add column call_max_award integer check (call_max_award between 1 and 1000000000),
  add column call_causes    text[] not null default '{}',
  add constraint open_call_fields check (
    case when kind = 'open_call'
      then call_deadline is not null and call_apply_url is not null
      else call_deadline is null and call_apply_url is null and call_max_award is null and cardinality(call_causes) = 0
    end
  );

create index posts_open_calls_idx on posts (call_deadline) where kind = 'open_call';

-- Only foundations post open calls; eligible causes must be real causes.
create function check_open_call() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.kind = 'open_call' and (select org_type from orgs where id = new.org_id) <> 'foundation' then
    raise exception 'only foundations post open calls';
  end if;
  if exists (select 1 from unnest(new.call_causes) c where c not in (select slug from causes)) then
    raise exception 'unknown cause in open call';
  end if;
  return new;
end $$;

create trigger posts_check_open_call before insert or update of kind, org_id, call_causes on posts
  for each row execute function check_open_call();
