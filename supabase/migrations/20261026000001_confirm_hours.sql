-- F-082 Organizations confirm volunteer hours. Logging hours with an org shares those shifts with
-- that org's team, who can confirm them ("Confirmed") or decline them ("Not ours"). Editing a shift
-- clears its confirmation. Only the confirm/decline function can set the status.
alter table volunteer_hours add column confirmed_at timestamptz, add column declined_at timestamptz;

-- Staff of the org can read shifts logged with them.
create policy "hours staff read" on volunteer_hours for select using (is_org_member(org_id));

-- Volunteers can't set the status themselves: column grants leave it out.
revoke insert, update on volunteer_hours from authenticated;
grant insert (user_id, org_id, hours, served_on, note) on volunteer_hours to authenticated;
grant update (org_id, hours, served_on, note) on volunteer_hours to authenticated;

create function reset_hours_status() returns trigger language plpgsql as $$
begin
  if (new.org_id, new.hours, new.served_on) is distinct from (old.org_id, old.hours, old.served_on) then
    new.confirmed_at := null; new.declined_at := null;
  end if;
  return new;
end $$;
create trigger volunteer_hours_reset before update on volunteer_hours for each row execute function reset_hours_status();

create function review_volunteer_hours(target uuid, confirm boolean) returns void
language plpgsql security definer set search_path = public as $$
declare v volunteer_hours;
begin
  select * into v from volunteer_hours where id = target;
  if v.id is null or not is_org_member(v.org_id) then raise exception 'not your organization'; end if;
  if v.user_id = auth.uid() then raise exception 'you can''t confirm your own hours'; end if;
  update volunteer_hours
     set confirmed_at = case when confirm then now() end, declined_at = case when confirm then null else now() end
   where id = target;
end $$;

-- Profile totals: declined shifts drop out; confirmed hours counted separately.
drop function volunteer_summary(uuid);
create function volunteer_summary(target uuid)
returns table (id uuid, slug text, name text, logo_url text, org_type org_type, hours numeric, confirmed numeric, since date)
language sql stable security definer set search_path = public as $$
  select o.id, o.slug::text, o.name, o.logo_url, o.org_type, sum(v.hours),
         coalesce(sum(v.hours) filter (where v.confirmed_at is not null), 0), min(v.served_on)
    from volunteer_hours v join orgs o on o.id = v.org_id join profiles p on p.id = v.user_id
   where v.user_id = target and p.show_volunteer_hours and v.declined_at is null and org_is_visible(o.id)
   group by o.id
   order by 6 desc, o.name
$$;
