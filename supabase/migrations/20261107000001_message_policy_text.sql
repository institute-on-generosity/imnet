-- F-123 start_conversation's refusal reflects the recipient's choice, not just the default rule.
create or replace function start_conversation(other uuid) returns uuid
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
  if not can_message(other) then raise exception 'This person isn''t taking messages from you.'; end if;
  insert into conversations default values returning id into created;
  insert into conversation_members (conversation_id, user_id) values (created, auth.uid()), (created, other);
  return created;
end $$;
