import { useState } from 'react';
import { usePersonalAuth } from '../firebase/PersonalAuthContext';
import { googleAuthMessage } from '../firebase/googleErrors.js';
import { useLanguage } from '../i18n/LanguageContext';
import { useToast } from './ToastContext';

export default function PersonalGoogleLink() {
  const state = usePersonalAuth();
  const { t } = useLanguage();
  const { showToast } = useToast();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  if (!state.user) return null;
  const linked = state.user.providerData?.some(provider => provider.providerId === 'google.com');
  async function link() {
    if (busy) return;
    setBusy(true); setError('');
    try {
      await state.linkGoogle();
      showToast(t('firebaseGoogleLinked'), 'success', 6000);
    } catch (failure) {
      const message = googleAuthMessage(failure, t);
      setError(message); showToast(message, 'error', 6000);
    } finally { setBusy(false); }
  }
  return <div className="mt-4 border-t border-line pt-4">
    <p className="font-semibold text-sm">{t('firebaseGoogleMethods')}</p>
    {linked ? <p className="text-sm mt-2">{t('firebaseGoogleConnected')}</p> : <>
      <p className="text-sm text-ink/55 mt-2">{t(state.otpVerified ? 'firebaseGoogleLinkHint' : 'firebaseGoogleOtpFirst')}</p>
      {state.otpVerified && <button type="button" disabled={busy || state.loading} onClick={link} className="border border-line rounded-lg px-3 py-2 mt-3 text-xs">{t(busy ? 'firebaseGoogleOpening' : 'firebaseGoogleAdd')}</button>}
    </>}
    {error && <p role="alert" className="auth-error mt-3">{error}</p>}
  </div>;
}
