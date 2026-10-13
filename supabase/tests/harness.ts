// Throwaway Postgres (PGlite, in-process WebAssembly) with our migrations and seed loaded,
// plus minimal stand-ins for what Supabase provides: auth.users, auth.uid(), storage, API roles.

import { readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"
import { PGlite } from "@electric-sql/pglite"
import { citext } from "@electric-sql/pglite/contrib/citext"

const SUPABASE_DIR = join(__dirname, "..")

const SUPABASE_STANDINS = `
  create role anon nologin;
  create role authenticated nologin;
  grant usage on schema public to anon, authenticated;

  -- Supabase grants API roles full table privileges by default; RLS and our revokes narrow them.
  alter default privileges in schema public grant all on tables to anon, authenticated;
  alter default privileges in schema public grant all on sequences to anon, authenticated;

  create schema auth;
  create table auth.users (id uuid primary key, email text);
  create function auth.uid() returns uuid language sql stable as $$
    select nullif(current_setting('request.jwt.sub', true), '')::uuid
  $$;

  create schema storage;
  grant usage on schema storage to anon, authenticated;
  create table storage.buckets (id text primary key, name text, public boolean);
  create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text);
  alter table storage.objects enable row level security;
  grant select, insert, delete on storage.objects to authenticated;
  create function storage.foldername(name text) returns text[] language sql as $$
    select string_to_array(name, '/')
  $$;
`

// Seeded orgs (supabase/seed.sql)
export const ORG_1 = "00000000-0000-4000-a000-000000000001" // Harbor Table
export const ORG_2 = "00000000-0000-4000-a000-000000000002" // Open Door Homes
export const ORG_PENDING = "00000000-0000-4000-a000-0000000000ff" // not verified

// Test users
export const DONOR = "10000000-0000-4000-8000-000000000001"
export const STAFF = "10000000-0000-4000-8000-000000000002" // staff of ORG_1
export const ADMIN = "10000000-0000-4000-8000-000000000003"

export type Who = typeof DONOR | typeof STAFF | typeof ADMIN | string | null
export type Result = { rows: Record<string, unknown>[]; error?: undefined } | { rows?: undefined; error: string }

export async function createTestDb() {
  const db = new PGlite({ extensions: { citext } })
  await db.exec(SUPABASE_STANDINS)

  const migrations = readdirSync(join(SUPABASE_DIR, "migrations")).filter((f) => f.endsWith(".sql")).sort()
  for (const file of migrations) await db.exec(readFileSync(join(SUPABASE_DIR, "migrations", file), "utf8"))
  await db.exec(readFileSync(join(SUPABASE_DIR, "seed.sql"), "utf8"))

  await db.exec(`
    insert into auth.users (id, email) values
      ('${DONOR}', 'dana.donor@example.com'),
      ('${STAFF}', 'sam.staff@example.org'),
      ('${ADMIN}', 'ada.admin@imnet.org');
    update profiles set is_admin = true where id = '${ADMIN}';
    insert into org_members (org_id, user_id) values ('${ORG_1}', '${STAFF}');
    insert into orgs (id, slug, name, status) values ('${ORG_PENDING}', 'pending-org', 'Pending Org', 'pending');
  `)

  // Run one statement as a user (null = signed-out visitor), the way PostgREST does.
  async function as(who: Who, sql: string): Promise<Result> {
    await db.exec(`select set_config('request.jwt.sub', '${who ?? ""}', false); set role ${who ? "authenticated" : "anon"};`)
    try {
      return { rows: (await db.query<Record<string, unknown>>(sql)).rows }
    } catch (e) {
      return { error: (e as Error).message }
    } finally {
      await db.exec("reset role")
    }
  }

  // Run as the database owner (bypasses RLS) to set up or inspect state.
  async function owner(sql: string) {
    return (await db.query<Record<string, unknown>>(sql)).rows
  }

  return { db, as, owner }
}
