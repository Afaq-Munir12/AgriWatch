// Never render Firebase error messages/customData: they can contain contact details or credentials.
export function googleAuthMessage(error, t) {
  const keys = {
    'auth/credential-already-in-use': 'firebaseGoogleUsed',
    'auth/email-already-in-use': 'firebaseGoogleUsed',
    'auth/account-exists-with-different-credential': 'firebaseGoogleExistingMethod',
    'auth/otp-required': 'firebaseGoogleOtpFirst',
    'auth/requires-recent-login': 'firebaseGoogleOtpFirst',
    'auth/provider-already-linked': 'firebaseGoogleConnected',
    'auth/popup-blocked': 'firebaseGooglePopupBlocked',
    'auth/popup-closed-by-user': 'firebaseGoogleCancelled',
    'auth/cancelled-popup-request': 'firebaseGoogleCancelled',
    'auth/network-request-failed': 'firebaseOtpNetwork',
    'auth/operation-not-allowed': 'firebaseGoogleUnavailable',
    'auth/unauthorized-domain': 'firebaseGoogleUnavailable',
    'auth/sign-out-required': 'firebaseGoogleSignOutFirst',
  };
  return t(keys[error?.code] || 'firebaseGoogleFailed');
}
