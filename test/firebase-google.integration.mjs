// Real Firebase Auth SDK against a local demo emulator. OAuth window selection is adapted
// to synthetic Google credentials; Google consent/browser round trips are not simulated.
import test from 'node:test';
import assert from 'node:assert/strict';
import { initializeApp, deleteApp } from 'firebase/app';
import * as sdk from 'firebase/auth';
import { createIdentityService } from '../src/firebase/identityService.js';
import { createPersonalSession } from '../src/firebase/session.js';

const origin = process.env.AGRIWATCH_GOOGLE_TEST_EMULATOR;
const project = 'demo-agriwatch-google';
if (origin && !/^http:\/\/127\.0\.0\.1:\d+$/.test(origin)) throw new Error('A local emulator is required.');
let appIndex = 0;
async function fixture(subject) {
  const app = initializeApp({ projectId: project, apiKey: 'demo-api-key', authDomain: `${project}.firebaseapp.com` }, `google-test-${++appIndex}`);
  const auth = sdk.getAuth(app);
  const phoneNumber = '+15555550' + String(appIndex).padStart(3, '0');
  sdk.connectAuthEmulator(auth, origin, { disableWarnings: true });
  const profiles = new Map();
  const records = new Map();
  let sms;
  let googleSubject = subject;
  async function emulator(path, body) {
    const response = await fetch(origin + path, { method: body ? 'POST' : 'GET', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer owner' }, body: body ? JSON.stringify(body) : undefined });
    if (!response.ok) throw new Error('Emulator fixture request failed.');
    return response.json();
  }
  function googleCredential() {
    const json = value => Buffer.from(JSON.stringify(value)).toString('base64url');
    const token = `${json({ alg: 'none', typ: 'JWT' })}.${json({ iss: 'https://accounts.google.com', aud: 'demo-web-client', sub: googleSubject, email: `${googleSubject}@example.invalid`, email_verified: true, iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + 3600 })}.`;
    return sdk.GoogleAuthProvider.credential(token);
  }
  async function bridge(result) {
    // Isolated emulator fixture: production's existing auth-creation trigger supplies this claim.
    await emulator('/identitytoolkit.googleapis.com/v1/accounts:update?key=demo-api-key', { localId: result.user.uid, customAttributes: JSON.stringify({ role: 'authenticated' }) });
    return result;
  }
  const adapter = {
    ...sdk,
    RecaptchaVerifier: class { clear() {} },
    signInWithPopup: async () => bridge(await sdk.signInWithCredential(auth, googleCredential())),
    linkWithPopup: user => sdk.linkWithCredential(user, googleCredential()),
    signInWithPhoneNumber: async (_, phone) => {
      const response = await emulator('/identitytoolkit.googleapis.com/v1/accounts:sendVerificationCode?key=demo-api-key', { phoneNumber: phone });
      const codes = await emulator(`/emulator/v1/projects/${project}/verificationCodes`);
      sms = codes.verificationCodes.find(value => value.sessionInfo === response.sessionInfo);
      return { confirm: async code => bridge(await sdk.signInWithCredential(auth, sdk.PhoneAuthCredential.fromJSON({ verificationId: response.sessionInfo, verificationCode: code }))) };
    },
  };
  const service = createIdentityService({ auth, sdk: adapter, readProfile: async uid => profiles.get(uid) || null, readRequests: async uid => records.has(uid) ? [{ uid }] : [], client: { from: () => ({ select: () => ({ eq: (_, uid) => ({ order: async () => ({ data: records.get(uid) || [], error: null }) }) }) }) } });
  const session = createPersonalSession({ service, currentUser: () => auth.currentUser, observeUser: callback => sdk.onAuthStateChanged(auth, callback) });
  return { auth, service, session, profiles, records, selectGoogle(value) { googleSubject = value; }, async phoneLogin() { await service.sendOtp(phoneNumber, {}); return session.confirmOtp(sms.code); }, close: () => deleteApp(app) };
}

test('new Google SDK user reaches setup and gains no membership', { skip: !origin }, async () => {
  const f = await fixture('new-google');
  try {
    const state = await f.session.signInGoogle();
    assert.equal(state.access.status, 'setup');
    assert.deepEqual(state.access.storedRoles, []);
    assert.equal(state.otpVerified, false);
    assert.equal(f.profiles.size, 0);
    await assert.rejects(f.session.linkGoogle(), { code: 'auth/otp-required' });
  } finally { await f.close(); }
});

test('existing mobile-style Google credentials return the same Firebase UID and stored-role records', { skip: !origin }, async () => {
  const f = await fixture('existing-mobile-google');
  try {
    const mobileUser = await f.service.signInGoogle();
    const uid = mobileUser.uid;
    f.records.set(uid, [{ id: 'owned-cmp', firebase_uid: uid }]);
    for (const [role, portal] of [['citizen', 'public'], ['farmer', 'farmer']]) {
      f.profiles.set(uid, { uid, role });
      await f.session.signOut();
      const web = await f.session.signInGoogle();
      assert.equal(web.user.uid, uid);
      assert.equal(web.access.portal, portal);
      assert.equal(web.snapshot.reports.data[0].firebase_uid, uid);
      assert.equal(web.snapshot.accessRequests.data[0].uid, uid);
    }
    await f.session.signOut();
    assert.equal(f.session.getSnapshot().snapshot, null);
  } finally { await f.close(); }
});

test('actual phone OTP followed by Google linking preserves UID, records and subsequent Google sign-in', { skip: !origin }, async () => {
  const f = await fixture('phone-linked-google');
  try {
    const phone = await f.phoneLogin();
    const uid = phone.user.uid;
    f.profiles.set(uid, { uid, role: 'citizen' });
    f.records.set(uid, [{ id: 'existing-phone-cmp', firebase_uid: uid }]);
    const linked = await f.session.linkGoogle();
    assert.equal(linked.user.uid, uid);
    assert.equal(linked.access.portal, 'public');
    assert.ok(linked.snapshot.providers.includes('phone'));
    assert.ok(linked.snapshot.providers.includes('google.com'));
    await f.session.signOut();
    const google = await f.session.signInGoogle();
    assert.equal(google.user.uid, uid);
    assert.equal(google.snapshot.reports.data[0].firebase_uid, uid);
    assert.equal(google.otpVerified, false);
  } finally { await f.close(); }
});

test('already-used Google credential cannot replace or merge the OTP-verified phone UID', { skip: !origin }, async () => {
  const f = await fixture('used-google');
  try {
    const existing = await f.session.signInGoogle();
    const googleUid = existing.user.uid;
    await f.session.signOut();
    const phone = await f.phoneLogin();
    const phoneUid = phone.user.uid;
    assert.notEqual(phoneUid, googleUid);
    await assert.rejects(f.session.linkGoogle(), error => ['auth/credential-already-in-use', 'auth/email-already-in-use'].includes(error.code));
    assert.equal(f.auth.currentUser.uid, phoneUid);
    assert.equal(f.auth.currentUser.providerData.some(value => value.providerId === 'google.com'), false);
    f.selectGoogle('unused-google');
    assert.equal((await f.session.linkGoogle()).user.uid, phoneUid);
  } finally { await f.close(); }
});
