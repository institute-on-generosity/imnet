-- Grant reports: a nonprofit's post about what a confirmed grant made possible.
-- Closes the loop: foundation gives -> nonprofit confirms -> nonprofit reports -> everyone sees it.

alter table posts add column reports_grant_id uuid references grants on delete set null;
create index posts_reports_grant_idx on posts (reports_grant_id) where reports_grant_id is not null;

create function check_grant_report() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.reports_grant_id is not null and not exists (
    select 1 from grants g
     where g.id = new.reports_grant_id and g.grantee_id = new.org_id and g.confirmed_at is not null
  ) then
    raise exception 'a grant report must be about a confirmed grant your organization received';
  end if;
  return new;
end $$;

create trigger posts_check_grant_report before insert or update of reports_grant_id, org_id on posts
  for each row execute function check_grant_report();
