import { createContext, useContext, useEffect, useSyncExternalStore } from 'react';
import { auth, service, observeUser } from './runtime.js';
import { createPersonalSession } from './session.js';
const session = createPersonalSession({ service, observeUser, currentUser: () => auth.currentUser });
const Context = createContext(null);
export function PersonalAuthProvider({ children }) {
  const state = useSyncExternalStore(session.subscribe, session.getSnapshot);
  useEffect(() => session.start(), []);
  return <Context.Provider value={{ ...state, refresh: session.refresh, confirmOtp: session.confirmOtp, signOut: session.signOut, sendOtp: service.sendOtp, cancelOtp: service.dispose }}>{children}</Context.Provider>;
}
export function usePersonalAuth() {
  const value = useContext(Context);
  if (!value) throw new Error('PersonalAuthProvider is required.');
  return value;
}
