-- F-127: posters mark photos or video made or changed with AI; the post shows "AI-assisted".
alter table posts add column ai_assisted boolean not null default false;
