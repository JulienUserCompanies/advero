-- Tables created via the SQL editor don't automatically pick up Supabase's
-- usual table-editor auto-grants. Without this, RLS policies never even
-- get evaluated — Postgres rejects with "permission denied for table X"
-- before RLS is checked, because the authenticated role has no baseline
-- grant on the table at all.

grant usage on schema public to authenticated;

grant select, insert, update, delete on public.followed_brands to authenticated;
grant select, update on public.profiles to authenticated;
