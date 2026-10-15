-- B-038 Posts can't be dated by their authors. Since F-079 every account can post, and the
-- column grants let a client set created_at (e.g. 2099) to sit atop every feed forever. Requests
-- from signed-in users get now() on insert and keep the original time and id on update.
-- (Seeds and ops scripts run without a JWT and may set historical times.)
create function posts_pin_time() returns trigger
language plpgsql set search_path = public as $$
begin
  if auth.uid() is not null then
    if tg_op = 'INSERT' then
      new.created_at := now();
    else
      new.created_at := old.created_at;
      new.id := old.id;
    end if;
  end if;
  return new;
end $$;
create trigger posts_pin_time before insert or update on posts for each row execute function posts_pin_time();

-- B-038 Editing a donor post can't point its spotlight at an org that isn't visible (insert already checks).
drop policy "posts update" on posts;
create policy "posts update" on posts for update
  using (is_org_member(org_id) or is_admin() or (org_id is null and author_id = auth.uid()))
  with check (
    (is_org_member(org_id) or is_admin() or (org_id is null and author_id = auth.uid()))
    and (about_org_id is null or org_is_visible(about_org_id))
  );
