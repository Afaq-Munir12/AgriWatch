import { useCallback, useEffect, useState } from "react";
import { useSupabaseAuth } from "../supabase/useSupabaseAuth";
import { supabase } from "../supabase/config";

// Cache only REAL Supabase farmer rows in memory. When the user moves from
// Crop Recommendations back to Home, the last genuine profile is available
// immediately while a quiet background refresh checks for newer data.
const farmerProfileCache = new Map();

// Only these fields are ever sent in an update — status/role/documents are
// decided by admins in the portal, not editable by the account owner.
const EDITABLE_FIELDS = ["full_name", "phone", "district", "tehsil", "crop", "farm_size", "designation"];

export function useMyProfile() {
  const { user, loading: authLoading } = useSupabaseAuth();
  const cachedAtMount = user ? farmerProfileCache.get(user.id) : undefined;
  const [profile, setProfile] = useState(() => cachedAtMount ?? null);
  const [loading, setLoading] = useState(() => !(user && farmerProfileCache.has(user.id)));
  const [error, setError] = useState(null);

  const fetchProfile = useCallback(async ({ showLoading = true } = {}) => {
    if (!user) {
      setProfile(null);
      setLoading(false);
      return null;
    }

    if (showLoading) setLoading(true);

    const { data, error: readErr } = await supabase
      .from("website_signup_requests")
      .select("*")
      .eq("user_id", user.id)
      .eq("role", "farmer")
      .maybeSingle();

    if (readErr) {
      console.error("Couldn't load profile:", readErr);
      setError(readErr);
    } else {
      farmerProfileCache.set(user.id, data ?? null);
      setProfile(data ?? null);
      setError(null);
    }

    setLoading(false);
    return data ?? null;
  }, [user]);

  const refresh = useCallback(() => fetchProfile({ showLoading: true }), [fetchProfile]);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      setProfile(null);
      setLoading(false);
      return;
    }

    const hasCachedProfile = farmerProfileCache.has(user.id);
    if (hasCachedProfile) {
      setProfile(farmerProfileCache.get(user.id) ?? null);
      setLoading(false);
    } else {
      setProfile(null);
      setLoading(true);
    }

    // Cached data is genuine data, so it is safe to keep visible while this
    // background refresh runs. With no cache, the page stays in skeleton mode.
    fetchProfile({ showLoading: !hasCachedProfile });
  }, [authLoading, user, fetchProfile]);

  const updateProfile = useCallback(
    async (fields) => {
      if (!user) throw new Error("Not signed in.");
      const safeFields = {};
      for (const key of EDITABLE_FIELDS) {
        if (key in fields) safeFields[key] = fields[key];
      }

      const { data, error: updateErr } = await supabase
        .from("website_signup_requests")
        .update(safeFields)
        .eq("user_id", user.id)
        .eq("role", "farmer")
        .select()
        .single();

      if (updateErr) throw updateErr;
      farmerProfileCache.set(user.id, data);
      setProfile(data);
      return data;
    },
    [user]
  );

  return { user, profile, loading: authLoading || loading, error, updateProfile, refresh };
}
