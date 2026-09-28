import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import logo from "../assets/logo.jpeg";
import { Phone, Shield, Sprout, Users2, ShieldCheck, Eye, Loader2, Clock, XCircle } from "lucide-react";
import { useLanguage } from "../i18n/LanguageContext";
import LanguageToggle from "../components/LanguageToggle";
import ThemeToggle from "../components/ThemeToggle";
import { addRipple } from "../utils/ripple";
import { useSupabaseAuth } from "../supabase/useSupabaseAuth";
import { supabase } from "../supabase/config";

const roles = [
  { key: "farmer", labelKey: "roleFarmerLabel", icon: Sprout, dest: "/farmer" },
  { key: "public", labelKey: "rolePublicLabel", icon: Users2, dest: "/public" },
  { key: "admin", labelKey: "roleAdminLabel", icon: ShieldCheck, dest: "/pdma" },
];

// Where a Google sign-in should send the browser once done — back to this
// same page, which then figures out what to do with the resulting session.
const GOOGLE_REDIRECT = typeof window !== "undefined" ? `${window.location.origin}/login` : undefined;

export default function Login() {
  const { t, lang } = useLanguage();
  const { user, loading: authLoading, signIn: supabaseSignIn, signOut } = useSupabaseAuth();
  const [role, setRole] = useState("farmer");
  const [step, setStep] = useState("phone");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  // "checking" | "needs_profile" | "pending" | "rejected" | null (nothing to show, phone flow as normal)
  const [googleState, setGoogleState] = useState(null);
  const navigate = useNavigate();

  // Once a Google session exists (either just returned from the OAuth
  // redirect, or already logged in from a previous visit), look up whether
  // this account has a verification request on file yet.
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setGoogleState(null);
      return;
    }

    let cancelled = false;
    setGoogleState("checking");

    supabase
      .from("website_signup_requests")
      .select("status, role")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data, error: readErr }) => {
        if (cancelled) return;
        if (readErr) {
          console.error("Couldn't check signup request status:", readErr);
          setError("Couldn't check your account status. Try again.");
          setGoogleState(null);
          return;
        }
        if (!data) {
          navigate("/complete-profile", { replace: true });
          return;
        }
        if (data.status === "approved") {
          const dest = roles.find((r) => r.key === (data.role === "pdma" ? "admin" : data.role))?.dest || "/";
          navigate(dest, { replace: true });
          return;
        }
        setGoogleState(data.status === "rejected" ? "rejected" : "pending");
      });

    return () => {
      cancelled = true;
    };
  }, [user, authLoading, navigate]);

  function requestOtp(e) {
    e.preventDefault();
    setStep("otp");
  }

  function verifyOtp(e) {
    e.preventDefault();
    navigate(roles.find((r) => r.key === role).dest);
  }

  async function handleGoogleSignIn() {
    setError("");
    setBusy(true);
    // Remember which role tab they had selected — read back after the OAuth
    // redirect completes, in case /complete-profile wants a sensible default.
    localStorage.setItem("pendingSignupRole", role);
    await supabaseSignIn(GOOGLE_REDIRECT);
    setBusy(false);
  }

  if (googleState === "checking") {
    return (
      <div className="min-h-screen bg-forest flex items-center justify-center p-6">
        <div className="w-8 h-8 rounded-full border-[3px] border-white/20 border-t-white animate-spin" />
      </div>
    );
  }

  if (googleState === "pending" || googleState === "rejected") {
    return (
      <div className="min-h-screen bg-forest flex items-center justify-center p-6">
        <div className="w-full max-w-sm bg-paper rounded-xl p-6 shadow-xl text-center">
          <div className={`w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4 ${googleState === "pending" ? "bg-warn/10" : "bg-danger/10"}`}>
            {googleState === "pending" ? <Clock size={26} className="text-warn" /> : <XCircle size={26} className="text-danger" />}
          </div>
          <p className="font-display font-semibold">
            {googleState === "pending" ? "Your account is awaiting approval" : "Access request declined"}
          </p>
          <p className="text-sm text-ink/55 leading-relaxed mt-2">
            {googleState === "pending"
              ? "An admin still needs to verify your submitted details and documents. Check back later."
              : "An admin reviewed your submitted documents and declined this request. Contact an admin if you think this is a mistake."}
          </p>
          <button
            onClick={signOut}
            className="mt-6 w-full border border-line rounded-lg py-2.5 text-sm font-medium hover:bg-paper-dim transition-colors"
          >
            Sign out
          </button>
        </div>
      </div>
    );
  }

  return (
    <div dir={lang === "ur" ? "rtl" : undefined} className={`min-h-screen bg-forest flex items-center justify-center p-6 ${lang === "ur" ? "i18n-ur" : ""}`}>
      <div className="w-full max-w-sm">
        <div className="flex justify-end gap-2 mb-3">
          <ThemeToggle className="!bg-white/10 !border-white/10 !text-mist hover:!bg-white/15" />
          <LanguageToggle className="!bg-white/10 !border-white/10 !text-mist hover:!bg-white/15" />
        </div>
        <div className="flex flex-col items-center mb-6">
          <Link to="/" className="flex flex-col items-center">
            <img src={logo} alt="AgriWatch Pakistan" className="w-20 h-20 rounded-full bg-white object-cover mb-3" />
            <h1 className="font-display text-white text-lg font-semibold">AgriWatch Pakistan</h1>
          </Link>
          <p className="text-primary-light text-xs tracking-widest uppercase mt-1">{t("tagline")}</p>
        </div>

        <div className="bg-paper rounded-xl p-6 shadow-xl">
          {step === "phone" && (
            <>
              <p className="text-xs font-medium text-ink/50 uppercase tracking-wide mb-2">{t("loginIAmA")}</p>
              <div className="grid grid-cols-3 gap-2 mb-5">
                {roles.map(({ key, labelKey, icon: Icon }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setRole(key)}
                    onMouseDown={addRipple}
                    className={`btn-animated flex flex-col items-center gap-1.5 py-3 rounded-lg border text-xs font-medium transition-colors ${
                      role === key ? "bg-primary text-white border-primary" : "bg-surface text-ink/60 border-line hover:bg-paper-dim"
                    }`}
                  >
                    <Icon size={16} />
                    {t(labelKey)}
                  </button>
                ))}
              </div>

              <form onSubmit={requestOtp} className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-ink/50 uppercase tracking-wide">{t("phoneNumber")}</label>
                  <div className="flex items-center gap-2 mt-1 border border-line rounded-lg px-3 py-2.5 bg-surface">
                    <Phone size={16} className="text-ink/40" />
                    <input
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+923001234567"
                      className="outline-none text-sm w-full bg-transparent"
                      dir="ltr"
                    />
                  </div>
                </div>
                {error && <p className="text-xs text-danger">{error}</p>}
                <button
                  type="submit"
                  disabled={busy}
                  onMouseDown={addRipple}
                  className="btn-animated btn-pulse w-full bg-primary text-white rounded-lg py-2.5 text-sm font-medium hover:bg-primary-light transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {busy && <Loader2 size={14} className="animate-spin" />}
                  {t("sendOtp")}
                </button>
                {role === "admin" && (
                  <p className="text-xs text-ink/40 text-center">{t("adminApprovalNote")}</p>
                )}
              </form>

              <div className="flex items-center gap-2 my-4">
                <div className="h-px bg-line flex-1" />
                <span className="text-[11px] text-ink/40 uppercase tracking-wide">or</span>
                <div className="h-px bg-line flex-1" />
              </div>

              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={busy}
                onMouseDown={addRipple}
                className="btn-animated w-full border border-line rounded-lg py-2.5 text-sm font-medium hover:bg-paper-dim transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {busy ? <Loader2 size={16} className="animate-spin" /> : <GoogleIcon />}
                Continue with Google
              </button>
              {error && <p className="text-xs text-danger text-center mt-2">{error}</p>}
              <p className="text-[11px] text-ink/40 text-center mt-2">
                First time with Google? You'll be asked for your details and a document for verification.
              </p>

              <div className="mt-5 pt-4 border-t border-line flex items-center justify-center gap-1.5 text-xs">
                <span className="text-ink/50">{t("newHereSignUp")}</span>
                <Link to="/signup" className="font-medium text-primary hover:underline">{t("signUp")}</Link>
              </div>
            </>
          )}

          {step === "otp" && (
            <form onSubmit={verifyOtp} className="space-y-4">
              <div>
                <label className="text-xs font-medium text-ink/50 uppercase tracking-wide">{t("enterOtp")}</label>
                <div className="flex items-center gap-2 mt-1 border border-line rounded-lg px-3 py-2.5 bg-surface">
                  <Shield size={16} className="text-ink/40" />
                  <input
                    placeholder={t("otpPlaceholder")}
                    maxLength={6}
                    dir="ltr"
                    className="outline-none text-sm w-full bg-transparent font-mono tracking-widest"
                  />
                </div>
                <p className="text-xs text-ink/40 mt-2">{t("codeSentTo")} {phone}</p>
              </div>
              <button
                type="submit"
                onMouseDown={addRipple}
                className="btn-animated w-full bg-primary text-white rounded-lg py-2.5 text-sm font-medium hover:bg-primary-light transition-colors"
              >
                {t("verifyContinueAs")} {t(roles.find((r) => r.key === role).labelKey)}
              </button>
            </form>
          )}

          {step === "phone" && (
            <div className="mt-4 flex items-center justify-center">
              <Link to="/guest" className="flex items-center gap-1.5 text-xs font-medium text-ink/50 hover:text-ink">
                <Eye size={13} /> {t("continueAsGuest")}
              </Link>
            </div>
          )}
        </div>

        {step === "phone" && (
          <div className="mt-4 flex items-center justify-center">
            <Link to="/admin-portal/login" className="flex items-center gap-1.5 text-xs font-medium text-mist/60 hover:text-mist">
              <ShieldCheck size={13} /> Admin Portal login →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.6-6 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6.1 29.6 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.7-.4-3.5z"/>
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 15.9 18.9 13 24 13c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6.1 29.6 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
      <path fill="#4CAF50" d="M24 44c5.5 0 10.4-1.9 14.2-5.1l-6.6-5.6C29.6 34.9 26.9 36 24 36c-5.3 0-9.7-3.4-11.3-8.1l-6.5 5C9.6 39.6 16.3 44 24 44z"/>
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.2 4.2-4.1 5.6l6.6 5.6C41.5 36.6 44 30.9 44 24c0-1.3-.1-2.7-.4-3.5z"/>
    </svg>
  );
}