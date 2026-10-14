-- F-065 Donor badge on comments. Opt-in: a donor who logged a gift to an org in their private
-- giving journal can choose to show "Donor" on their comments on that org's posts.
-- Only a yes/no ever leaves the journal; amounts and dates stay private.
alter table profiles add column donor_badge boolean not null default false;
grant update (donor_badge) on profiles to authenticated;

-- Computed field: PostgREST exposes it as comments.donor. security definer reads the private
-- gifts table, but only answers for people who opted in.
create function donor(c comments) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from profiles pr join gifts g on g.user_id = pr.id
     where pr.id = c.user_id and pr.donor_badge and not c.as_org
       and g.org_id = (select org_id from posts where id = c.post_id)
  )
$$;

drop function latest_comments(uuid[]);
create function latest_comments(post_ids uuid[])
returns table (id uuid, post_id uuid, parent_id uuid, body text, as_org boolean, created_at timestamptz, user_id uuid, handle text, display_name text, bio text, more boolean, donor boolean)
language sql stable as $$
  select distinct on (c.post_id) c.id, c.post_id, c.parent_id, c.body, c.as_org, c.created_at, c.user_id, p.handle::text, p.display_name, p.bio,
         exists (select 1 from comments o where o.post_id = c.post_id and o.id <> c.id) as more,
         donor(c)
    from comments c join profiles p on p.id = c.user_id
   where c.post_id = any (post_ids) and c.parent_id is null
   order by c.post_id, c.created_at desc
$$;
