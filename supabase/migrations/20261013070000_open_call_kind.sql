-- New post kind for foundations' calls for applications. (Own migration: a new enum value
-- can't be used in the same transaction that adds it.)
alter type post_kind add value if not exists 'open_call';
