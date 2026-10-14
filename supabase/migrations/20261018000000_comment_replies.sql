-- F-063 Replies to comments, one level deep (as on LinkedIn). A reply belongs to the same post
-- as its parent, and you can't reply to a reply.
alter table comments add column parent_id uuid references comments on delete cascade;
create index comments_parent on comments (parent_id);

create function check_comment_parent() returns trigger
language plpgsql security definer set search_path = public as $$
declare p comments;
begin
  if new.parent_id is null then return new; end if;
  select * into p from comments where id = new.parent_id;
  if p.id is null or p.post_id <> new.post_id then raise exception 'reply must be on the same post'; end if;
  if p.parent_id is not null then raise exception 'replies are one level deep'; end if;
  return new;
end $$;
create trigger comments_parent_check before insert on comments for each row execute function check_comment_parent();
