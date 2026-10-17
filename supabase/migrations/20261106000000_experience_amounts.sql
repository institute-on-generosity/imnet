-- F-119 Experiences can say how much: hours volunteered and dollars given. Both optional and
-- shared only with followers, like the rest of the experience (journal gifts stay private).
alter table experiences
  add column hours numeric(5,1) check (hours > 0 and hours <= 1000),
  add column amount_usd integer check (amount_usd between 1 and 10000000);
