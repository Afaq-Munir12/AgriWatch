import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Outlet, Route, Routes } from 'react-router-dom';

const mocks = vi.hoisted(() => ({ personal: {}, legacy: {}, from: vi.fn(), passwordSignIn: vi.fn(), sendPhoneOtp: vi.fn(), verifyPhoneOtp: vi.fn(), getSignupRequest: vi.fn(), showToast: vi.fn(), lang: 'en', translate: false }));
vi.mock('../src/firebase/PersonalAuthContext', () => ({ usePersonalAuth: () => mocks.personal }));
vi.mock('../src/supabase/useSupabaseAuth', () => ({ useSupabaseAuth: () => mocks.legacy }));
vi.mock('../src/supabase/config', () => ({ supabase: { from: mocks.from, auth: { signOut: vi.fn(async () => ({ error: null })), signInWithPassword: mocks.passwordSignIn } } }));
vi.mock('../src/services/authService', () => ({ sendPhoneOtp: mocks.sendPhoneOtp, verifyPhoneOtp: mocks.verifyPhoneOtp, getSignupRequest: mocks.getSignupRequest, normalizeDbRole: role => role === 'admin' ? 'pdma' : role }));
vi.mock('../src/i18n/LanguageContext', () => ({ useLanguage: () => ({ lang: mocks.lang, t: key => mocks.translate ? translations[key]?.[mocks.lang] || key : key }) }));
vi.mock('../src/services/droughtService', () => ({ getDistricts: vi.fn(async () => []) }));
vi.mock('../src/components/LanguageToggle', () => ({ default: () => <button>Language</button> }));
vi.mock('../src/components/ThemeToggle', () => ({ default: () => <button>Theme</button> }));
vi.mock('../src/components/ToastContext', () => ({ useToast: () => ({ showToast: mocks.showToast }) }));
vi.mock('../src/components/NotAdminPending', () => ({ default: () => <p>Admin approval required</p> }));
import Login from '../src/pages/Login';
import AdminPortalLogin from '../src/pages/adminportal/AdminPortalLogin';
import AuthCallback from '../src/pages/AuthCallback';
import CompleteProfile from '../src/pages/CompleteProfile';
import translations from '../src/i18n/translations';
import RequirePersonalAuth from '../src/components/RequirePersonalAuth';
import RequirePortalAuth from '../src/components/RequirePortalAuth';
import RequireAdminAuth from '../src/components/RequireAdminAuth';
import ProfileDropdown from '../src/components/ProfileDropdown';
import PersonalGoogleLink from '../src/components/PersonalGoogleLink';
import { grantPortalAccess } from '../src/utils/authAccess';

function roleState(role = 'public') {
  return { user: { uid: 'firebase-uid' }, loading: false, error: null, access: { firebaseUid: 'firebase-uid', status: 'portal', portal: role, storedRoles: [role], storedProfileRole: role === 'public' ? 'citizen' : 'farmer' } };
}
function queryResult(data) {
  const chain = { select: vi.fn(() => chain), eq: vi.fn(() => chain), maybeSingle: vi.fn(async () => ({ data, error: null })) };
  mocks.from.mockReturnValue(chain); return chain;
}
beforeEach(() => {
  vi.clearAllMocks(); localStorage.clear(); sessionStorage.clear();
  mocks.lang = 'en'; mocks.translate = false;
  mocks.personal = { user: null, loading: false, access: null, error: null, sendOtp: vi.fn(async () => {}), cancelOtp: vi.fn(), confirmOtp: vi.fn(async () => roleState()), signInGoogle: vi.fn(async () => roleState()), linkGoogle: vi.fn(async () => roleState()), signOut: vi.fn(async () => {}), refresh: vi.fn(async () => roleState()) };
  mocks.legacy = { user: null, loading: false, signIn: vi.fn(async () => {}), signOut: vi.fn(async () => {}) };
});
afterEach(cleanup);
function login() {
  render(<MemoryRouter initialEntries={['/login']}><Routes><Route path="/login" element={<Login />} /><Route path="/public" element={<p>Public dashboard</p>} /><Route path="/farmer" element={<p>Farmer dashboard</p>} /><Route path="/personal-account" element={<p>Account setup</p>} /><Route path="/pdma" element={<p>PDMA dashboard</p>} /></Routes></MemoryRouter>);
}
describe('existing login UI with separate personal and staff auth', () => {
  it('Farmer hint sends Firebase OTP and stored Public role opens Public without Supabase role grants', async () => {
    login();
    expect(screen.getByText('firebasePersonalSelection')).toBeTruthy();
    fireEvent.change(screen.getByPlaceholderText('3XX XXXXXXX'), { target: { value: '3110000000' } });
    fireEvent.click(screen.getByText('sendOtp'));
    await waitFor(() => expect(mocks.personal.sendOtp).toHaveBeenCalledTimes(1));
    expect(mocks.personal.sendOtp.mock.calls[0][0]).toBe('+923110000000');
    expect(mocks.sendPhoneOtp).not.toHaveBeenCalled();
    fireEvent.change(screen.getByPlaceholderText('••••••'), { target: { value: '123456' } });
    fireEvent.click(screen.getByText('firebaseVerifyContinue'));
    await screen.findByText('Public dashboard');
    expect(mocks.showToast).toHaveBeenCalledWith('firebaseStoredPublicNotice', 'info', 6000);
    expect(mocks.getSignupRequest).not.toHaveBeenCalled();
    expect(sessionStorage.getItem('agriwatch_portal_access')).toBeNull();
  });
  it('General Public hint cannot override a stored Farmer role', async () => {
    mocks.personal.confirmOtp.mockResolvedValue(roleState('farmer')); login();
    fireEvent.click(screen.getByText('rolePublicLabel'));
    fireEvent.change(screen.getByPlaceholderText('3XX XXXXXXX'), { target: { value: '3110000000' } });
    fireEvent.click(screen.getByText('sendOtp'));
    await screen.findByText('changeNumber');
    fireEvent.change(screen.getByPlaceholderText('••••••'), { target: { value: '123456' } });
    fireEvent.click(screen.getByText('firebaseVerifyContinue'));
    await screen.findByText('Farmer dashboard');
    expect(mocks.showToast).toHaveBeenCalledWith('firebaseStoredFarmerNotice', 'info', 6000);
  });
  it('PDMA uses its original Supabase phone flow and approved stored registration', async () => {
    mocks.verifyPhoneOtp.mockResolvedValue({ user: { id: 'staff-uuid' } });
    mocks.getSignupRequest.mockResolvedValue({ status: 'approved', role: 'pdma' }); login();
    fireEvent.click(screen.getByText('roleAdminLabel'));
    fireEvent.click(screen.getByText('sendOtp'));
    fireEvent.change(screen.getByPlaceholderText('3XX XXXXXXX'), { target: { value: '3110000000' } });
    fireEvent.click(screen.getByText('sendOtp'));
    await screen.findByText('changeNumber');
    expect(mocks.sendPhoneOtp).toHaveBeenCalledTimes(1);
    expect(mocks.personal.sendOtp).not.toHaveBeenCalled();
    fireEvent.change(screen.getByPlaceholderText('••••••'), { target: { value: '123456' } });
    fireEvent.click(screen.getByText(/verifyContinueAs/));
    await screen.findByText('PDMA dashboard');
    expect(JSON.parse(sessionStorage.getItem('agriwatch_portal_access'))).toMatchObject({ userId: 'staff-uuid', role: 'pdma' });
  });
  it('PDMA Google still uses the dedicated Supabase callback', async () => {
    login();
    fireEvent.click(screen.getByText('roleAdminLabel')); fireEvent.click(screen.getByText('continueWithGoogle'));
    await waitFor(() => expect(mocks.legacy.signIn).toHaveBeenCalledTimes(1));
    expect(mocks.legacy.signIn.mock.calls[0][0]).toContain('/auth/callback');
    expect(mocks.personal.signInGoogle).not.toHaveBeenCalled();
  });
  it('Farmer-selected Firebase Google opens stored Public without a Supabase grant', async () => {
    login(); fireEvent.click(screen.getByText('continueWithGoogle'));
    await screen.findByText('Public dashboard');
    expect(mocks.personal.signInGoogle).toHaveBeenCalledTimes(1);
    expect(mocks.legacy.signIn).not.toHaveBeenCalled();
    expect(mocks.getSignupRequest).not.toHaveBeenCalled();
    expect(sessionStorage.getItem('agriwatch_portal_access')).toBeNull();
    expect(mocks.showToast).toHaveBeenCalledWith('firebaseStoredPublicNotice', 'info', 6000);
  });
  it('Public-selected existing mobile Google account opens stored Farmer', async () => {
    mocks.personal.signInGoogle.mockResolvedValue(roleState('farmer'));
    login(); fireEvent.click(screen.getByText('rolePublicLabel')); fireEvent.click(screen.getByText('continueWithGoogle'));
    await screen.findByText('Farmer dashboard');
    expect(mocks.legacy.signIn).not.toHaveBeenCalled();
  });
  it('pending Google sign-in displays its own progress and role switching never starts OTP or staff auth', async () => {
    let complete;
    mocks.personal.signInGoogle.mockImplementationOnce(() => new Promise(resolve => { complete = resolve; }));
    login(); fireEvent.click(screen.getByText('continueWithGoogle'));
    expect(await screen.findByText('firebaseGoogleOpening')).toBeTruthy();
    expect(screen.queryByText('firebaseOtpCancel')).toBeNull();
    fireEvent.click(screen.getByText('rolePublicLabel'));
    await act(async () => complete(roleState()));
    await screen.findByText('Public dashboard');
    expect(mocks.personal.sendOtp).not.toHaveBeenCalled();
    expect(mocks.legacy.signIn).not.toHaveBeenCalled();
  });
  it('new Google account with no membership opens setup without creating a profile or role', async () => {
    mocks.personal.signInGoogle.mockResolvedValue({ user: { uid: 'new-google-uid' }, error: null, access: { status: 'setup', storedRoles: [] } });
    login(); fireEvent.click(screen.getByText('continueWithGoogle'));
    await screen.findByText('Account setup');
    expect(mocks.from).not.toHaveBeenCalled();
    expect(mocks.getSignupRequest).not.toHaveBeenCalled();
  });
  it('blocked Google popup gives a safe Urdu error and retry remains possible', async () => {
    mocks.lang = 'ur'; mocks.translate = true;
    mocks.personal.signInGoogle.mockRejectedValueOnce(Object.assign(new Error('private-auth-detail'), { code: 'auth/popup-blocked' }));
    login(); fireEvent.click(screen.getByText(translations.continueWithGoogle.ur));
    expect((await screen.findByRole('alert')).textContent).toBe(translations.firebaseGooglePopupBlocked.ur);
    expect(screen.queryByText('private-auth-detail')).toBeNull();
    fireEvent.click(screen.getByText(translations.continueWithGoogle.ur));
    await screen.findByText('Public dashboard');
  });
  it('Farmer/Public changes during SMS sending and code entry retain the attempt and route by stored role', async () => {
    let sent;
    mocks.personal.sendOtp.mockImplementation(() => new Promise(resolve => { sent = resolve; }));
    login();
    fireEvent.change(screen.getByPlaceholderText('3XX XXXXXXX'), { target: { value: '3110000000' } });
    fireEvent.click(screen.getByText('sendOtp'));
    await waitFor(() => expect(mocks.personal.sendOtp).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByText('rolePublicLabel'));
    expect(screen.getByText('rolePublicLabel').closest('button').className).toContain('role-choice-active');
    await act(async () => sent());
    await screen.findByText('changeNumber');
    fireEvent.click(screen.getByText('roleFarmerLabel'));
    fireEvent.click(screen.getByText('roleFarmerLabel'));
    expect(screen.getByText('changeNumber')).toBeTruthy();
    expect(mocks.personal.cancelOtp).not.toHaveBeenCalled();
    fireEvent.change(screen.getByRole('textbox', { name: 'enterOtp' }), { target: { value: '123456' } });
    fireEvent.click(screen.getByText('firebaseVerifyContinue'));
    await screen.findByText('Public dashboard');
    expect(sessionStorage.getItem('agriwatch_portal_access')).toBeNull();
  });
  it('cancelling a stalled SMS request allows retry and ignores its late completion', async () => {
    let oldSend;
    mocks.personal.sendOtp.mockImplementationOnce(() => new Promise(resolve => { oldSend = resolve; }));
    login();
    fireEvent.change(screen.getByPlaceholderText('3XX XXXXXXX'), { target: { value: '3110000000' } });
    fireEvent.click(screen.getByText('sendOtp'));
    fireEvent.click(await screen.findByText('firebaseOtpCancel'));
    fireEvent.click(screen.getByText('rolePublicLabel'));
    fireEvent.click(screen.getByText('sendOtp'));
    await screen.findByText('changeNumber');
    fireEvent.click(screen.getByText('changeNumber'));
    await act(async () => oldSend());
    expect(screen.queryByText('changeNumber')).toBeNull();
    expect(screen.getByText('sendOtp').closest('button').disabled).toBe(false);
    expect(mocks.personal.sendOtp).toHaveBeenCalledTimes(2);
  });
  it.each(['auth/captcha-check-failed', 'auth/otp-timeout'])('sending failure %s shows a safe alert/snackbar and allows retry', async code => {
    mocks.personal.sendOtp.mockRejectedValueOnce(Object.assign(new Error('private detail must not be displayed'), { code }));
    login();
    fireEvent.change(screen.getByPlaceholderText('3XX XXXXXXX'), { target: { value: '3110000000' } });
    fireEvent.click(screen.getByText('sendOtp'));
    const key = code === 'auth/otp-timeout' ? 'firebaseOtpTimeout' : 'firebaseOtpCaptcha';
    expect((await screen.findByRole('alert')).textContent).toBe(key);
    expect(mocks.showToast).toHaveBeenCalledWith(key, 'error', 6000);
    expect(screen.queryByText('private detail must not be displayed')).toBeNull();
    fireEvent.click(screen.getByText('rolePublicLabel'));
    fireEvent.click(screen.getByText('sendOtp'));
    await screen.findByText('changeNumber');
  });
  it('wrong verification code displays an alert and retry still opens the stored Public account', async () => {
    mocks.personal.confirmOtp.mockRejectedValueOnce({ code: 'auth/invalid-verification-code' });
    login();
    fireEvent.change(screen.getByPlaceholderText('3XX XXXXXXX'), { target: { value: '3110000000' } });
    fireEvent.click(screen.getByText('sendOtp'));
    await screen.findByText('changeNumber');
    fireEvent.change(screen.getByRole('textbox', { name: 'enterOtp' }), { target: { value: '123456' } });
    fireEvent.click(screen.getByText('firebaseVerifyContinue'));
    expect((await screen.findByRole('alert')).textContent).toBe('firebaseOtpInvalid');
    fireEvent.click(screen.getByText('rolePublicLabel'));
    fireEvent.click(screen.getByText('firebaseVerifyContinue'));
    await screen.findByText('Public dashboard');
  });
  it('an expired code offers a new SMS request and Urdu failures retain RTL', async () => {
    mocks.lang = 'ur'; mocks.translate = true;
    mocks.personal.confirmOtp.mockRejectedValueOnce({ code: 'auth/code-expired' });
    login();
    fireEvent.change(screen.getByPlaceholderText('3XX XXXXXXX'), { target: { value: '3110000000' } });
    fireEvent.click(screen.getByText(translations.sendOtp.ur));
    await screen.findByText(translations.changeNumber.ur);
    fireEvent.change(screen.getByRole('textbox', { name: translations.enterOtp.ur }), { target: { value: '123456' } });
    fireEvent.click(screen.getByText(translations.firebaseVerifyContinue.ur));
    expect((await screen.findByRole('alert')).textContent).toBe(translations.firebaseOtpExpired.ur);
    fireEvent.click(screen.getByText(translations.sendOtp.ur));
    await screen.findByText(translations.changeNumber.ur);
    fireEvent.click(screen.getByText(translations.firebaseOtpResend.ur));
    await screen.findByText(translations.changeNumber.ur);
    expect(mocks.personal.sendOtp).toHaveBeenCalledTimes(3);
  });
  it('changing the number during verification ignores late navigation and releases the send button', async () => {
    let verified;
    mocks.personal.confirmOtp.mockImplementationOnce(() => new Promise(resolve => { verified = resolve; }));
    login();
    fireEvent.change(screen.getByPlaceholderText('3XX XXXXXXX'), { target: { value: '3110000000' } });
    fireEvent.click(screen.getByText('sendOtp'));
    await screen.findByText('changeNumber');
    fireEvent.change(screen.getByRole('textbox', { name: 'enterOtp' }), { target: { value: '123456' } });
    fireEvent.click(screen.getByText('firebaseVerifyContinue'));
    fireEvent.click(screen.getByText('changeNumber'));
    await act(async () => verified(roleState()));
    expect(screen.queryByText('Public dashboard')).toBeNull();
    expect(screen.getByText('sendOtp').closest('button').disabled).toBe(false);
  });
  it('latest PDMA password login still checks its stored approved registration', async () => {
    mocks.passwordSignIn.mockResolvedValue({ data: { user: { id: 'staff-uuid' } }, error: null });
    mocks.getSignupRequest.mockResolvedValue({ status: 'approved', role: 'pdma' });
    login();
    fireEvent.click(screen.getByText('roleAdminLabel'));
    fireEvent.change(screen.getByPlaceholderText('authEmailPhonePlaceholder'), { target: { value: 'staff@example.test' } });
    fireEvent.change(screen.getByPlaceholderText('••••••••'), { target: { value: 'fixture-password' } });
    fireEvent.click(screen.getByText('authLoginWithPassword'));
    await screen.findByText('PDMA dashboard');
    expect(mocks.getSignupRequest).toHaveBeenCalledWith('staff-uuid', 'pdma');
    expect(mocks.personal.sendOtp).not.toHaveBeenCalled();
  });
  it('latest Admin Google login clears its old session and forces account selection at the callback', async () => {
    render(<MemoryRouter><AdminPortalLogin /></MemoryRouter>);
    fireEvent.click(screen.getByText('Continue with Google (Admin only)'));
    await waitFor(() => expect(mocks.legacy.signIn).toHaveBeenCalledTimes(1));
    expect(mocks.legacy.signOut).toHaveBeenCalledTimes(1);
    expect(mocks.legacy.signOut.mock.invocationCallOrder[0]).toBeLessThan(mocks.legacy.signIn.mock.invocationCallOrder[0]);
    expect(mocks.legacy.signIn).toHaveBeenCalledWith(expect.stringContaining('/auth/callback'), { forceAccountChoice: true });
    expect(JSON.parse(sessionStorage.getItem('agriwatch_login_attempt'))).toMatchObject({ method: 'admin-google' });
  });
  it('Urdu OTP retains RTL scope and routes from stored identity', async () => {
    mocks.lang = 'ur'; mocks.translate = true;
    login();
    expect(screen.getByText(translations.firebaseStoredRoleHint.ur)).toBeTruthy();
    expect(document.querySelector('.auth-form-column').getAttribute('dir')).toBe('rtl');
    fireEvent.change(screen.getByPlaceholderText('3XX XXXXXXX'), { target: { value: '3110000000' } });
    fireEvent.click(screen.getByText(translations.sendOtp.ur));
    await screen.findByText(translations.changeNumber.ur);
    fireEvent.change(screen.getByRole('textbox', { name: translations.enterOtp.ur }), { target: { value: '123456' } });
    fireEvent.click(screen.getByText(translations.firebaseVerifyContinue.ur));
    await screen.findByText('Public dashboard');
  });
  it('Admin Google callback resumes Admin without granting a Farmer/Public role', async () => {
    mocks.legacy.user = { id: 'admin-uuid' };
    sessionStorage.setItem('agriwatch_login_attempt', JSON.stringify({ method: 'admin-google', role: 'admin-portal', startedAt: Date.now() }));
    render(<MemoryRouter initialEntries={['/auth/callback']}><Routes><Route path="/auth/callback" element={<AuthCallback />} /><Route path="/admin-portal" element={<p>Admin destination</p>} /></Routes></MemoryRouter>);
    await screen.findByText('Admin destination');
    expect(mocks.getSignupRequest).not.toHaveBeenCalled();
    expect(sessionStorage.getItem('agriwatch_portal_access')).toBeNull();
  });
  it('profile completion remains usable with backup-password feature excluded', async () => {
    mocks.legacy.user = { id: 'existing-staff-uuid', email: 'staff@example.test' };
    localStorage.setItem('agriwatch_require_backup_password', '1');
    render(<MemoryRouter><CompleteProfile /></MemoryRouter>);
    await waitFor(() => expect(screen.getByPlaceholderText('Your full name')).toBeTruthy());
    expect(screen.queryByText('Create backup AgriWatch password')).toBeNull();
    expect(document.querySelector('input[type="password"]')).toBeNull();
  });
});
describe('role guards keep Firebase personal and Supabase staff permissions separate', () => {
  function guarded(element, path) {
    render(<MemoryRouter initialEntries={[path]}><Routes><Route element={element}><Route path={path} element={<p>Permitted page</p>} /></Route><Route path="/login" element={<p>Personal login</p>} /><Route path="/admin-portal/login" element={<p>Admin login</p>} /><Route path="/public" element={<p>Stored Public destination</p>} /><Route path="/personal-account" element={<p>Account setup</p>} /></Routes></MemoryRouter>);
  }
  it('stored Public cannot enter Farmer even with a forged browser Farmer grant', async () => {
    mocks.personal = { ...mocks.personal, ...roleState() }; grantPortalAccess('firebase-uid', 'farmer');
    guarded(<RequirePersonalAuth role="farmer" />, '/farmer');
    await screen.findByText('Stored Public destination');
  });
  it('personal Firebase identity alone cannot enter PDMA', async () => {
    mocks.personal = { ...mocks.personal, ...roleState() }; guarded(<RequirePortalAuth role="pdma" />, '/pdma');
    await screen.findByText('Personal login');
  });
  it('approved PDMA Supabase account still enters its original guarded portal', async () => {
    mocks.legacy.user = { id: 'staff-uuid' }; grantPortalAccess('staff-uuid', 'pdma'); queryResult({ status: 'approved', role: 'pdma' });
    guarded(<RequirePortalAuth role="pdma" />, '/pdma');
    await screen.findByText('Permitted page');
    expect(mocks.from).toHaveBeenCalledWith('website_signup_requests');
  });
  it('Admin still requires a Supabase admins allowlist row', async () => {
    mocks.legacy.user = { id: 'admin-uuid' }; queryResult({ user_id: 'admin-uuid' });
    guarded(<RequireAdminAuth />, '/admin-portal');
    await screen.findByText('Permitted page');
    expect(mocks.from).toHaveBeenCalledWith('admins');
  });
  it('non-admin Supabase users remain pending and Firebase cannot supply Admin permission', async () => {
    mocks.personal = { ...mocks.personal, ...roleState() }; mocks.legacy.user = { id: 'not-admin' }; queryResult(null);
    guarded(<RequireAdminAuth />, '/admin-portal');
    await screen.findByText('Admin approval required');
  });
});
it('personal profile menu signs out Firebase, not Supabase, and offers no unowned portal switches', async () => {
  mocks.personal = { ...mocks.personal, ...roleState() };
  render(<MemoryRouter><Routes><Route path="/" element={<ProfileDropdown displayName="Stored name" initials="SN" currentRole="public" userId="firebase-uid" profileHref="/public/settings" />} /><Route path="/login" element={<p>Signed out login</p>} /></Routes></MemoryRouter>);
  fireEvent.click(screen.getByRole('button', { expanded: false }));
  expect(screen.queryByText('switchAccount')).toBeNull();
  expect(screen.queryByText('securityPasswordMenu')).toBeNull();
  fireEvent.click(screen.getByText('signOut'));
  await screen.findByText('Signed out login');
  expect(mocks.personal.signOut).toHaveBeenCalledTimes(1);
});

describe('phone account Google linking', () => {
  it('restored phone sessions must verify OTP before the linking control is offered', () => {
    mocks.personal = { ...mocks.personal, ...roleState(), otpVerified: false };
    render(<PersonalGoogleLink />);
    expect(screen.getByText('firebaseGoogleOtpFirst')).toBeTruthy();
    expect(screen.queryByText('firebaseGoogleAdd')).toBeNull();
    expect(mocks.personal.linkGoogle).not.toHaveBeenCalled();
  });
  it('OTP-verified phone users can link Google without starting a new sign-in', async () => {
    mocks.personal = { ...mocks.personal, ...roleState(), otpVerified: true };
    render(<PersonalGoogleLink />);
    fireEvent.click(screen.getByText('firebaseGoogleAdd'));
    await waitFor(() => expect(mocks.showToast).toHaveBeenCalledWith('firebaseGoogleLinked', 'success', 6000));
    expect(mocks.personal.linkGoogle).toHaveBeenCalledTimes(1);
    expect(mocks.personal.signInGoogle).not.toHaveBeenCalled();
    expect(mocks.legacy.signIn).not.toHaveBeenCalled();
  });
  it('an already-used Google account shows a clear collision and allows another choice', async () => {
    mocks.personal = { ...mocks.personal, ...roleState(), otpVerified: true };
    mocks.personal.linkGoogle.mockRejectedValueOnce({ code: 'auth/credential-already-in-use' });
    render(<PersonalGoogleLink />);
    fireEvent.click(screen.getByText('firebaseGoogleAdd'));
    expect((await screen.findByRole('alert')).textContent).toBe('firebaseGoogleUsed');
    fireEvent.click(screen.getByText('firebaseGoogleAdd'));
    await waitFor(() => expect(mocks.personal.linkGoogle).toHaveBeenCalledTimes(2));
    expect(mocks.personal.user.uid).toBe('firebase-uid');
    expect(mocks.personal.signInGoogle).not.toHaveBeenCalled();
  });
  it('already-linked Google users see the connected status rather than a second link button', () => {
    mocks.personal = { ...mocks.personal, ...roleState(), user: { uid: 'firebase-uid', providerData: [{ providerId: 'google.com' }] } };
    render(<PersonalGoogleLink />);
    expect(screen.getByText('firebaseGoogleConnected')).toBeTruthy();
    expect(screen.queryByText('firebaseGoogleAdd')).toBeNull();
  });
});
