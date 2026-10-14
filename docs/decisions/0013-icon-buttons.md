# 0013 Icon-only secondary actions, labeled primary actions
**Status:** accepted, 2026-10-13

Secondary, frequent actions (moved, share, open, follow in lists, show on profile, sign out) are icon-only. Each uses `IconTip`: a tooltip whose text is also the button's accessible name. Primary or consequential actions keep a text label next to the icon (Follow on profiles, Donate, Post, Confirm / Not ours, Approve / Reject, Submit claim).

**Why:** the owner asked for icons and less clutter; feeds repeat these actions on every card.
**Guardrail:** never icon-only for anything irreversible or unclear; every icon button has a label for screen readers.
