import { useEffect, useState } from 'react';
import ConfirmDialog from './ConfirmDialog';
import { useComplaints } from '../store/ComplaintsContext';
import { useSupabaseAuth } from '../supabase/useSupabaseAuth';
import { fetchReportReviewers } from '../supabase/complaintsApi';

export default function DroughtReportReview({ report, readOnly = false }) {
  const { access, reviewReport } = useComplaints();
  const { user } = useSupabaseAuth();
  const [note, setNote] = useState(report.resolutionNote || '');
  const [reason, setReason] = useState('');
  const [assignee, setAssignee] = useState('');
  const [serious, setSerious] = useState(false);
  const [reviewerState, setReviewerState] = useState(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [confirmResolve, setConfirmResolve] = useState(false);
  const admin = !readOnly && access?.admin === true;
  const reviewers = admin && reviewerState?.userId === user?.id ? reviewerState.rows : [];

  useEffect(() => {
    let cancelled = false;
    if (admin && user?.id) fetchReportReviewers().then(rows => {
      if (!cancelled) setReviewerState({ userId: user.id, rows });
    }).catch(() => { if (!cancelled) setMessage('Verified PDMA reviewers could not be loaded. Assignment is unavailable.'); });
    return () => { cancelled = true; };
  }, [admin, user?.id]);

  async function act(action) {
    if (!report || !admin || busy) return;
    setBusy(true); setMessage('');
    try {
      await reviewReport(report.dbId, action, note, action === 'assign' ? assignee : null, action === 'assign' ? reason : '');
      setMessage(action === 'assign' ? 'Assignment recorded for PDMA review. This does not confirm government action.' : 'Admin action saved.');
    } catch (err) {
      setMessage(err.message || 'The action could not be saved.');
    } finally { setBusy(false); }
  }


  return <div className="space-y-3 text-sm">
      {report.reviewStartedAt && <p>AgriWatch review started: {report.reviewStartedAt}</p>}
      {report.assignedAt && <p>Assigned for PDMA review: {report.assignedAt}. Government action is not confirmed.</p>}
      {report.resolvedAt && <p>Resolution recorded: {report.resolvedAt}</p>}
      {report.resolutionNote && <p className="mt-3">{report.respondedAt ? "AgriWatch admin response: " : "Recorded response: "}{report.resolutionNote}</p>}
      {admin && <div className="space-y-3 mt-4">
        <label className="block">Admin response<textarea className="block border border-line rounded-lg px-3 py-2 text-sm bg-surface w-full" value={note} onChange={e => setNote(e.target.value)} /></label>
        <div className="flex flex-wrap gap-3">
          <button className="btn-animated text-xs font-medium border border-line rounded-lg px-3 py-2 hover:bg-paper-dim disabled:opacity-50 disabled:cursor-not-allowed" disabled={busy || Boolean(report.reviewStartedAt) || Boolean(report.resolvedAt)} onClick={() => act('start_review')}>Start AgriWatch review</button>
          <button className="btn-animated text-xs font-medium border border-line rounded-lg px-3 py-2 hover:bg-paper-dim disabled:opacity-50 disabled:cursor-not-allowed" disabled={busy || !note.trim()} onClick={() => act('respond')}>Save response</button>
          <button className="btn-animated text-xs font-medium border border-line rounded-lg px-3 py-2 hover:bg-paper-dim disabled:opacity-50 disabled:cursor-not-allowed" disabled={busy || !note.trim() || Boolean(report.resolvedAt)} onClick={() => setConfirmResolve(true)}>Record resolution</button>
        </div>
        <fieldset className="border border-line rounded-lg p-3 space-y-3">
          <legend>Assign for PDMA review</legend>
          <label className="block"><input type="checkbox" checked={serious} onChange={e => setSerious(e.target.checked)} /> I reviewed this as a serious drought situation.</label>
          <label className="block">Verified reviewer for {report.district}<select className="block border border-line rounded-lg px-3 py-2 text-sm bg-surface w-full" value={assignee} onChange={e => setAssignee(e.target.value)}>
            <option value="">Select a verified reviewer</option>
            {reviewers.filter(r => r.district === report.district).map(r => <option key={r.user_id} value={r.user_id}>{r.user_id}</option>)}
          </select></label>
          <label className="block">Serious drought assessment<textarea className="block border border-line rounded-lg px-3 py-2 text-sm bg-surface w-full" value={reason} onChange={e => setReason(e.target.value)} /></label>
          <button className="btn-animated text-xs font-medium border border-line rounded-lg px-3 py-2 hover:bg-paper-dim disabled:opacity-50 disabled:cursor-not-allowed" disabled={busy || !serious || !report.reviewStartedAt || !assignee || reason.trim().length < 10 || Boolean(report.resolvedAt)} onClick={() => act('assign')}>Assign for PDMA review</button>
          <p className="text-xs">Assignment grants this reviewer access within their verified area. It does not confirm a referral to government or a government response.</p>
        </fieldset>
      </div>}

    {report.cropType && <p>Crop: {report.cropType}</p>}
    {message && <p role="status">{message}</p>}
    <ConfirmDialog open={confirmResolve} title="Record this report as resolved?" body="The reporter will see your response and the stored resolution." confirmLabel="Record resolution" onCancel={() => setConfirmResolve(false)} onConfirm={() => { setConfirmResolve(false); act('resolve'); }} />
  </div>;
}
