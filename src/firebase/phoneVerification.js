/**
 * Firebase phone-number ownership proof only.
 * This named Firebase app is isolated from existing personal/mobile Firebase Auth
 * and from the Supabase session. Its public web config matches AgriWatch's
 * registered Firebase web app; it does NOT contain service-account credentials.
 *
 * IMPORTANT: The resulting Firebase ID token MUST be verified by a trusted
 * FastAPI backend before it may create/link/reset any Supabase Auth identity.
 */
import { getApps, initializeApp } from "firebase/app";
import { getAuth, RecaptchaVerifier, signInWithPhoneNumber, signOut } from "firebase/auth";

const firebaseWebConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyBv2fQsykl1DgPsSnKCcVd6Qf8yh8vhoi4",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "agriwatch-pakistan.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "agriwatch-pakistan",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "agriwatch-pakistan.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "603632933825",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:603632933825:web:fbe63f109613f0616bad40",
};

const APP_NAME = "agriwatch-phone-proof";

function getPhoneAuth() {
  const app = getApps().find((item) => item.name === APP_NAME)
    || initializeApp(firebaseWebConfig, APP_NAME);
  return getAuth(app);
}

export async function sendFirebasePhoneOtp(phone, captchaElement) {
  if (!/^\+[1-9]\d{7,14}$/.test(phone)) {
    throw new Error("Enter a valid phone number with country code.");
  }
  if (!captchaElement) throw new Error("Verification control is not available. Try again.");
  const auth = getPhoneAuth();
  // Explicit opt-in for fictional test numbers in the Vite dev server only.
  // NEVER enable this in a production build or with a real phone number.
  if (import.meta.env.DEV && import.meta.env.VITE_FIREBASE_PHONE_TEST_MODE === "true") {
    auth.settings.appVerificationDisabledForTesting = true;
  }
  // A previous proof must never be reused to verify a different number.
  if (auth.currentUser) await signOut(auth);
  const verifier = new RecaptchaVerifier(auth, captchaElement, { size: "invisible" });
  try {
    const confirmation = await signInWithPhoneNumber(auth, phone, verifier);
    return { confirmation, verifier, auth, requestedPhone: phone };
  } catch (error) {
    try { verifier.clear(); } catch { /* preserve the original error */ }
    throw error;
  }
}

export async function confirmFirebasePhoneOtp(flow, code) {
  if (!flow || !/^\d{6}$/.test(code)) throw new Error("Enter the six-digit verification code.");
  try {
    const credential = await flow.confirmation.confirm(code);
    const verifiedPhone = credential.user.phoneNumber;
    if (verifiedPhone !== flow.requestedPhone) throw new Error("Verified phone did not match the requested number.");
    const idToken = await credential.user.getIdToken(true);
    return { idToken, firebaseUid: credential.user.uid, verifiedPhone };
  } finally {
    // Keep the OTP proof isolated: do not establish a lasting Firebase login
    // through this verification-only component, and never touch Supabase Auth.
    await signOut(flow.auth);
  }
}
