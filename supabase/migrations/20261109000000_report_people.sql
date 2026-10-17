-- F-125: report a person (from their profile or a conversation), not only a post.
alter table reports alter column post_id drop not null;
alter table reports
  add column profile_id uuid references profiles on delete cascade,
  add column conversation_id uuid references conversations on delete set null,
  add column excerpt text check (char_length(excerpt) <= 4000),
  add constraint reports_one_target check (num_nonnulls(post_id, profile_id) = 1);

-- Direct inserts stay for posts only; people go through report_person() so the excerpt
-- is the reported person's own messages, never text the reporter typed.
drop policy "reports insert" on reports;
create policy "reports insert" on reports for insert
  with check (reporter_id = auth.uid() and post_id is not null and profile_id is null and conversation_id is null and excerpt is null);

create function report_person(target uuid, why text, convo uuid default null) returns void
language plpgsql security definer set search_path = public as $$
declare snippet text;
begin
  if auth.uid() is null then raise exception 'Sign in to report'; end if;
  if target = auth.uid() then raise exception 'You can''t report yourself'; end if;
  if convo is not null then
    if not exists (select 1 from conversation_members where conversation_id = convo and user_id = auth.uid())
       or not exists (select 1 from conversation_members where conversation_id = convo and user_id = target) then
      raise exception 'Not your conversation';
    end if;
    select left(string_agg(body, E'\n---\n' order by created_at), 4000) into snippet
      from (select body, created_at from messages where conversation_id = convo and author_id = target order by created_at desc limit 5) m;
  end if;
  insert into reports (profile_id, conversation_id, reporter_id, reason, excerpt)
    values (target, convo, auth.uid(), left(why, 1000), snippet);
end $$;
revoke execute on function report_person(uuid, text, uuid) from public, anon;
grant execute on function report_person(uuid, text, uuid) to authenticated;
