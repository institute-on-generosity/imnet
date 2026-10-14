-- When you last opened your inbox. Notifications are computed from existing data (no table);
-- this only decides whether the bell shows a dot.
alter table profiles add column notifications_seen_at timestamptz;
grant update (notifications_seen_at) on profiles to authenticated;
