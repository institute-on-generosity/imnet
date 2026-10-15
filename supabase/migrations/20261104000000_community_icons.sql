-- F-103 Community icons: a picture per community, stored in the community's own folder.
alter table groups add column icon_path text check (icon_path ~ ('^communities/' || id::text || '/icon(-[0-9a-f-]{36})?\.(png|jpg|jpeg|webp)$'));
