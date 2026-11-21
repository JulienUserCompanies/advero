-- Accounts (profiles) + the competitor-follow feature, with a hard 3-follow
-- cap for free accounts. See src/app/login and src/lib/supabase for the app
-- side of this.

create extension if not exists pgcrypto;

-- ── Profiles ────────────────────────────────────────────────────────────
create table if not exists public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  email      text,
  plan       text not null default 'free' check (plan in ('free', 'pro')),
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── Followed brands (the competitor-tracking feature) ──────────────────
-- brand_id is plain text matching the brand.id used in Cloudflare D1 (the
-- ad archive's own database) — there's no real foreign key across the two
-- databases, so it's just stored as an opaque reference.
create table if not exists public.followed_brands (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  brand_id   text not null,
  brand_name text,
  created_at timestamptz not null default now(),
  unique (user_id, brand_id)
);

create index if not exists followed_brands_user_id_idx on public.followed_brands(user_id);

-- Hard cap: free accounts can't insert a 4th follow, even if someone
-- bypasses the UI and calls the API/SQL directly.
create or replace function public.enforce_follow_limit()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  user_plan text;
  current_count int;
begin
  select plan into user_plan from public.profiles where id = new.user_id;

  if user_plan is distinct from 'pro' then
    select count(*) into current_count
    from public.followed_brands
    where user_id = new.user_id;

    if current_count >= 3 then
      raise exception 'Free accounts can follow up to 3 competitors. Upgrade to Pro for unlimited follows.'
        using errcode = 'P0001';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists followed_brands_limit_check on public.followed_brands;
create trigger followed_brands_limit_check
  before insert on public.followed_brands
  for each row execute function public.enforce_follow_limit();

-- ── Row-level security ──────────────────────────────────────────────────
alter table public.profiles enable row level security;
alter table public.followed_brands enable row level security;

drop policy if exists "Users can view own profile" on public.profiles;
create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

drop policy if exists "Users can view own follows" on public.followed_brands;
create policy "Users can view own follows"
  on public.followed_brands for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own follows" on public.followed_brands;
create policy "Users can insert own follows"
  on public.followed_brands for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own follows" on public.followed_brands;
create policy "Users can delete own follows"
  on public.followed_brands for delete
  using (auth.uid() = user_id);
