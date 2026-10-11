/**
 * AgriWatch production candidate phone bridge (pilot only).
 * Firebase validates fresh phone ownership at registration/link/recovery.
 * Supabase Auth remains the ONLY password/session issuer.
 * Phone/password login uses the linked Supabase user's email internally;
 * this Edge Function never discloses that email to the browser.
 *
 * Production fail-closed: no action works until an explicit pilot allowlist
 * and exact production project reference are configured. This is NOT a
 * globally enabled production release. verify_jwt=false on this function only:
 * Firebase account-changing proofs and Supabase owner tokens are verified here.
 */
import { createClient } from 'npm:@supabase/supabase-js@2.116.0';
import { createRemoteJWKSet, jwtVerify } from 'npm:jose@6.1.0';

type JsonObj = Record<string, unknown>;
const PROJECT_ID = Deno.env.get('FIREBASE_PROJECT_ID') || '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') || '';
const ALLOWED_ORIGINS = new Set((Deno.env.get('AGRIWATCH_ALLOWED_ORIGINS') || '').split(',').map(x => x.trim()).filter(Boolean));
const TEST_NUMBERS = new Set((Deno.env.get('FIREBASE_TEST_PHONE_NUMBERS') || '').split(',').map(x => x.trim()).filter(Boolean));
// Fail closed by default. Only pre-approved REAL phones may use a pilot.
const BRIDGE_MODE = Deno.env.get('AGRIWATCH_PHONE_BRIDGE_MODE') || 'disabled';
const PILOT_NUMBERS = new Set((Deno.env.get('AGRIWATCH_PHONE_BRIDGE_PILOT_NUMBERS') || '').split(',').map(x => x.trim()).filter(Boolean));
const EXPECTED_PROJECT_REF = Deno.env.get('AGRIWATCH_MAIN_PROJECT_REF') || '';
const ALLOW_TEST = false; // production candidate never accepts fictional Firebase phones
const MAX_AGE = 300;
const jwks = createRemoteJWKSet(new URL('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com'));
const phonePattern = /^\+923\d{9}$/;
const passwordValid = (v: unknown): v is string => typeof v === 'string' && v.length >= 9 && v.length <= 128 && /[a-z]/i.test(v) && /\d/.test(v);
const stringPhone = (v: unknown): v is string => typeof v === 'string' && phonePattern.test(v);

function reply(status: number, body: JsonObj, origin: string | null) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json', 'cache-control': 'no-store',
      'access-control-allow-origin': origin && ALLOWED_ORIGINS.has(origin) ? origin : 'null',
      'access-control-allow-headers': 'authorization, apikey, x-client-info, content-type',
      'access-control-allow-methods': 'POST, OPTIONS', 'vary': 'Origin',
    },
  });
}

async function verifyPhoneProof(rawToken: unknown) {
  if (typeof rawToken !== 'string' || rawToken.length > 10000 || rawToken.split('.').length !== 3) {
    throw new Error('PHONE_PROOF_REQUIRED');
  }
  const { payload } = await jwtVerify(rawToken, jwks, {
    issuer: `https://securetoken.google.com/${PROJECT_ID}`,
    audience: PROJECT_ID,
    algorithms: ['RS256'],
    clockTolerance: 5,
  });
  const signInProvider = (payload.firebase as JsonObj | undefined)?.sign_in_provider;
  const uid = payload.sub;
  const phone = payload.phone_number;
  const authTime = payload.auth_time;
  const now = Math.floor(Date.now() / 1000);
  if (signInProvider !== 'phone' || typeof uid !== 'string' || !uid ||
      !stringPhone(phone) || typeof authTime !== 'number' || authTime > now + 5 || authTime < now - MAX_AGE) {
    throw new Error('FRESH_PHONE_OTP_REQUIRED');
  }
  if (TEST_NUMBERS.has(phone) && !ALLOW_TEST) throw new Error('TEST_NUMBER_NOT_ALLOWED');
  return { uid, phone, authTime };
}

async function syntheticEmail(firebaseUid: string) {
  // RFC-reserved domain: not a deliverable email. Never display or email this address.
  // UUID comes from Supabase; Firebase UID is merely bound to it in the private table.
  const input = new TextEncoder().encode(`${PROJECT_ID}:${firebaseUid}`);
  const hash = await crypto.subtle.digest('SHA-256', input);
  const hex = [...new Uint8Array(hash)].map(x => x.toString(16).padStart(2, '0')).join('');
  return `phone-${hex}@phone.agriwatch.invalid`;
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get('origin');
  if (req.method === 'OPTIONS') return reply(200, {}, origin);
  if (req.method !== 'POST') return reply(405, { error: 'METHOD_NOT_ALLOWED' }, origin);
  if (!origin || !ALLOWED_ORIGINS.has(origin)) return reply(403, { error: 'ORIGIN_NOT_ALLOWED' }, origin);
  if (BRIDGE_MODE !== 'pilot') return reply(503, { error: 'PHONE_BRIDGE_DISABLED' }, origin);
  const actualRef = (() => { try { return new URL(SUPABASE_URL).hostname.split('.')[0]; } catch { return ''; } })();
  if (!PROJECT_ID || !SUPABASE_URL || !SERVICE_KEY || !ANON_KEY || !ALLOWED_ORIGINS.size ||
      !TEST_NUMBERS.size || !PILOT_NUMBERS.size || !EXPECTED_PROJECT_REF ||
      actualRef !== EXPECTED_PROJECT_REF ||
      Deno.env.get('ALLOW_TEST_PHONE_BRIDGE') === 'true' ||
      [...PILOT_NUMBERS].some(phone => !stringPhone(phone) || TEST_NUMBERS.has(phone))) {
    return reply(503, { error: 'BRIDGE_NOT_CONFIGURED' }, origin);
  }

  let input: JsonObj;
  try {
    if (Number(req.headers.get('content-length') || 0) > 16000) throw new Error();
    input = await req.json();
    if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error();
  } catch { return reply(400, { error: 'INVALID_REQUEST' }, origin); }

  const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  const anon = createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  try {
    const action = input.action;
    if (!['register', 'login', 'link', 'recover', 'my-phone'].includes(String(action))) return reply(400, { error: 'INVALID_ACTION' }, origin);

    if (action === 'login') {
      // Never look up or expose another user's email in the browser.
      // GoTrue enforces password validation/rate limits. Production also needs
      // an upstream IP/phone throttle and abuse monitoring before go-live.
      if (!stringPhone(input.phone) || typeof input.password !== 'string' || input.password.length > 128) {
        return reply(401, { error: 'INVALID_PHONE_OR_PASSWORD' }, origin);
      }
      if (!PILOT_NUMBERS.has(input.phone)) return reply(403, { error: 'PHONE_PILOT_ONLY' }, origin);
      const { data: mapping, error: mappingError } = await admin.from('firebase_phone_links')
        .select('supabase_user_id').eq('phone', input.phone).maybeSingle();
      if (mappingError) throw mappingError;
      if (!mapping) return reply(401, { error: 'INVALID_PHONE_OR_PASSWORD' }, origin);
      const { data: result, error: userError } = await admin.auth.admin.getUserById(mapping.supabase_user_id);
      if (userError || !result.user?.email) return reply(401, { error: 'INVALID_PHONE_OR_PASSWORD' }, origin);
      const { data: signed, error: signError } = await anon.auth.signInWithPassword({
        email: result.user.email,
        password: input.password,
      });
      if (signError || !signed.session || signed.user?.id !== mapping.supabase_user_id) {
        return reply(401, { error: 'INVALID_PHONE_OR_PASSWORD' }, origin);
      }
      return reply(200, {
        ok: true,
        session: {
          access_token: signed.session.access_token,
          refresh_token: signed.session.refresh_token,
        },
      }, origin);
    }

    if (action === 'my-phone') {
      // A signed-in Supabase user may read ONLY their own previously-linked
      // verified phone. Used when resuming an interrupted phone registration.
      const accessToken = /^Bearer (.+)$/i.exec(req.headers.get('authorization') || '')?.[1];
      if (!accessToken) return reply(401, { error: 'SUPABASE_SIGN_IN_REQUIRED' }, origin);
      const { data: owner, error: ownerError } = await anon.auth.getUser(accessToken);
      if (ownerError || !owner.user?.id) return reply(401, { error: 'SUPABASE_SIGN_IN_REQUIRED' }, origin);
      const { data: link, error: linkError } = await admin.from('firebase_phone_links')
        .select('phone').eq('supabase_user_id', owner.user.id).maybeSingle();
      if (linkError) throw linkError;
      if (!link) return reply(404, { error: 'PHONE_NOT_LINKED' }, origin);
      if (!PILOT_NUMBERS.has(link.phone)) return reply(403, { error: 'PHONE_PILOT_ONLY' }, origin);
      return reply(200, { ok: true, phone: link.phone }, origin);
    }

    // Every account-changing operation REQUIRES a fresh, Google-signed Firebase
    // phone sign-in. Browsers never get service-role capabilities.
    const proof = await verifyPhoneProof(input.firebaseIdToken);
    if (!PILOT_NUMBERS.has(proof.phone)) return reply(403, { error: 'PHONE_PILOT_ONLY' }, origin);

    if (action === 'register') {
      if (!passwordValid(input.password)) return reply(400, { error: 'PASSWORD_TOO_WEAK' }, origin);
      const { data: existing, error: queryError } = await admin.from('firebase_phone_links')
        .select('supabase_user_id').or(`firebase_uid.eq.${proof.uid},phone.eq.${proof.phone}`).limit(1);
      if (queryError) throw queryError;
      if (existing?.length) return reply(409, { error: 'PHONE_ALREADY_LINKED_SIGN_IN' }, origin);
      // Public Staging tests lacked live user data. Production MUST also reject
      // a number already claimed in website_signup_requests or auth.users.
      // Private RPC is SECURITY DEFINER; only service_role may execute it.
      const { data: claimed, error: claimError } = await admin.rpc('agriwatch_phone_claim_conflict', {
        p_phone: proof.phone, p_owner: null,
      });
      if (claimError || typeof claimed !== 'boolean') throw claimError || new Error('CLAIM_CHECK_UNAVAILABLE');
      if (claimed) return reply(409, { error: 'PHONE_ALREADY_ASSOCIATED' }, origin);
      const email = await syntheticEmail(proof.uid);
      // Email is a non-deliverable internal username. Firebase OTP, NOT an email
      // confirmation, validated possession. Auth is nonetheless email/password.
      const { data: created, error: createError } = await admin.auth.admin.createUser({
        email, password: input.password, email_confirm: true,
        user_metadata: { signup_method: 'firebase_phone' },
      });
      if (createError || !created.user) {
        return reply(409, { error: 'PHONE_ACCOUNT_CREATION_UNAVAILABLE' }, origin);
      }
      const { error: linkError } = await admin.from('firebase_phone_links').insert({
        firebase_uid: proof.uid, supabase_user_id: created.user.id, phone: proof.phone,
      });
      if (linkError) {
        // Compensation: never leave a valid but unlinked Supabase account.
        await admin.auth.admin.deleteUser(created.user.id);
        return reply(409, { error: 'PHONE_LINK_UNAVAILABLE' }, origin);
      }
      return reply(200, { ok: true }, origin);
    }

    if (action === 'link') {
      const accessToken = /^Bearer (.+)$/i.exec(req.headers.get('authorization') || '')?.[1];
      if (!accessToken) return reply(401, { error: 'SUPABASE_SIGN_IN_REQUIRED' }, origin);
      const { data: owner, error: ownerError } = await anon.auth.getUser(accessToken);
      if (ownerError || !owner.user?.id) return reply(401, { error: 'SUPABASE_SIGN_IN_REQUIRED' }, origin);
      const { data: conflicts, error: conflictsError } = await admin.from('firebase_phone_links')
        .select('supabase_user_id, firebase_uid, phone')
        .or(`firebase_uid.eq.${proof.uid},phone.eq.${proof.phone},supabase_user_id.eq.${owner.user.id}`);
      if (conflictsError) throw conflictsError;
      if (conflicts?.some(row => row.supabase_user_id !== owner.user.id || row.phone !== proof.phone || row.firebase_uid !== proof.uid)) {
        return reply(409, { error: 'PHONE_LINKED_TO_ANOTHER_ACCOUNT' }, origin);
      }
      // Linking requires BOTH signed-in Supabase ownership and fresh Firebase OTP.
      // Reject phone claims already held by a different existing user.
      const { data: otherClaim, error: claimError } = await admin.rpc('agriwatch_phone_claim_conflict', {
        p_phone: proof.phone, p_owner: owner.user.id,
      });
      if (claimError || typeof otherClaim !== 'boolean') throw claimError || new Error('CLAIM_CHECK_UNAVAILABLE');
      if (otherClaim) return reply(409, { error: 'PHONE_ALREADY_ASSOCIATED' }, origin);
      if (!conflicts?.length) {
        const { error: insertError } = await admin.from('firebase_phone_links').insert({
          firebase_uid: proof.uid, supabase_user_id: owner.user.id, phone: proof.phone,
        });
        if (insertError) return reply(409, { error: 'PHONE_LINK_UNAVAILABLE' }, origin);
      }
      // Do not update auth.users.phone: Supabase's native Phone provider is OFF.
      return reply(200, { ok: true }, origin);
    }

    if (action === 'recover') {
      if (!passwordValid(input.password)) return reply(400, { error: 'PASSWORD_TOO_WEAK' }, origin);
      const { data: linked, error: selectError } = await admin.from('firebase_phone_links')
        .select('supabase_user_id').eq('firebase_uid', proof.uid).eq('phone', proof.phone).maybeSingle();
      if (selectError) throw selectError;
      if (!linked) return reply(404, { error: 'PHONE_NOT_LINKED' }, origin);
      // Single-use recovery, atomically consumed by the staging SQL function.
      const { data: consumed, error: consumeError } = await admin.rpc('consume_phone_recovery', {
        p_firebase_uid: proof.uid, p_supabase_user_id: linked.supabase_user_id, p_auth_time: proof.authTime,
      });
      if (consumeError) throw consumeError;
      if (!consumed) return reply(409, { error: 'REQUEST_NEW_OTP' }, origin);
      const { error: updateError } = await admin.auth.admin.updateUserById(linked.supabase_user_id, {
        password: input.password,
      });
      if (updateError) return reply(500, { error: 'PASSWORD_RESET_FAILED_REQUEST_NEW_OTP' }, origin);
      return reply(200, { ok: true }, origin);
    }
  } catch (err) {
    const safeErrors = ['PHONE_PROOF_REQUIRED', 'FRESH_PHONE_OTP_REQUIRED', 'TEST_NUMBER_NOT_ALLOWED'];
    if (safeErrors.includes((err as Error)?.message)) return reply(401, { error: (err as Error).message }, origin);
    console.error('AgriWatch production pilot phone bridge error:', (err as Error)?.name || 'error');
    return reply(500, { error: 'PHONE_BRIDGE_UNAVAILABLE' }, origin);
  }
  return reply(400, { error: 'INVALID_ACTION' }, origin);
});
