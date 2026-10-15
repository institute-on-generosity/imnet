-- F-100 Groups and messages.
-- Groups: communities anyone can find and join; the group chat is for members only.
-- Direct messages: one conversation per pair of people. You can start one with someone you share a
-- group with, or who follows you (so strangers can't cold-message you).
-- Unread state is a per-member "last read" time; the UI shows a quiet dot, never a count.

create table groups (
  id          uuid primary key default gen_random_uuid(),
  slug        citext unique not null check (slug ~ '^[a-z0-9-]{3,60}$'),
  name        text not null check (char_length(name) between 3 and 80),
  description text check (char_length(description) <= 500),
  cause_slug  text references causes on delete set null,
  created_by  uuid not null default auth.uid() references profiles on delete cascade,
  created_at  timestamptz not null default now()
);

create type group_role as enum ('owner', 'member');

create table group_members (
  group_id     uuid not null references groups on delete cascade,
  user_id      uuid not null default auth.uid() references profiles on delete cascade,
  role         group_role not null default 'member',
  last_read_at timestamptz not null default now(),
  joined_at    timestamptz not null default now(),
  primary key (group_id, user_id)
);
create index group_members_user on group_members (user_id);

create table conversations (
  id         uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now()
);

create table conversation_members (
  conversation_id uuid not null references conversations on delete cascade,
  user_id         uuid not null references profiles on delete cascade,
  last_read_at    timestamptz not null default now(),
  primary key (conversation_id, user_id)
);
create index conversation_members_user on conversation_members (user_id);

create table messages (
  id              uuid primary key default gen_random_uuid(),
  group_id        uuid references groups on delete cascade,
  conversation_id uuid references conversations on delete cascade,
  author_id       uuid not null default auth.uid() references profiles on delete cascade,
  body            text not null check (char_length(btrim(body)) between 1 and 4000),
  created_at      timestamptz not null default now(),
  check ((group_id is null) <> (conversation_id is null))
);
create index messages_group on messages (group_id, created_at desc) where group_id is not null;
create index messages_conversation on messages (conversation_id, created_at desc) where conversation_id is not null;

-- Helpers (security definer so policies can call them without recursion).
create function is_group_member(target uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from group_members where group_id = target and user_id = auth.uid())
$$;
create function is_group_owner(target uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from group_members where group_id = target and user_id = auth.uid() and role = 'owner')
$$;
create function is_conversation_member(target uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from conversation_members where conversation_id = target and user_id = auth.uid())
$$;
-- You may message someone you share a community with, or who follows you.
create function can_message(other uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select auth.uid() is not null and other <> auth.uid() and (
    exists (select 1 from group_members a join group_members b on a.group_id = b.group_id
             where a.user_id = auth.uid() and b.user_id = other)
    or exists (select 1 from person_follows where follower_id = other and followee_id = auth.uid())
  )
$$;

alter table groups enable row level security;
alter table group_members enable row level security;
alter table conversations enable row level security;
alter table conversation_members enable row level security;
alter table messages enable row level security;

-- Groups are discoverable by everyone; owners edit or delete them.
create policy "groups read" on groups for select using (true);
create policy "groups insert" on groups for insert with check (created_by = auth.uid());
create policy "groups update" on groups for update using (is_group_owner(id) or is_admin()) with check (is_group_owner(id) or is_admin());
create policy "groups delete" on groups for delete using (is_group_owner(id) or is_admin());
-- The creator becomes the owner.
create function groups_add_owner() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into group_members (group_id, user_id, role) values (new.id, new.created_by, 'owner');
  return new;
end $$;
create trigger groups_add_owner after insert on groups for each row execute function groups_add_owner();

-- Membership lists are visible to signed-in people (the join button says so). You join or leave
-- yourself; an owner can remove members. Nobody makes themselves an owner.
create policy "group members read" on group_members for select using (auth.uid() is not null);
create policy "group members join" on group_members for insert with check (user_id = auth.uid() and role = 'member');
create policy "group members leave" on group_members for delete using (user_id = auth.uid() or is_group_owner(group_id));
revoke update on group_members from anon, authenticated;
grant update (last_read_at) on group_members to authenticated;
create policy "group members mark read" on group_members for update using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Conversations are created only through start_conversation(); members see their own.
create policy "conversations read" on conversations for select using (is_conversation_member(id));
create policy "conversation members read" on conversation_members for select using (is_conversation_member(conversation_id));
revoke insert, update, delete on conversations, conversation_members from anon, authenticated;
grant update (last_read_at) on conversation_members to authenticated;
create policy "conversation members mark read" on conversation_members for update using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Messages: members read and post; authors delete their own.
create policy "messages read" on messages for select using (
  (group_id is not null and is_group_member(group_id)) or (conversation_id is not null and is_conversation_member(conversation_id))
);
create policy "messages insert" on messages for insert with check (
  author_id = auth.uid() and (
    (group_id is not null and is_group_member(group_id)) or (conversation_id is not null and is_conversation_member(conversation_id))
  )
);
create policy "messages delete" on messages for delete using (author_id = auth.uid());
revoke update on messages from anon, authenticated;

-- Signed-in requests can't backdate messages or groups (as with posts, B-038).
create function stamp_now() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null then new.created_at := now(); end if;
  return new;
end $$;
create trigger messages_stamp before insert on messages for each row execute function stamp_now();
create trigger groups_stamp before insert on groups for each row execute function stamp_now();

-- Open (or reuse) the one conversation between you and someone you may message.
create function start_conversation(other uuid) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  existing uuid;
  created uuid;
begin
  select a.conversation_id into existing
    from conversation_members a join conversation_members b on a.conversation_id = b.conversation_id
   where a.user_id = auth.uid() and b.user_id = other
   limit 1;
  if existing is not null then return existing; end if;
  if not can_message(other) then raise exception 'You can message people you share a community with, or who follow you.'; end if;
  insert into conversations default values returning id into created;
  insert into conversation_members (conversation_id, user_id) values (created, auth.uid()), (created, other);
  return created;
end $$;
revoke all on function start_conversation(uuid) from public;
grant execute on function start_conversation(uuid) to authenticated;

-- The Messages tab's quiet dot: any message from someone else since you last read a conversation.
create function has_unread_messages() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from conversation_members cm
      join messages m on m.conversation_id = cm.conversation_id
     where cm.user_id = auth.uid() and m.author_id <> auth.uid() and m.created_at > cm.last_read_at
  )
$$;
grant execute on function has_unread_messages() to authenticated;
