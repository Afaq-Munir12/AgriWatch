import { Link, Navigate, useNavigate } from 'react-router-dom';
import { usePersonalAuth } from '../firebase/PersonalAuthContext';
import PersonalAccountStatus from '../components/PersonalAccountStatus';
export default function PersonalAccount() {
  const state = usePersonalAuth();
  const navigate = useNavigate();
  if (state.loading) return <div className="auth-page flex items-center justify-center">Checking your account…</div>;
  if (!state.user) return <Navigate to="/login" replace />;
  if (!state.error && state.access?.status === 'portal') return <Navigate to={`/${state.access.portal}`} replace />;
  return <div className="auth-page flex items-center justify-center p-5"><div className="auth-status-card">
    <h1 className="font-display text-xl font-semibold">{state.access?.status === 'choice' ? 'Choose your portal' : state.error ? 'Account check needs attention' : 'Complete your account setup'}</h1>
    <p className="text-sm text-ink/55 mt-3">{state.access?.status === 'choice' ? 'Both personal memberships are already stored on your account.' : state.error ? 'We could not verify your stored membership. Retry the account check or sign in again.' : 'No Farmer or General Public membership is stored for this verified account. Complete your profile in the AgriWatch mobile app, then refresh here.'}</p>
    <div className="mt-5"><PersonalAccountStatus /></div>
    <button onClick={async () => { await state.signOut(); navigate('/login', { replace: true }); }} className="auth-primary-btn mt-5">Sign out</button>
    <Link to="/" className="block text-sm mt-4">Return home</Link>
  </div></div>;
}
