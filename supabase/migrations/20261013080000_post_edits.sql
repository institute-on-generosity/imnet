-- Edited posts say so (no silent edits). Stamped by the database when the text changes.
alter table posts add column edited_at timestamptz;

create function stamp_post_edit() returns trigger
language plpgsql as $$
begin
  if new.body is distinct from old.body then new.edited_at := now(); end if;
  return new;
end $$;

create trigger posts_stamp_edit before update of body on posts
  for each row execute function stamp_post_edit();
