import { complaintFromRow } from '../supabase/reportContract.js';
export function personalReports(state) {
  if (!state.user || state.snapshot?.firebaseUid !== state.user.uid || state.snapshot.reports.status !== 'read') return [];
  const rows = state.snapshot.reports.data;
  if (rows.some(row => row.firebase_uid !== state.user.uid)) return [];
  return rows.map(row => ({ ...complaintFromRow(row), userId: row.firebase_uid, firebaseUid: row.firebase_uid, identityProvider: 'firebase' }));
}
