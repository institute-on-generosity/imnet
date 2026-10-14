-- F-076 Giving totals on a donor's profile. Opt-in (the giving journal is private by default):
-- when on, the profile shows the total given and a split by cause. Individual gifts, dates and
-- organizations' amounts stay private.
alter table profiles add column show_giving_totals boolean not null default false;
grant update (show_giving_totals) on profiles to authenticated;

-- Totals by cause. A gift to an org with several causes is split evenly across them, so the
-- causes add up to the total. Returns nothing unless the person opted in.
create function giving_summary(target uuid)
returns table (cause_slug text, cause_name text, amount numeric, total numeric, orgs bigint, since date)
language sql stable security definer set search_path = public as $$
  with mine as (
    select g.amount_usd, g.org_id, g.given_on from gifts g join profiles p on p.id = g.user_id
     where g.user_id = target and p.show_giving_totals and org_is_visible(g.org_id)
  ), split as (
    select oc.cause_slug, m.amount_usd::numeric / oc_n.n as part
      from mine m
      join org_causes oc on oc.org_id = m.org_id
      join (select org_id, count(*) n from org_causes group by org_id) oc_n on oc_n.org_id = m.org_id
  )
  select s.cause_slug, c.name, round(sum(s.part)),
         (select sum(amount_usd) from mine), (select count(distinct org_id) from mine), (select min(given_on) from mine)
    from split s join causes c on c.slug = s.cause_slug
   group by s.cause_slug, c.name
   order by 3 desc
$$;
