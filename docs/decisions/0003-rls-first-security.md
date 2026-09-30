# 0003 Enforce access in Postgres (RLS), not only the app
**Status:** accepted, 2026-09-30

Every table has RLS. No service-role key in the app in Phase I.
**Why:** multi-tenant data; a missed check in app code must not leak data.
