import { useCallback, useEffect, useState } from "react";
import { supabase } from "./config";
import { useSupabaseAuth } from "./useSupabaseAuth";
import { currentFarmer, currentOfficer, currentPublicUser } from "../data/dummyData";

// Real Supabase profile rows are cached per user+portal for the lifetime of the
// app tab. This prevents the topbar from briefly swapping to demo data whenever
// React Router mounts a different page in the same portal.
const realProfileCache = new Map();

const fallbackProfiles = {
  farmer: currentFarmer,
  pdma: currentOfficer,
  public: currentPublicUser,
};

function cacheKey(userId, role) {
  return `${userId}:${role}`;
}

function overrideKey(role) {
  return `agriwatch_profile_override_${role}`;
}

function readOverride(role) {
  try {
    const raw = localStorage.getItem(overrideKey(role));
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function useCurrentProfile(fallbackRole = "farmer") {
  const { user, loading: authLoading } = useSupabaseAuth();
  const key = user ? cacheKey(user.id, fallbackRole) : null;
  const hasInitialCache = !!key && realProfileCache.has(key);

  const [profile, setProfile] = useState(() => (hasInitialCache ? realProfileCache.get(key) : null));
  const [loading, setLoading] = useState(() => authLoading || (!!user && !hasInitialCache));
  const [override, setOverride] = useState(() => readOverride(fallbackRole));

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      setProfile(null);
      setLoading(false);
      return;
    }

    const currentKey = cacheKey(user.id, fallbackRole);
    const hasCachedProfile = realProfileCache.has(currentKey);

    if (hasCachedProfile) {
      setProfile(realProfileCache.get(currentKey) ?? null);
      setLoading(false);
    } else {
      setProfile(null);
      setLoading(true);
    }

    let cancelled = false;

    supabase
      .from("website_signup_requests")
      .select("full_name, role, district, phone, crop, farm_size, tehsil")
      .eq("user_id", user.id)
      .eq("role", fallbackRole)
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          console.warn("Couldn't load profile for report form:", error.message);
        } else {
          realProfileCache.set(currentKey, data ?? null);
          setProfile(data ?? null);
        }
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [user, authLoading, fallbackRole]);

  const isFarmerish = fallbackRole === "farmer";

  // Demo fallback is allowed ONLY after auth has definitely resolved to no
  // Supabase user. While auth/profile is loading, never expose demo values.
  const demoMode = !authLoading && !user;
  const fallback = demoMode ? fallbackProfiles[fallbackRole] || null : null;

  const name =
    profile?.full_name ||
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    (demoMode ? override.name || fallback?.name : "") ||
    "";

  const district = profile?.district || (demoMode ? override.district || fallback?.district : "") || "";
  const phone = profile?.phone || (demoMode ? override.phone : "") || "";
  const crop = profile?.crop || (demoMode ? override.crop || (isFarmerish ? currentFarmer.crop : "") : "") || "";
  const farmSize = profile?.farm_size || (demoMode ? override.farmSize || (isFarmerish ? currentFarmer.farmSize : "") : "") || "";
  const tehsil = profile?.tehsil || (demoMode ? override.tehsil || (isFarmerish ? currentFarmer.tehsil : "") : "") || "";

  const updateProfile = useCallback(
    async (fields) => {
      let error = null;

      if (user) {
        const payload = {};
        if (fields.name !== undefined) payload.full_name = fields.name;
        if (fields.district !== undefined) payload.district = fields.district;
        if (fields.phone !== undefined) payload.phone = fields.phone;
        if (fields.crop !== undefined) payload.crop = fields.crop;
        if (fields.farmSize !== undefined) payload.farm_size = fields.farmSize;
        if (fields.tehsil !== undefined) payload.tehsil = fields.tehsil;

        if (Object.keys(payload).length) {
          const res = await supabase
            .from("website_signup_requests")
            .update(payload)
            .eq("user_id", user.id)
            .eq("role", fallbackRole)
            .select("full_name, role, district, phone, crop, farm_size, tehsil")
            .maybeSingle();

          error = res.error || null;
          if (!error) {
            const nextProfile = res.data || { ...(profile || {}), ...payload };
            realProfileCache.set(cacheKey(user.id, fallbackRole), nextProfile);
            setProfile(nextProfile);
          }
        }
      } else {
        // Demo/OTP-without-session mode keeps local edits locally.
        const merged = { ...readOverride(fallbackRole), ...fields };
        try {
          localStorage.setItem(overrideKey(fallbackRole), JSON.stringify(merged));
        } catch {
          // storage unavailable — state still keeps this session's edits
        }
        setOverride(merged);
      }

      return { error };
    },
    [user, fallbackRole, profile]
  );

  return {
    loading: authLoading || loading,
    userId: user?.id ?? null,
    email: user?.email ?? "",
    name,
    role: profile?.role || fallbackRole,
    district,
    phone,
    crop,
    farmSize,
    tehsil,
    signedIn: !!user,
    updateProfile,
  };
}
