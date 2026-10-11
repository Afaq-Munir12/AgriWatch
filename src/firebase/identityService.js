import { profileMemberships, resolvePortal } from './roleRouting.js';

export function createIdentityService({ auth, sdk, client, readProfile, readRequests, readMemberships = profileMemberships, checkPhoneSite = async () => {}, delay = ms => new Promise(resolve => setTimeout(resolve, ms)), otpTimeoutMs = 90000 }) {
  let verifier;
  let confirmation;
  let otpGeneration = 0;
  let phoneVerifiedUid = null;
  const cancelled = () => Object.assign(new Error('OTP attempt cancelled.'), { code: 'auth/otp-cancelled' });
  function withDeadline(operation) {
    let timer;
    const timeout = new Promise((_, reject) => {
      timer = setTimeout(() => reject(Object.assign(new Error('Phone verification timed out. Please try again.'), { code: 'auth/otp-timeout' })), otpTimeoutMs);
    });
    return Promise.race([operation, timeout]).finally(() => clearTimeout(timer));
  }
  const requireUser = () => {
    const user = auth.currentUser;
    if (!user || user.isAnonymous) throw new Error('Sign in with phone OTP first.');
    return user;
  };
  async function ready(user) {
    for (let attempt = 0; attempt < 8; attempt++) {
      if (auth.currentUser?.uid !== user.uid) throw new Error('The signed-in account changed.');
      const result = await user.getIdTokenResult(true);
      if (result.claims.role === 'authenticated') return;
      if (attempt < 7) await delay(1000);
    }
    throw new Error('Firebase signed in, but the Supabase authenticated claim is missing. No accounts were changed.');
  }
  function clearVerifier() {
    verifier?.clear();
    verifier = undefined;
  }
  return {
    observe: callback => sdk.onIdTokenChanged(auth, callback),
    async sendOtp(phone, container) {
      if (!/^\+[1-9]\d{7,14}$/.test(phone)) throw new Error('Use an international phone number, for example +923001234567.');
      if (auth.currentUser) throw new Error('Sign out before signing into another phone account.');
      const version = ++otpGeneration;
      confirmation = undefined;
      clearVerifier();
      let attemptVerifier;
      try {
        const result = await withDeadline((async () => {
          await checkPhoneSite();
          if (version !== otpGeneration) throw cancelled();
          // Firebase supplies the site key and invokes its normal interactive challenge when needed.
          attemptVerifier = new sdk.RecaptchaVerifier(auth, container, { size: 'invisible' });
          verifier = attemptVerifier;
          return sdk.signInWithPhoneNumber(auth, phone, attemptVerifier);
        })());
        if (version !== otpGeneration) throw cancelled();
        confirmation = result;
      } catch (error) {
        // An old request must never clear the verifier belonging to its retry.
        if (version === otpGeneration) {
          ++otpGeneration;
          clearVerifier();
        }
        throw error;
      }
    },
    async confirmOtp(code) {
      if (!confirmation) throw Object.assign(new Error('Request a new SMS code.'), { code: 'auth/missing-verification-id' });
      if (!/^\d{6}$/.test(code)) throw new Error('Enter the six-digit SMS code.');
      const version = otpGeneration;
      const result = await withDeadline(confirmation.confirm(code));
      if (version !== otpGeneration) throw cancelled();
      confirmation = undefined;
      clearVerifier();
      await ready(result.user);
      phoneVerifiedUid = result.user.uid;
      return result.user;
    },
    async resolveAccess() {
      const user = requireUser();
      await ready(user);
      const uid = user.uid;
      const profile = await readProfile(uid);
      // Validate the profile even when a separate membership reader is used.
      profileMemberships(uid, profile);
      const memberships = await readMemberships(uid, profile);
      if (auth.currentUser?.uid !== uid) throw new Error('The signed-in account changed.');
      return { firebaseUid: uid, storedProfileRole: profile?.role ?? null, ...resolvePortal(uid, memberships) };
    },
    async signInGoogle() {
      if (auth.currentUser) throw Object.assign(new Error('Sign out before signing into another account.'), { code: 'auth/sign-out-required' });
      ++otpGeneration; confirmation = undefined; clearVerifier(); phoneVerifiedUid = null;
      const provider = new sdk.GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      const result = await sdk.signInWithPopup(auth, provider);
      if (result.user.isAnonymous || auth.currentUser?.uid !== result.user.uid) throw new Error('Account identity changed; verification stopped.');
      await ready(result.user);
      return result.user;
    },
    async linkGoogle() {
      const user = requireUser();
      const uid = user.uid;
      if (phoneVerifiedUid !== uid) throw Object.assign(new Error('Verify this account with phone OTP before adding Google.'), { code: 'auth/otp-required' });
      const provider = new sdk.GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      // Never fall back to Google sign-in, email/phone matching, unlinking, or account migration.
      const result = await sdk.linkWithPopup(user, provider);
      if (result.user.uid !== uid || auth.currentUser?.uid !== uid) throw new Error('Account identity changed; verification stopped.');
      await ready(result.user);
      return result.user;
    },
    async snapshot() {
      const user = requireUser();
      await ready(user);
      const uid = user.uid;
      const settled = await Promise.allSettled([
        client.from('complaints').select('*').eq('firebase_uid', uid).order('created_at', { ascending: false }).then(({ data, error }) => {
          if (error) throw error;
          if ((data || []).some(row => row.firebase_uid !== uid)) throw new Error('Report ownership mismatch.');
          return data || [];
        }),
        readProfile(uid).then(profile => { profileMemberships(uid, profile); return profile; }),
        readRequests(uid).then(requests => {
          if (requests.some(request => (request.uid != null && request.uid !== uid) || (request.firebase_uid != null && request.firebase_uid !== uid))) throw new Error('Request ownership mismatch.');
          return requests;
        }),
      ]);
      if (auth.currentUser?.uid !== uid) throw new Error('The signed-in account changed.');
      return {
        firebaseUid: uid,
        observedAt: new Date().toISOString(),
        providers: user.providerData.map(provider => provider.providerId),
        ...Object.fromEntries(['reports', 'profile', 'accessRequests'].map((key, index) => {
          const result = settled[index];
          return [key, result.status === 'fulfilled'
            ? { status: 'read', data: result.value }
            : { status: 'error', code: result.reason?.code || 'read-failed' }];
        })),
      };
    },
    async signOut() {
      ++otpGeneration;
      phoneVerifiedUid = null;
      confirmation = undefined;
      clearVerifier();
      await sdk.signOut(auth);
    },
    dispose() { ++otpGeneration; confirmation = undefined; clearVerifier(); },
  };
}
