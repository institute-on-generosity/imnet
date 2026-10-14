-- F-078 Top supporters on a nonprofit's profile: foundations by confirmed grants (already public)
-- and individuals by self-reported gifts, only for people who opted in to show their giving
-- totals (F-076). Largest first.
create function top_supporters(target uuid, lim int default 10)
returns table (kind text, id uuid, slug text, name text, logo_url text, avatar_url text, amount bigint)
language sql stable security definer set search_path = public as $$
  select * from (
    select 'foundation'::text, f.id, f.slug::text, f.name, f.logo_url, null::text, sum(coalesce(g.amount_usd, 0))::bigint
      from grants g join orgs f on f.id = g.foundation_id
     where g.grantee_id = target and g.confirmed_at is not null and org_is_visible(f.id)
     group by f.id
    union all
    select 'person', p.id, p.handle::text, coalesce(p.display_name, '@' || p.handle), null, p.avatar_url, sum(gi.amount_usd)::bigint
      from gifts gi join profiles p on p.id = gi.user_id
     where gi.org_id = target and p.show_giving_totals
     group by p.id
  ) s
  where org_is_visible(target)
  order by 7 desc, 4
  limit lim
$$;
