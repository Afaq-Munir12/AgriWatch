import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  LockKeyhole,
  QrCode,
  ShieldCheck,
  Sparkles,
  Sprout,
  Users2,
  X,
} from "lucide-react";
import { usePersonalAuth } from "../firebase/PersonalAuthContext";
import { personalDestination } from "../firebase/session.js";
import logo from "../assets/logo.jpeg";
import { useLanguage } from "../i18n/LanguageContext";
import LanguageToggle from "../components/LanguageToggle";
import ThemeToggle from "../components/ThemeToggle";
import { useToast } from "../components/ToastContext";
import { addRipple } from "../utils/ripple";
import { useSupabaseAuth } from "../supabase/useSupabaseAuth";
import { supabase } from "../supabase/config";
import { getSignupRequest, normalizeDbRole, sendPhoneOtp, verifyPhoneOtp } from "../services/authService";
import {
  digitsOnly,
  otpError,
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

function localizedPhoneError(message, t) {
  if (!message) return "";
  if (message === "Enter your mobile number.") return t("errPhoneRequired");
  if (message === "Enter exactly 10 digits after +92.") return t("errPhoneLength");
  if (message === "Pakistani mobile numbers must start with 3.") return t("errPhoneStart");
  return message;
}

function localizedOtpError(message, t) {
  if (!message) return "";
  if (message === "Enter the 6-digit verification code.") return t("errOtpLength");
  return message;
}

export default function Login() {
  const { t, lang } = useLanguage();
  const { showToast } = useToast();
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
  const [qrOpen, setQrOpen] = useState(false);
  const [step, setStep] = useState("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [staffOtpMode, setStaffOtpMode] = useState(false);
  const personal = usePersonalAuth();
  const cancelOtp = personal.cancelOtp;
  const recaptchaContainer = useRef(null);
  const personalLogin = role !== "admin";
  const otpOperation = useRef(0);
  const routedAccount = useRef(null);
  const routePersonal = useCallback((state) => {
    const destination = state.error ? "/personal-account" : personalDestination(state.access);
    const accountRoute = `${state.user?.uid}:${destination}`;
    if (routedAccount.current === accountRoute) return;
    routedAccount.current = accountRoute;
    if (!state.error && state.access?.status === "portal" && state.access.portal !== role) {
      showToast(t(state.access.portal === "public" ? "firebaseStoredPublicNotice" : "firebaseStoredFarmerNotice"), "info", 6000);
    }
    navigate(destination, { replace: true });
  }, [navigate, role, showToast, t]);

  useEffect(() => () => { ++otpOperation.current; cancelOtp(); }, [cancelOtp]);
  function resetOtp() {
    ++otpOperation.current;
    cancelOtp();
    setBusy(false); setStep("phone"); setOtp(""); setError("");
  }
  function selectRole(key) {
    if (key === role) return;
    if (personalLogin && key !== "admin") {
      // Both buttons use the same Firebase identity; they are presentation hints.
      setRole(key);
      showToast(t("firebaseStoredRoleHint"), "info");
      return;
    }
    resetOtp(); setRole(key); setPassword(""); setStaffOtpMode(false);
  }
  function showOtpFailure(err, sending) {
    const keys = {
      "auth/otp-timeout": "firebaseOtpTimeout",
      "auth/captcha-check-failed": "firebaseOtpCaptcha",
      "auth/network-request-failed": "firebaseOtpNetwork",
      "auth/invalid-verification-code": "firebaseOtpInvalid",
      "auth/code-expired": "firebaseOtpExpired",
      "auth/session-expired": "firebaseOtpExpired",
      "auth/missing-verification-id": "firebaseOtpExpired",
      "auth/too-many-requests": "firebaseOtpLimited",
      "auth/quota-exceeded": "firebaseOtpLimited",
      "auth/unauthorized-domain": "firebaseOtpDomain",
    };
    // Raw Firebase messages can include account details; display only safe localized copy.
    const message = t(keys[err?.code] || (sending ? "firebaseOtpSendFailed" : "firebaseOtpVerifyFailed"));
    if (["auth/code-expired", "auth/session-expired", "auth/missing-verification-id"].includes(err?.code)) resetOtp();
    setError(message); showToast(message, "error", 6000);
  }
  useEffect(() => {
    if (personalLogin && personal.user && !personal.loading) routePersonal({ user: personal.user, error: personal.error, access: personal.access });
  }, [personal.user, personal.loading, personal.error, personal.access, routePersonal, personalLogin]);

  const phoneError = useMemo(() => (phone ? localizedPhoneError(pakistanPhoneError(phone), t) : ""), [phone, t]);
  const prettyPhone = phone ? `+92 ${phone.slice(0, 3)} ${phone.slice(3, 6)} ${phone.slice(6)}` : "+92";


  useEffect(() => {
    if (authLoading || !user || credentialFlow.current || busy) return;
    const attempt = getLoginAttempt();
    if (attempt) {
      navigate("/auth/callback", { replace: true });
      return;
    }
    signOut();
  }, [user, authLoading, navigate, signOut, busy]);

  async function requestOtp(e) {
    e.preventDefault();
    if (busy) return;
    const validationError = localizedPhoneError(pakistanPhoneError(phone), t);
    if (validationError) {
      setError(validationError);
      return;
    }

    const operation = ++otpOperation.current;
    setBusy(true);
    setError("");
    try {
      if (personalLogin) {
        clearLoginAttempt();
        await personal.sendOtp(toPakistanE164(phone), recaptchaContainer.current);
      } else {
        await sendPhoneOtp(phone);
        localStorage.setItem("pendingSignupRole", role);
      }
      if (operation === otpOperation.current) setStep("otp");
    } catch (err) {
      if (operation === otpOperation.current) {
        if (personalLogin) showOtpFailure(err, true);
        else setError(err?.message || t("loginErrSendOtp"));
      }
    } finally {
      if (operation === otpOperation.current) setBusy(false);
    }
  }

  async function verifyOtp(e) {
    e.preventDefault();
    if (busy) return;
    const validationError = localizedOtpError(otpError(otp), t);
    if (validationError) {
      setError(validationError);
      return;
    }

    const operation = ++otpOperation.current;
    setBusy(true);
    setError("");
    try {
      if (personalLogin) {
        const state = await personal.confirmOtp(otp);
        if (operation !== otpOperation.current) return;
        setPhone(""); setOtp("");
        routePersonal(state);
        return;
      }
      const result = await verifyPhoneOtp(phone, otp);
      if (operation !== otpOperation.current) return;
      const signedInUser = result?.user;
      if (!signedInUser) throw new Error(t("loginErrNoSession"));

      const request = await getSignupRequest(signedInUser.id, role);
      if (operation !== otpOperation.current) return;
      if (!request) {
        navigate("/complete-profile", { replace: true });
        return;
      }
      if (request.status === "approved") {
        const selectedDbRole = normalizeDbRole(role);
        grantPortalAccess(signedInUser.id, selectedDbRole);
        navigate(routeForRole(selectedDbRole), { replace: true });
        return;
      }
      setStatus(request.status === "rejected" ? "rejected" : "pending");
    } catch (err) {
      if (operation === otpOperation.current) {
        if (personalLogin) showOtpFailure(err, false);
        else setError(err?.message || t("loginErrOtpInvalid"));
      }
    } finally {
      if (operation === otpOperation.current) setBusy(false);
    }
  }

  async function handlePasswordLogin(e) {
    e.preventDefault();
    setError("");
    if (personalLogin) return setError(t("firebasePersonalPhoneOnly"));
    const raw = identifier.trim();
    if (!raw) return setError(t("authErrIdentifierRequired"));
    if (!password) return setError(t("authErrPasswordRequired"));

    let credentials;
    if (raw.includes("@")) {
      if (!validEmail(raw)) return setError(t("authErrEmailInvalid"));
      credentials = { email: raw.toLowerCase(), password };
    } else {
      const localPhone = normalizePakistanLocalPhone(raw);
      if (pakistanPhoneError(localPhone)) return setError(t("authErrPhoneLogin"));
      credentials = { phone: toPakistanE164(localPhone), password };
    }

    credentialFlow.current = true;
    setBusy(true);
    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword(credentials);
      if (authError) throw authError;
      if (!data?.user?.id) throw new Error(t("authErrNoSession"));

      const dbRole = normalizeDbRole(role);
      const request = await getSignupRequest(data.user.id, dbRole);
      if (!request) {
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
    if (personalLogin) { setError(t("firebasePersonalPhoneOnly")); return; }
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
              <h2 className="font-display text-4xl xl:text-5xl leading-tight font-semibold text-white mt-5">Sign in with phone verification or your staff account.</h2>
              <p className="mt-5 text-white/65 leading-relaxed">Farmer and General Public accounts use phone verification. PDMA officers can use their existing credentials or Google account.</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {[['Phone OTP','Farmer / Public'],['Google','Fast access'],['Mobile App','QR preview']].map(([value,label]) => (
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
                  <p className="text-sm text-ink/50 mt-2 max-w-md">{t(personalLogin ? "loginSubheading" : "loginCredentialSubheading")}</p>
                </div>
                <div className="auth-card-tools"><ThemeToggle /><LanguageToggle /></div>
              </div>

              <div className="auth-card-body-scroll flex-1">
                <p className="auth-label mb-2">{t(personalLogin ? "firebasePersonalSelection" : "loginIAmA")}</p>
                <div className="grid grid-cols-3 gap-2 mb-5">
                  {roles.map(({ key, labelKey, icon: Icon }) => (
                    <button key={key} type="button" disabled={busy && !(personalLogin && key !== "admin")} onClick={() => selectRole(key)} onMouseDown={addRipple} className={`role-choice ${role === key ? "role-choice-active" : ""}`}>
                      <Icon size={17} /><span>{t(labelKey)}</span>
                    </button>
                  ))}
                </div>

                <div ref={recaptchaContainer} />
                {personalLogin && <p className="text-xs text-ink/45 mb-3">{t("firebaseStoredRoleHint")}</p>}
                {(personalLogin || staffOtpMode) ? (step === "phone" ? (
                  <form onSubmit={requestOtp} className="space-y-4">
                    <div>
                      <label className="auth-label">{t("phoneNumber")}</label>
                      <div className={`phone-control mt-1.5 ${phoneError ? "field-invalid" : phone.length === 10 ? "field-valid" : ""}`} dir="ltr">
                        <span className="text-lg" aria-hidden="true">🇵🇰</span>
                        <span className="font-semibold text-sm text-ink/75">+92</span>
                        <span className="w-px h-6 bg-line" />
                        <input
                          value={phone}
                          disabled={busy}
                          onChange={(e) => {
                            setPhone(normalizePakistanLocalPhone(e.target.value));
                            setError("");
                          }}
                          inputMode="numeric"
                          autoComplete="tel-national"
                          placeholder="3XX XXXXXXX"
                          maxLength={10}
                          className="outline-none text-sm w-full bg-transparent font-mono tracking-wide"
                        />
                        {phone.length === 10 && !phoneError && <CheckCircle2 size={17} className="text-primary" />}
                      </div>
                      <div className="flex items-center justify-between gap-3 mt-1.5">
                        <p className={`text-[11px] ${phoneError ? "text-danger" : "text-ink/40"}`}>
                          {phoneError || t("loginPhoneHelp")}
                        </p>
                        <span className="text-[11px] text-ink/35" dir="ltr">{phone.length}/10</span>
                      </div>
                    </div>

                    {error && <div role="alert" className="auth-error">{error}</div>}

                    <button
                      type="submit"
                      disabled={busy || Boolean(pakistanPhoneError(phone))}
                      onMouseDown={addRipple}
                      className="btn-animated auth-primary-btn"
                    >
                      {busy ? <Loader2 size={16} className="animate-spin" /> : <LockKeyhole size={16} />}
                      {t("sendOtp")}
                    </button>

                    {personalLogin && busy && <button type="button" onClick={resetOtp} className="text-xs font-semibold text-ink/50 hover:text-ink">{t("firebaseOtpCancel")}</button>}

                    {role === "admin" && <p className="text-xs text-ink/40 text-center">{t("adminApprovalNote")}</p>}
                  </form>

                ) : (
                <form onSubmit={verifyOtp} className="space-y-5 animate-fade-in">
                  <button type="button" onClick={resetOtp} className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink/50 hover:text-ink">
                    <ArrowLeft size={14} /> {t("changeNumber")}
                  </button>

                  <div className="rounded-2xl bg-primary/8 border border-primary/15 p-4">
                    <p className="text-xs text-ink/45">{t("verificationCodeSentTo")}</p>
                    <p className="font-display font-semibold mt-1" dir="ltr">{prettyPhone}</p>
                  </div>

                  <div>
                    <label className="auth-label">{t("enterOtp")}</label>
                    <input
                      value={otp}
                      disabled={busy}
                      onChange={(e) => { setOtp(digitsOnly(e.target.value, 6)); setError(""); }}
                      placeholder="••••••" aria-label={t("enterOtp")}
                      maxLength={6}
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      dir="ltr"
                      className="otp-input mt-1.5"
                      autoFocus
                    />
                    <p className="text-[11px] text-ink/40 mt-1.5">{t("otpHelp")}</p>
                  </div>

                  {error && <div role="alert" className="auth-error">{error}</div>}

                  <button type="submit" disabled={busy || otp.length !== 6} onMouseDown={addRipple} className="btn-animated auth-primary-btn">
                    {busy && <Loader2 size={16} className="animate-spin" />}
                    {personalLogin ? t("firebaseVerifyContinue") : <>{t("verifyContinueAs")} {t(roles.find((r) => r.key === role).labelKey)}</>}
                  </button>
                  {personalLogin && <button type="button" disabled={busy} onClick={(e) => { resetOtp(); void requestOtp(e); }} className="text-xs font-semibold text-primary hover:underline">{t("firebaseOtpResend")}</button>}
                </form>
                )) : (
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
                </form>

                )}
                {!personalLogin && <button type="button" disabled={busy} className="mt-3 text-xs text-primary hover:underline" onClick={() => { personal.cancelOtp(); setStep("phone"); setOtp(""); setStaffOtpMode(value => !value); }}>{t(staffOtpMode ? "authLoginWithPassword" : "sendOtp")}</button>}

                <div className="auth-divider"><span>{t("authOr")}</span></div>
                <div className="grid sm:grid-cols-2 gap-2.5">
                  <button type="button" onClick={handleGoogleSignIn} disabled={busy} onMouseDown={addRipple} className="btn-animated auth-google-btn"><GoogleIcon />{t("continueWithGoogle")}</button>
                  <button type="button" onClick={() => setQrOpen(true)} onMouseDown={addRipple} className="btn-animated auth-google-btn"><QrCode size={17} className="text-primary" />{t("signInWithApp")}</button>
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

      {qrOpen && <QrPreview t={t} onClose={() => setQrOpen(false)} />}
    </div>
  );
}

function QrPreview({ t, onClose }) {
  return (
    <div className="auth-qr-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="auth-qr-modal animate-pop-in">
        <button type="button" onClick={onClose} className="auth-qr-close"><X size={18} /></button>
        <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto"><QrCode size={24} className="text-primary" /></div>
        <h2 className="font-display text-xl font-semibold text-center mt-4">{t("qrLoginTitle")}</h2>
        <p className="text-sm text-ink/50 leading-relaxed text-center mt-2">{t("qrLoginBody")}</p>
        <div className="auth-qr-placeholder"><QrCode size={128} strokeWidth={1.3} /></div>
        <p className="text-xs text-center text-warn font-semibold">{t("qrPreviewLabel")}</p>
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
