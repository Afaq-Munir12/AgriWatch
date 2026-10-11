import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Check, CheckCircle2, Eye, EyeOff, KeyRound, Loader2, ShieldCheck } from "lucide-react";
import { supabase } from "../supabase/config";
import { clearPortalAccess, clearLoginAttempt } from "../utils/authAccess";
import { useLanguage } from "../i18n/LanguageContext";
import LanguageToggle from "../components/LanguageToggle";
import ThemeToggle from "../components/ThemeToggle";

// Register at module evaluation so the PASSWORD_RECOVERY event emitted by
// Supabase while processing an email redirect is not lost before React mounts.
// This is never a portal-access grant; only an email recovery proof.
let recoveryEventReceived = false;
const initialUrl = typeof window !== "undefined" ? new URL(window.location.href) : null;
const recoveryLinkPresent = initialUrl?.pathname === "/auth/reset-password" && (
  initialUrl.searchParams.has("code") ||
  initialUrl.searchParams.get("type") === "recovery" ||
  initialUrl.hash.includes("type=recovery") ||
  initialUrl.hash.includes("access_token=")
);
supabase.auth.onAuthStateChange((event) => {
  if (event === "PASSWORD_RECOVERY") recoveryEventReceived = true;
});

export default function ResetPassword() {
  const { t, lang } = useLanguage();
  const [status, setStatus] = useState("checking");
  const [problem, setProblem] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState(false);

  const checks = useMemo(() => ({
    length: password.length > 8,
    letter: /[A-Za-z]/.test(password),
    number: /\d/.test(password),
    match: Boolean(password) && password === confirmPassword,
  }), [password, confirmPassword]);
  const valid = checks.length && checks.letter && checks.number && checks.match;

  useEffect(() => {
    let cancelled = false;
    const search = new URLSearchParams(window.location.search);
    const hash = new URLSearchParams(window.location.hash.slice(1));
    const returnError = search.get("error_description") || search.get("error") || hash.get("error_description") || hash.get("error");
    if (returnError) {
      setProblem(returnError);
      setStatus("invalid");
      return undefined;
    }

    const { data: authEvents } = supabase.auth.onAuthStateChange((event, session) => {
      if (cancelled) return;
      if (event === "PASSWORD_RECOVERY" && session?.user) {
        recoveryEventReceived = true;
        setStatus("ready");
      }
    });

    // getSession waits for Supabase to finish exchanging the PKCE code or
    // recovery token. Possessing an old unrelated session alone is NOT proof.
    async function verifyLink() {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;
        if (cancelled) return;
        if (data.session?.user && (recoveryEventReceived || recoveryLinkPresent)) {
          clearPortalAccess();
          clearLoginAttempt();
          setStatus("ready");
        } else {
          setProblem(t("recoveryLinkInvalid"));
          setStatus("invalid");
        }
      } catch (err) {
        if (!cancelled) {
          setProblem(err?.message || t("recoveryLinkInvalid"));
          setStatus("invalid");
        }
      }
    }
    verifyLink();
    return () => { cancelled = true; authEvents.subscription.unsubscribe(); };
  }, [t]);

  async function setNewPassword(event) {
    event.preventDefault();
    if (!valid || busy || status !== "ready") return;
    setBusy(true);
    setProblem("");
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;
      setPassword("");
      setConfirmPassword("");
      setSuccess(true);
      recoveryEventReceived = false;
      // A temporary recovery session must not silently open a role-based portal.
      clearPortalAccess();
      clearLoginAttempt();
      const { error: signOutError } = await supabase.auth.signOut();
      if (signOutError) throw signOutError;
    } catch (err) {
      // Password may already have been saved if sign-out failed; show a safe
      // message and offer normal login, never grant dashboard access here.
      setProblem(err?.message || t("recoveryPasswordError"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={`auth-page flex min-h-screen items-center justify-center px-4 py-12 ${lang === "ur" ? "i18n-ur" : ""}`}>
      <div className="auth-orb auth-orb-one" /><div className="auth-orb auth-orb-two" />
      <section className="relative z-10 w-full max-w-md rounded-[2rem] border border-line bg-surface p-6 shadow-xl sm:p-8" dir={lang === "ur" ? "rtl" : "ltr"}>
        <div className="flex justify-end gap-2"><ThemeToggle /><LanguageToggle /></div>
        <div className="w-12 h-12 mt-2 rounded-2xl bg-primary/10 text-primary flex items-center justify-center"><ShieldCheck size={24}/></div>
        <h1 className="font-display text-2xl font-semibold mt-4">{success ? t("securityPasswordSaved") : t("recoveryResetTitle")}</h1>
        <p className="text-sm text-ink/55 mt-2 leading-relaxed">{success ? t("recoveryPasswordDone") : t("recoveryResetIntro")}</p>
        {status === "checking" && !success && <p className="mt-6 flex items-center gap-2 text-sm text-ink/60"><Loader2 size={18} className="animate-spin" />{t("recoveryLinkChecking")}</p>}
        {success ? (
          <div className="mt-6 space-y-4"><p className="flex items-center gap-2 text-sm font-semibold text-primary"><CheckCircle2 size={18}/>{t("securityPasswordSaved")}</p>
            <Link to="/login" className="btn-animated auth-primary-btn inline-flex justify-center">{t("recoveryGoToLogin")}</Link>
          </div>
        ) : status === "ready" ? (
          <form className="space-y-4 mt-6" onSubmit={setNewPassword}>
            <div><label className="auth-label" htmlFor="reset-new-password">{t("securityNewPassword")}</label>
              <div className="relative mt-1.5"><input id="reset-new-password" type={showPassword ? "text" : "password"} value={password} onChange={e=>setPassword(e.target.value)} autoComplete="new-password" className="form-input !pr-11" dir="ltr" placeholder="•••••••••" />
              <button type="button" onClick={()=>setShowPassword(v=>!v)} aria-label={t(showPassword ? "hidePassword" : "showPassword")} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink/50">{showPassword ? <EyeOff size={17}/> : <Eye size={17}/>}</button></div>
            </div>
            <div><label className="auth-label" htmlFor="reset-confirm-password">{t("confirmPassword")}</label><input id="reset-confirm-password" type="password" value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)} autoComplete="new-password" className="form-input mt-1.5" dir="ltr" placeholder="•••••••••" /></div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">{[[checks.length,t("passwordRuleLength")],[checks.letter,t("passwordRuleLetter")],[checks.number,t("passwordRuleNumber")],[checks.match,t("passwordRuleMatch")]].map(([ok,label])=><div className={`password-rule ${ok ? "is-valid" : ""}`} key={label}><span className="password-rule-icon">{ok ? <Check size={12}/> : "•"}</span><span>{label}</span></div>)}</div>
            {problem && <div className="auth-error" role="alert">{problem}</div>}
            <button type="submit" className="btn-animated auth-primary-btn" disabled={!valid || busy}>{busy ? <Loader2 size={17} className="animate-spin"/> : <KeyRound size={17}/>} {t("securitySavePassword")}</button>
          </form>
        ) : status === "invalid" ? (
          <div className="space-y-4 mt-6"><div className="auth-error" role="alert">{problem || t("recoveryLinkInvalid")}</div>
            <Link to="/forgot-password" className="btn-animated auth-primary-btn inline-flex justify-center">{t("forgotPasswordLink")}</Link>
          </div>
        ) : null}
        <Link to="/login" className="block text-sm text-center text-primary font-semibold hover:underline mt-6">{t("recoveryGoToLogin")}</Link>
      </section>
    </div>
  );
}
