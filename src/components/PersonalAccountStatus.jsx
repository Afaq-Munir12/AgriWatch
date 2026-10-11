import { Link } from 'react-router-dom';
import Card from './Card';
import { usePersonalAuth } from '../firebase/PersonalAuthContext';
import { accountObservation } from '../firebase/session.js';
export default function PersonalAccountStatus() {
  const state = usePersonalAuth();
  if (!state.user) return null;
  const observation = accountObservation(state);
  function download() {
    const url = URL.createObjectURL(new Blob([JSON.stringify(observation, null, 2)], { type: 'application/json' }));
    const link = document.createElement('a'); link.href = url; link.download = 'website-auth-observations.json'; link.click(); URL.revokeObjectURL(url);
  }
  return <Card className="max-w-lg">
    <p className="font-display font-semibold">Your account access</p>
    {state.loading ? <p className="text-sm mt-3">Reading your account…</p> : state.error ? <p role="alert" className="text-sm mt-3">Your account could not be read. Please retry.</p> : <>
      <p className="text-sm mt-3">Stored role: {observation?.profile.storedRole === 'citizen' || observation?.profile.storedRole === 'public' ? 'General Public' : observation?.profile.storedRole === 'farmer' ? 'Farmer' : 'No personal membership'}</p>
      <p className="text-sm mt-2">Profile: {observation?.profile.status !== 'read' ? 'unavailable' : observation.profile.exists ? 'found' : 'not found'}</p>
      <p className="text-sm mt-2">CMP reports: {observation?.reports.status === 'read' ? observation.reports.count : 'unavailable'}</p>
      <p className="text-sm mt-2">Access requests: {observation?.accessRequests.status === 'read' ? observation.accessRequests.count : 'unavailable'}</p>
      {state.snapshot?.accessRequests.status === 'read' && state.snapshot.accessRequests.data.map((request, index) => <p key={request.sourceDocumentId || index} className="text-xs mt-2">Request {index + 1}: {String(request.status || 'pending')}</p>)}
      {state.access?.status === 'choice' && state.access.storedRoles.map(role => <Link key={role} to={`/${role}`} className="block text-primary mt-3">Open {role === 'farmer' ? 'Farmer' : 'General Public'}</Link>)}
      <button type="button" onClick={download} className="border border-line rounded-lg px-3 py-2 mt-4 text-xs">Download sign-in check</button>
    </>}
    <button type="button" onClick={() => state.refresh()} disabled={state.loading} className="border border-line rounded-lg px-3 py-2 mt-4 ms-2 text-xs">Refresh account</button>
  </Card>;
}
