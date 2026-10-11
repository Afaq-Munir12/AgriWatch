import { initializeApp } from 'firebase/app';
import * as sdk from 'firebase/auth';
import { getFirestore, doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { createFirebaseDataClient } from './dataClient.js';
import { createIdentityService } from './identityService.js';
import { checkPhoneSite } from './phoneSite.js';
import { firebaseProjectIdentity } from './projectIdentity.js';

const app = initializeApp({
  projectId: 'agriwatch-pakistan',
  apiKey: 'AIzaSyBv2fQsykl1DgPsSnKCcVd6Qf8yh8vhoi4',
  authDomain: 'agriwatch-pakistan.firebaseapp.com',
  appId: '1:603632933825:web:fbe63f109613f0616bad40',
  messagingSenderId: '603632933825',
}, 'agriwatch-personal');
export const auth = sdk.getAuth(app);
const db = getFirestore(app);
const url = import.meta.env.VITE_SUPABASE_URL;
if (new URL(url).hostname !== 'gtbfmrefgwodphjurvdq.supabase.co') throw new Error('Firebase data must use the existing mobile data project.');
const client = createFirebaseDataClient({ url, key: import.meta.env.VITE_SUPABASE_ANON_KEY, auth });
export async function readFirebaseProfile(uid) {
  const snapshot = await getDoc(doc(db, 'user_profiles', uid));
  if (!snapshot.exists()) return null;
  const profile = snapshot.data();
  if (profile.uid != null && profile.uid !== uid) throw new Error('Profile ownership mismatch.');
  return { ...profile, uid };
}
export const service = createIdentityService({
  auth, sdk, client,
  checkPhoneSite: () => checkPhoneSite({ hostname: window.location.hostname, config: app.options,
    fetchConfig: async () => {
      const response = await fetch(`https://identitytoolkit.googleapis.com/v1/projects?key=${app.options.apiKey}`);
      if (!response.ok) throw new Error('Unable to check phone verification configuration. Try again.');
      const config = await response.json();
      return { ...firebaseProjectIdentity, authProjectNumber: config.projectId, authorizedDomains: config.authorizedDomains };
    },
  }),
  readProfile: readFirebaseProfile,
  readRequests: async uid => {
    const snapshot = await getDocs(query(collection(db, 'access_requests'), where('uid', '==', uid)));
    return snapshot.docs.map(item => ({ ...item.data(), sourceDocumentId: item.id }));
  },
});
// Token refreshes must not recursively restart the profile/claim refresh.
export const observeUser = callback => sdk.onAuthStateChanged(auth, callback);
