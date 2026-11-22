-- Following a competitor now follows every platform-specific brand row that
-- shares its name in one action (see src/lib/use-follows.ts followByName) —
-- the same real-world brand gets a separate D1 brand_id per platform
-- (meta-page-<id>, linkedin-<slug>, ...), so "GDC" can mean 2+ rows here.
--
-- The free-tier cap was counting raw rows in followed_brands, which would
-- have charged a user 2 "brands" for following one competitor that happens
-- to run ads on two platforms. Count DISTINCT brand name instead, so the
-- cap matches what the person actually chose ("3 competitors"), regardless
-- of how many platform rows that expands to under the hood.
create or replace function public.enforce_follow_limit()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  user_plan text;
  already_following boolean;
  distinct_count int;
begin
  select plan into user_plan from public.profiles where id = new.user_id;

  if user_plan is distinct from 'pro' then
    -- Inserting another platform-row for a name the user already follows
    -- never counts as a new brand — only a genuinely new name does.
    select exists (
      select 1 from public.followed_brands
      where user_id = new.user_id and lower(brand_name) = lower(new.brand_name)
    ) into already_following;

    if not already_following then
      select count(distinct lower(brand_name)) into distinct_count
      from public.followed_brands
      where user_id = new.user_id;

      if distinct_count >= 3 then
        raise exception 'Free accounts can follow up to 3 competitors. Upgrade to Pro for unlimited follows.'
          using errcode = 'P0001';
      end if;
    end if;
  end if;

  return new;
end;
$$;
