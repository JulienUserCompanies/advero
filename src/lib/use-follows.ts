"use client";

import { useCallback, useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

export const FREE_FOLLOW_LIMIT = 3;

export type ToggleFollowResult = { error?: string; needsAuth?: boolean };

/**
 * Tracks the signed-in user and their followed brands, and exposes a
 * toggleFollow() that inserts/deletes rows in `followed_brands`. The 3-brand
 * free-tier cap is enforced by a Postgres trigger (see the init migration),
 * not here — this just surfaces whatever error that trigger raises.
 */
export function useFollows() {
  const [supabase] = useState(() => createClient());
  // No supabase client means nothing to wait on — start "not loading"
  // rather than flipping to false a tick later via an effect.
  const [user, setUser] = useState<User | null>(null);
  const [userLoading, setUserLoading] = useState(() => supabase !== null);
  const [followedIds, setFollowedIds] = useState<Set<string>>(new Set());
  // Lowercased brand_name per followed row, kept alongside followedIds so
  // the "follow a competitor by name" search (BrandSearch) can tell
  // whether a name is already tracked without caring which platform-
  // specific brand_id rows that expands to under the hood.
  const [followedNames, setFollowedNames] = useState<Set<string>>(new Set());
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
  const [pendingNames, setPendingNames] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user ?? null);
      setUserLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, [supabase]);

  useEffect(() => {
    let cancelled = false;
    // Always resolve through a promise (even the "nothing to fetch" case)
    // so every setFollowedIds call happens inside a .then callback rather
    // than synchronously in the effect body.
    const fetch =
      supabase && user
        ? supabase.from("followed_brands").select("brand_id, brand_name")
        : Promise.resolve({ data: [] as { brand_id: string; brand_name: string | null }[], error: null });

    fetch.then(({ data, error }) => {
      if (cancelled || error) return;
      setFollowedIds(new Set((data ?? []).map((row) => row.brand_id)));
      setFollowedNames(new Set((data ?? []).map((row) => (row.brand_name ?? "").trim().toLowerCase()).filter(Boolean)));
    });

    return () => {
      cancelled = true;
    };
  }, [supabase, user]);

  const toggleFollow = useCallback(
    async (brandId: string, brandName: string): Promise<ToggleFollowResult> => {
      if (!supabase || !user) return { needsAuth: true };
      if (pendingIds.has(brandId)) return {};

      setPendingIds((prev) => new Set(prev).add(brandId));
      try {
        if (followedIds.has(brandId)) {
          const { error } = await supabase
            .from("followed_brands")
            .delete()
            .eq("user_id", user.id)
            .eq("brand_id", brandId);
          if (error) return { error: error.message };
          setFollowedIds((prev) => {
            const next = new Set(prev);
            next.delete(brandId);
            return next;
          });
          return {};
        }

        const { error } = await supabase
          .from("followed_brands")
          .insert({ user_id: user.id, brand_id: brandId, brand_name: brandName });
        if (error) {
          // The free-tier cap trigger raises a plain, already-friendly
          // message (errcode P0001) — just pass it through as-is.
          return { error: error.message };
        }
        setFollowedIds((prev) => new Set(prev).add(brandId));
        return {};
      } finally {
        setPendingIds((prev) => {
          const next = new Set(prev);
          next.delete(brandId);
          return next;
        });
      }
    },
    [supabase, user, followedIds, pendingIds]
  );

  /**
   * Follows a competitor by NAME: inserts one followed_brands row per
   * underlying brand_id (one per platform that name resolves to), so
   * following "GDC" once covers its LinkedIn row and its Facebook row
   * together rather than requiring two separate follow actions. The free
   * cap (enforced server-side too — see the migration) counts this as ONE
   * brand regardless of how many rows it expands to.
   */
  const followByName = useCallback(
    async (name: string, brandIds: string[]): Promise<ToggleFollowResult> => {
      if (!supabase || !user) return { needsAuth: true };
      const key = name.trim().toLowerCase();
      if (pendingNames.has(key) || followedNames.has(key)) return {};

      setPendingNames((prev) => new Set(prev).add(key));
      try {
        const rows = brandIds
          .filter((id) => !followedIds.has(id))
          .map((id) => ({ user_id: user.id, brand_id: id, brand_name: name }));
        if (rows.length === 0) return {};

        const { error } = await supabase.from("followed_brands").insert(rows);
        if (error) return { error: error.message };

        setFollowedIds((prev) => {
          const next = new Set(prev);
          for (const id of brandIds) next.add(id);
          return next;
        });
        setFollowedNames((prev) => new Set(prev).add(key));
        return {};
      } finally {
        setPendingNames((prev) => {
          const next = new Set(prev);
          next.delete(key);
          return next;
        });
      }
    },
    [supabase, user, followedIds, followedNames, pendingNames]
  );

  /** Unfollows every row sharing this brand name — see followByName. */
  const unfollowByName = useCallback(
    async (name: string): Promise<ToggleFollowResult> => {
      if (!supabase || !user) return { needsAuth: true };
      const key = name.trim().toLowerCase();
      if (pendingNames.has(key)) return {};

      setPendingNames((prev) => new Set(prev).add(key));
      try {
        const { data, error } = await supabase
          .from("followed_brands")
          .delete()
          .eq("user_id", user.id)
          .eq("brand_name", name)
          .select("brand_id");
        if (error) return { error: error.message };

        const removedIds = new Set((data ?? []).map((row) => row.brand_id));
        setFollowedIds((prev) => {
          const next = new Set(prev);
          for (const id of removedIds) next.delete(id);
          return next;
        });
        setFollowedNames((prev) => {
          const next = new Set(prev);
          next.delete(key);
          return next;
        });
        return {};
      } finally {
        setPendingNames((prev) => {
          const next = new Set(prev);
          next.delete(key);
          return next;
        });
      }
    },
    [supabase, user, pendingNames]
  );

  return {
    user,
    userLoading,
    followedIds,
    followedNames,
    pendingIds,
    pendingNames,
    toggleFollow,
    followByName,
    unfollowByName,
    followCount: followedNames.size,
  };
}
