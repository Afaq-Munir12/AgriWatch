import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  Check,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  ShieldCheck,
  X,
} from "lucide-react";
import { supabase } from "../supabase/config";
import { useLanguage } from "../i18n/LanguageContext";

export default function SecurityPasswordModal({ open, onClose }) {
  const { t, lang } = useLanguage();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const checks = useMemo(
    () => ({
      length: password.length > 8,
      letter: /[A-Za-z]/.test(password),
      number: /\d/.test(password),
      match: Boolean(password) && password === confirmPassword,
    }),
    [password, confirmPassword]
  );

  const valid = checks.length && checks.letter && checks.number && checks.match;

  useEffect(() => {
    if (!open) {
      setPassword("");
      setConfirmPassword("");
      setShowPassword(false);
      setShowConfirmPassword(false);
      setBusy(false);
      setError("");
      setSuccess(false);
      return;
    }

    function onKeyDown(event) {
      if (event.key === "Escape" && !busy) onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, busy, onClose]);

  async function savePassword(event) {
    event.preventDefault();
    if (!valid || busy) return;

    setBusy(true);
    setError("");
    setSuccess(false);

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password,
      });
      if (updateError) throw updateError;
      setSuccess(true);
      setPassword("");
      setConfirmPassword("");
    } catch (err) {
      const message = String(err?.message || "");
      setError(
        /reauth|nonce|recent/i.test(message)
          ? t("securityReauthRequired")
          : message || t("securityPasswordFailed")
      );
    } finally {
      setBusy(false);
    }
  }

  if (!open) return null;

  return createPortal(
    <div
      className="auth-qr-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label={t("securityPasswordTitle")}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !busy) onClose();
      }}
    >
      <div
        className="auth-qr-modal animate-pop-in"
        dir={lang === "ur" ? "rtl" : "ltr"}
      >
        <button
          type="button"
          onClick={onClose}
          disabled={busy}
          className="auth-qr-close"
          aria-label={t("close")}
        >
          <X size={18} />
        </button>

        <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
          <KeyRound size={23} className="text-primary" />
        </div>

        <h2 className="font-display text-xl font-semibold text-center mt-4">
          {t("securityPasswordTitle")}
        </h2>
        <p className="text-sm text-ink/50 leading-relaxed text-center mt-2">
          {t("securityPasswordBody")}
        </p>

        <form onSubmit={savePassword} className="space-y-4 mt-5">
          <PasswordInput
            label={t("securityNewPassword")}
            value={password}
            onChange={(value) => {
              setPassword(value);
              setError("");
              setSuccess(false);
            }}
            show={showPassword}
            onToggle={() => setShowPassword((value) => !value)}
            t={t}
          />

          <PasswordInput
            label={t("confirmPassword")}
            value={confirmPassword}
            onChange={(value) => {
              setConfirmPassword(value);
              setError("");
              setSuccess(false);
            }}
            show={showConfirmPassword}
            onToggle={() => setShowConfirmPassword((value) => !value)}
            t={t}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {[
              [checks.length, t("passwordRuleLength")],
              [checks.letter, t("passwordRuleLetter")],
              [checks.number, t("passwordRuleNumber")],
              [checks.match, t("passwordRuleMatch")],
            ].map(([ok, label]) => (
              <div
                key={label}
                className={`password-rule ${ok ? "is-valid" : ""}`}
              >
                <span className="password-rule-icon">
                  {ok ? <Check size={12} /> : "•"}
                </span>
                <span>{label}</span>
              </div>
            ))}
          </div>

          {success && (
            <div className="rounded-xl border border-primary/15 bg-primary/[0.06] px-3 py-2.5 text-xs text-primary flex items-start gap-2">
              <ShieldCheck size={15} className="shrink-0 mt-0.5" />
              <span>{t("securityPasswordSaved")}</span>
            </div>
          )}

          {error && <div className="auth-error">{error}</div>}

          <button
            type="submit"
            disabled={!valid || busy}
            className="btn-animated auth-primary-btn"
          >
            {busy ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <KeyRound size={16} />
            )}
            {t("securitySavePassword")}
          </button>
        </form>
      </div>
    </div>,
    document.body
  );
}

function PasswordInput({ label, value, onChange, show, onToggle, t }) {
  return (
    <div>
      <label className="auth-label">{label}</label>
      <div className="relative mt-1.5">
        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          autoComplete="new-password"
          placeholder="•••••••••"
          className="form-input !pr-11"
          dir="ltr"
        />
        <button
          type="button"
          onClick={onToggle}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-ink/40 hover:text-ink"
          aria-label={show ? t("hidePassword") : t("showPassword")}
        >
          {show ? <EyeOff size={17} /> : <Eye size={17} />}
        </button>
      </div>
    </div>
  );
}
