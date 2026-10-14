-- B-022 / F-067 Analytics computed in the database (the API caps rows at 1,000, so counting
-- raw event rows in the app undercounted busy orgs). Staff of the org (and admins) only.
create function org_daily_events(target uuid, days int default 30)
returns table (day date, type text, n bigint)
language sql stable security definer set search_path = public as $$
  select (e.created_at at time zone 'UTC')::date, e.type::text, count(*)
    from events e
   where e.org_id = target
     -- the last `days` calendar days in UTC, today included (matches the chart's buckets)
     and e.created_at >= (((now() at time zone 'UTC')::date - (days - 1))::timestamp at time zone 'UTC')
     and (is_org_member(target) or is_admin())
   group by 1, 2
$$;

-- Top posts in the window by views, with private totals (moved, saves) and comment counts.
create function org_top_posts(target uuid, days int default 30, lim int default 5)
returns table (post_id uuid, body text, created_at timestamptz, views bigint, shares bigint, moved bigint, saves bigint, comments bigint)
language sql stable security definer set search_path = public as $$
  select p.id, p.body, p.created_at,
         (select count(*) from events e where e.post_id = p.id and e.type = 'view' and e.created_at >= now() - make_interval(days => days)),
         (select count(*) from events e where e.post_id = p.id and e.type = 'share' and e.created_at >= now() - make_interval(days => days)),
         (select count(*) from moved m where m.post_id = p.id),
         (select count(*) from saved_posts s where s.post_id = p.id),
         (select count(*) from comments c where c.post_id = p.id)
    from posts p
   where p.org_id = target and (is_org_member(target) or is_admin())
   order by 4 desc, p.created_at desc
   limit lim
$$;

-- F-066 "Gave to" on profiles: orgs a person logged gifts to, only if they opted in to the
-- Donor badge (F-065). Names only; amounts and dates stay private.
create function donor_orgs(target uuid)
returns table (id uuid, slug text, name text, logo_url text, org_type org_type)
language sql stable security definer set search_path = public as $$
  select distinct o.id, o.slug::text, o.name, o.logo_url, o.org_type
    from gifts g join orgs o on o.id = g.org_id join profiles pr on pr.id = g.user_id
   where g.user_id = target and pr.donor_badge and org_is_visible(o.id)
$$;
