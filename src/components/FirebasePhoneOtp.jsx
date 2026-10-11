import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Loader2, ShieldCheck } from "lucide-react";
import { confirmFirebasePhoneOtp, sendFirebasePhoneOtp } from "../firebase/phoneVerification";
import { useLanguage } from "../i18n/LanguageContext";

/**
 * Send + verify Firebase SMS. Proof alone never creates a Supabase session.
 * Backend linking deliberately remains a separate, server-verified operation.
 */
export default function FirebasePhoneOtp({ phoneE164, onVerified }) {
  const { t } = useLanguage();
  const captchaNode = useRef(null);
  const flowRef = useRef(null);
  const pendingRef = useRef(false);
  const [status, setStatus] = useState("idle");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  // Firebase reCAPTCHA can retain a widget on the original DOM node even
  // after verifier.clear(). Always make a fresh child node for each attempt.
  // React owns the outer wrapper only, so it is safe to replace its children.
  function releaseCaptcha() {
    const previous = flowRef.current;
    flowRef.current = null;
    if (previous?.verifier) {
      try { previous.verifier.clear(); } catch { /* widget may already be gone */ }
    }
    captchaNode.current?.replaceChildren();
  }

  useEffect(() => () => {
    // Also runs in React StrictMode's dev cleanup; no widget exists then.
    releaseCaptcha();
  }, []);

  async function sendCode() {
    if (!phoneE164 || pendingRef.current || !captchaNode.current) return;
    pendingRef.current = true;
    setBusy(true);
    setError("");
    setCode("");
    releaseCaptcha();

    const freshCaptchaElement = document.createElement("div");
    captchaNode.current?.appendChild(freshCaptchaElement);
    try {
      const result = await sendFirebasePhoneOtp(phoneE164, freshCaptchaElement);
      flowRef.current = result;
      setStatus("sent");
    } catch (err) {
      // sendFirebasePhoneOtp clears its own verifier on rejection. Still
      // replace the widget DOM so that a retry cannot reuse a rendered node.
      captchaNode.current?.replaceChildren();
      setStatus("idle");
      setError(err?.message || t("loginErrSendOtp"));
    } finally {
      pendingRef.current = false;
      setBusy(false);
    }
  }

  async function verifyCode() {
    if (pendingRef.current || code.length !== 6 || !flowRef.current) return;
    pendingRef.current = true;
    setBusy(true);
    setError("");
    const flow = flowRef.current;
    try {
      const result = await confirmFirebasePhoneOtp(flow, code);
      releaseCaptcha();
      // Never store the Firebase ID token in localStorage or in a URL.
      await onVerified?.(result);
      setCode("");
      setStatus("verified");
    } catch (err) {
      // This UI deliberately requires requesting a fresh code after a failed
      // confirmation. The future backend still controls account access.
      releaseCaptcha();
      setStatus("idle");
      setError(err?.message || t("loginErrOtpInvalid"));
    } finally {
      pendingRef.current = false;
      setBusy(false);
    }
  }

  return (
    <div className="w-full space-y-3" dir="ltr">
      <div ref={captchaNode} />
      {status === "verified" ? (
        <div role="status" className="rounded-xl border border-primary/20 bg-primary/[0.07] p-3 text-sm text-primary">
          <span className="inline-flex items-center gap-2 font-semibold"><CheckCircle2 size={18} />{t("phoneOtpVerified")}</span>
          <p className="mt-2 text-xs leading-relaxed text-ink/70">{t("phoneOtpNoSession")}</p>
        </div>
      ) : status === "idle" ? (
        <button type="button" onClick={sendCode} disabled={busy || !phoneE164} className="btn-animated auth-primary-btn">
          {busy ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
          {t("sendOtp")}
        </button>
      ) : (
        <div className="space-y-3">
          <label className="auth-label block" htmlFor="firebase-phone-otp">{t("enterOtp")}</label>
          <input id="firebase-phone-otp" className="form-input" dir="ltr" inputMode="numeric" autoComplete="one-time-code" maxLength={6}
            value={code} onChange={event => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
            onKeyDown={event => { if (event.key === "Enter") { event.preventDefault(); void verifyCode(); } }}
            placeholder={t("otpPlaceholder")} />
          <button type="button" onClick={verifyCode} disabled={busy || code.length !== 6} className="btn-animated auth-primary-btn">
            {busy ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />}{t("phoneOtpVerify")}
          </button>
          <button type="button" disabled={busy} onClick={sendCode} className="text-sm font-semibold text-primary hover:underline">{t("phoneOtpResend")}</button>
        </div>
      )}
      {status === "sent" && <p role="status" className="text-xs text-ink/65">{t("phoneOtpCodeSent")}</p>}
      {error && <p role="alert" className="auth-error text-sm">{error}</p>}
    </div>
  );
}
