import { useState } from 'react';
import { X, Smartphone, CheckCircle2 } from 'lucide-react';
import FirebasePhoneOtp from './FirebasePhoneOtp';
import { supabase } from '../supabase/config';
import { phoneBridge, phoneBridgeEnabled } from '../services/phoneAccountBridge';
import { normalizePakistanLocalPhone, pakistanPhoneError, toPakistanE164 } from '../utils/formValidation';

/** Existing Supabase account owner can attach a phone only with BOTH proofs:
 * current Supabase access token + fresh Firebase phone OTP.
 * No new Supabase user or role is created here. */
export default function LinkPhoneModal({ open, onClose }) {
  const [phone, setPhone] = useState('');
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const validPhone = !pakistanPhoneError(normalizePakistanLocalPhone(phone));
  if (!open) return null;
  return <div className="fixed inset-0 z-[1500] bg-black/55 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Link verified phone to your account">
    <div className="bg-surface border border-line rounded-2xl shadow-2xl p-5 w-full max-w-md max-h-[90vh] overflow-y-auto space-y-4">
      <div className="flex items-center justify-between gap-3"><h2 className="font-display text-xl font-semibold">Link a phone number</h2><button type="button" onClick={onClose} aria-label="Close" className="p-2"><X size={18}/></button></div>
      <p className="text-sm text-ink/65">Your current email/Google account will keep the same Supabase ID, roles, and approval status. To sign in later using phone and password, first set an AgriWatch password on your account. This linking feature is staging-only during testing.</p>
      {done ? <div className="rounded-xl bg-primary/10 p-4 space-y-3"><p role="status" className="font-semibold flex gap-2 items-center text-primary"><CheckCircle2 size={18}/>Phone linked successfully.</p><button className="auth-primary-btn" onClick={onClose} type="button">Done</button></div> : <>
        <label htmlFor="profile-link-phone" className="auth-label">Pakistan phone number (+92)</label>
        <div className="phone-control" dir="ltr"><span className="text-sm font-semibold">+92</span><input id="profile-link-phone" className="outline-none bg-transparent w-full" inputMode="numeric" placeholder="3XX XXXXXXX" maxLength={10} value={phone} onChange={e => {setPhone(normalizePakistanLocalPhone(e.target.value));setError('');}} /></div>
        {phone && !validPhone && <p className="text-xs text-danger">Enter a valid Pakistani mobile number.</p>}
        {validPhone && !phoneBridgeEnabled && <p className="text-sm text-ink/60">Phone linking is not enabled for this environment.</p>}
        {validPhone && phoneBridgeEnabled && <FirebasePhoneOtp key={phone} phoneE164={toPakistanE164(normalizePakistanLocalPhone(phone))} onVerified={async (proof) => {
          const { data: { user }, error: authError } = await supabase.auth.getUser();
          if (authError || !user) throw new Error('Please sign in to your existing Supabase account first.');
          try { await phoneBridge('link', proof.idToken); setDone(true); }
          catch (err) { setError(err?.message || 'Phone linking failed.'); throw err; }
        }} />}
        {error && <div className="auth-error" role="alert">{error}</div>}
      </>}
    </div>
  </div>;
}
