const ACCESS_KEY = "agriwatch_portal_access";
const LOGIN_ATTEMPT_KEY = "agriwatch_login_attempt";

function safeSet(storage, key, value) {
  try {
    storage?.setItem(key, value);
  } catch {
    // Storage can be unavailable in privacy modes. The other store may still work.
  }
}

function safeGet(storage, key) {
  try {
    return storage?.getItem(key) || null;
  } catch {
    return null;
  }
}

function safeRemove(storage, key) {
  try {
    storage?.removeItem(key);
  } catch {
    // Ignore storage cleanup errors.
  }
}

export function grantPortalAccess(userId, role) {
  if (!userId || !role) return;
  safeSet(
    window.sessionStorage,
    ACCESS_KEY,
    JSON.stringify({ userId, role, grantedAt: Date.now() })
  );
}

export function getPortalAccess() {
  try {
    const raw = safeGet(window.sessionStorage, ACCESS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.userId || !parsed?.role) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearPortalAccess() {
  safeRemove(window.sessionStorage, ACCESS_KEY);
}

// OAuth leaves the AgriWatch origin and comes back again. Some browsers are
// more reliable with localStorage than sessionStorage across that round-trip,
// so keep the short-lived OAuth intent in BOTH stores. It is still time-limited.
export function markLoginAttempt(method = "google", role = null) {
  const payload = JSON.stringify({ method, role, startedAt: Date.now() });
  safeSet(window.sessionStorage, LOGIN_ATTEMPT_KEY, payload);
  safeSet(window.localStorage, LOGIN_ATTEMPT_KEY, payload);
}

export function getLoginAttempt() {
  try {
    const raw =
      safeGet(window.sessionStorage, LOGIN_ATTEMPT_KEY) ||
      safeGet(window.localStorage, LOGIN_ATTEMPT_KEY);

    if (!raw) return null;

    const parsed = JSON.parse(raw);

    // Ignore stale callbacks older than 10 minutes.
    if (!parsed?.startedAt || Date.now() - parsed.startedAt > 10 * 60 * 1000) {
      clearLoginAttempt();
      return null;
    }

    return parsed;
  } catch {
    clearLoginAttempt();
    return null;
  }
}

export function clearLoginAttempt() {
  safeRemove(window.sessionStorage, LOGIN_ATTEMPT_KEY);
  safeRemove(window.localStorage, LOGIN_ATTEMPT_KEY);
}
