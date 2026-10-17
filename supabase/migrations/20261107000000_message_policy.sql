-- F-123 Who can message me. 'connected' (default) keeps the original rule: people who share a
-- community with you or who follow you. 'everyone' lets any signed-in person start a DM; 'nobody'
-- turns new DMs off (existing conversations stay readable; you can still reply).
create type message_policy as enum ('everyone', 'connected', 'nobody');
alter table profiles add column message_policy message_policy not null default 'connected';
grant update (message_policy) on profiles to authenticated;

create or replace function can_message(other uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select auth.uid() is not null and other <> auth.uid() and coalesce((
    select case p.message_policy
      when 'nobody' then false
      when 'everyone' then true
      else exists (select 1 from group_members a join group_members b on a.group_id = b.group_id
                    where a.user_id = auth.uid() and b.user_id = other)
        or exists (select 1 from person_follows where follower_id = other and followee_id = auth.uid())
    end
    from profiles p where p.id = other
  ), false)
$$;
