# 0017 Communities and direct messages
**Status:** accepted, 2026-10-15.

Communities are open to find and join; their chats are members-only. Direct messages are one conversation per pair (F-100).

**Who can message whom:** you can start a DM with someone you share a community with, or who follows you. Following someone doesn't let you message them (that would let anyone cold-message by following); being followed opens the door because the other person chose to follow you. Enforced in `start_conversation()`; conversations can't be inserted directly.
**Calm by design:** unread DMs show a quiet dot on the Messages tab, never a number; no typing indicators or read receipts; communities with new messages get a dot in your list, not a badge.
**Delivery:** clients poll every 3 seconds while the tab is visible. It works without a realtime server (the test stack and CI run without one); Supabase Realtime can replace polling later without changing the data model.
**Naming:** "Community" in the UI and docs; the tables keep the name `groups`.
**Not yet:** blocking and reporting messages, private (invite-only) communities, attachments, editing messages.
