import { supabase } from './config';

const reviewEndpoint = import.meta.env.VITE_ACCESS_REQUEST_REVIEW_URL;

export async function reviewAccessRequest({ requestId, action }) {
  if (!reviewEndpoint) {
    throw new Error('Access-request review endpoint is not configured.');
  }
  if (!requestId || !['approve', 'reject'].includes(action)) {
    throw new Error('A request ID and valid review action are required.');
  }

  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) throw sessionError;
  const accessToken = sessionData.session?.access_token;
  if (!accessToken) throw new Error('Please sign in again before reviewing requests.');

  const response = await fetch(reviewEndpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ requestId, action }),
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(body.message || body.error || 'The access request review failed.');
  }
  return body;
}
