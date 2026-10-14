-- B-028 Giving totals no longer split gifts across causes. A gift to an org that works on two
-- causes isn't "half to each", and showing $25 + $25 invented a breakdown the donor never made.
-- giving_summary now lists the causes supported (no amounts); giving_by_org carries each org's causes.
drop function giving_summary(uuid);
create function giving_summary(target uuid)
returns table (cause_slug text, cause_name text, total numeric, orgs bigint, since date)
language sql stable security definer set search_path = public as $$
  with mine as (
    select g.amount_usd, g.org_id, g.given_on from gifts g join profiles p on p.id = g.user_id
     where g.user_id = target and p.show_giving_totals and org_is_visible(g.org_id)
  )
  select c.slug, c.name, (select sum(amount_usd) from mine), (select count(distinct org_id) from mine), (select min(given_on) from mine)
    from causes c
   where exists (select 1 from mine m join org_causes oc on oc.org_id = m.org_id where oc.cause_slug = c.slug)
   order by c.name
$$;

drop function giving_by_org(uuid);
create function giving_by_org(target uuid)
returns table (id uuid, slug text, name text, logo_url text, org_type org_type, amount bigint, causes text[])
language sql stable security definer set search_path = public as $$
  select o.id, o.slug::text, o.name, o.logo_url, o.org_type, sum(g.amount_usd),
         (select array_agg(c.name order by c.name) from org_causes oc join causes c on c.slug = oc.cause_slug where oc.org_id = o.id)
    from gifts g join orgs o on o.id = g.org_id join profiles p on p.id = g.user_id
   where g.user_id = target and p.show_giving_totals and org_is_visible(o.id)
   group by o.id
   order by 6 desc, o.name
$$;
