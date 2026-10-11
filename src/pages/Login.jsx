import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  LockKeyhole,
  ShieldCheck,
  Sparkles,
  Sprout,
  Users2,
} from "lucide-react";
import logo from "../assets/logo.jpeg";
import { useLanguage } from "../i18n/LanguageContext";
import LanguageToggle from "../components/LanguageToggle";
import ThemeToggle from "../components/ThemeToggle";
import { addRipple } from "../utils/ripple";
import { useSupabaseAuth } from "../supabase/useSupabaseAuth";
import { supabase } from "../supabase/config";
import { phonePasswordLogin, phoneBridgeEnabled } from "../services/phoneAccountBridge";
import { getSignupRequest, normalizeDbRole } from "../services/authService";
import {
  normalizePakistanLocalPhone,
  pakistanPhoneError,
  toPakistanE164,
} from "../utils/formValidation";
import {
  clearLoginAttempt,
  getLoginAttempt,
  grantPortalAccess,
  markLoginAttempt,
} from "../utils/authAccess";

const roles = [
  { key: "farmer", labelKey: "roleFarmerLabel", icon: Sprout, dest: "/farmer" },
  { key: "public", labelKey: "rolePublicLabel", icon: Users2, dest: "/public" },
  { key: "admin", labelKey: "roleAdminLabel", icon: ShieldCheck, dest: "/pdma" },
];

const GOOGLE_REDIRECT = typeof window !== "undefined" ? `${window.location.origin}/auth/callback` : undefined;

function routeForRole(role) {
  const normalized = role === "pdma" ? "admin" : role;
  return roles.find((item) => item.key === normalized)?.dest || "/";
}

function validEmail(value = "") {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value).trim());
}

export default function Login() {
  const { t, lang } = useLanguage();
  const { user, loading: authLoading, signIn: googleSignIn, signOut } = useSupabaseAuth();
  const navigate = useNavigate();
  const credentialFlow = useRef(false);

  const [role, setRole] = useState(() => {
    const pending = localStorage.getItem("pendingSignupRole");
    if (pending === "pdma") return "admin";
    return ["farmer", "public", "admin"].includes(pending) ? pending : "farmer";
  });
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState(null);

  useEffect(() => {
    if (authLoading || !user || credentialFlow.current) return;
    const attempt = getLoginAttempt();
    if (attempt) {
      navigate("/auth/callback", { replace: true });
      return;
    }
    signOut();
  }, [user, authLoading, navigate, signOut]);

  async function handlePasswordLogin(e) {
    e.preventDefault();
    setError("");
    const raw = identifier.trim();
    if (!raw) return setError(t("authErrIdentifierRequired"));
    if (!password) return setError(t("authErrPasswordRequired"));
    let credentials;
    let phoneCredential = null;
    if (!raw.includes("@")) {
      const localPhone = normalizePakistanLocalPhone(raw);
      if (pakistanPhoneError(localPhone)) return setError(t("authErrPhoneLogin"));
      // Supabase owns the password and returns its normal session; OTP was
      // required at registration or when linking the number to this identity.
      if (!phoneBridgeEnabled) return setError("Phone login is not enabled for this environment. Use email or Google until phone authentication is released.");
      phoneCredential = toPakistanE164(localPhone);
    } else {
      if (!validEmail(raw)) return setError(t("authErrEmailInvalid"));
      credentials = { email: raw.toLowerCase(), password };
    }

    credentialFlow.current = true;
    setBusy(true);
    try {
      const result = phoneCredential
        ? { data: await phonePasswordLogin(phoneCredential, password), error: null }
        : await supabase.auth.signInWithPassword(credentials);
      const { data, error: authError } = result;
      if (authError) throw authError;
      if (!data?.user?.id) throw new Error(t("authErrNoSession"));

      const dbRole = normalizeDbRole(role);
      const request = await getSignupRequest(data.user.id, dbRole);
      if (!request) {
        // A phone account may have been created successfully just before its
        // initial profile submission failed or the user closed the browser.
        // Let that *authenticated* user finish the normal role request rather
        // than creating a duplicate UUID or silently approving the role.
        if (phoneCredential && data.user.user_metadata?.signup_method === "firebase_phone") {
          localStorage.setItem("pendingSignupRole", role);
          navigate("/signup?resume=phone", { replace: true });
          return;
        }
        await supabase.auth.signOut();
        credentialFlow.current = false;
        setError(t("authErrNoSelectedRole"));
        return;
      }
      if (request.status === "approved") {
        grantPortalAccess(data.user.id, dbRole);
        navigate(routeForRole(dbRole), { replace: true });
        return;
      }
      setStatus(request.status === "rejected" ? "rejected" : "pending");
    } catch (err) {
      credentialFlow.current = false;
      const message = String(err?.message || "");
      if (/email.*confirm/i.test(message)) setError(t("authErrEmailNotVerified"));
      else if (/invalid login credentials/i.test(message)) setError(t("authErrInvalidCredentials"));
      else setError(message || t("authErrCredentialLogin"));
    } finally {
      setBusy(false);
    }
  }

  async function handleGoogleSignIn() {
    setError("");
    setBusy(true);
    localStorage.setItem("pendingSignupRole", role);
    markLoginAttempt("google", role);
    try {
      await googleSignIn(GOOGLE_REDIRECT, { forceAccountChoice: true });
    } catch (err) {
      clearLoginAttempt();
      setError(err?.message || t("loginErrGoogleStart"));
    } finally {
      setBusy(false);
    }
  }

  if (status) {
    return (
      <div className={`auth-page flex items-center justify-center p-5 ${lang === "ur" ? "i18n-ur" : ""}`}>
        <div className="auth-status-card animate-pop-in" dir={lang === "ur" ? "rtl" : "ltr"}>
          <h1 className="font-display text-xl font-semibold">
            {status === "pending" ? t("authPendingTitle") : t("authRejectedTitle")}
          </h1>
          <p className="text-sm text-ink/55 leading-relaxed mt-3">
            {status === "pending" ? t("authPendingBody") : t("authRejectedBody")}
          </p>
          <button onClick={signOut} className="mt-6 w-full border border-line rounded-xl py-3 text-sm font-semibold hover:bg-paper-dim transition-colors">
            {t("signOut")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`auth-page ${lang === "ur" ? "i18n-ur" : ""}`}>
      <div className="auth-orb auth-orb-one" />
      <div className="auth-orb auth-orb-two" />
      <div className="auth-layout">
        <section dir="ltr" className="hidden lg:flex flex-col justify-between rounded-[2rem] p-10 xl:p-12 auth-visual-panel auth-equal-panel animate-fade-up">
          <div>
            <Link to="/" className="inline-flex items-center gap-3">
              <img src={logo} alt="AgriWatch Pakistan" className="w-12 h-12 rounded-2xl object-cover bg-white shadow-lg" />
              <div>
                <p className="font-display text-xl font-semibold text-white">AgriWatch Pakistan</p>
                <p className="text-xs tracking-[0.18em] uppercase text-white/55">GeoAI drought intelligence</p>
              </div>
            </Link>
            <div className="mt-20 max-w-lg">
              <span className="inline-flex items-center gap-2 rounded-full bg-white/10 border border-white/10 px-3 py-1.5 text-xs text-white/80"><Sparkles size={13} /> Secure access</span>
              <h2 className="font-display text-4xl xl:text-5xl leading-tight font-semibold text-white mt-5">Sign in with your email or phone number and password, or continue with Google.</h2>
              <p className="mt-5 text-white/65 leading-relaxed">Email uses your password. Phone numbers verified during registration can sign in with their Supabase password.</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[['Email','Password login'],['Phone','Password after OTP signup']].map(([value,label]) => (
              <div key={label} className="rounded-2xl border border-white/10 bg-white/[0.07] p-4 backdrop-blur">
                <p className="font-display text-lg text-white font-semibold">{value}</p>
                <p className="text-[11px] text-white/55 mt-1">{label}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="auth-form-column" dir={lang === "ur" ? "rtl" : "ltr"}>
          <div className="auth-form-wrap animate-fade-up animation-delay-100">
            <div className="auth-form-card auth-equal-card auth-login-card">
              <div className="auth-card-header">
                <div>
                  <p className="auth-eyebrow text-xs uppercase tracking-[0.18em] text-primary font-semibold">{t("loginWelcomeBack")}</p>
                  <h1 className="font-display text-2xl sm:text-3xl font-semibold mt-2">{t("loginHeading")}</h1>
                  <p className="text-sm text-ink/50 mt-2 max-w-md">{t("loginCredentialSubheading")}</p>
                </div>
                <div className="auth-card-tools"><ThemeToggle /><LanguageToggle /></div>
              </div>

              <div className="auth-card-body-scroll flex-1">
                <p className="auth-label mb-2">{t("loginIAmA")}</p>
                <div className="grid grid-cols-3 gap-2 mb-5">
                  {roles.map(({ key, labelKey, icon: Icon }) => (
                    <button key={key} type="button" onClick={() => { setRole(key); setError(""); }} onMouseDown={addRipple} className={`role-choice ${role === key ? "role-choice-active" : ""}`}>
                      <Icon size={17} /><span>{t(labelKey)}</span>
                    </button>
                  ))}
                </div>

                <form onSubmit={handlePasswordLogin} className="space-y-4">
                  <div>
                    <label className="auth-label">{t("authEmailOrPhone")}</label>
                    <div className="relative mt-1.5">
                      <KeyRound size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink/35" />
                      <input value={identifier} onChange={(e) => { setIdentifier(e.target.value); setError(""); }} autoComplete="username" placeholder={t("authEmailPhonePlaceholder")} className="form-input !pl-10" dir="ltr" />
                    </div>
                  </div>
                  <div>
                    <label className="auth-label">{t("authPassword")}</label>
                    <div className="relative mt-1.5">
                      <LockKeyhole size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink/35" />
                      <input type={showPassword ? "text" : "password"} value={password} onChange={(e) => { setPassword(e.target.value); setError(""); }} autoComplete="current-password" placeholder="••••••••" className="form-input !pl-10 !pr-11" dir="ltr" />
                      <button type="button" onClick={() => setShowPassword((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink/40 hover:text-ink" aria-label={showPassword ? t("hidePassword") : t("showPassword")}>
                        {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                      </button>
                    </div>
                  </div>
                  {error && <div className="auth-error">{error}</div>}
                  <button type="submit" disabled={busy || !identifier.trim() || !password} onMouseDown={addRipple} className="btn-animated auth-primary-btn">
                    {busy ? <Loader2 size={16} className="animate-spin" /> : <LockKeyhole size={16} />}{t("authLoginWithPassword")}
                  </button>
                  <div className="flex justify-end">
                    <Link to="/forgot-password" className="text-xs font-semibold text-primary hover:underline">{t("forgotPasswordLink")}</Link>
                  </div>
                </form>

                <div className="auth-divider"><span>{t("authOr")}</span></div>
                <div className="grid grid-cols-1 gap-2.5">
                  <button type="button" onClick={handleGoogleSignIn} disabled={busy} onMouseDown={addRipple} className="btn-animated auth-google-btn"><GoogleIcon />{t("continueWithGoogle")}</button>
                </div>
              </div>

              <div className="auth-card-footer mt-3 pt-3 border-t border-line flex flex-wrap items-center justify-center gap-x-2 gap-y-2 text-xs">
                <span className="text-ink/50">{t("newHereSignUp")}</span><Link to="/signup" className="font-semibold text-primary hover:underline">{t("signUp")}</Link>
                <span className="text-ink/25">•</span><Link to="/guest" className="inline-flex items-center gap-1 font-medium text-ink/55 hover:text-ink"><Eye size={13} /> {t("continueAsGuest")}</Link>
              </div>
            </div>
            <Link to="/admin-portal/login" className="auth-portal-link"><ShieldCheck size={14} /> {t("adminPortalAccess")}</Link>
          </div>
        </section>
      </div>

    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.6-6 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6.1 29.6 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.7-.4-3.5z"/>
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 15.9 18.9 13 24 13c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6.1 29.6 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
      <path fill="#4CAF50" d="M24 44c5.5 0 10.4-1.9 14.2-5.1l-6.6-5.6C29.6 34.9 26.9 36 24 36c-5.3 0-9.7-3.4-11.3-8.1l-6.5 5C9.6 39.6 16.3 44 24 44z"/>
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.2 4.2-4.1 5.6l6.6 5.6C41.5 36.6 44 30.9 44 24c0-1.3-.1-2.7-.4-3.5z"/>
    </svg>
  );
}
