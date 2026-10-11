import { supabase } from '../supabase/config';

// Main deploy directly on the EXISTING Vercel project; phone OTP pilot is
// OFF unless an admin enables the env flag and the exact HTTPS origin matches.
// Supabase project URL must match Main. Staging and local dev tests are retained.
// Account access is independently restricted by the Main Edge Function's
// one-number pilot allowlist; browser Origin is NOT an authentication proof.
const normalizeUrl = (value) => value?.replace(/\/$/, '');
const currentUrl = normalizeUrl(import.meta.env.VITE_SUPABASE_URL);
const stagingUrl = normalizeUrl(import.meta.env.VITE_AGRIWATCH_PHONE_BRIDGE_STAGING_URL);
const mainUrl = normalizeUrl(import.meta.env.VITE_AGRIWATCH_PHONE_BRIDGE_MAIN_URL);
const pilotOrigin = normalizeUrl(import.meta.env.VITE_AGRIWATCH_PHONE_BRIDGE_PILOT_ORIGIN);
const flag = import.meta.env.VITE_AGRIWATCH_PHONE_BRIDGE_ENABLED === 'true';
const isBrowser = typeof window !== 'undefined';
const stageDev = import.meta.env.MODE === 'staging' && import.meta.env.DEV && currentUrl === stagingUrl;
const mainLocalDev = import.meta.env.MODE === 'main-pilot' && import.meta.env.DEV && currentUrl === mainUrl;
const mainHostedPilot = import.meta.env.PROD &&
  (import.meta.env.MODE === 'production' || import.meta.env.MODE === 'main-pilot') &&
  currentUrl === mainUrl && Boolean(pilotOrigin) &&
  isBrowser && window.location.protocol === 'https:' &&
  window.location.origin === pilotOrigin;

export const phoneBridgeEnabled = flag && Boolean(currentUrl) &&
  (stageDev || mainLocalDev || mainHostedPilot);

const ERRORS = {
  PHONE_BRIDGE_DISABLED: 'Phone authentication is not enabled for Main yet.',
  PHONE_PILOT_ONLY: 'This feature is currently limited to the approved test number.',
  PHONE_ALREADY_ASSOCIATED: 'This phone is already associated with an account. Sign in to the existing account before linking it.',
  PHONE_PROOF_REQUIRED: 'Verify your phone using a fresh Firebase OTP first.',
  FRESH_PHONE_OTP_REQUIRED: 'Your phone confirmation expired. Request and verify a new OTP.',
  TEST_NUMBER_NOT_ALLOWED: 'Test numbers are blocked in this environment.',
  BRIDGE_NOT_CONFIGURED: 'The phone-account service is not configured.',
  ORIGIN_NOT_ALLOWED: 'This website origin is not allowed by the phone-account service.',
  PASSWORD_TOO_WEAK: 'Use 9+ characters, including a letter and a number.',
  PHONE_ALREADY_LINKED_SIGN_IN: 'This number already has an account. Sign in or recover its password.',
  PHONE_ACCOUNT_CREATION_UNAVAILABLE: 'Phone account could not be created. Please contact support.',
  PHONE_LINKED_TO_ANOTHER_ACCOUNT: 'This phone is already linked to a different account.',
  PHONE_LINK_UNAVAILABLE: 'Unable to link this phone right now.',
  SUPABASE_SIGN_IN_REQUIRED: 'Sign in to your current Supabase account before linking a phone.',
  PHONE_NOT_LINKED: 'There is no linked AgriWatch account for this number.',
  REQUEST_NEW_OTP: 'This OTP proof has already been used. Request a fresh OTP.',
  INVALID_PHONE_OR_PASSWORD: 'Incorrect phone number or password.',
  PASSWORD_RESET_FAILED_REQUEST_NEW_OTP: 'Password reset failed. Request a fresh OTP.',
  PHONE_BRIDGE_UNAVAILABLE: 'The phone-account service is temporarily unavailable.',
};

async function invokeBridge(body) {
  if (!phoneBridgeEnabled) {
    throw new Error('Phone authentication is disabled. Ask the administrator to enable the restricted pilot.');
  }
  const { data, error } = await supabase.functions.invoke('phone-auth-bridge', { body });
  if (error || data?.error || !data?.ok) {
    let code = data?.error;
    if (!code && error?.context?.json) {
      try { code = (await error.context.json())?.error; } catch { /* unreadable */ }
    }
    throw new Error(ERRORS[code] || 'Could not complete phone authentication. Check staging function logs.');
  }
  return data;
}

export async function phoneBridge(action, firebaseIdToken, password) {
  return invokeBridge({ action, firebaseIdToken, ...(password !== undefined ? { password } : {}) });
}

export async function phonePasswordLogin(phone, password) {
  const response = await invokeBridge({ action: 'login', phone, password });
  if (!response?.session?.access_token || !response?.session?.refresh_token) {
    throw new Error('The phone sign-in session was not returned.');
  }
  const { data, error } = await supabase.auth.setSession({
    access_token: response.session.access_token,
    refresh_token: response.session.refresh_token,
  });
  if (error || !data?.user?.id) throw error || new Error('Unable to establish a Supabase session.');
  return data;
}
