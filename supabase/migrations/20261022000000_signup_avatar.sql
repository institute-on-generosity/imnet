-- F-071 New sign-ups get an illustrated avatar right away. The seed comes from the user id,
-- not the handle, so changing your handle later doesn't leave the old one in your avatar URL.
create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  base text := regexp_replace(lower(split_part(new.email, '@', 1)), '[^a-z0-9_]', '', 'g');
begin
  if char_length(base) < 3 then base := 'giver'; end if;
  insert into profiles (id, handle, display_name, avatar_url)
  values (new.id, left(base, 22) || '_' || substr(md5(new.id::text), 1, 6), split_part(new.email, '@', 1),
          '/avatars/u' || substr(md5(new.id::text || 'avatar'), 1, 16));
  return new;
end $$;

-- Everyone who signed up before this gets one too.
update profiles set avatar_url = '/avatars/u' || substr(md5(id::text || 'avatar'), 1, 16) where avatar_url is null;
