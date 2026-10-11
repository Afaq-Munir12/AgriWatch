import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useSupabaseAuth } from "../supabase/useSupabaseAuth";
import { getLoginAttempt } from "../utils/authAccess";

// Recovery layer for OAuth providers/Supabase projects whose redirect allow-list
// falls back to the Site URL ("/") instead of the requested callback path.
// If a fresh OAuth attempt exists and a Google session comes back on Home/Login,
// resume it at the dedicated callback instead of leaving the user on Home.
export default function OAuthResumeGuard() {
  const { user, loading } = useSupabaseAuth();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (location.pathname === "/auth/callback") return;

    const attempt = getLoginAttempt();
    if (!attempt) return;

    const params = new URLSearchParams(location.search);
    const hash = typeof window !== "undefined" ? window.location.hash : "";
    const hasOAuthReturn =
      params.has("code") ||
      params.has("error") ||
      params.has("error_description") ||
      hash.includes("access_token=") ||
      hash.includes("error=");

    const recoverablePath = ["/", "/login", "/signup", "/admin-portal/login"].includes(location.pathname);

    if (recoverablePath && (hasOAuthReturn || (!loading && !!user))) {
      // Preserve OAuth fragments when the provider falls back to the site root.
      // Dropping #access_token/#refresh_token here loses the actual sign-in.
      navigate({ pathname: "/auth/callback", search: location.search, hash: location.hash }, { replace: true });
    }
  }, [location.pathname, location.search, user, loading, navigate]);

  return null;
}
