-- Credit line for an embedded video (needed when sharing openly licensed video made by someone else).
alter table posts
  add column embed_credit text check (char_length(embed_credit) <= 300),
  add constraint embed_credit_needs_embed check (embed_credit is null or embed_url is not null);
