import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, ShieldCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useSupabaseAuth } from "../supabase/useSupabaseAuth";
import { supabase } from "../supabase/config";
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
  const { signOut } = useSupabaseAuth();
  const navigate = useNavigate();
  const [status, setStatus] = useState("Finishing Google sign-in…");
  const [problem, setProblem] = useState("");
  const [oauthUser, setOauthUser] = useState(null);
  const [sessionChecked, setSessionChecked] = useState(false);
  const [sessionError, setSessionError] = useState("");

  const oauthError = useMemo(() => {
    if (typeof window === "undefined") return "";
    const params = new URLSearchParams(window.location.search);
    return params.get("error_description") || params.get("error") || "";
  }, []);

  // OAuth can return either a PKCE code (?code=...) or an implicit
  // access/refresh token pair (#access_token=...&refresh_token=...).
  // Do not rely on the auth hook's initially cached null user: recover the
  // callback session first, then perform the existing role-approval checks.
  // A promise ref also prevents duplicate recovery under React StrictMode.
  const recoveryPromiseRef = useRef(null);
  useEffect(() => {
    let cancelled = false;

    async function recoverGoogleSession() {
      const fragment = new URLSearchParams(window.location.hash.replace(/^#/, ""));
      const query = new URLSearchParams(window.location.search);
      const oauthErrorText =
        query.get("error_description") || query.get("error") ||
        fragment.get("error_description") || fragment.get("error");
      if (oauthErrorText) throw new Error(oauthErrorText);

      // If the provider returns an implicit token pair, explicitly establish
      // the session instead of waiting indefinitely for an SDK auth event.
      // Supabase Auth validates/refreshes these credentials on setSession.
      const accessToken = fragment.get("access_token");
      const refreshToken = fragment.get("refresh_token");
      if (accessToken && refreshToken) {
        const { data, error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        if (error) throw error;
        if (!data?.user) throw new Error("Google returned tokens, but Supabase did not accept the session.");
        // Remove bearer credentials from the address bar/history ASAP.
        window.history.replaceState(window.history.state, "", window.location.pathname + window.location.search);
        return data.user;
      }

      // Supabase may already have consumed the OAuth redirect during its own
      // initialization. Check the SDK session before trying any code exchange.
      for (let i = 0; i < 8; i += 1) {
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;
        if (data?.session?.user) {
          if (accessToken) {
            window.history.replaceState(window.history.state, "", window.location.pathname + window.location.search);
          }
          return data.session.user;
        }
        if (i < 7) await new Promise((resolve) => setTimeout(resolve, 400));
      }

      // Fallback for a PKCE code only when SDK initialization did not create
      // a session; don't exchange a consumed code twice.
      const code = query.get("code");
      if (code) {
        const { data, error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) throw error;
        if (data?.user) {
          window.history.replaceState(window.history.state, "", window.location.pathname);
          return data.user;
        }
      }
      throw new Error(
        "Google returned, but no Supabase session could be established. Please sign in again."
      );
    }

    if (!recoveryPromiseRef.current) {
      recoveryPromiseRef.current = recoverGoogleSession();
    }
    recoveryPromiseRef.current
      .then((resolvedUser) => {
        if (!cancelled) {
          setOauthUser(resolvedUser);
          setSessionChecked(true);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setSessionError(error?.message || "Google sign-in could not be completed.");
          setSessionChecked(true);
        }
      });
    return () => { cancelled = true; };
  }, []);

  // Only trust the result of the returned OAuth credentials for this callback,
  // never a cached user from a previous login.
  const activeUser = oauthUser;

  useEffect(() => {
    if (!sessionChecked) return;

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

      if (!activeUser) {
        setProblem(
          sessionError ||
          "Google returned, but Supabase did not establish a session. Please sign in again."
        );
        return;
      }

      if (attempt.method === "admin-google") {
        setStatus("Opening the secure Admin Portal…");
        clearLoginAttempt();
        localStorage.removeItem("pendingSignupRole");
        navigate("/admin-portal", { replace: true });
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
          const approvedRoles = await getApprovedSignupRequests(activeUser.id);
          if (cancelled) return;

          if (approvedRoles.length > 0) {
            const roleNames = approvedRoles
              .map((item) =>
                item.role === "pdma"
                  ? "NDMA Officer"
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

          localStorage.setItem("agriwatch_require_backup_password", "1");
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
        const request = await getSignupRequest(activeUser.id, requestedDbRole);
        if (cancelled) return;

        if (!request) {
          // Same Gmail may already own other roles. Only the selected role is
          // missing, so take the user to create this specific role profile.
          localStorage.removeItem("agriwatch_require_backup_password");
          clearLoginAttempt();
          navigate("/complete-profile", { replace: true });
          return;
        }

        if (request.status === "approved") {
          grantPortalAccess(activeUser.id, requestedDbRole);
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
  }, [activeUser, sessionChecked, sessionError, navigate, oauthError]);

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
