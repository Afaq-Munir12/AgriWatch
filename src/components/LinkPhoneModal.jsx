import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Smartphone, CheckCircle2, ShieldCheck, LockKeyhole, ArrowRight } from 'lucide-react';
import FirebasePhoneOtp from './FirebasePhoneOtp';
import { supabase } from '../supabase/config';
import { phoneBridge, phoneBridgeEnabled } from '../services/phoneAccountBridge';
import { normalizePakistanLocalPhone, pakistanPhoneError, toPakistanE164 } from '../utils/formValidation';

/**
 * Account linking requires both an existing Supabase session and fresh Firebase
 * phone proof. UI is portaled to document.body so transformed portal layouts,
 * dashboard scrolling, and fixed headers cannot clip or reposition the dialog.
 */
export default function LinkPhoneModal({ open, onClose }) {
  const [phone, setPhone] = useState('');
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const dialogRef = useRef(null);
  const closeRef = useRef(null);
  const latestOnClose = useRef(onClose);
  latestOnClose.current = onClose;

  const cleanPhone = normalizePakistanLocalPhone(phone);
  const validPhone = !pakistanPhoneError(cleanPhone);

  useEffect(() => {
    if (!open) {
      setPhone('');
      setDone(false);
      setError('');
      return;
    }

    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        event.preventDefault();
        latestOnClose.current?.();
        return;
      }
      if (event.key !== 'Tab' || !dialogRef.current) return;
      const focusable = Array.from(dialogRef.current.querySelectorAll(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )).filter((element) => element.getClientRects().length > 0);
      if (!focusable.length) {
        event.preventDefault();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
      if (previousFocus?.isConnected) previousFocus.focus?.();
    };
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[5000] flex items-center justify-center bg-forest/75 backdrop-blur-[5px] p-3 sm:p-6"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="link-phone-title"
        aria-describedby="link-phone-description"
        className="animate-pop-in relative flex w-full max-w-[510px] max-h-[calc(100dvh-1.5rem)] flex-col overflow-hidden rounded-[28px] border border-line bg-surface text-ink shadow-[0_28px_95px_rgba(0,0,0,0.32)] sm:max-h-[min(90dvh,730px)]"
      >
        <div className="relative shrink-0 overflow-hidden border-b border-line bg-gradient-to-br from-primary/[0.14] via-paper-dim/60 to-surface px-5 pb-5 pt-5 sm:px-7 sm:pb-6 sm:pt-7">
          <div aria-hidden="true" className="pointer-events-none absolute -right-12 -top-16 h-52 w-52 rounded-full border-[30px] border-primary/[0.07]" />
          <div className="relative flex items-start justify-between gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-primary/15 bg-primary/10 text-primary shadow-sm">
              <Smartphone size={23} strokeWidth={2} />
            </div>
            <button
              ref={closeRef}
              type="button"
              onClick={onClose}
              aria-label="Close phone linking"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-line bg-surface/80 text-ink/65 transition hover:bg-paper-dim hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              <X size={19} />
            </button>
          </div>
          <div className="relative mt-4">
            <div className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-primary/15 bg-primary/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.13em] text-primary">
              <ShieldCheck size={12} /> Account security
            </div>
            <h2 id="link-phone-title" className="font-display text-[25px] font-semibold leading-tight sm:text-[28px]">
              Link your phone number
            </h2>
            <p id="link-phone-description" className="mt-2 text-sm leading-relaxed text-ink/65">
              Verify a phone number while keeping your current AgriWatch account, roles and approvals.
            </p>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5 sm:px-7 sm:py-6">
          {done ? (
            <div className="flex flex-col items-center gap-4 py-5 text-center" role="status">
              <div className="flex h-16 w-16 items-center justify-center rounded-full border border-primary/20 bg-primary/10 text-primary">
                <CheckCircle2 size={34} />
              </div>
              <div>
                <h3 className="font-display text-xl font-semibold">Phone linked successfully</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink/65">Your existing account and portal permissions have been preserved.</p>
              </div>
              <button type="button" onClick={onClose} className="auth-primary-btn mt-2">
                Done <ArrowRight size={17} />
              </button>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="flex items-start gap-3 rounded-2xl border border-line bg-paper-dim/55 p-3.5">
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <LockKeyhole size={16} />
                </div>
                <div>
                  <p className="text-sm font-semibold">One account, all your portals</p>
                  <p className="mt-1 text-xs leading-relaxed text-ink/65">
                    Linking uses your current signed-in account plus a fresh Firebase verification. It won't create another Public, Farmer or NDMA profile.
                  </p>
                </div>
              </div>

              <div className="space-y-2.5">
                <label htmlFor="profile-link-phone" className="auth-label block">
                  Pakistan mobile number
                </label>
                <div className="phone-control !min-h-[54px]" dir="ltr">
                  <span className="font-semibold text-ink">+92</span>
                  <span aria-hidden="true" className="h-6 w-px bg-line" />
                  <input
                    id="profile-link-phone"
                    type="tel"
                    autoComplete="tel-national"
                    inputMode="numeric"
                    className="min-w-0 w-full flex-1 bg-transparent text-ink outline-none placeholder:text-ink/40"
                    placeholder="3XX XXXXXXX"
                    maxLength={10}
                    value={phone}
                    onChange={(event) => {
                      setPhone(normalizePakistanLocalPhone(event.target.value));
                      setError('');
                    }}
                  />
                </div>
                <p className="text-xs leading-relaxed text-ink/55">Enter your 10-digit mobile number without the leading zero.</p>
                {phone && !validPhone && (
                  <p role="alert" className="text-xs text-danger">Enter a valid Pakistani mobile number.</p>
                )}
              </div>

              {validPhone && !phoneBridgeEnabled && (
                <div role="status" className="rounded-xl border border-line bg-paper-dim/60 px-3.5 py-3 text-sm leading-relaxed text-ink/70">
                  Verified phone linking isn't available in this environment yet. Your account is unchanged.
                </div>
              )}
              {validPhone && phoneBridgeEnabled && (
                <div className="space-y-3 rounded-2xl border border-line bg-paper-dim/40 p-3.5 sm:p-4">
                  <p className="flex items-center gap-2 text-sm font-semibold"><ShieldCheck size={16} className="text-primary" /> Verify number ownership</p>
                  <FirebasePhoneOtp
                    key={cleanPhone}
                    phoneE164={toPakistanE164(cleanPhone)}
                    onVerified={async (proof) => {
                      const { data: { user }, error: authError } = await supabase.auth.getUser();
                      if (authError || !user) throw new Error('Please sign in to your existing Supabase account first.');
                      try {
                        await phoneBridge('link', proof.idToken);
                        setDone(true);
                      } catch (err) {
                        setError(err?.message || 'Phone linking failed.');
                        throw err;
                      }
                    }}
                  />
                </div>
              )}
              {error && <div className="auth-error" role="alert">{error}</div>}
            </div>
          )}
        </div>

        {!done && (
          <div className="flex shrink-0 items-center justify-between gap-3 border-t border-line bg-surface px-5 py-3.5 sm:px-7">
            <span className="flex items-center gap-1.5 text-[11px] leading-snug text-ink/50"><ShieldCheck size={14} className="shrink-0 text-primary" /> Secure verification</span>
            <button type="button" onClick={onClose} className="rounded-xl border border-line px-4 py-2 text-xs font-semibold text-ink/70 transition hover:bg-paper-dim hover:text-ink">
              Not now
            </button>
          </div>
        )}
      </section>
    </div>,
    document.body
  );
}
