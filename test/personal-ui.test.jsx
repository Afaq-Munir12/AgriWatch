import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Outlet, Route, Routes } from 'react-router-dom';

const mocks = vi.hoisted(() => ({ personal: {}, legacy: {}, from: vi.fn(), passwordSignIn: vi.fn(), sendPhoneOtp: vi.fn(), verifyPhoneOtp: vi.fn(), getSignupRequest: vi.fn(), lang: 'en', translate: false }));
vi.mock('../src/firebase/PersonalAuthContext', () => ({ usePersonalAuth: () => mocks.personal }));
vi.mock('../src/supabase/useSupabaseAuth', () => ({ useSupabaseAuth: () => mocks.legacy }));
vi.mock('../src/supabase/config', () => ({ supabase: { from: mocks.from, auth: { signOut: vi.fn(async () => ({ error: null })), signInWithPassword: mocks.passwordSignIn } } }));
vi.mock('../src/services/authService', () => ({ sendPhoneOtp: mocks.sendPhoneOtp, verifyPhoneOtp: mocks.verifyPhoneOtp, getSignupRequest: mocks.getSignupRequest, normalizeDbRole: role => role === 'admin' ? 'pdma' : role }));
vi.mock('../src/i18n/LanguageContext', () => ({ useLanguage: () => ({ lang: mocks.lang, t: key => mocks.translate ? translations[key]?.[mocks.lang] || key : key }) }));
vi.mock('../src/services/droughtService', () => ({ getDistricts: vi.fn(async () => []) }));
vi.mock('../src/components/LanguageToggle', () => ({ default: () => <button>Language</button> }));
vi.mock('../src/components/ThemeToggle', () => ({ default: () => <button>Theme</button> }));
vi.mock('../src/components/ToastContext', () => ({ useToast: () => ({ showToast: vi.fn() }) }));
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
  mocks.personal = { user: null, loading: false, access: null, error: null, sendOtp: vi.fn(async () => {}), cancelOtp: vi.fn(), confirmOtp: vi.fn(async () => roleState()), signOut: vi.fn(async () => {}), refresh: vi.fn(async () => roleState()) };
  mocks.legacy = { user: null, loading: false, signIn: vi.fn(async () => {}), signOut: vi.fn(async () => {}) };
});
afterEach(cleanup);
function login() {
  render(<MemoryRouter initialEntries={['/login']}><Routes><Route path="/login" element={<Login />} /><Route path="/public" element={<p>Public dashboard</p>} /><Route path="/farmer" element={<p>Farmer dashboard</p>} /><Route path="/personal-account" element={<p>Account setup</p>} /><Route path="/pdma" element={<p>PDMA dashboard</p>} /></Routes></MemoryRouter>);
}
describe('existing login UI with separate personal and staff auth', () => {
  it('Farmer hint sends Firebase OTP and stored Public role opens Public without Supabase role grants', async () => {
    login();
    fireEvent.change(screen.getByPlaceholderText('3XX XXXXXXX'), { target: { value: '3110000000' } });
    fireEvent.click(screen.getByText('sendOtp'));
    await waitFor(() => expect(mocks.personal.sendOtp).toHaveBeenCalledTimes(1));
    expect(mocks.personal.sendOtp.mock.calls[0][0]).toBe('+923110000000');
    expect(mocks.sendPhoneOtp).not.toHaveBeenCalled();
    fireEvent.change(screen.getByPlaceholderText('••••••'), { target: { value: '123456' } });
    fireEvent.click(screen.getByText('firebaseVerifyContinue'));
    await screen.findByText('Public dashboard');
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
  it('PDMA Google still uses the dedicated callback; personal Google does not create a legacy account', async () => {
    login(); fireEvent.click(screen.getByText('continueWithGoogle'));
    expect(mocks.legacy.signIn).not.toHaveBeenCalled();
    fireEvent.click(screen.getByText('roleAdminLabel')); fireEvent.click(screen.getByText('continueWithGoogle'));
    await waitFor(() => expect(mocks.legacy.signIn).toHaveBeenCalledTimes(1));
    expect(mocks.legacy.signIn.mock.calls[0][0]).toContain('/auth/callback');
  });
  it('changing the portal while OTP is pending cancels that confirmation before another attempt', async () => {
    login();
    fireEvent.change(screen.getByPlaceholderText('3XX XXXXXXX'), { target: { value: '3110000000' } });
    fireEvent.click(screen.getByText('sendOtp'));
    await screen.findByText('changeNumber');
    fireEvent.click(screen.getByText('rolePublicLabel'));
    expect(mocks.personal.cancelOtp).toHaveBeenCalled();
    expect(screen.queryByText('changeNumber')).toBeNull();
    expect(mocks.personal.confirmOtp).not.toHaveBeenCalled();
    expect(sessionStorage.getItem('agriwatch_portal_access')).toBeNull();
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
