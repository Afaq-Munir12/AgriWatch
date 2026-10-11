import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, CheckCircle2, KeyRound, Loader2, Mail, ShieldCheck, Smartphone } from "lucide-react";
import { supabase } from "../supabase/config";
import { normalizePakistanLocalPhone, pakistanPhoneError, toPakistanE164 } from "../utils/formValidation";
import { useLanguage } from "../i18n/LanguageContext";
import LanguageToggle from "../components/LanguageToggle";
import ThemeToggle from "../components/ThemeToggle";
import FirebasePhoneOtp from "../components/FirebasePhoneOtp";
import { phoneBridge, phoneBridgeEnabled } from "../services/phoneAccountBridge";

// Email uses Supabase's normal password-reset links. Phone recovery validates
// a fresh signed Firebase OTP proof in a server-side Edge Function; no portal
// access is granted by the verification itself.
export default function ForgotPassword() {
  const { t, lang } = useLanguage();
  const [method, setMethod] = useState("email");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [phoneProof, setPhoneProof] = useState(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPhonePassword, setConfirmPhonePassword] = useState("");
  const [phonePasswordSaved, setPhonePasswordSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const validPhone = !pakistanPhoneError(normalizePakistanLocalPhone(phone));

  function chooseMethod(next) {
    setMethod(next);
    setError("");
    setSent(false);
    setPhoneProof(null);
    setPhonePasswordSaved(false);
    setNewPassword("");
    setConfirmPhonePassword("");
  }

  async function savePhonePassword(event) {
    event.preventDefault();
    if (!phoneProof || busy) return;
    if (!(newPassword.length >= 9 && /[A-Za-z]/.test(newPassword) && /\d/.test(newPassword) && newPassword === confirmPhonePassword)) {
      setError("Use 9+ characters with a letter and a number; both passwords must match.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await phoneBridge("recover", phoneProof.idToken, newPassword);
      setPhoneProof(null);
      setNewPassword("");
      setConfirmPhonePassword("");
      setPhonePasswordSaved(true);
      // Unlike a recovery email session, the Firebase phone proof never logs
      // the browser into Supabase. The user must sign in normally after reset.
    } catch (err) { setError(err?.message || "Could not update your password."); }
    finally { setBusy(false); }
  }

  async function sendEmail(event) {
    event.preventDefault();
    if (!validEmail || busy) return;
    setBusy(true);
    setError("");
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });
      if (resetError) throw resetError;
      // Generic confirmation helps prevent email-account enumeration.
      setSent(true);
    } catch (err) {
      setError(err?.message || t("recoveryPasswordError"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={`auth-page flex min-h-screen items-center justify-center px-4 py-12 ${lang === "ur" ? "i18n-ur" : ""}`}>
      <div className="auth-orb auth-orb-one" /><div className="auth-orb auth-orb-two" />
      <section className="relative z-10 w-full max-w-md rounded-[2rem] border border-line bg-surface px-5 py-7 shadow-xl sm:p-8" dir={lang === "ur" ? "rtl" : "ltr"}>
        <div className="flex items-center justify-between gap-2 mb-7">
          <Link to="/login" className="text-sm font-semibold text-primary hover:underline inline-flex items-center gap-1.5"><ArrowLeft size={15} />{t("recoveryGoToLogin")}</Link>
          <div className="flex gap-2"><ThemeToggle /><LanguageToggle /></div>
        </div>
        <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary"><KeyRound size={24} /></div>
        <h1 className="font-display text-2xl font-semibold mt-4">{t("recoveryTitle")}</h1>
        <p className="text-sm text-ink/55 mt-2">{t("recoveryIntro")}</p>

        <div className="grid grid-cols-2 gap-2 mt-6 p-1 bg-paper-dim rounded-xl" role="tablist" aria-label={t("recoveryIntro")}>
          <button type="button" role="tab" aria-selected={method === "email"} onClick={() => chooseMethod("email")} className={`rounded-lg px-3 py-2.5 text-sm font-semibold inline-flex items-center justify-center gap-2 transition-colors ${method === "email" ? "bg-surface text-primary shadow-sm" : "text-ink/55"}`}><Mail size={16}/>{t("recoveryEmailTab")}</button>
          <button type="button" role="tab" aria-selected={method === "phone"} onClick={() => chooseMethod("phone")} className={`rounded-lg px-3 py-2.5 text-sm font-semibold inline-flex items-center justify-center gap-2 transition-colors ${method === "phone" ? "bg-surface text-primary shadow-sm" : "text-ink/55"}`}><Smartphone size={16}/>{t("recoveryPhoneTab")}</button>
        </div>

        {method === "email" ? sent ? (
          <div className="mt-6 space-y-4" role="status">
            <div className="rounded-xl border border-primary/20 bg-primary/[0.06] px-4 py-4">
              <div className="flex gap-2 items-center text-sm font-semibold text-primary"><CheckCircle2 size={18}/>{t("recoveryEmailSentTitle")}</div>
              <p className="text-sm leading-relaxed text-ink/70 mt-2">{t("recoveryEmailSent")}</p>
            </div>
            <button type="button" className="text-sm font-semibold text-primary hover:underline" onClick={() => { setSent(false); setEmail(""); }}>{t("recoveryResend")}</button>
          </div>
        ) : (
          <form onSubmit={sendEmail} className="space-y-4 mt-6">
            <p className="text-sm leading-relaxed text-ink/55">{t("recoveryEmailHelp")}</p>
            <div><label htmlFor="recovery-email" className="auth-label">{t("emailAddress")}</label>
              <div className="relative mt-1.5"><Mail size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink/35" />
                <input id="recovery-email" type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="name@example.com" className="form-input !pl-10" dir="ltr" />
              </div>
            </div>
            {error && <div className="auth-error" role="alert">{error}</div>}
            <button type="submit" disabled={!validEmail || busy} className="btn-animated auth-primary-btn">{busy ? <Loader2 size={16} className="animate-spin" /> : <Mail size={16}/>} {t("recoveryEmailSend")}</button>
          </form>
        ) : (
          <div className="space-y-4 mt-6">
            <p className="text-sm text-ink/55 leading-relaxed">{t("recoveryPhoneHelp")}</p>
            {phonePasswordSaved ? (
              <div role="status" className="rounded-xl border border-primary/20 p-4 space-y-3">
                <p className="flex gap-2 items-center text-sm text-primary font-semibold"><CheckCircle2 size={17}/>Password updated successfully.</p>
                <Link to="/login" className="btn-animated auth-primary-btn inline-flex justify-center">Return to login</Link>
              </div>
            ) : <>
              <div><label htmlFor="recovery-phone" className="auth-label">{t("phoneNumber")}</label>
                <div className="phone-control mt-1.5" dir="ltr"><span className="text-sm font-semibold text-ink/60">+92</span><input id="recovery-phone" value={phone} onChange={e => { setPhone(normalizePakistanLocalPhone(e.target.value)); setPhoneProof(null); setNewPassword(""); setConfirmPhonePassword(""); }} maxLength={10} inputMode="numeric" placeholder="3XX XXXXXXX" className="outline-none bg-transparent w-full text-sm font-mono" /></div>
                {phone && !validPhone && <p className="text-xs text-danger mt-1">{t("authErrPhoneLogin")}</p>}
              </div>
              {validPhone && !phoneBridgeEnabled && <p className="text-sm text-ink/65">Phone recovery is not enabled for this website yet.</p>}
              {validPhone && phoneBridgeEnabled && !phoneProof && <FirebasePhoneOtp key={phone} phoneE164={toPakistanE164(normalizePakistanLocalPhone(phone))} onVerified={(proof) => { setPhoneProof(proof); setError(""); }} />}
              {phoneProof && <form onSubmit={savePhonePassword} className="space-y-3">
                <p className="text-sm text-primary font-semibold flex gap-2 items-center"><ShieldCheck size={17}/>Phone ownership confirmed. Set a new password within five minutes.</p>
                <label htmlFor="phone-reset-password" className="auth-label block">New password</label>
                <input id="phone-reset-password" className="form-input" type="password" autoComplete="new-password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required minLength={9} />
                <label htmlFor="phone-reset-confirm" className="auth-label block">Confirm password</label>
                <input id="phone-reset-confirm" className="form-input" type="password" autoComplete="new-password" value={confirmPhonePassword} onChange={(e) => setConfirmPhonePassword(e.target.value)} required minLength={9} />
                <p className="text-xs text-ink/55">Minimum 9 characters, including a letter and number.</p>
                <button type="submit" className="btn-animated auth-primary-btn" disabled={busy || !newPassword || newPassword !== confirmPhonePassword}>{busy ? <Loader2 size={16} className="animate-spin"/> : <KeyRound size={16}/>} Save new password</button>
                <button type="button" onClick={() => {setPhoneProof(null); setNewPassword(""); setConfirmPhonePassword("");}} className="text-xs font-semibold text-primary hover:underline">Request a new OTP</button>
              </form>}
              {error && <div className="auth-error" role="alert">{error}</div>}
            </>}
          </div>
        )}
      </section>
    </div>
  );
}
