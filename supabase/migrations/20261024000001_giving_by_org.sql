-- F-077 Giving totals by organization on a donor's profile, under the same opt-in as F-076
-- (show_giving_totals). Individual gifts and dates stay private.
create function giving_by_org(target uuid)
returns table (id uuid, slug text, name text, logo_url text, org_type org_type, amount bigint)
language sql stable security definer set search_path = public as $$
  select o.id, o.slug::text, o.name, o.logo_url, o.org_type, sum(g.amount_usd)
    from gifts g join orgs o on o.id = g.org_id join profiles p on p.id = g.user_id
   where g.user_id = target and p.show_giving_totals and org_is_visible(o.id)
   group by o.id
   order by 6 desc, o.name
$$;
