import { Navigate, Outlet } from 'react-router-dom';
import { usePersonalAuth } from '../firebase/PersonalAuthContext';
import { canEnterPersonalPortal, personalDestination } from '../firebase/session.js';
export default function RequirePersonalAuth({ role }) {
  const state = usePersonalAuth();
  if (state.loading) return <div className="min-h-screen bg-paper flex items-center justify-center">Checking secure access…</div>;
  if (!state.user) return <Navigate to="/login" replace />;
  if (state.error) return <Navigate to="/personal-account" replace />;
  if (!canEnterPersonalPortal(state, role)) return <Navigate to={personalDestination(state.access)} replace />;
  return <Outlet />;
}
