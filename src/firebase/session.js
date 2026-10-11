// A UID change invalidates every outstanding read and all cached personal data.
export function createPersonalSession({ service, observeUser, currentUser }) {
  let state = { user: null, loading: true, access: null, snapshot: null, error: null, otpVerified: false };
  let generation = 0;
  let verifiedUid = null;
  const listeners = new Set();
  function publish(next) { state = { ...state, ...next }; listeners.forEach(fn => fn()); }
  async function refresh(user = currentUser()) {
    const version = ++generation;
    publish({ user, loading: !!user, access: null, snapshot: null, error: null, otpVerified: !!user && verifiedUid === user.uid });
    if (!user) return;
    try {
      const access = await service.resolveAccess();
      const snapshot = await service.snapshot();
      if (version !== generation || currentUser()?.uid !== user.uid) return;
      publish({ access, snapshot, loading: false });
      return state;
    } catch (error) {
      if (version === generation && currentUser()?.uid === user.uid) publish({ loading: false, error });
    }
  }
  return {
    subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    getSnapshot: () => state,
    start: () => observeUser(user => { void refresh(user); }),
    refresh,
    async confirmOtp(code) { const user = await service.confirmOtp(code); verifiedUid = user.uid; await refresh(user); return state; },
    async signOut() {
      ++generation; verifiedUid = null;
      publish({ user: null, loading: true, access: null, snapshot: null, error: null, otpVerified: false });
      try { await service.signOut(); publish({ loading: false }); }
      catch (error) { await refresh(currentUser()); throw error; }
    },
  };
}
export function personalDestination(access) {
  return access?.status === 'portal' ? `/${access.portal}` : '/personal-account';
}
export function canEnterPersonalPortal(state, role) {
  return Boolean(state.user && !state.loading && !state.error && state.access?.firebaseUid === state.user.uid && state.access.storedRoles.includes(role));
}
export function accountObservation(state) {
  const snapshot = state.snapshot;
  if (!state.user || !snapshot || snapshot.firebaseUid !== state.user.uid) return null;
  return {
    firebaseUid: state.user.uid, observedAt: snapshot.observedAt,
    webPhoneOtp: { status: state.otpVerified ? 'verified-this-page' : 'restored-session' },
    access: state.access,
    reports: { status: snapshot.reports.status, count: snapshot.reports.status === 'read' ? snapshot.reports.data.length : null },
    profile: { status: snapshot.profile.status, exists: snapshot.profile.status === 'read' ? Boolean(snapshot.profile.data) : null, storedRole: snapshot.profile.status === 'read' ? snapshot.profile.data?.role ?? null : null },
    accessRequests: { status: snapshot.accessRequests.status, count: snapshot.accessRequests.status === 'read' ? snapshot.accessRequests.data.length : null },
  };
}
