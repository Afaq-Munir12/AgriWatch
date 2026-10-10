import { useEffect, useMemo, useState } from "react";
import { Loader2, ShieldCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useSupabaseAuth } from "../supabase/useSupabaseAuth";
import { getApprovedSignupRequests, getSignupRequest, normalizeDbRole } from "../services/authService";
import {
  clearLoginAttempt,
  getLoginAttempt,
  grantPortalAccess,
} from "../utils/authAccess";

function routeForRole(role) {
  if (role === "pdma" || role === "admin") return "/pdma";
  if (role === "public") return "/public";
  return "/farmer";
}

export default function AuthCallback() {
  const { user, loading, signOut } = useSupabaseAuth();
  const navigate = useNavigate();
  const [status, setStatus] = useState("Finishing Google sign-in…");
  const [problem, setProblem] = useState("");

  const oauthError = useMemo(() => {
    if (typeof window === "undefined") return "";
    const params = new URLSearchParams(window.location.search);
    return params.get("error_description") || params.get("error") || "";
  }, []);

  useEffect(() => {
    if (loading) return;

    let cancelled = false;

    async function finish() {
      const attempt = getLoginAttempt();

      if (oauthError) {
        clearLoginAttempt();
        setProblem(decodeURIComponent(oauthError));
        return;
      }

      if (!attempt) {
        // Nothing to resume. This also prevents a surviving old Supabase
        // session from silently entering a portal.
        navigate("/login", { replace: true });
        return;
      }

      if (!user) {
        setProblem("Google returned to AgriWatch, but no authenticated session was created. Please try again.");
        return;
      }

      const requestedUiRole =
        attempt.role || localStorage.getItem("pendingSignupRole") || "farmer";
      const requestedDbRole = normalizeDbRole(requestedUiRole);

      localStorage.setItem("pendingSignupRole", requestedUiRole);

      // Google SIGN-UP must not create another account when this Google
      // identity already owns ANY approved AgriWatch portal registration.
      // The user should Log in instead. This keeps signup for genuinely new
      // Google identities while preserving the authenticated multi-role flow.
      if (attempt.method === "google-signup") {
        setStatus("Checking whether this Google account already has AgriWatch access…");

        try {
          const approvedRoles = await getApprovedSignupRequests(user.id);
          if (cancelled) return;

          if (approvedRoles.length > 0) {
            const roleNames = approvedRoles
              .map((item) =>
                item.role === "pdma"
                  ? "PDMA Officer"
                  : item.role === "public"
                    ? "General Public"
                    : "Farmer"
              )
              .filter((value, index, all) => all.indexOf(value) === index);

            clearLoginAttempt();
            localStorage.removeItem("pendingSignupRole");
            setProblem(
              `This Google account already has an approved AgriWatch account${roleNames.length ? ` (${roleNames.join(", ")})` : ""}. Please log in instead of signing up again.`
            );
            return;
          }

          clearLoginAttempt();
          navigate("/complete-profile", { replace: true });
          return;
        } catch (err) {
          if (!cancelled) {
            setProblem(err?.message || "AgriWatch could not check this Google account.");
          }
          return;
        }
      }

      setStatus("Checking your approved AgriWatch role…");

      try {
        const request = await getSignupRequest(user.id, requestedDbRole);
        if (cancelled) return;

        if (!request) {
          // Same Gmail may already own other roles. Only the selected role is
          // missing, so take the user to create this specific role profile.
          clearLoginAttempt();
          navigate("/complete-profile", { replace: true });
          return;
        }

        if (request.status === "approved") {
          grantPortalAccess(user.id, requestedDbRole);
          localStorage.removeItem("pendingSignupRole");
          clearLoginAttempt();
          navigate(routeForRole(requestedDbRole), { replace: true });
          return;
        }

        clearLoginAttempt();
        setProblem(
          request.status === "rejected"
            ? "This role request was rejected. Please contact the AgriWatch administrator."
            : "This role request is still waiting for administrator approval."
        );
      } catch (err) {
        if (!cancelled) {
          setProblem(err?.message || "AgriWatch could not verify this role.");
        }
      }
    }

    finish();

    return () => {
      cancelled = true;
    };
  }, [loading, user, navigate, oauthError]);

  async function backToLogin() {
    clearLoginAttempt();
    await signOut();
    navigate("/login", { replace: true });
  }

  if (problem) {
    return (
      <div className="auth-page flex items-center justify-center p-5">
        <div className="auth-status-card animate-pop-in">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5 bg-primary/10">
            <ShieldCheck size={30} className="text-primary" />
          </div>
          <h1 className="font-display text-xl font-semibold">Google sign-in needs attention</h1>
          <p className="text-sm text-ink/55 leading-relaxed mt-3">{problem}</p>
          <button
            type="button"
            onClick={backToLogin}
            className="mt-6 w-full border border-line rounded-xl py-3 text-sm font-semibold hover:bg-paper-dim transition-colors"
          >
            Back to login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page flex items-center justify-center">
      <div className="flex items-center gap-3 text-sm text-ink/60">
        <Loader2 size={21} className="animate-spin text-primary" />
        {status}
      </div>
    </div>
  );
}
