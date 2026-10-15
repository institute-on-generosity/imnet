-- F-084 Calls for volunteers and calls for donations (enum values in their own migration).
alter type post_kind add value if not exists 'call_volunteers';
alter type post_kind add value if not exists 'call_donations';
