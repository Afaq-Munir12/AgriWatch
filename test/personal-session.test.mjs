import test from 'node:test';
import assert from 'node:assert/strict';
import { createPersonalSession, canEnterPersonalPortal, personalDestination, accountObservation } from '../src/firebase/session.js';
import { personalProfileView } from '../src/firebase/profile.js';
import { personalReports } from '../src/firebase/reports.js';
function fixture() {
  let user = null;
  let observer;
  let resolver;
  let waitForAccess = false;
  const service = {
    resolveAccess: async () => waitForAccess ? new Promise(resolve => { resolver = resolve; }) : ({ firebaseUid: user.uid, status: 'portal', portal: 'public', storedRoles: ['public'], storedProfileRole: 'citizen' }),
    snapshot: async () => ({ firebaseUid: user.uid, observedAt: 'test-time', reports: { status: 'read', data: [{ firebase_uid: user.uid, id: 'cmp' }] }, profile: { status: 'read', data: { uid: user.uid, role: 'citizen', name: 'Stored name' } }, accessRequests: { status: 'read', data: [] } }),
    confirmOtp: async () => { user = { uid: 'firebase-uid' }; return user; },
    signOut: async () => { user = null; observer?.(null); },
  };
  const session = createPersonalSession({ service, observeUser: fn => { observer = fn; fn(user); return () => {}; }, currentUser: () => user });
  session.start();
  return { session, service, block() { waitForAccess = true; }, resolve(value) { resolver(value); }, setUser(value) { user = value; } };
}
test('OTP routes to stored Public role, exposes own profile/history, and sign-out clears everything', async () => {
  const { session } = fixture();
  const state = await session.confirmOtp('123456');
  assert.equal(personalDestination(state.access), '/public');
  assert.equal(canEnterPersonalPortal(state, 'public'), true);
  assert.equal(canEnterPersonalPortal(state, 'farmer'), false);
  assert.equal(canEnterPersonalPortal(state, 'pdma'), false);
  assert.equal(personalProfileView(state).name, 'Stored name');
  assert.equal(personalReports(state)[0].userId, 'firebase-uid');
  assert.equal(accountObservation(state).webPhoneOtp.status, 'verified-this-page');
  await session.signOut();
  assert.equal(session.getSnapshot().user, null);
  assert.equal(session.getSnapshot().access, null);
  assert.equal(session.getSnapshot().snapshot, null);
  assert.deepEqual(personalReports(session.getSnapshot()), []);
  assert.equal(personalProfileView(session.getSnapshot()).name, '');
});
test('late reads cannot revive a signed-out session', async () => {
  const f = fixture();
  f.setUser({ uid: 'old' }); f.block();
  const pending = f.session.refresh();
  await f.session.signOut();
  f.resolve({ firebaseUid: 'old', storedRoles: ['farmer'] });
  await pending;
  assert.equal(f.session.getSnapshot().user, null);
  assert.equal(f.session.getSnapshot().access, null);
});
test('changing UID clears former account data immediately and discards its in-flight result', async () => {
  const f = fixture(); await f.session.confirmOtp('123456');
  f.setUser({ uid: 'next' }); f.block();
  const pending = f.session.refresh();
  assert.equal(f.session.getSnapshot().snapshot, null);
  assert.equal(f.session.getSnapshot().access, null);
  f.setUser({ uid: 'third' });
  f.resolve({ firebaseUid: 'next', storedRoles: ['public'] });
  await pending;
  assert.equal(f.session.getSnapshot().snapshot, null);
});
test('foreign snapshots cannot expose reports or profile, and errors cannot unlock a portal', async () => {
  const { session } = fixture(); const state = await session.confirmOtp('123456');
  const foreign = { ...state, user: { uid: 'other' } };
  assert.deepEqual(personalReports(foreign), []);
  assert.equal(personalProfileView(foreign).name, '');
  assert.equal(accountObservation(foreign), null);
  assert.equal(canEnterPersonalPortal(foreign, 'public'), false);
  assert.equal(canEnterPersonalPortal({ ...state, error: new Error('denied') }, 'public'), false);
});
test('read failures remain unavailable rather than zero and exports omit private contact/auth fields', async () => {
  const { session } = fixture(); const state = await session.confirmOtp('123456');
  state.snapshot.profile.data.phoneNumber = 'private-contact';
  state.user.token = 'private-token';
  state.snapshot.reports = { status: 'error', code: 'permission-denied' };
  const observation = accountObservation(state);
  assert.equal(observation.reports.count, null);
  assert.equal(observation.profile.exists, true);
  assert.equal(observation.accessRequests.count, 0);
  assert.ok(!JSON.stringify(observation).includes('private-'));
});
test('only both stored memberships allow choosing and neither routes to setup', () => {
  assert.equal(personalDestination({ status: 'choice' }), '/personal-account');
  assert.equal(personalDestination({ status: 'setup' }), '/personal-account');
  assert.equal(personalDestination({ status: 'portal', portal: 'farmer' }), '/farmer');
});
